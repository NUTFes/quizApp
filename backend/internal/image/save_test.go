// save.go の検証ロジックのテスト。HTTPもDBも使わない。
//
// 守りたいのは次の2つ:
//  1. staticDir の外へ書き込める名前を1つも通さないこと
//  2. 拡張子と中身が食い違うファイルを1つも通さないこと
package image

import (
	"bytes"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestValidateFileName(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
		why     string
	}{
		// --- 通すもの ---
		{"通常のPNG", "q5.png", false, "運用で一番使う形"},
		{"通常のJPG", "q5.jpg", false, ""},
		{"jpeg", "q5.jpeg", false, ""},
		{"アンダースコアとハイフン", "q5_choice-a.png", false, "区切りに使いたい記号は許可する"},
		{"数字始まり", "2026q5.png", false, ""},
		{"大文字の拡張子", "Q5.PNG", false, "スマホから出てくる名前を拒否しても混乱するだけ"},
		{"名前に複数のドット", "q5.v2.png", false, ".. でなければドットは通す"},

		// --- ディレクトリを含む(最重要) ---
		{"親ディレクトリ", "../q5.png", true, "staticDir の外へ書き込まれる"},
		{"深い親ディレクトリ", "../../etc/q5.png", true, ""},
		{"絶対パス", "/etc/q5.png", true, ""},
		{"サブディレクトリ", "sub/q5.png", true, "basename のみ許可"},
		{"末尾のスラッシュ", "q5.png/", true, ""},
		{"Windowsのフルパス", `C:\Users\admin\q5.png`, true, "バックスラッシュも区切りとして扱う"},
		{"バックスラッシュの親", `..\q5.png`, true, ""},
		{"区切り無しの..", "..q5.png", true, "区切りが無くても .. は残さない"},

		// --- 名前そのものが不正 ---
		{"空", "", true, ""},
		{"ドットのみ", ".", true, ""},
		{"親ディレクトリそのもの", "..", true, ""},
		{"隠しファイル", ".q5.png", true, "先頭のドットは隠しファイル"},
		{"ハイフン始まり", "-q5.png", true, "コマンドのオプションと紛らわしい"},
		{"長すぎる名前", strings.Repeat("a", maxFileNameLen) + ".png", true, ""},
		{"上限ちょうど", strings.Repeat("a", maxFileNameLen-4) + ".png", false, "境界は通る側"},

		// --- 使えない文字 ---
		{"スペース", "q 5.png", true, "URLエンコードで表記ゆれが起きる"},
		{"日本語", "問題5.png", true, ""},
		{"NULLバイト", "q5.png\x00", true, ""},
		{"改行", "q5\n.png", true, ""},
		{"クエリ文字", "q5.png?a=1", true, ""},
		{"パーセント", "q5%2e%2e.png", true, "エンコードで .. を持ち込ませない"},

		// --- 拡張子 ---
		{"拡張子なし", "q5", true, ""},
		{"gif", "q5.gif", true, "許可は png / jpg / jpeg のみ"},
		{"svg", "q5.svg", true, "SVGはHTML同様にスクリプトを埋め込める"},
		{"html", "q5.html", true, ""},
		{"二重拡張子(最後が不正)", "q5.png.html", true, "見るのは最後の拡張子"},
		{"二重拡張子(最後が正当)", "q5.html.png", false, "最後が .png なら中身の判定で弾く"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateFileName(tt.input)
			if tt.wantErr && err == nil {
				t.Errorf("validateFileName(%q) が通ってしまった。%s", tt.input, tt.why)
			}
			if !tt.wantErr && err != nil {
				t.Errorf("validateFileName(%q) が拒否された: %v", tt.input, err)
			}
		})
	}
}

// pngBytes / jpegBytes は http.DetectContentType が種類を見分けるのに使う先頭バイト列。
// 画像として正しいファイルである必要はない(判定は先頭だけを見るため)。
var (
	pngBytes  = []byte("\x89PNG\r\n\x1a\n" + strings.Repeat("\x00", 32))
	jpegBytes = []byte("\xff\xd8\xff\xe0" + strings.Repeat("\x00", 32))
	htmlBytes = []byte("<!DOCTYPE html><html><script>alert(1)</script></html>")
)

func TestCheckContentMatchesExt(t *testing.T) {
	tests := []struct {
		name     string
		fileName string
		head     []byte
		wantErr  bool
		why      string
	}{
		{"PNGの中身とpng", "q5.png", pngBytes, false, ""},
		{"JPEGの中身とjpg", "q5.jpg", jpegBytes, false, ""},
		{"JPEGの中身とjpeg", "q5.jpeg", jpegBytes, false, ""},
		{"大文字の拡張子", "Q5.PNG", pngBytes, false, ""},
		{"中身がHTMLでpng", "evil.png", htmlBytes, true, "同一オリジンでJSが動き ADMIN_TOKEN が読まれる"},
		{"中身がJPEGでpng", "q5.png", jpegBytes, true, "拡張子と中身は一致させる"},
		{"中身がPNGでjpg", "q5.jpg", pngBytes, true, ""},
		{"空のファイル", "q5.png", []byte{}, true, "0バイトは text/plain と判定される"},
		{"許可されない拡張子", "q5.gif", pngBytes, true, "validateFileName を通していれば来ないが念のため"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := checkContentMatchesExt(tt.fileName, tt.head)
			if tt.wantErr && err == nil {
				t.Errorf("checkContentMatchesExt(%q, ...) が通ってしまった。%s", tt.fileName, tt.why)
			}
			if !tt.wantErr && err != nil {
				t.Errorf("checkContentMatchesExt(%q, ...) が拒否された: %v", tt.fileName, err)
			}
		})
	}
}

func TestSave(t *testing.T) {
	// 保存先が無くても作られること・中身がそのまま書かれることを確認する
	dir := filepath.Join(t.TempDir(), "images")
	if err := Save(dir, "q5.png", bytes.NewReader(pngBytes)); err != nil {
		t.Fatalf("Save が失敗した: %v", err)
	}
	got, err := os.ReadFile(filepath.Join(dir, "q5.png"))
	if err != nil {
		t.Fatalf("保存されたファイルを読めない: %v", err)
	}
	if !bytes.Equal(got, pngBytes) {
		t.Errorf("中身が違う: %q", got)
	}
}

func TestSaveOverwrites(t *testing.T) {
	// 同名アップロードは上書きする(§3.6)。
	// nginx の location /images/ が「名前を変えずに差し替える」前提でキャッシュを
	// 切っているので、上書き禁止にすると運用と矛盾する。
	dir := t.TempDir()
	if err := Save(dir, "q5.png", bytes.NewReader(pngBytes)); err != nil {
		t.Fatalf("1回目の Save が失敗した: %v", err)
	}
	updated := append(append([]byte{}, pngBytes...), []byte("updated")...)
	if err := Save(dir, "q5.png", bytes.NewReader(updated)); err != nil {
		t.Fatalf("2回目の Save が失敗した: %v", err)
	}
	got, err := os.ReadFile(filepath.Join(dir, "q5.png"))
	if err != nil {
		t.Fatalf("保存されたファイルを読めない: %v", err)
	}
	if !bytes.Equal(got, updated) {
		t.Errorf("上書きされていない: %q", got)
	}

	// 一時ファイルが残っていないこと(残ると /images/ 配下にゴミが溜まる)
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		names := make([]string, 0, len(entries))
		for _, e := range entries {
			names = append(names, e.Name())
		}
		t.Errorf("保存先に余計なファイルが残っている: %v", names)
	}
}

func TestImageLimitReader(t *testing.T) {
	const limit = 1000
	tests := []struct {
		name    string
		size    int
		wantErr bool
	}{
		{"空", 0, false},
		{"上限より小さい", limit - 1, false},
		{"上限ちょうど", limit, false},
		{"上限を1バイト超える", limit + 1, true},
		{"上限を大きく超える", limit * 10, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			src := bytes.Repeat([]byte("a"), tt.size)
			got, err := io.ReadAll(newImageLimitReader(bytes.NewReader(src), limit))
			if tt.wantErr {
				if !errors.Is(err, errImageTooLarge) {
					t.Fatalf("err=%v, want errImageTooLarge", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("上限以内なのにエラーになった: %v", err)
			}
			if len(got) != tt.size {
				t.Errorf("読めたバイト数=%d, want %d(途中で切れている)", len(got), tt.size)
			}
		})
	}
}

func TestSaveTooLargeKeepsExisting(t *testing.T) {
	// 上限超えで失敗したとき、①途中まで書いた一時ファイルが残らない
	// ②同名の既存画像は元のまま、を確認する。
	// 当日、差し替えに失敗しても直前の画像は表示され続けてほしい。
	dir := t.TempDir()
	if err := Save(dir, "q5.png", bytes.NewReader(pngBytes)); err != nil {
		t.Fatalf("1回目の Save が失敗した: %v", err)
	}
	err := Save(dir, "q5.png", newImageLimitReader(bytes.NewReader(pngOfSize(2000)), 1000))
	if !errors.Is(err, errImageTooLarge) {
		t.Fatalf("err=%v, want errImageTooLarge", err)
	}

	got, err := os.ReadFile(filepath.Join(dir, "q5.png"))
	if err != nil {
		t.Fatalf("既存の画像が消えた: %v", err)
	}
	if !bytes.Equal(got, pngBytes) {
		t.Error("失敗したアップロードで既存の画像が書き換わった")
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		names := make([]string, 0, len(entries))
		for _, e := range entries {
			names = append(names, e.Name())
		}
		t.Errorf("保存先に余計なファイルが残っている: %v", names)
	}
}
