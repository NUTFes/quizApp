package sse

import "sync"

type Hub struct{
	mu sync.Mutex					// 排他的制御
	clients map[chan []byte]struct{}// 値を使わない（マップのキーのみ）＝set 型に等しい
}

// 接続する箱を make して、ハブに追加し、この箱を渡す
func (h *Hub) Add() chan []byte{
	ch := make(chan []byte, 8) // バッファ(キューの箱を作る)
	h.mu.Lock()
	h.clients[ch] = struct{}{} // ハブに追加(値は使わずキーのみ使う)
	h.mu.Unlock()
	return ch 				   // ハブに追加した箱を渡す
}

// 接続を解除する
func (h *Hub) Remove(ch chan []byte){
	h.mu.Lock()
	delete(h.clients, ch) // ハブから切り離す
	h.mu.Unlock()
	close(ch)			  // 切り離した箱の接続を解除
}

// ブロードキャスト（配信）する
func (h *Hub) Broadcast(msg []byte) {
	h.mu.Lock()
	for ch := range h.clients {
		ch <- msg // メッセージを送る
	}
	defer h.mu.Unlock() // この関数の最後にロックを解除
}