package sse

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
)

// registerEvents は SSE の疎通確認エンドポイント(既存実装の移植)。
// 本実装は internal/sse に移す予定なので、標準ライブラリのハンドラを
// gin.WrapF でそのまま包んで一時的にここに置いている。
func RegisterRoutes(b *Broadcaster) platform.RegisterFunc {
	return func(r *gin.Engine) {
		r.GET("/api/events", func(c *gin.Context) { handleEvents(c, b) })
	}
}

// 接続したら挨拶を1回送り、以降15秒ごとにハートビートを流す。
// 15〜30秒ごとのハートビートは必須(本番のCloudflareが無通信約100秒で切るため)。
func handleEvents(c *gin.Context, b *Broadcaster) {
	// ヘッダの前に検証
	hub := b.hubFor(c.Query("view"))
	if hub == nil {
			platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST",
					"view は monitor か phone を指定してください")
			return
	}
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	fmt.Fprint(c.Writer, "event: hello\ndata: {\"message\":\"SSE接続できました\"}\n\n")
	c.Writer.Flush()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop() // この関数（handleEvents）が終わるとき必ず呼ばれ、ticker を開放しないとリークするため .Stop()

	ch := hub.Add()
	defer hub.Remove(ch) // 切断時は必ず呼ぶ

	for {
		select {
		case <-c.Request.Context().Done(): // 切断したとき
			return
		case msg := <-ch:
			fmt.Fprintf(c.Writer, "event: state\ndata: %s\n\n", msg)
			c.Writer.Flush()
		case <-ticker.C: // ハートビートが来たら（15秒ごと）
			fmt.Fprint(c.Writer, "event: ping\ndata: {}\n\n")
			c.Writer.Flush()
		}
	}
}
