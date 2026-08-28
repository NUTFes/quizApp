// ルータの組み立て。
//
// 各機能(internal/question, internal/event, ...)は
//
//	func RegisterRoutes(r *gin.Engine)
//
// を生やし、このファイルの NewRouter に1行足して登録する。
//
// こうすると新しいエンドポイントを作るときにやることは
//  1. 自分のパッケージにハンドラを書く
//  2. ここに1行足す
//
// の2つだけで済み、複数人で作業してもこのファイルのコンフリクトは最小になる。
package platform

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RegisterFunc は各機能が生やすルート登録関数の形。
type RegisterFunc func(r *gin.Engine)

// NewRouter は Gin エンジンを組み立てて返す。
// 各機能のルート登録関数を可変長で受け取り、順に適用する。
func NewRouter(registers ...RegisterFunc) *gin.Engine {// gin.Default() は使わない。
	// 既定の Logger はクエリ文字列をそのままログに書くため、
	// SSE の管理者トークン(?token=)が平文で残る(→ Issue #64、API仕様書 §5)。
	r := gin.New()
	r.Use(gin.LoggerWithConfig(gin.LoggerConfig{SkipQueryString: true}))
	r.Use(gin.Recovery()) // ★ gin.Default() に入っていた。消してはいけない(下記)

	// 生存確認用。どの機能にも属さないのでここで直接定義する。
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// 問題・選択肢の画像を配信する(認証なし)。仕様書 §6。
	r.Static("/images", "./static/images")

	// 存在しないパスでも §0 の形でエラーを返す。
	// これが無いと Gin 標準の 404(text/plain)が返ってしまい、
	// フロントの「codeで分岐する」前提が壊れる。
	r.NoRoute(func(c *gin.Context) {
		RespondError(c, http.StatusNotFound, "NOT_FOUND", c.Request.URL.Path+" は存在しません")
	})

	// 各機能のルートを登録
	for _, register := range registers {
		register(r)
	}

	return r
}
