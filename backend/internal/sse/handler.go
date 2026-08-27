package sse

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
)

// registerEvents は SSE の疎通確認エンドポイント(既存実装の移植)。
// 本実装は internal/sse に移す予定なので、標準ライブラリのハンドラを
// gin.WrapF でそのまま包んで一時的にここに置いている。
func RegisterRoutes() platform.RegisterFunc{
	return func (r *gin.Engine) {
		r.GET("/api/events", handleEvents)
	}
}

// 接続したら挨拶を1回送り、以降15秒ごとにハートビートを流す。
// 15〜30秒ごとのハートビートは必須(本番のCloudflareが無通信約100秒で切るため)。
func handleEvents(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	fmt.Fprint(c.Writer, "event: hello\ndata: {\"message\":\"SSE接続できました\"}\n\n")
	c.Writer.Flush()

	<-c.Request.Context().Done() // 切断まではずっとここの行で待つ
}
