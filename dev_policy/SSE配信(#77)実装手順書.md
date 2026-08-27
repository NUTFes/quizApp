# SSE配信(#77) 実装手順書

Issue #77 担当者向け。**当日の心臓部**なので、動くものを一気に作らず、**毎ステップ `curl` で確認しながら**積み上げる。

> 前提: #76（進行制御API）がマージ済み。ブランチは `origin/main` から切る。

## この手順書の読み方

各 STEP は「**その時点で必ず動く**」ように区切ってある。STEP 3 まで書いたら 3 の確認をして、通ってから 4 に進むこと。全部書いてから動かすと、どこが悪いのか分からなくなる。

---

## そもそも SSE とは何か

サーバーが接続を**開いたまま**、テキストを少しずつ流し続けるだけの仕組み。WebSocket と違って**サーバー → クライアントの一方通行**で、中身はただの文字列。

流すフォーマットはこれだけ。

```
event: state
data: {"phase":"question",...}
              ← 空行が「1件おわり」の合図
```

- `data:` 行に改行を含めてはいけない（JSON は1行に収める）
- **空行が区切り**。忘れると、クライアントは次のイベントが来るまで待ち続ける
- `:` で始まる行はコメント（クライアントは無視する）

C で言えば「`printf` して `fflush` する」をずっと繰り返しているだけ。特別な API ではない。

### なぜ難しいか

難しいのは形式ではなく、**接続を持ち続けること**。

- 200人ぶんの接続が同時に開く。Go は**接続1本につき goroutine が1つ**立つ
- 誰かが電波の悪い場所へ歩いていくと、その1本が詰まる。**詰まった1本が他の199人を止めてはいけない**
- スマホを閉じた人の goroutine を片付けないと、溜まり続けてメモリを食う

このあとの設計は、全部この3つを避けるためにある。

---

## STEP 0: 現状の把握

### いま `/api/events` は「仮実装」で埋まっている

`backend/cmd/server/main.go` の末尾に `handleEvents` がある（#8 で置いた疎通確認用）。挨拶を1回送って、15秒ごとにコメントを流すだけのもの。

```go
func registerEvents(r *gin.Engine) {
	r.GET("/api/events", gin.WrapF(handleEvents))
}
```

**この登録を消さないと Gin が起動時に panic する。** 同じパスを2回登録できないため。STEP 1 で消す。

### state を組み立てる部品はもうある

| 関数 | 場所 | 返すもの |
| --- | --- | --- |
| `buildState` | `internal/event/state.go` | 管理者向け（正答つき） |
| `buildViewerState` | `internal/event/viewer.go` | 閲覧者向け（正答を抜いたもの） |

**この2つは書き直さない。** SSE で配信する JSON は `GET /api/state` が返すものと**同一スキーマ**（API仕様書 §5）なので、既存の関数をそのまま使う。ここを別実装にすると、片方だけ直してズレる。

---

## STEP 1: 1本の接続に、固定の文字列を流す

いきなり配信を作らない。**まず「繋がって、切れる」だけ**を作る。

`backend/internal/sse/` に新しいファイルを作り、仮実装を移植する。Gin の `c.Writer` は `http.Flusher` を満たしているので、`gin.WrapF` で包む必要はない。

```go
package sse

func handleEvents(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // nginx にバッファさせない保険

	fmt.Fprint(c.Writer, "event: hello\ndata: {}\n\n")
	c.Writer.Flush()

	<-c.Request.Context().Done() // 切断されるまでここで待つ
}
```

### `Flush()` を忘れると何も届かない

Go は書いた内容をバッファに溜める。`Flush()` は「いま溜まっているぶんを今すぐ送れ」という指示。**SSE では1件書くたびに必ず呼ぶ。** これを忘れると「ローカルでは動くのに本番で画面が切り替わらない」の典型パターンになる。

### `c.Request.Context().Done()` が「切断待ち」

`Done()` は**チャネル**を返す。クライアントが切断すると、Go がそのチャネルを閉じる。`<-` で受け取ろうとすると、閉じられるまでブロックする。

C で言えば「イベントを待つ `select()`」に近い。ここで待っている間、この goroutine は CPU を使わない。

### ルート登録

`main.go` の `registerEvents` と `handleEvents` を**削除**し、`sse.RegisterRoutes()` を `platform.NewRouter(...)` に足す。

### ✅ 確認

```bash
mise run up
curl -N "http://localhost:3000/api/events?view=monitor"
```

- `event: hello` が届く（`-N` はバッファしない指定。忘れると何も出ない）
- `Ctrl+C` で抜ける
- **`docker compose logs backend` にエラーが出ていない**

---

## STEP 2: ping を定期的に流す

Cloudflare が**無通信約100秒で切る**ので、放っておくと当日の本番だけ全員切断される。

```go
ticker := time.NewTicker(15 * time.Second)
defer ticker.Stop()

for {
	select {
	case <-c.Request.Context().Done():
		return
	case <-ticker.C:
		fmt.Fprint(c.Writer, "event: ping\ndata: {}\n\n")
		c.Writer.Flush()
	}
}
```

`select` は「複数のチャネルのうち、先に来た方を処理する」構文。ここでは「切断」と「15秒経過」を同時に待っている。

### 間隔は 15 秒にする

API仕様書 §5 の表は「30秒ごと」だが、Issue の注意書きは「15〜30秒ごと」。**15秒を推奨する。** 100秒の制限に対して、1回落としても間に合う余裕が要るため。

### `defer ticker.Stop()` は必須

`defer` は「この関数を抜けるときに必ず実行する」指定。C の `goto cleanup` を自動でやってくれるもの。忘れるとタイマーが回り続けてリークする。

### 仮実装との違い

仮実装は `: ping\n\n`（**コメント**）を送っていた。接続維持だけなら十分だが、仕様は `event: ping` / `data: {}` なので**イベントとして送る**。フロントが「pingを受け取った＝生きている」を判定できるようにするため。

### ✅ 確認

`curl -N` したまま放置して、15秒ごとに `event: ping` が出ること。

---

## STEP 3: 複数の接続をまとめる「ハブ」を作る

ここが本体。**いま作るのは配信の仕組みだけで、中身はまだ固定文字列でよい。**

### 考え方

接続ごとに**郵便受け（チャネル）**を1つ用意し、ハブがその一覧を持つ。配信するときは、一覧を回して全部の郵便受けに投げ込む。

```
              ┌─ 郵便受けA ─→ goroutine A ─→ 端末A
配信 ─→ ハブ ─┼─ 郵便受けB ─→ goroutine B ─→ 端末B
              └─ 郵便受けC ─→ goroutine C ─→ 端末C
```

**大事なのは「投げ込むだけで、届くのを待たない」こと。** 端末Bが遅くても、ハブはBの郵便受けに置いて次へ行く。

```go
type Hub struct {
	mu      sync.Mutex
	clients map[chan []byte]struct{}
}

func (h *Hub) Add() chan []byte {
	ch := make(chan []byte, 8) // ★ バッファ付き
	h.mu.Lock()
	h.clients[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *Hub) Remove(ch chan []byte) {
	h.mu.Lock()
	delete(h.clients, ch)
	h.mu.Unlock()
	close(ch)
}

func (h *Hub) Broadcast(msg []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for ch := range h.clients {
		select {
		case ch <- msg:
		default: // ★ 郵便受けが満杯なら捨てる
		}
	}
}
```

### ★ ここが一番重要な2行

**`make(chan []byte, 8)` のバッファ**と、**`select` の `default`**。

バッファ無しのチャネルに送ると、受け取る人が現れるまで**送る側がブロックする**。つまり電波の悪い1台が、`Broadcast` のループを止め、**残り199人への配信も止まる**。

`default` を付けると「送れなければ何もしない」になる。8件も溜まっている端末は明らかに追いつけていないので、**捨ててよい**。SSE は state を丸ごと送る設計（差分ではない）なので、途中を落としても次の1件で正しい画面に戻る。**ここが差分配信でなく全体配信にしてある理由**でもある。

### `sync.Mutex` は何をしているか

`clients` は複数の goroutine から同時に触られる（新しい接続の追加、切断による削除、配信のループ）。Go の map は**同時アクセスで壊れる**（実行時に `concurrent map writes` で落ちる）。`Lock()` / `Unlock()` で「同時に1人だけ」を保証する。

C の pthread_mutex と同じ。**`defer h.mu.Unlock()` を使うと解放し忘れが起きない。**

### ハンドラ側

```go
ch := hub.Add()
defer hub.Remove(ch) // ★ 切断時に必ず片付ける

for {
	select {
	case <-c.Request.Context().Done():
		return
	case msg := <-ch:
		fmt.Fprintf(c.Writer, "event: state\ndata: %s\n\n", msg)
		c.Writer.Flush()
	case <-ticker.C:
		// ping
	}
}
```

**`c.Writer` に書いてよいのは、この goroutine だけ。** 他の goroutine から直接書くと出力が混ざる。だから「ハブはチャネルに置くだけ、書くのは接続担当の goroutine」という形にしている。

### ✅ 確認

デバッグ用に、一時的に `/api/health` あたりで `hub.Broadcast([]byte(`{"test":1}`))` を呼ぶようにして、

```bash
# 3つの端末で受信
curl -N "http://localhost:3000/api/events?view=monitor"   # ×3

curl -s localhost:3000/api/health   # 別の端末で叩く
```

- [ ] 3つ全部に届く
- [ ] 1つを `Ctrl+C` で切っても、残り2つに届き続ける

**確認できたらデバッグ用の呼び出しは消す。**

---

## STEP 4: 宛先ごとに中身を変える

3種類の宛先があり、**送る JSON が違う**。

| 宛先 | 中身 |
| --- | --- |
| 管理者 | `State`（正答・難易度つき） |
| モニタ | `MonitorState`（`ViewerState` + `joinUrl`） |
| スマホ | `ViewerState` |

### ハブを3つ持つ

一番単純なのは、`Hub` を3つ用意すること。

```go
type Broadcaster struct {
	admin   *Hub
	monitor *Hub
	phone   *Hub
}
```

接続時に `view` を見て、どのハブに登録するか決める。配信時は**3種類の JSON をそれぞれ1回だけ作って**、対応するハブに流す。

```go
func (b *Broadcaster) BroadcastAll(adminJSON, monitorJSON, phoneJSON []byte) {
	b.admin.Broadcast(adminJSON)
	b.monitor.Broadcast(monitorJSON)
	b.phone.Broadcast(phoneJSON)
}
```

**接続ごとに JSON を作らないこと。** 200人ぶん `json.Marshal` を回すと、状態が変わるたびに200回シリアライズすることになる。3回で済む。

### ⚠️ 正答は「サーバーで抜く」

`buildViewerState` が既に `correctChoiceId` と `explanation` を落としている。**送ってからフロントで隠すのでは、開発者ツールで丸見えになる。**

確認では「`null` が入っている」ではなく「**キーごと存在しない**」ことを見ること（API仕様書 §2.2）。

### ✅ 確認

```bash
curl -N "http://localhost:3000/api/events?view=phone"    # 端末1
curl -N "http://localhost:3000/api/events?view=monitor"  # 端末2
```

`view` を付けない場合は `phone` 扱い（`getViewerState` の既定値と揃える）。不正な `view` は 400 を返す。

---

## STEP 5: 状態が変わったら配信する

### 5a. まず「HTTP と無関係に state を作る関数」を切り出す

ここが**この Issue で一番の設計判断**になる。

いまの `getState` / `getViewerState` は `*gin.Context` を受け取り、エラー時は `RespondError` で HTTP レスポンスを返す。**配信にはリクエストが無い**ので、そのままでは呼べない。

なので、**DB から読んで組み立てるところだけ**を、gin に依存しない関数として抜き出す。

```go
// internal/event/load.go（新規）
func LoadStates(db *gorm.DB, joinURL string) (State, ViewerState, MonitorState, error)
```

- `readEventState` から `c *gin.Context` を外し、`error` を返す形に変える
- `getState` / `getViewerState` は、この関数を呼んで**エラーを HTTP に翻訳するだけ**にする

こうすると「DB から state を作る」ロジックが1箇所になり、**API と SSE で必ず同じものが出る**。分けて書くと、片方だけ直してズレる。

> `getState` / `getViewerState` の**外から見た振る舞いは変えない**こと。#91（GET /api/state）のテストがそのまま通るはず。

### 5b. 4つのハンドラから呼ぶ

`internal/event/progress.go` の4つは、いずれも DB 更新のあと `getState(c, db)` で終わっている。

```go
showQuestion / advanceText / showAnswer / reset
```

**トランザクションが成功したあと**に配信を呼ぶ。

```go
if err != nil {
	return // ← 失敗しているので配信しない
}

broadcaster.PublishFromDB(db, joinURL) // ★ ここ

getState(c, db)
```

### ⚠️ トランザクションの中で配信しない

まだコミットされていない状態を配信してしまう。ロールバックされたら、**サーバーの状態と全端末の画面がズレたまま**になる。当日これが起きると、司会と画面が食い違って復旧できない。

**必ず「DBが確定してから配信」の順番にする。**

### 配線

`Broadcaster` は `main.go` で1つだけ作り、`event.RegisterRoutes` と `sse.RegisterRoutes` の**両方に同じものを渡す**。別々に作ると、配信する側と受け取る側が別のハブを見ることになり、**何も届かないのに誰もエラーを出さない**という一番デバッグしづらい状態になる。

### ✅ 確認

```bash
curl -N "http://localhost:3000/api/events?view=monitor"   # 受信して待つ

curl -s -H "Authorization: Bearer dev-admin-token" \
  -d '{"questionId":1}' localhost:3000/api/admin/show-question
```

- [ ] 受信側に `event: state` が届く
- [ ] スマホ／モニタ向けに `correctChoiceId` と `explanation` の**キーが無い**
- [ ] `advance-text` / `show-answer` / `reset` でも届く

---

## STEP 6: 管理者チャンネルの認証

`GET /api/admin/events?token=<ADMIN_TOKEN>` だけ、**クエリ**でトークンを受け取る。ブラウザの `EventSource` が任意のヘッダを付けられないため。

`platform.RequireToken` は `Authorization` ヘッダを見るので**使えない**。このエンドポイント専用に書く。

```go
token := c.Query("token")
if subtle.ConstantTimeCompare([]byte(token), []byte(adminToken)) != 1 {
	platform.RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "トークンが違います")
	return
}
```

### ⚠️ 3つの注意

**① `==` で比較しない。** `subtle.ConstantTimeCompare` を使う。文字列比較は「何文字目で違ったか」が処理時間に出るため、理屈の上では1文字ずつ当てられる。`platform/auth.go` が既にこの形なので合わせる。

**② 401 は `text/event-stream` ヘッダを付ける前に返す。** 順番を逆にすると、エラー JSON が SSE ストリームとして解釈される。

**③ 他のエンドポイントでクエリのトークンを受け付けない。** #10 で塞いである。ここだけの例外。

### ⚠️ トークンをログに出さない

```go
log.Printf("token=%s", token)  // ← 絶対にやらない
log.Printf("len=%d", len(token))  // ← デバッグするならこちら
```

このリポジトリは public。SSE はトークンが URL に載るぶん、**アクセスログ・ブラウザ履歴・画面共有から漏れる前提**で運用する（本番用と開発用を分け、当日終了後に捨てる）。

### ✅ 確認

```bash
curl -i "http://localhost:3000/api/admin/events?token=wrong"        # 401
curl -N "http://localhost:3000/api/admin/events?token=dev-admin-token"  # 繋がる
```

---

## STEP 7: 200人を捌けるか確認する

### goroutine が残っていないか

接続を50本開いて全部切り、**goroutine 数が元に戻る**ことを見る。戻らなければ `Remove` が呼ばれていない（`defer` の付け忘れ、または `return` していない経路がある）。

```bash
for i in $(seq 1 50); do curl -N -s "http://localhost:3000/api/events?view=phone" & done
sleep 5
kill %1 %2 ...   # あるいは pkill curl
```

`net/http/pprof` を一時的に有効にして `/debug/pprof/goroutine?debug=1` を見るのが確実。**確認が済んだら必ず外すこと**（public なリポジトリで、本番に pprof を晒さない）。

### 本番の設定は既にできている

- `docker-compose.prod.yml`: `nofile` を 65535 に引き上げ済み（既定の1024だと、200接続 ×2本の fd で詰まる）
- `frontend/nginx.conf`: `proxy_buffering off` / `proxy_read_timeout 3600s` 設定済み

**この2つは触らなくてよい。**

---

## 最後のチェックリスト（Issue #77 ④）

- [ ] 受信側に `event: state` が届く
- [ ] モニタ／スマホ向けに `correctChoiceId` と `explanation` の**キーが存在しない**
- [ ] 30秒放置で `ping` が届く
- [ ] `/api/admin/events` はトークン不一致で **401**
- [ ] 3端末を同時接続して、全部に同じ `state` が届く
- [ ] 1端末を切断しても、残りに配信が続く

そのあと `mise run fix` と `mise run lint` を通す。

---

## つまずいたときの見分け方

| 症状 | 疑うところ |
| --- | --- |
| `curl` に何も出ない | `-N` を付けたか / `Flush()` を呼んでいるか |
| 起動時に panic | `/api/events` の二重登録（`main.go` の仮実装が残っている） |
| 誰にも届かない | `Broadcaster` を2つ作っていないか（配信側と受信側で別インスタンス） |
| 1人切断すると全員止まる | チャネルにバッファが無い / `select` の `default` が無い |
| `concurrent map writes` で落ちる | `sync.Mutex` の掛け忘れ |
| 100秒で切れる（本番だけ） | ping が飛んでいない |
| 正答が見えてしまう | `buildState` を閲覧者に送っている（`buildViewerState` が正しい） |
