// backend の最小サーバー(動作確認用)。
// まだ Gin も DB も使わず、標準ライブラリだけで動く。
// - GET /api/health : 生きているか確認するAPI
// - GET /api/events : SSE の疎通確認(このアプリの心臓部)
// 本物の実装(Gin + GORM + 各エンドポイント)は、WSL2で動くのを確認してから足す。
package main

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

func main() {
	mux := http.NewServeMux()

	// 生存確認用。{"status":"ok"} を返すだけ。
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"status":"ok"}`)
	})

	// SSE の疎通確認。接続したら挨拶を1回送り、以降15秒ごとにハートビートを流す。
	mux.HandleFunc("/api/events", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming unsupported", http.StatusInternalServerError)
			return
		}

		// 接続直後にあいさつを送る(本番では現在stateを送る場所)
		fmt.Fprint(w, "event: hello\ndata: {\"message\":\"SSE接続できました\"}\n\n")
		flusher.Flush()

		// 15〜30秒ごとのハートビートは必須(本番のCloudflareが無通信約100秒で切るため)
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-r.Context().Done(): // クライアントが切断したら終了
				return
			case <-ticker.C:
				fmt.Fprint(w, ": ping\n\n") // コメント行のハートビート
				flusher.Flush()
			}
		}
	})

	addr := ":3000"
	log.Printf("backend listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
