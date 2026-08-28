type Broadcaster struct {
	admin *Hub
	monitor *Hub
	phone *Hub
}

func (b *Broadcaster) BroadcastAll(adminJSON, monitorJSON, phoneJSON []byte){
	b.admin.Broadcast(adminJSON)
	b.monitor.Broadcast(monitorJSON)
	b.phone.Broadcast(phoneJSON)
}