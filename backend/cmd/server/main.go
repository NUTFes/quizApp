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
	"log"
	"os"

	"github.com/naoto-anzai/quizApp/backend/internal/admin"
	"github.com/naoto-anzai/quizApp/backend/internal/event"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"github.com/naoto-anzai/quizApp/backend/internal/sse"
)

func main() {
	adminToken := os.Getenv("ADMIN_TOKEN")
	if adminToken == "" {
		log.Fatal("ADMIN_TOKEN が設定されていません")
	}

	// DB接続を一度だけ行う
	db, err := platform.NewDB()
	if err != nil {
		log.Fatalf("DB接続が出来ませんでした: %v", err)
	}

	// 参加者向けのURLを取得
	joinURL := os.Getenv("JOIN_URL")
	if joinURL == "" {
		log.Fatal("JOIN_URL が設定されていません")
	}

	// ブロードキャストのためのハブの元を作る
	hub := sse.NewHub()

	r := platform.NewRouter(
		// 各機能の RegisterRoutes をここに1行ずつ足していく。
		admin.RegisterRoutes(adminToken),
		event.RegisterRoutes(db, adminToken, joinURL),
		sse.RegisterRoutes(hub),
	)

	addr := ":3000"
	log.Printf("backend listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
