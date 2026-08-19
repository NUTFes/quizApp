# API・fetch入門 — サーバーと話すために必要な知識だけ

**「HTTPを網羅的に学ぶ」ためのドキュメントではない。** このクイズアプリの `src/lib/api.ts` を**自分の手で書くために必要な知識だけ**を、実装する順に並べたもの。

- データの契約(**正はこちら**) → [`../実装要件/API仕様書.md`](../実装要件/API仕様書.md)
- 型の定義 → [`React・TypeScript入門.md`](./React・TypeScript入門.md) §1
- 作る順番 → `dev_policy/フロントエンドの進め方.md` STEP2

> **このドキュメントは「解説」で、「正」ではない。** 値や仕様が食い違っていたら **`API仕様書.md` が正しい。**

---

## 0. そもそも何をしているのか

フロント(ブラウザ)とバック(サーバー)は、**別のコンピュータで動く別のプログラム**。直接は関数を呼び合えない。

そこで「**手紙を送って、返事をもらう**」という形で会話する。この手紙のやりとりの決まりが **HTTP**、決まりに沿って用意された窓口が **API** と呼ばれる。

```
ブラウザ                             サーバー
   │  ①「問題5を出して」と手紙を送る      │
   │ ──────────────────────────────────▶ │
   │                                     │ ② DBを書き換える
   │  ③「できました。今の状態はこれです」   │
   │ ◀────────────────────────────────── │
```

**このアプリでは、手紙の中身はすべて JSON。** 送る内容も返る内容も `API仕様書.md` に全部書いてある。

---

## 1. 手紙の4要素

送る手紙は、必ずこの4つでできている。**`fetch` を書くとは、この4つを埋めること。**

| 要素 | 意味 | このアプリでの例 |
| --- | --- | --- |
| **メソッド** | 何をしたいか | `GET` / `POST` / `PUT` |
| **パス** | どの窓口か | `/api/admin/show-question` |
| **ヘッダ** | 付箋(補足情報) | `Authorization: Bearer …` |
| **ボディ** | 本文(送るデータ) | `{"questionId": 5}` |

### メソッドの使い分け

| メソッド | 意味 | ボディ |
| --- | --- | --- |
| `GET` | **取ってくる**(何も変えない) | 付けない |
| `POST` | **何かをさせる**(状態が変わる) | 付ける |
| `PUT` | **まるごと置き換える** | 付ける |

厳密な使い分けの議論はあるが、**このアプリでは仕様書に書いてあるとおりに使えばよい。** 迷う場面は無い。

> **`GET` にボディは付けられない。** 情報を渡したいときは `?view=monitor` のように**URLの後ろに付ける**(クエリパラメータ)。`/api/state?view=monitor` がその形。

---

## 2. 返事の見方(ステータスコード)

返事には必ず**3桁の番号**が付いてくる。これで成功・失敗が分かる。

| 番号 | 意味 | このアプリで出る場面 |
| --- | --- | --- |
| **200** | 成功 | 正常系すべて |
| **400** | **送った内容がおかしい** | `timeLimitSec` が範囲外、`to` が変な値 |
| **401** | **認証が通らない** | トークンが無い/違う |
| **404** | **そんなものは無い** | 存在しない `questionId` |
| **409** | **今はその操作ができない** | `waiting` 中に「次を表示」を押した |
| **500** | サーバー側が壊れた | バグ |

**400番台は「こちらが悪い」、500番台は「向こうが悪い」** と覚えるとよい。

### エラーの中身は全API共通

```json
{ "error": { "code": "QUESTION_NOT_FOUND", "message": "questionId=99 は存在しません" } }
```

`API仕様書.md` §0 のルール:

- **`code` は機械用。フロントは `code` で分岐する**
- **`message` は開発者向け。画面に出さない**(バックが予告なく変えてよいことになっている)

ユーザーに見せる日本語は**フロント側で持つ**。

```tsx
if (e.code === 'QUESTION_NOT_FOUND') alert('その問題は存在しません')
```

---

## 3. `fetch` — 手紙を出す道具

ブラウザに最初から入っている機能。ライブラリは要らない。

```ts
const res = await fetch('http://localhost:3000/api/admin/show-question', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer xxxxx',
  },
  body: JSON.stringify({ questionId: 5 }),
})
```

第1引数がURL、第2引数が §1 の残り3要素。**そのままの対応**になっている。

### ⚠️ 落とし穴① `fetch` は失敗しても例外を投げない

**ここが全員つまずくところ。**

```ts
const res = await fetch('/api/admin/show-question')  // サーバーが 404 を返した
// ↑ ここで止まらない。処理は普通に続く
```

`fetch` にとって「404 が返ってきた」は**成功**。手紙は届いて返事も来たのだから、通信としては成功している、という理屈。

**自分で `res.ok` を見る必要がある。**

```ts
if (!res.ok) {
  // 400〜500番台。ここでエラー処理をする
}
```

`res.ok` は **200番台なら `true`**、それ以外は `false`。

> **これを忘れると、エラーなのに成功として先に進む。** 当日「問題が存在しないのに次に進んでしまった」という壊れ方をするので、必ず書く。

### ⚠️ 落とし穴② JSONは2段階

```ts
const res = await fetch(...)        // ← ①返事のヘッダが届いた
const data = await res.json()       // ← ②本文を読んでJSONに変換した
```

`await` が2回要る。`res` の中身はまだ JSON ではない。

### ⚠️ 落とし穴③ 送るときは自分で文字列にする

```ts
body: JSON.stringify({ questionId: 5 })   // ✅
body: { questionId: 5 }                    // ❌ オブジェクトは送れない
```

`Content-Type: application/json` も**自分で付ける**。

---

## 4. `async` / `await` と `throw`

### `await` は「返事が来るまで待つ」

通信には時間がかかる。`await` を付けると、返事が届くまでその行で待ってくれる。

`await` を使う関数には `async` を付ける、という決まりがある。

```ts
async function f() {
  const res = await fetch(...)
}
```

### `throw` は「失敗しました」と伝える方法

関数の終わり方は2種類ある。**非同期とは関係ない、普通の機能。**

| | 意味 | 受け取り方 |
| --- | --- | --- |
| `return x` | 正常に終わった。結果は `x` | 変数に入る |
| `throw e` | **失敗した。理由は `e`** | `try` / `catch` で捕まえる |

`async` 関数の中では、この2つが Promise の `resolve` / `reject` に自動変換される。

```ts
async function f() {
  return 1           // → Promise が 1 で resolve される
  throw new Error()  // → Promise が reject される
}
```

**だから `resolve` / `reject` を自分で書く必要はない。** `new Promise(...)` を `async` 関数の中で書くのは、よく知られたアンチパターン。

### なぜエラーを `return` しないのか

```ts
return { ok: false, code: '...' }   // この設計も可能ではある
```

しかしこれだと、**呼ぶ側が毎回チェックしないといけない**。書き忘れると、失敗したのに成功として進む。

`throw` なら書き忘れた場合はその場で止まるし、**呼び出し元へ自動で伝播する**(途中の関数が何もしなくても、一番外側の `catch` まで届く)。

---

## 5. このアプリのAPI 10本

`API仕様書.md` §2〜§4 の全部。**これが `src/lib/api.ts` に書く関数の一覧**になる。

| 関数 | メソッド | パス | 認証 | 返るもの |
| --- | --- | --- | --- | --- |
| `getState` | GET | `/api/state?view=` | — | `MonitorState` / `ViewerState` |
| `getAdminState` | GET | `/api/admin/state` | 要 | `AdminState` |
| `showQuestion` | POST | `/api/admin/show-question` | 要 | `AdminState` |
| `advanceText` | POST | `/api/admin/advance-text` | 要 | `AdminState` |
| `showAnswer` | POST | `/api/admin/show-answer` | 要 | `AdminState` |
| `reset` | POST | `/api/admin/reset` | 要 | `AdminState` |
| `putQuestions` | PUT | `/api/admin/questions` | 要 | 投入結果 |
| `getQuestions` | GET | `/api/admin/questions` | 要 | 一覧 |
| `getQuestion` | GET | `/api/admin/questions/:id` | 要 | `Question` |
| `verify` | GET | `/api/admin/verify` | 要 | `{ ok: true }` |

> **§3 の5本は、成功時すべて「更新後の `AdminState`」を返す**(§3 冒頭)。個別の戻り値の形を覚える必要がない、という設計になっている。

### 個別の説明

#### `getState(view)` — 閲覧者向けの現在の状態

モニタ・スマホが表示に使う。**唯一、認証が要らない**API。

```ts
export const getState = (view: 'monitor' | 'phone') =>
  request<MonitorState>(`/api/state?view=${view}`)
```

`view` で中身が変わる(モニタには `joinUrl` が付く)。ここに `Authorization` を付けてはいけない。

#### `getAdminState()` — 管理者向けの現在の状態

`correctChoiceId` を含むフル形が返る。**プレビュー表示に使う。**

#### `showQuestion(questionId, timeLimitSec?)` — 問題を出す

一番よく押されるボタン。`timeLimitSec` は**任意**で、省略するとサーバーが30秒を適用する(§3.1)。

```ts
export const showQuestion = (questionId: number, timeLimitSec?: number) =>
  request<AdminState>('/api/admin/show-question', {
    method: 'POST',
    body: { questionId, ...(timeLimitSec !== undefined && { timeLimitSec }) },
    auth: true,
  })
```

`...(x !== undefined && { x })` は「値があるときだけキーを足す」書き方。`timeLimitSec: undefined` を送らないためのもの。

| エラー | code |
| --- | --- |
| 404 | `QUESTION_NOT_FOUND` |
| 400 | `INVALID_REQUEST`(秒数が5〜120の外) |

**連打しても壊れない**(同じ問題ならやり直しになるだけ)。裏方が焦って2回押す前提の設計。

#### `advanceText()` — 問題文を1つ進める

ボディ不要。

| エラー | code |
| --- | --- |
| 409 | `INVALID_PHASE`(`question` 以外で押した) |

全部表示済みで押しても**エラーにならず200**(§3.2)。

#### `showAnswer()` — 正答を出す

ボディ不要。**このアプリで一番事故ってはいけない操作**なので、画面側で確認ポップアップを1回挟む(`画面・要件.md` §6)。

#### `reset(to?)` — 進行を戻す/終わらせる

```ts
export const reset = (to: 'waiting' | 'finished' = 'waiting') =>
  request<AdminState>('/api/admin/reset', { method: 'POST', body: { to }, auth: true })
```

**全問題の `asked` が `false` に戻る**(§3.4)。つまり `askedCount` が `0` になる。

#### `putQuestions(questions)` — 問題データを全置換

通常はGASが叩く。管理者画面からは「貼り付け投入」の保険として使う(§3.5.5)。

**エラーが特殊**で、複数件まとめて `details` 配列に入って返る。

```json
{ "error": { "code": "SYNC_VALIDATION_ERROR", "message": "2件の問題が不正です",
  "details": [ { "sourceRow": 5, "reason": "…" } ] } }
```

画面には**行番号つきで全件表示**する。1件ずつ直して再送、を避けるための設計。

#### `getQuestions()` — 問題一覧

管理者画面の問題リスト用。**返るのは `Question` そのものではない**ことに注意(§4.1)。

```json
{ "questions": [
  { "id": 5, "number": 12, "type": "four_choice", "difficulty": "hard",
    "textPreview": "…", "hasImage": true, "asked": false }
] }
```

`textSegments` ではなく結合済みの `textPreview`、画像は有無だけの `hasImage`。**一覧表示に必要な分だけに削られた別の形**なので、専用の型が要る。

#### `getQuestion(id)` — 1問の詳細

出題前の内容確認用。`correctChoiceId` `explanation` を含むフル形。

#### `verify()` — トークンが有効か確かめる

**login / logout は存在しない。** 管理者画面は起動時にこれを叩き、401ならトークン入力画面を出す(§4.3)。

ログアウトは**フロントで `localStorage` を消すだけ**。サーバーに状態が無いのでAPIが要らない。

---

## 6. なぜ `request()` にまとめるのか

10本を上のようにベタ書きすると、**同じコードが10回並ぶ**。

| 10本で**同じ**もの | 10本で**違う**もの |
| --- | --- |
| ベースURLの組み立て | パス |
| `Content-Type` | メソッド |
| `Bearer` の付け方 | ボディ |
| `res.ok` のチェック | 認証が要るか |
| `res.json()` | 戻り値の型 |

左を共通化したものが `request()`、**右の一覧がそのまま引数(`Options`)**になる。

**ただし、この形を先に覚えても意味がない。** 次節で、空の関数から7段階で組み立てる。

### 要件から1段ずつ組み立てる

**完成形を写経するのではなく、「これが要るから、これを足す」を7回繰り返す。** 各段階でコードが動く状態を保つ。

#### R1. サーバーの場所を1箇所で持ちたい

本番URLに切り替えるとき10箇所直したくない。→ **定数にする**(→ `React・TypeScript入門.md` §8)

```ts
const BASE = import.meta.env.VITE_API_URL

async function request(path: string) {
  const res = await fetch(`${BASE}${path}`)
  return res.json()
}
```

**この時点で `getState()` は動く。** GET・認証なしのAPIは、もうこれで足りる。

#### R2. 失敗したことを知りたい

§3の落とし穴①。`fetch` は404でも例外を投げないので、**`res.ok` を自分で見る**。

```ts
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(res.statusText)   // ← 追加
  return res.json()
```

> ここで初めて `throw` が出てくる。**「失敗を呼び出し元に伝える手段」が要るから**であって、非同期だからではない(→§4)。

#### R3. 失敗の理由で画面の出し分けをしたい

`Error` は `message` しか運べない。しかし画面は **`code` で分岐**したい(→§2)。

→ **運びたいものが足りないので、自分でエラー型を作る。**

```ts
export class ApiError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message)
  }
}
```
```ts
  if (!res.ok) {
    const data = await res.json()
    throw new ApiError(data.error.code, res.status, data.error.message)
  }
```

`status` も持たせるのは、**401 のときだけトークン入力画面に戻す**必要があるから(→§5 `verify`)。

#### R4. サーバーが壊れてJSONを返さない場合に備えたい

`res.json()` は、返ってきたのがHTMLだと**それ自体が例外を投げる**。すると本来のエラー(500)が握りつぶされ、画面には「JSONのパースに失敗」とだけ出る。当日これが起きると原因が追えない。

```ts
    const data = await res.json().catch(() => null)   // 失敗したら null にする
    throw new ApiError(
      data?.error?.code ?? 'UNKNOWN',
      res.status,
      data?.error?.message ?? res.statusText,
    )
```

`?.` と `??` で「無ければ既定値」にしておく。**エラー処理の中で例外を出さない**のが鉄則。

#### R5. GET以外も送りたい

`showQuestion` は POST でボディが要る。**呼ぶ側ごとに変わるので引数にする。**

```ts
type Options = { method?: 'GET' | 'POST' | 'PUT'; body?: unknown }

async function request(path: string, opts: Options = {}) {
  const { method = 'GET', body } = opts
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  })
```

`= {}` を付けているので、**`getState` のような呼び出しは今までどおり第2引数なしで動く。**

`body` があるときだけ `Content-Type` を付けるのは、`advanceText()` のように**ボディ無しのAPIがある**ため(→§5)。

#### R6. 管理者APIにだけ認証を付けたい

10本中9本が認証必須で、`getState` だけ不要(→§0)。**これも呼ぶ側で変わるので引数**。

```ts
type Options = { method?: …; body?: unknown; auth?: boolean }   // ← 3つ目

  const { method = 'GET', body, auth = false } = opts
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) headers['Authorization'] = `Bearer ${localStorage.getItem('adminToken') ?? ''}`
```

**ここで `Options` が3つ揃う。** 先に設計したのではなく、R5・R6 で「呼ぶ側ごとに変わるもの」を足していった結果。

> 既定値を `auth = false` にしてあるのが安全側。**書き忘れたら認証が付かない**(=401で気づく)。逆にしていたら、閲覧系にトークンが漏れる。

#### R7. 戻り値に型を付けたい

このままだと戻り値が `any` / `unknown` で、STEP1 の型が活きない。→ **ジェネリクス**

```ts
async function request<T>(path: string, opts: Options = {}): Promise<T> {
  …
  return res.json() as Promise<T>
}
```
```ts
export const getAdminState = () => request<AdminState>('/api/admin/state', { auth: true })
const state = await getAdminState()
state.askedCount    // ← 補完が効く
```

### 対応表

| 要件 | 足したもの | 根拠 |
| --- | --- | --- |
| R1 サーバーの場所を1箇所に | `BASE` | `React・TypeScript入門.md` §8 |
| R2 失敗を検出する | `res.ok` チェック | §3 落とし穴① |
| R3 理由で画面を出し分ける | `ApiError`(`code` / `status`) | `API仕様書.md` §0 |
| R4 壊れた応答に備える | `.catch(() => null)` と `??` | — |
| R5 GET以外を送る | `Options.method` / `body` | `API仕様書.md` §3 |
| R6 認証を出し分ける | `Options.auth` | `API仕様書.md` §0 |
| R7 型を効かせる | `<T>` | STEP1 の型 |

**この7つ以外は要らない。** リトライ・タイムアウト・キャッシュ・インターセプタは、ライブラリには付いているがこのアプリでは使わない(必要になってから足す)。

### 完成形

```ts
const BASE = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message)
  }
}

type Options = { method?: 'GET' | 'POST' | 'PUT'; body?: unknown; auth?: boolean }

async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = opts

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) headers['Authorization'] = `Bearer ${localStorage.getItem('adminToken') ?? ''}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(
      data?.error?.code ?? 'UNKNOWN',
      res.status,
      data?.error?.message ?? res.statusText,
    )
  }

  return res.json() as Promise<T>
}
```

**40行に満たない。** この規模だからライブラリを入れずに手で書いている(→§10)。

`<T>` は**ジェネリクス**で、「返ってくる型を呼び出し側が指定する」仕組み。**STEP1 で作った型が、ここで初めて仕事をする。**

---

## 7. 書く順番(おすすめ)

1. **呼ぶ側を先に書く。** `await showQuestion(5)` と書きたい、を決める
2. 1本だけベタ書きして動かす
3. 10本並べて、違うところを数える → `Options` の中身が見える(§6 R5・R6)
4. `code` で分岐したいと気づく → `ApiError` が決まる
5. **骨組みだけ作る**(`request` の中身は `throw new Error('未実装')` でよい)。`pnpm typecheck` を通す
6. 型を埋める
7. 最後に `request` の中身を書く

**「動く」より先に「形が正しい」を確認する**のがトップダウンの利点。⑤の時点でエンドポイント10本が並ぶので、`Options` の過不足がひと目で分かる。

---

## 8. SSE はここに入らない

サーバーから**勝手に流れてくる**データ(リアルタイム配信)は `EventSource` の担当で、STEP4 の `useEventState` で扱う。

`api.ts` は「**こちらから叩きに行く**」ものだけ。

→ [`React・TypeScript入門.md`](./React・TypeScript入門.md) §5

---

## 9. よくある間違い

| やりがち | 正しくは |
| --- | --- |
| `res.ok` を見ない | **必ず見る。** `fetch` は404でも例外を投げない |
| `res.json()` の `await` を忘れる | 2段階。`fetch` と `json()` の両方に `await` |
| `body` にオブジェクトを直接渡す | `JSON.stringify()` する |
| `getState` に `Authorization` を付ける | 閲覧系は**認証なし**(§0) |
| エラーの `message` を画面に出す | **`code` で分岐**して、日本語はフロントが持つ |
| `async` の中で `new Promise` を書く | `return` と `throw` で足りる |
| 401 の処理を `api.ts` に書く | `api.ts` は `ApiError` を投げるまで。**画面側の仕事** |

---

## 10. なぜライブラリを使わないのか

「APIクライアントのテンプレはないのか」への答え。**あるが、このアプリでは使わない。**

| 手段 | してくれること | 判断 |
| --- | --- | --- |
| **OpenAPI + 自動生成** | 仕様(YAML)から型もクライアントも生成 | ❌ 仕様書が2つになる |
| **tRPC** | サーバーと型を自動共有 | ❌ バックがGoなので使えない |
| **axios / ky / ofetch** | `fetch` の薄い包み | ❌ §6の40行と同等。依存が増えるだけ |
| **TanStack Query** | キャッシュ・再取得・重複排除 | ❌ SSEでpushされるので出番がない |

**OpenAPI は本来の正解**ではある。ただし `API仕様書.md` は型の一覧ではなく、「なぜ `explanation` を `answer` に入れるのか」といった**判断の記録**が本体で、これはYAMLで表現できない。導入すると仕様書が2つになり、片方だけ直して食い違う。生成されたコードは中身が読めないので、**当日エラーを踏んだときに追えない**という問題もある。

長期運用する業務システムなら OpenAPI が正解。**3ヶ月で作って1日使うイベントアプリ**では、二重管理のコストが勝つ。

`axios` を入れても `ApiError` は自分で書くことになる。**エラーの形はこのアプリ固有**(`{ error: { code, message } }`)で、どのライブラリも知らないため。

> 将来の選択肢として、Goの実装から OpenAPI を出力する道はある(`swaggo` など)。**Goが正**になるので二重管理にならない。ただし #9 以降の話。

---

## 📚 参考リンク

- [MDN: フェッチ API の使用](https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN: Response.ok](https://developer.mozilla.org/ja/docs/Web/API/Response/ok) ← **落とし穴①の根拠**
- [MDN: HTTPレスポンスステータスコード](https://developer.mozilla.org/ja/docs/Web/HTTP/Status)
- [MDN: async function](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/async_function)
- [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
