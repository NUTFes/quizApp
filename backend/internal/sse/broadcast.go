package sse

type Broadcaster struct {
	admin   *Hub
	monitor *Hub
	phone   *Hub
}

func NewBroadcaster() *Broadcaster {
	admin := NewHub()
	monitor := NewHub()
	phone := NewHub()
	return &Broadcaster{
		admin,
		monitor,
		phone,
	}
}

func (b *Broadcaster) BroadcastAll(adminJSON, monitorJSON, phoneJSON []byte) {
	b.admin.Broadcast(adminJSON)
	b.monitor.Broadcast(monitorJSON)
	b.phone.Broadcast(phoneJSON)
}
