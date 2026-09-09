// POST /api/admin/images のテスト。
// httptest でルータを直接叩くだけなので、DBもコンテナも要らない。
//
// Issueの受け入れ条件のうち、手元で確認できるもの(401 / ../ の拒否 /
// 中身の判定 / 5MB / 上書き)をここで押さえる。
// nginx を経由する 413 の確認は本番構成が要るのでここでは扱わない。
package image

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
)

const (
	testAdminToken  = "test-admin-token"
	testImportToken = "test-import-token"
)

func newTestServer(t *testing.T) (*gin.Engine, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	staticDir := t.TempDir()
	r := platform.NewRouter(RegisterRoutes(testAdminToken, staticDir))
	return r, filepath.Join(staticDir, "images")
}

// uploadRequest は multipart/form-data の POST /api/admin/images を組み立てる。
// token が空文字列なら Authorization ヘッダを付けない。
func uploadRequest(t *testing.T, token, fieldName, fileName string, content []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	if fileName != "" || fieldName != "" {
		part, err := w.CreateFormFile(fieldName, fileName)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := part.Write(content); err != nil {
			t.Fatal(err)
		}
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/admin/images", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return req
}

// errorCode はレスポンスJSONから error.code を取り出す(§0のエラー形)。
func errorCode(t *testing.T, body io.Reader) string {
	t.Helper()
	var res struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.NewDecoder(body).Decode(&res); err != nil {
		t.Fatalf("エラーJSONを読めない: %v", err)
	}
	return res.Error.Code
}

func TestPostImageSuccess(t *testing.T) {
	r, imagesDir := newTestServer(t)

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, uploadRequest(t, testAdminToken, "file", "q5.png", pngBytes))

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var res uploadResult
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("レスポンスJSONを読めない: %v", err)
	}
	// スプレッドシートにそのまま書ける形で返す(§3.5.1)
	if res.ImageURL != "/images/q5.png" {
		t.Errorf("imageUrl=%q, want /images/q5.png", res.ImageURL)
	}
	if _, err := os.Stat(filepath.Join(imagesDir, "q5.png")); err != nil {
		t.Errorf("ファイルが保存されていない: %v", err)
	}
}

func TestPostImageOverwrite(t *testing.T) {
	r, imagesDir := newTestServer(t)

	updated := append(append([]byte{}, pngBytes...), []byte("v2")...)
	for _, content := range [][]byte{pngBytes, updated} {
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, uploadRequest(t, testAdminToken, "file", "q5.png", content))
		if rec.Code != http.StatusOK {
			t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
		}
	}
	got, err := os.ReadFile(filepath.Join(imagesDir, "q5.png"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, updated) {
		t.Error("同名アップロードで上書きされていない")
	}
}

func TestPostImageAuth(t *testing.T) {
	tests := []struct {
		name  string
		token string
	}{
		{"Authorization無し", ""},
		{"誤ったトークン", "wrong-token"},
		// ★ 画像投入は ADMIN_TOKEN のみ。GASは画像を送らないので通す理由が無い(§3.6)
		{"IMPORT_TOKEN", testImportToken},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, imagesDir := newTestServer(t)
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, uploadRequest(t, tt.token, "file", "q5.png", pngBytes))

			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("status=%d, want 401 (body=%s)", rec.Code, rec.Body.String())
			}
			if code := errorCode(t, rec.Body); code != "UNAUTHORIZED" {
				t.Errorf("code=%q, want UNAUTHORIZED", code)
			}
			if _, err := os.Stat(filepath.Join(imagesDir, "q5.png")); err == nil {
				t.Error("認証に失敗したのにファイルが作られている")
			}
		})
	}
}

func TestPostImageRejects(t *testing.T) {
	tests := []struct {
		name       string
		fieldName  string
		fileName   string
		content    []byte
		wantStatus int
		wantCode   string
	}{
		{"fileフィールドが無い", "image", "q5.png", pngBytes,
			http.StatusBadRequest, "INVALID_REQUEST"},
		{"ファイル名に../", "file", "../q5.png", pngBytes,
			http.StatusBadRequest, "INVALID_FILE_NAME"},
		{"許可されない拡張子", "file", "q5.svg", pngBytes,
			http.StatusBadRequest, "INVALID_FILE_NAME"},
		{"拡張子はpngだが中身がHTML", "file", "evil.png", htmlBytes,
			http.StatusBadRequest, "INVALID_FILE_TYPE"},
		{"5MB超", "file", "big.png", oversizedPNG(),
			http.StatusRequestEntityTooLarge, "FILE_TOO_LARGE"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, _ := newTestServer(t)
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, uploadRequest(t, testAdminToken, tt.fieldName, tt.fileName, tt.content))

			if rec.Code != tt.wantStatus {
				t.Fatalf("status=%d, want %d (body=%s)", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if code := errorCode(t, rec.Body); code != tt.wantCode {
				t.Errorf("code=%q, want %q", code, tt.wantCode)
			}
		})
	}
}

// TestPostImageTraversalWritesNothing は ../ を含む名前で staticDir の外に
// ファイルが作られないことを確認する。受け入れ条件のうち最も重要なもの。
func TestPostImageTraversal(t *testing.T) {
	gin.SetMode(gin.TestMode)
	root := t.TempDir()
	staticDir := filepath.Join(root, "static")
	r := platform.NewRouter(RegisterRoutes(testAdminToken, staticDir))

	names := []string{"../q5.png", "../../q5.png", "sub/q5.png", `..\q5.png`}
	for _, name := range names {
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, uploadRequest(t, testAdminToken, "file", name, pngBytes))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%q: status=%d, want 400", name, rec.Code)
		}
	}

	// staticDir の外(root 直下)に何も作られていないこと
	entries, err := os.ReadDir(root)
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range entries {
		t.Errorf("staticDir の外にファイルが作られた: %s", e.Name())
	}
}

// oversizedPNG は上限をわずかに超えるPNG(先頭だけ本物)を作る。
func oversizedPNG() []byte {
	return append(append([]byte{}, pngBytes...), []byte(strings.Repeat("a", MaxUploadBytes))...)
}
