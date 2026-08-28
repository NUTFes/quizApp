package sse

type Broadcaster struct {
	admin   *Hub
	monitor *Hub
	phone   *Hub
}

func NewBroadcaster() *Broadcaster {
	return &Broadcaster{
		admin: NewHub(),
		monitor: NewHub(),
		phone: NewHub(),
	}
}

func (b *Broadcaster) BroadcastAll(adminJSON, monitorJSON, phoneJSON []byte) {
	b.admin.Broadcast(adminJSON)
	b.monitor.Broadcast(monitorJSON)
	b.phone.Broadcast(phoneJSON)
}

func (b *Broadcaster) hubFor(view string) *Hub{
	switch view {
	case "monitor":
		return b.monitor
	case "phone":
		return b.phone
	default:
		return nil
	}
}