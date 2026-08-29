package event

import (
	"encoding/json"
	"log"

	"github.com/naoto-anzai/quizApp/backend/internal/sse"
	"gorm.io/gorm"
)

// buildPayloads は同じ瞬間の state を、宛先ごとの JSON にして返す。
func buildPayloads(snap snapshot, joinURL string) (adminJSON, monitorJSON, phoneJSON []byte, err error) {
	// ★ モニタとスマホで作り分ける。1つ作って使い回してはいけない。
	//   早押しではスマホ向けだけ textSegments を空にする必要があり(§2.2 原則4)、
	//   使い回すと SSE 経由でだけ問題文がスマホに漏れる。
	//   HTTP(GET /api/state)は viewer.go 側で view ごとに作っている。
	monitorVS := buildViewerState(snap.es, snap.q, snap.askedCount, "monitor")
	phoneVS := buildViewerState(snap.es, snap.q, snap.askedCount, "phone")

	adminJSON, err = json.Marshal(buildState(snap.es, snap.q, snap.askedCount))
	if err != nil {
		return nil, nil, nil, err
	}
	monitorJSON, err = json.Marshal(MonitorState{ViewerState: monitorVS, JoinURL: joinURL})
	if err != nil {
		return nil, nil, nil, err
	}
	phoneJSON, err = json.Marshal(phoneVS)
	if err != nil {
		return nil, nil, nil, err
	}
	return adminJSON, monitorJSON, phoneJSON, nil
}

// broadcastState は今の state を全宛先へ配る。
// 配信に失敗しても管理APIは失敗させない（記録だけ残す）。
func broadcastState(db *gorm.DB, joinURL string, b *sse.Broadcaster) {
	snap, err := loadSnapshot(db)
	if err != nil {
		log.Printf("broadcast: snapshot failed: %v", err)
		return
	}
	a, m, p, err := buildPayloads(snap, joinURL)
	if err != nil {
		log.Printf("broadcast: marshal failed: %v", err)
		return
	}
	b.BroadcastAll(a, m, p)
}
