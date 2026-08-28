package sse

type Hub struct{
	clients map[chan []byte]struct{}// 値を使わない（マップのキーのみ）＝set 型に等しい
}

// 接続する箱を make して、ハブに追加し、この箱を渡す
func (h *Hub) Add() chan []byte{
	ch := make(chan []byte, 8) // バッファ(キューの箱を作る)
	h.clients[ch] = struct{}{} // ハブに追加(値は使わずキーのみ使う)
	return ch 				   // ハブに追加した箱を渡す
}

// 接続を解除する
func (h *Hub) Remove(ch chan []byte){
	delete(h.clients, ch) // ハブから切り離す
	close(ch)			  // 切り離した箱の接続を解除
}

// ブロードキャスト（配信）する
func (h *Hub) Broadcast(msg []byte) {
	for ch := range h.clients {
		ch <- msg // メッセージを送る
	}
}