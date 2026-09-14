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
	"path/filepath"

	"github.com/gin-gonic/gin"
)

// StaticDir は画像などの静的ファイルの置き場所。
//
// ★ 環境変数で変えられるようにはしない。画像の「配信」(このファイル)・
// 「投入」(internal/image)・「問題投入時の存在チェック」(internal/question)の
// 3箇所が必ず同じ場所を指す必要があり、1箇所だけ別の値を読むと
// 「アップロードは 200 なのに /images/... が 404」になる(PR #113 のレビューで判明)。
// 仕様書にも別の場所を使う要件は無い。
//
// 作業ディレクトリからの相対パス。本番は docker-compose.prod.yml で
// ./backend/static をコンテナの /app/static にマウントしている。
const StaticDir = "./static"

// RegisterFunc は各機能が生やすルート登録関数の形。
type RegisterFunc func(r *gin.Engine)

// NewRouter は Gin エンジンを組み立てて返す。
// 各機能のルート登録関数を可変長で受け取り、順に適用する。
func NewRouter(registers ...RegisterFunc) *gin.Engine {
	// gin.Default() は使わない。既定の Logger はクエリ文字列をそのまま
	// ログに書くため、SSE の管理者トークン(?token=)が平文で残る
	// (→ Issue #64、API仕様書 §5)。
	r := gin.New()
	r.Use(gin.LoggerWithConfig(gin.LoggerConfig{SkipQueryString: true}))
	// ★ gin.Default() に入っていたもの。消すと panic 1回でプロセスごと落ち、
	//    会場全員のSSE接続が同時に切れる。
	r.Use(gin.Recovery())

	// 生存確認用。どの機能にも属さないのでここで直接定義する。
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// 問題・選択肢の画像を配信する(認証なし)。仕様書 §6。
	r.Static("/images", filepath.Join(StaticDir, "images"))

	// 敗者復活の動画を配信する(認証なし)。Issue #121。
	// 投入経路は無い(CTへ scp で置く運用)。配信の作りだけ /images と同一にする。
	r.Static("/videos", filepath.Join(StaticDir, "videos"))

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
