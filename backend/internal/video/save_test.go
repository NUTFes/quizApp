package video

import (
	"bytes"
	"encoding/binary"
	"errors"
	"io"
	"os"
	"path/filepath"
	"testing"
)

var mp4Bytes = func() []byte {
	b := make([]byte, 24)
	binary.BigEndian.PutUint32(b[:4], uint32(len(b)))
	copy(b[4:8], "ftyp")
	copy(b[8:12], "isom")
	copy(b[16:20], "isom")
	copy(b[20:24], "mp42")
	return b
}()

func TestCheckMP4(t *testing.T) {
	extended := make([]byte, 24)
	binary.BigEndian.PutUint32(extended[:4], 1)
	copy(extended[4:8], "ftyp")
	binary.BigEndian.PutUint64(extended[8:16], 24)
	copy(extended[16:20], "isom")
	copy(extended[20:24], []byte{0, 0, 0, 0})

	avif := append([]byte{}, mp4Bytes...)
	copy(avif[8:12], "avif")
	heic := append([]byte{}, mp4Bytes...)
	copy(heic[8:12], "heic")
	mov := append([]byte{}, mp4Bytes...)
	copy(mov[8:12], "qt  ")
	extendedAVIF := append([]byte{}, extended...)
	copy(extendedAVIF[16:20], "avif")

	tests := []struct {
		name    string
		head    []byte
		wantErr bool
	}{
		{"通常のftyp", mp4Bytes, false},
		{"末尾まで続くftyp", append([]byte{0, 0, 0, 0}, mp4Bytes[4:]...), false},
		{"64bitサイズのftyp", extended, false},
		{"AVIFのmajor brand", avif, true},
		{"HEICのmajor brand", heic, true},
		{"QuickTime MOVのmajor brand", mov, true},
		{"64bitサイズのAVIF major brand", extendedAVIF, true},
		{"HTML", []byte("<!DOCTYPE html><html></html>"), true},
		{"ftypが先頭ではない", append([]byte("01234567"), mp4Bytes...), true},
		{"短すぎる", []byte("....ftyp"), true},
		{"不正なボックスサイズ", append([]byte{0, 0, 0, 8}, mp4Bytes[4:]...), true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := checkMP4(tt.head)
			if tt.wantErr && err == nil {
				t.Error("不正なファイルがMP4として通った")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("正しいftypが拒否された: %v", err)
			}
		})
	}
}

func TestCheckMP4AcceptsCommonMajorBrands(t *testing.T) {
	brands := []string{
		"isom", "iso2", "iso3", "iso4", "iso5", "iso6",
		"mp41", "mp42", "avc1", "M4V ", "M4A ",
	}
	for _, brand := range brands {
		t.Run(brand, func(t *testing.T) {
			head := append([]byte{}, mp4Bytes...)
			copy(head[8:12], brand)
			if err := checkMP4(head); err != nil {
				t.Errorf("major brand %q が拒否された: %v", brand, err)
			}
		})
	}
}

func TestSaveUsesFixedNameAndOverwrites(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "videos")
	if err := Save(dir, bytes.NewReader(mp4Bytes)); err != nil {
		t.Fatalf("1回目のSaveが失敗した: %v", err)
	}
	updated := append(append([]byte{}, mp4Bytes...), []byte("updated")...)
	if err := Save(dir, bytes.NewReader(updated)); err != nil {
		t.Fatalf("2回目のSaveが失敗した: %v", err)
	}

	got, err := os.ReadFile(filepath.Join(dir, fileName))
	if err != nil {
		t.Fatalf("保存された動画を読めない: %v", err)
	}
	if !bytes.Equal(got, updated) {
		t.Error("固定名で上書きされていない")
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].Name() != fileName {
		t.Errorf("保存先の中身=%v, want [%s]", entries, fileName)
	}
}

func TestVideoLimitReader(t *testing.T) {
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
			got, err := io.ReadAll(newVideoLimitReader(bytes.NewReader(make([]byte, tt.size)), limit))
			if tt.wantErr {
				if !errors.Is(err, errVideoTooLarge) {
					t.Fatalf("err=%v, want errVideoTooLarge", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("上限以内なのにエラーになった: %v", err)
			}
			if len(got) != tt.size {
				t.Errorf("読めたバイト数=%d, want %d", len(got), tt.size)
			}
		})
	}
}

func TestSaveTooLargeKeepsExisting(t *testing.T) {
	dir := t.TempDir()
	if err := Save(dir, bytes.NewReader(mp4Bytes)); err != nil {
		t.Fatal(err)
	}
	err := Save(dir, newVideoLimitReader(bytes.NewReader(make([]byte, 2000)), 1000))
	if !errors.Is(err, errVideoTooLarge) {
		t.Fatalf("err=%v, want errVideoTooLarge", err)
	}

	got, err := os.ReadFile(filepath.Join(dir, fileName))
	if err != nil {
		t.Fatalf("既存動画が消えた: %v", err)
	}
	if !bytes.Equal(got, mp4Bytes) {
		t.Error("失敗したアップロードで既存動画が書き換わった")
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Errorf("保存先に一時ファイルが残っている: %v", entries)
	}
}

func TestVideoSizeConstants(t *testing.T) {
	if MaxVideoBytes != 500*1024*1024 {
		t.Errorf("MaxVideoBytes=%d", MaxVideoBytes)
	}
	if MaxRequestBytes <= MaxVideoBytes {
		t.Errorf("MaxRequestBytes=%d は動画本体の上限より大きくする必要がある", MaxRequestBytes)
	}
}
