// POST /api/admin/videos のテスト。
// httptestでルータを直接叩くため、DBもコンテナも要らない。
package video

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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
	return r, filepath.Join(staticDir, "videos")
}

func uploadRequest(t *testing.T, token, fieldName, uploadedName string, content []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	if uploadedName != "" || fieldName != "" {
		part, err := w.CreateFormFile(fieldName, uploadedName)
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
	req := httptest.NewRequest(http.MethodPost, "/api/admin/videos", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return req
}

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

func TestPostVideoSuccessUsesFixedName(t *testing.T) {
	r, videosDir := newTestServer(t)

	rec := httptest.NewRecorder()
	// 元の名前や拡張子は使わず、中身を検査して固定名で保存する。
	r.ServeHTTP(rec, uploadRequest(t, testAdminToken, "file", "original-name.txt", mp4Bytes))

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var res uploadResult
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("レスポンスJSONを読めない: %v", err)
	}
	if res.VideoURL != "/videos/revival.mp4" {
		t.Errorf("videoUrl=%q, want /videos/revival.mp4", res.VideoURL)
	}
	got, err := os.ReadFile(filepath.Join(videosDir, fileName))
	if err != nil {
		t.Fatalf("動画が保存されていない: %v", err)
	}
	if !bytes.Equal(got, mp4Bytes) {
		t.Error("保存された動画の中身が違う")
	}
}

func TestPostVideoOverwrite(t *testing.T) {
	r, videosDir := newTestServer(t)
	updated := append(append([]byte{}, mp4Bytes...), []byte("updated")...)

	for _, content := range [][]byte{mp4Bytes, updated} {
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, uploadRequest(t, testAdminToken, "file", "any.mp4", content))
		if rec.Code != http.StatusOK {
			t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
		}
	}

	got, err := os.ReadFile(filepath.Join(videosDir, fileName))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, updated) {
		t.Error("再アップロードで上書きされていない")
	}
}

func TestPostVideoAuth(t *testing.T) {
	tests := []struct {
		name  string
		token string
	}{
		{"Authorization無し", ""},
		{"誤ったトークン", "wrong-token"},
		{"IMPORT_TOKEN", testImportToken},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, videosDir := newTestServer(t)
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, uploadRequest(t, tt.token, "file", "revival.mp4", mp4Bytes))

			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("status=%d, want 401 (body=%s)", rec.Code, rec.Body.String())
			}
			if code := errorCode(t, rec.Body); code != "UNAUTHORIZED" {
				t.Errorf("code=%q, want UNAUTHORIZED", code)
			}
			if _, err := os.Stat(filepath.Join(videosDir, fileName)); err == nil {
				t.Error("認証に失敗したのに動画が作られている")
			}
		})
	}
}

func TestPostVideoRejectsInvalidRequestAndContent(t *testing.T) {
	tests := []struct {
		name       string
		fieldName  string
		content    []byte
		wantStatus int
		wantCode   string
	}{
		{"fileフィールドが無い", "video", mp4Bytes, http.StatusBadRequest, "INVALID_REQUEST"},
		{"拡張子だけmp4で中身がHTML", "file", []byte("<!DOCTYPE html><html></html>"), http.StatusBadRequest, "INVALID_FILE_TYPE"},
		{"空ファイル", "file", nil, http.StatusBadRequest, "INVALID_FILE_TYPE"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, videosDir := newTestServer(t)
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, uploadRequest(t, testAdminToken, tt.fieldName, "revival.mp4", tt.content))

			if rec.Code != tt.wantStatus {
				t.Fatalf("status=%d, want %d (body=%s)", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if code := errorCode(t, rec.Body); code != tt.wantCode {
				t.Errorf("code=%q, want %q", code, tt.wantCode)
			}
			if _, err := os.Stat(filepath.Join(videosDir, fileName)); err == nil {
				t.Error("拒否した動画が保存されている")
			}
		})
	}
}

func TestPostVideoRejectsNonMultipart(t *testing.T) {
	r, _ := newTestServer(t)
	req := httptest.NewRequest(http.MethodPost, "/api/admin/videos", bytes.NewReader(mp4Bytes))
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Authorization", "Bearer "+testAdminToken)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d, want 400 (body=%s)", rec.Code, rec.Body.String())
	}
	if code := errorCode(t, rec.Body); code != "INVALID_REQUEST" {
		t.Errorf("code=%q, want INVALID_REQUEST", code)
	}
}
