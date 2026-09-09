// 画像の検証と保存(§3.6)。
//
// このファイルは HTTP も DB も知らない。
// 「そのファイル名を受け付けてよいか」「中身が本当に画像か」「どう書き込むか」だけを扱う。
// そのおかげで save_test.go はサーバーもDBも立てずにテストできる。
package image

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// MaxUploadBytes は1リクエストで受け取れる画像の上限(5MB)。
// frontend/nginx.conf の client_max_body_size と同じ値にすること。
// 本番は nginx が先に弾くが、開発ではバックエンドを直接叩く(nginxを経由しない)ため
// Go側にも上限が要る。
const MaxUploadBytes = 5 << 20

// sniffLen は http.DetectContentType が見る先頭バイト数(固定で512)。
const sniffLen = 512

// maxFileNameLen はファイル名の長さの上限。
// ファイルシステム側の上限(255バイト)よりだいぶ手前で切る。
// スプレッドシートに手で書き写す運用(§3.5.1)なので、長い名前はそもそも事故のもと。
const maxFileNameLen = 100

// allowedExts は「許可する拡張子」と「その拡張子が名乗ってよい実際の種類」の対応。
// 中身の判定結果(http.DetectContentType)と突き合わせるのに使う。
var allowedExts = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
}

// validateFileName はアップロードされたファイル名を検証する。
//
// ★ ファイル名はアップロードする側が決める(サーバーは生成しない)。
// スプレッドシートには運営メンバーが手で /images/q5.png と書くので(§3.5.1)、
// サーバーがランダムな名前を付けると「シートに何を書けばいいか」が分からなくなる。
//
// その代わり、受け取る名前は厳しく絞る。ここを緩くすると
// ../../etc/xxx のような名前で staticDir の外へ書き込めてしまう。
// 読み取り側(question/import.go の imageExists)は filepath.Clean で正規化しているが、
// 書き込み側は「正規化して助ける」のではなく「少しでも怪しければ拒否する」方針にする。
func validateFileName(name string) error {
	if name == "" {
		return errors.New("ファイル名がありません")
	}
	if len(name) > maxFileNameLen {
		return fmt.Errorf("ファイル名が長すぎます(%dバイト以内にしてください)", maxFileNameLen)
	}
	// ディレクトリ区切りを含むものは一切受け付けない(basename のみ許可)。
	// Windows のブラウザが C:\Users\... のようなフルパスを送ってくる場合もあるので
	// バックスラッシュも見る。
	if strings.ContainsAny(name, `/\`) {
		return errors.New("ファイル名にディレクトリを含められません")
	}
	// 上の区切り文字チェックで staticDir の外へは出られないが、
	// 親ディレクトリを指す表記自体を残さない(多重の防御)。
	if strings.Contains(name, "..") {
		return errors.New("ファイル名に .. を含められません")
	}
	// 先頭の . は隠しファイル、先頭の - はコマンドのオプションと紛らわしい。
	if strings.HasPrefix(name, ".") || strings.HasPrefix(name, "-") {
		return errors.New("ファイル名を . や - で始められません")
	}
	for _, r := range name {
		if !isAllowedRune(r) {
			return fmt.Errorf("ファイル名に使えない文字 %q が含まれています(英数字と . _ - のみ)", r)
		}
	}
	if _, ok := allowedExts[strings.ToLower(filepath.Ext(name))]; !ok {
		return errors.New("拡張子は .png / .jpg / .jpeg のみです")
	}
	return nil
}

// isAllowedRune はファイル名に使ってよい文字か。
// 日本語やスペースを許すと、スプレッドシートへの書き写し・URLエンコード・
// サーバーのファイルシステムの3箇所で表記ゆれが起きるので英数字だけにする。
func isAllowedRune(r rune) bool {
	switch {
	case r >= 'a' && r <= 'z':
		return true
	case r >= 'A' && r <= 'Z':
		return true
	case r >= '0' && r <= '9':
		return true
	case r == '.' || r == '_' || r == '-':
		return true
	}
	return false
}

// checkContentMatchesExt は「拡張子が名乗っている種類」と「先頭512バイトから判定した
// 実際の種類」が一致するかを調べる。
//
// ★ 拡張子だけを信じて保存すると、evil.png という名前の中身がHTMLのファイルを置ける。
// それが /images/evil.png で配信されブラウザにHTMLとして解釈されると、
// このアプリと同一オリジンで任意のJavaScriptが動く =
// localStorage に入れた ADMIN_TOKEN が読まれる(§0)。
//
// head は validateFileName を通したファイルの先頭 sniffLen バイト(それ未満でもよい)。
func checkContentMatchesExt(name string, head []byte) error {
	want, ok := allowedExts[strings.ToLower(filepath.Ext(name))]
	if !ok {
		// validateFileName を先に通していれば起きない
		return errors.New("拡張子は .png / .jpg / .jpeg のみです")
	}
	if got := http.DetectContentType(head); got != want {
		return fmt.Errorf("拡張子は %s ですが、中身は %s ではありません(%s と判定されました)",
			strings.ToLower(filepath.Ext(name)), want, got)
	}
	return nil
}

// Save は src の中身を dir/name として保存する。
//
// 同名ファイルは上書きする。frontend/nginx.conf の location /images/ が
// 「画像はファイル名を変えずに差し替えることがある」ことを前提に長期キャッシュを
// 切っているので、上書き禁止にすると運用と矛盾する。
//
// 直接書かず、一時ファイルへ書き切ってから rename する。
// 直接書くと、途中で通信が切れたときに壊れた画像が正しい名前で残り、
// そのまま配信され続ける。rename なら「最後まで書けたもの」だけが置き換わる。
func Save(dir string, name string, src io.Reader) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("保存先ディレクトリを作れませんでした: %w", err)
	}
	// 一時ファイルは保存先と同じディレクトリに作る。
	// 別の場所(/tmp 等)だと rename がファイルシステムをまたいで失敗しうる。
	tmp, err := os.CreateTemp(dir, ".upload-*")
	if err != nil {
		return fmt.Errorf("一時ファイルを作れませんでした: %w", err)
	}
	tmpPath := tmp.Name()
	// 成功時は rename 済みで tmpPath はもう無いため、Remove の失敗は無視してよい。
	defer func() {
		tmp.Close()
		os.Remove(tmpPath)
	}()

	if _, err := io.Copy(tmp, src); err != nil {
		return fmt.Errorf("書き込みに失敗しました: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("書き込みを完了できませんでした: %w", err)
	}
	// CreateTemp は 0600 で作る。nginx / Gin から配信するので読める権限に直す。
	if err := os.Chmod(tmpPath, 0o644); err != nil {
		return fmt.Errorf("パーミッションを設定できませんでした: %w", err)
	}
	if err := os.Rename(tmpPath, filepath.Join(dir, name)); err != nil {
		return fmt.Errorf("保存できませんでした: %w", err)
	}
	return nil
}
