package event

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/naoto-anzai/quizApp/backend/internal/sse"
	"gorm.io/gorm"
)

// buildPayloads は同じ瞬間の state を、宛先ごとの JSON にして返す。
func buildPayloads(snap snapshot, joinURL string) (adminJSON, monitorJSON, phoneJSON []byte, err error) {
	vs := buildViewerState(snap.es, snap.q, snap.askedCount)

	adminJSON, err = json.Marshal(buildState(snap.es, snap.q, snap.askedCount))
	if err != nil {
		return nil, nil, nil, err
	}
	monitorJSON, err = json.Marshal(MonitorState{ViewerState: vs, JoinURL: joinURL})
	if err != nil {
		return nil, nil, nil, err
	}
	phoneJSON, err = json.Marshal(vs)
	if err != nil {
		return nil, nil, nil, err
	}
	return adminJSON, monitorJSON, phoneJSON, nil
}

// broadcastState は今の state を全宛先へ配る。
// 配信に失敗しても管理APIは失敗させない（記録だけ残す）。
// goroutine によって、並列で他のstate 書き換え系と順番が入れ替わりになったりすると、
// 前にしたはずの操作が、後にした操作の直後に実行されて操作結果が巻き戻る可能性がある
// mutex lock 機能を使って保護する
var broadcastMu sync.Mutex

func broadcastState(db *gorm.DB, joinURL string, b *sse.Broadcaster) {
	broadcastMu.Lock()
	defer broadcastMu.Unlock()
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
