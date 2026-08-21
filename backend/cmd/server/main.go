// backend の最小サーバー(動作確認用)。
// まだ Gin も DB も使わず、標準ライブラリだけで動く。
// - GET /api/health : 生きているか確認するAPI
// - GET /api/events : SSE の疎通確認(このアプリの心臓部)
// 本物の実装(Gin + GORM + 各エンドポイント)は、WSL2で動くのを確認してから足す。
// backend のサーバー入口。
// ルータの組み立ては internal/platform/router.go に任せ、
// ここは「起動する」ことだけに責任を持つ。
package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/naoto-anzai/quizApp/backend/internal/platform"
)

func main() {
	r := platform.NewRouter(
		// 各機能の RegisterRoutes をここに1行ずつ足していく。
		// 例(STEP 6 以降): admin.RegisterRoutes,
		registerEvents,
	)

	addr := ":3000"
	log.Printf("backend listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}

// registerEvents は SSE の疎通確認エンドポイント(既存実装の移植)。
// 本実装は internal/sse に移す予定なので、標準ライブラリのハンドラを
// gin.WrapF でそのまま包んで一時的にここに置いている。
func registerEvents(r *gin.Engine) {
	r.GET("/api/events", gin.WrapF(handleEvents))
}

// 接続したら挨拶を1回送り、以降15秒ごとにハートビートを流す。
// 15〜30秒ごとのハートビートは必須(本番のCloudflareが無通信約100秒で切るため)。
func handleEvents(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	fmt.Fprint(w, "event: hello\ndata: {\"message\":\"SSE接続できました\"}\n\n")
	flusher.Flush()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			fmt.Fprint(w, ": ping\n\n")
			flusher.Flush()
		}
	}
}
