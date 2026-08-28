package event

import "encoding/json"

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

