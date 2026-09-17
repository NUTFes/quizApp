// 敗者復活動画の検証と保存。
//
// このファイルは HTTP も DB も知らない。
// 「中身が本当にMP4か」「上限を超えていないか」「どう書き込むか」だけを扱う。
package video

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

const fileName = "revival.mp4"

// MaxVideoBytes は動画本体の上限(500MB)。ちょうど500MBは受け付け、
// 1バイトでも超えたら413にする。
const MaxVideoBytes = 500 * 1024 * 1024

// MaxRequestBytes はリクエスト全体(multipart の区切り・ヘッダ・ファイル名を含む)の上限。
//
// ★ MaxVideoBytes と分けている理由: http.MaxBytesReader が数えるのは動画だけでなく
// multipart の包み全体。同じ500MBにすると包みのぶん(数百バイト)だけ小さい動画しか
// 通らず、500MBちょうどに縮めた動画が413になる。
// 包みは数百バイトなので、画像投入と同じ64KBの余裕を持たせる。
//
// 本番は frontend/nginx.conf の動画投入専用 location でも上限を掛けるが、
// 開発ではバックエンドを直接叩く(nginxを経由しない)ためGo側にも上限が要る。
const MaxRequestBytes = MaxVideoBytes + 64<<10

// sniffLen は先頭の ftyp ボックスを調べるために読む長さ。
// 通常のボックスは16バイト、拡張サイズを使う場合は最低24バイト必要になる。
const sniffLen = 24

// checkMP4 は、ファイル先頭がMP4で使われる ftyp ボックスかを調べる。
// 拡張子やブラウザが申告するContent-Typeは偽装できるため、判定には使わない。
func checkMP4(head []byte) error {
	if len(head) < 16 || !bytes.Equal(head[4:8], []byte("ftyp")) {
		return errors.New("ファイル先頭にMP4のftypボックスがありません")
	}

	boxSize := binary.BigEndian.Uint32(head[:4])
	switch boxSize {
	case 0:
		// 0はファイル末尾まで続くボックスを表す。
		return nil
	case 1:
		// 1は後続8バイトで64bitのサイズを表す。
		if len(head) < 24 || binary.BigEndian.Uint64(head[8:16]) < 24 {
			return errors.New("MP4のftypボックスサイズが不正です")
		}
		return nil
	default:
		// ftypには major_brand と minor_version が必須なので最小16バイト。
		if boxSize < 16 {
			return errors.New("MP4のftypボックスサイズが不正です")
		}
		return nil
	}
}

// Save は src の中身を dir/revival.mp4 として保存する。
//
// 直接書かず、一時ファイルへ書き切ってからrenameする。直接書くと、通信切断や
// 上限超過で壊れた動画が revival.mp4 として残り、そのまま配信されてしまう。
func Save(dir string, src io.Reader) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("保存先ディレクトリを作れませんでした: %w", err)
	}
	tmp, err := os.CreateTemp(dir, ".upload-*")
	if err != nil {
		return fmt.Errorf("一時ファイルを作れませんでした: %w", err)
	}
	tmpPath := tmp.Name()
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
	if err := os.Chmod(tmpPath, 0o644); err != nil {
		return fmt.Errorf("パーミッションを設定できませんでした: %w", err)
	}
	if err := os.Rename(tmpPath, filepath.Join(dir, fileName)); err != nil {
		return fmt.Errorf("保存できませんでした: %w", err)
	}
	return nil
}

var errVideoTooLarge = errors.New("動画が上限を超えています")

// videoLimitReader は動画本体のバイト数だけを数え、limitを1バイトでも超えたら
// errVideoTooLargeを返すReader。io.LimitReaderでは上限超過と上限ちょうどを
// 区別できず、途中で切れた動画を正常保存してしまうため専用に持つ。
type videoLimitReader struct {
	r         io.Reader
	remaining int64
}

func newVideoLimitReader(r io.Reader, limit int64) *videoLimitReader {
	return &videoLimitReader{r: r, remaining: limit}
}

func (l *videoLimitReader) Read(p []byte) (int, error) {
	if l.remaining <= 0 {
		var probe [1]byte
		n, err := l.r.Read(probe[:])
		if n > 0 {
			return 0, errVideoTooLarge
		}
		return 0, err
	}
	if int64(len(p)) > l.remaining {
		p = p[:l.remaining]
	}
	n, err := l.r.Read(p)
	l.remaining -= int64(n)
	return n, err
}
