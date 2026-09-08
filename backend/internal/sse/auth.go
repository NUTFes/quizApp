package sse

import (
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
)

// adminTokenOK はクエリの token が管理者トークンと一致するか調べる。
//
// ★ 小文字始まり（非公開）にしてある。
// クエリ文字列での認証は /api/admin/events だけに許された例外なので、
// 他のパッケージから呼べないようにコンパイラに保証させている（→ API仕様書 §5）。
func adminTokenOK(given, adminToken string) bool {
	if given == "" || adminToken == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(given), []byte(adminToken)) == 1
}

func handleAdminEvents(c *gin.Context, b *Broadcaster, adminToken string) {
	// ★ SSE のヘッダを書く【前】に認証する
	if !adminTokenOK(c.Query("token"), adminToken) {
		platform.RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "トークンが違います")
		return
	}
	stream(c, b.admin)
}
