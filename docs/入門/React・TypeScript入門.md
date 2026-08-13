# React・TypeScript入門 — このアプリを書くために必要な知識だけ

**「Reactを網羅的に学ぶ」ためのドキュメントではない。** このクイズアプリのフロントを**自分の手で書くために必要な知識だけ**を、出てくる順に並べたもの。

- 何を作るか → [`../実装要件/画面・要件.md`](../実装要件/画面・要件.md)
- 実装で守ること → [`../実装要件/フロントエンド実装要件.md`](../実装要件/フロントエンド実装要件.md)
- 作る順番 → `dev_policy/フロントエンド基盤の進め方.md`

> **読み方**: 上から順に読む必要はない。**STEPで詰まったら、対応する節に戻ってくる**使い方を想定している。
> 各節の最後に「**このアプリのどこで使うか**」を書いてあるので、そこだけ先に眺めてもよい。

---

## 0. 全体像 — このアプリのフロントは何をしているのか

驚くほど単純な構造をしている。**ここを掴めば、あとは書くだけ。**

```
サーバー ──(SSE で state を流し続ける)──▶ ブラウザ
                                            │
                                            ▼
                                    state を受け取る
                                            │
                                            ▼
                              state を見て、画面を丸ごと描き直す
```

**これだけ。** `docs/実装要件/フロントエンド実装要件.md` §1 にあるとおり、

> **「state を受け取って画面全体を再描画する」1つの流れだけで作る**

差分の計算も、フェーズの予測も、進行の管理もフロントには書かない。**進行の頭脳はサーバーだけ**にある。
だから必要な知識は「**データを受け取る方法**」と「**データを画面にする方法**」の2つしかない。

---

## 1. TypeScript — 「データの形」を先に決める道具

### 何のためにあるか

JavaScript は、存在しないキーを読んでも実行するまで気づけない。`question.text` と書くべきところを `question.txt` と書いても、動かしてみるまで分からない。
TypeScript は**データの形を先に宣言しておく**ことで、書いた瞬間にエディタが赤線で教えてくれるようにする。

### 覚えるのはこれだけ

```ts
// ① 型注釈 — 変数や引数に「形」を書く
const count: number = 3
const name: string = "技大祭"

// ② type / interface — 自分でデータの形を定義する
type Question = {
  id: number
  type: 'four_choice' | 'two_choice' | 'arunashi'  // ← ③ ユニオン型(このどれか、という意味)
  textSegments: string[]                            // ← 文字列の配列
  correctChoiceId: string | null                    // ← ④ null が入りうる(idは "A"〜"D" の文字列)
}

// ⑤ 関数の型
function formatTime(sec: number): string {
  return `${sec}秒`
}
```

### ⚠️ このプロジェクトで一番大事なポイント: `null` の扱い

`docs/実装要件/フロントエンド実装要件.md` §1 にこうある。

> **キーは常に存在し、値が `null` / `[]` になる**契約なので、型もそのとおりに書く(Optionalの乱用をしない)

つまり、こう書く。

```ts
// ✅ 正しい: キーは必ずある。値が null になりうる
type State = {
  question: Question | null
  questionStartedAt: string | null
}

// ❌ 間違い: 「キーが無いかもしれない」という意味になってしまう
type State = {
  question?: Question
  questionStartedAt?: string
}
```

`?` と `| null` は**別の意味**。契約は「キーは残す、値が null」なので `| null` が正しい。

そして `null` かもしれない値を使うときは、必ず確認してから使う。

```tsx
{state.question !== null && <QuestionView question={state.question} />}
```

### 📚 参考リンク

| リンク | どう使うか |
|---|---|
| [サバイバルTypeScript](https://typescriptbook.jp/) | **日本語で一番読みやすい入門。** 「TypeScriptの基礎」の章だけで足りる |
| [TypeScript公式 Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) | 型の一覧をざっと確認したいとき |

**このアプリのどこで使うか**: `src/types/` の型定義(STEP1)。ここを正確に書くと、以降の全画面でエディタが助けてくれる。

---

## 2. React — データを画面にする道具

### 考え方

React の発想は一言でいうとこう。

> **画面 = f(データ)**

「データがこうなら、画面はこう」という関数を書く。**画面を直接いじる操作(この要素を消す、この文字を書き換える)は書かない。** データを変えれば、Reactが画面を勝手に合わせてくれる。

これはこのアプリの設計と完全に一致している。state が来たら画面が変わる。それだけ。

### ① コンポーネントとJSX

```tsx
// コンポーネント = 画面の部品を返す関数。名前は大文字で始める
function QuestionText() {
  return <p className="text-4xl">問題文です</p>
}
```

`return` の中の HTML っぽいものが **JSX**。JavaScriptの中にHTMLを書ける記法。

- `class` ではなく **`className`**(`class` はJSの予約語のため)
- `{}` で囲むと中にJavaScriptを書ける

```tsx
function QuestionText({ text }: { text: string }) {
  return <p>{text}</p>          // ← {} の中は JavaScript
}
```

### ② props — 部品にデータを渡す

```tsx
// 受け取る側: 引数で受け取る。型を必ず書く
function ChoiceButton({ label, isCorrect }: { label: string; isCorrect: boolean }) {
  return <div className={isCorrect ? 'bg-red-500' : 'bg-gray-200'}>{label}</div>
}

// 渡す側: HTMLの属性のように書く
<ChoiceButton label="選択肢A" isCorrect={true} />
```

**props は上から下へ一方向にしか流れない。** 子が親のデータを書き換えることはできない。

### ③ useState — 変わる値を持つ

```tsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)   // [今の値, 変える関数]

  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

**`setCount` を呼ぶと、Reactがその部品を描き直す。** これがReactの心臓。

### ④ 条件分岐とリスト表示

```tsx
// 条件分岐: && と 三項演算子
{state.phase === 'waiting' && <p>まもなく始まります</p>}
{state.question !== null ? <QuestionView /> : <WaitingView />}

// リスト表示: map。key を必ず付ける
{question.choices.map((choice) => (
  <ChoiceButton key={choice.id} label={choice.text} />
))}
```

**`key` は必須。** 付け忘れると、リストが変化したときにReactが要素を取り違えて、表示がおかしくなる。

### 📚 参考リンク

| リンク | どう使うか |
|---|---|
| [React公式(日本語)「クイックスタート」](https://ja.react.dev/learn) | **まずここ。** 上から順に読めば①〜④が全部出てくる |
| [React公式「UIの記述」](https://ja.react.dev/learn/describing-the-ui) | JSX・props・条件分岐・リスト |
| [React公式「インタラクティビティの追加」](https://ja.react.dev/learn/adding-interactivity) | useState |

**このアプリのどこで使うか**: 全画面。特に「state を見て表示を切り替える」が④そのもの。

---

## 3. useEffect — 「外の世界」とつなぐ

### 何のためにあるか

React は「データ→画面」を担当する。しかし **SSE接続・タイマー・localStorage** といった**React の外側にあるもの**とやりとりするには `useEffect` を使う。

```tsx
import { useEffect } from 'react'

useEffect(() => {
  // ここが「画面が表示されたとき」に動く

  return () => {
    // ここが「画面が消えるとき」に動く(後片付け)
  }
}, [])   // ← 依存配列
```

### 3つの落とし穴(ここで全員つまずく)

**① 依存配列を書き忘れる**

```tsx
useEffect(() => { ... })        // ❌ 毎回の再描画で実行される(無限ループの原因)
useEffect(() => { ... }, [])    // ✅ 最初の1回だけ
useEffect(() => { ... }, [id])  // ✅ id が変わったときだけ
```

**② 後片付けを書き忘れる**

SSE接続やタイマーは、**必ず後片付けが要る**。書かないと接続やタイマーが増え続ける。

```tsx
useEffect(() => {
  const es = new EventSource(url)
  return () => es.close()        // ✅ これが無いと接続が残り続ける
}, [url])
```

**③ 何でも useEffect に入れてしまう**

「state から計算できるもの」は useEffect ではなく**ただの計算**で書く。

```tsx
// ❌ 不要な useEffect
const [remaining, setRemaining] = useState(0)
useEffect(() => { setRemaining(calc(state)) }, [state])

// ✅ ただの計算でよい
const remaining = calc(state)
```

### 📚 参考リンク

| リンク | どう使うか |
|---|---|
| [React公式「エフェクトを使って同期する」](https://ja.react.dev/learn/synchronizing-with-effects) | **SSE接続を書く前に必読。** 後片付けの説明がある |
| [React公式「エフェクトは必要ないかもしれない」](https://ja.react.dev/learn/you-might-not-need-an-effect) | 落とし穴③の判断基準 |
| [React公式 useEffect リファレンス](https://ja.react.dev/reference/react/useEffect) | 引数の意味を確認したいとき |

**このアプリのどこで使うか**: SSE接続(STEP4)、タイマーの毎秒更新(STEP5)、管理者画面の起動時 `verify`(STEP8)。

---

## 4. カスタムフック — 共通処理をまとめる

`use` で始まる**ただの関数**。中でフック(useState/useEffect)を使えるのが特徴。

```tsx
// src/lib/useEventState.ts のイメージ
function useEventState(view: 'monitor' | 'phone') {
  const [state, setState] = useState<State | null>(null)

  useEffect(() => {
    const es = new EventSource(`/api/events?view=${view}`)
    es.onmessage = (e) => setState(JSON.parse(e.data))
    return () => es.close()
  }, [view])

  return state
}
```

こうしておくと、**各画面は1行で state を受け取れる**。

```tsx
function MonitorPage() {
  const state = useEventState('monitor')
  if (state === null) return <p>接続中...</p>
  return <div>{state.phase}</div>
}
```

これが `フロントエンド実装要件.md` §2 の「**接続口はまとめ役が `src/lib/` に共通実装し、各画面はそれを使うだけ**」の正体。

### 📚 参考リンク

- [React公式「カスタムフックでロジックを再利用する」](https://ja.react.dev/learn/reusing-logic-with-custom-hooks)

**このアプリのどこで使うか**: STEP4(SSE)、STEP5(タイマー)。**この2つを作れば、画面側は驚くほど簡単になる。**

---

## 5. SSE(EventSource)— サーバーから流れてくるデータを受け取る

ブラウザ標準の機能。**ライブラリは不要**(`フロントエンド実装要件.md` §2)。

```ts
const es = new EventSource('/api/events?view=monitor')

es.onmessage = (event) => {
  const state = JSON.parse(event.data)   // ← 届いた文字列をオブジェクトに戻す
}

es.onerror = () => { /* 切断時。EventSourceは自動で再接続を試みる */ }

es.close()   // 明示的に切る
```

### このアプリ固有の必須ルール

`フロントエンド実装要件.md` §2 より:

- **再接続に成功したら、必ず `GET /api/state` を1回叩いて再描画してから受信を再開する**(切断中の取りこぼし対策。**契約上のフロント必須実装**)
- `ping` イベントは無視してよい(接続維持用)
- 接続URL: モニタ `?view=monitor` / スマホ `?view=phone` / 管理者は `?token=` 付き

### 📚 参考リンク

| リンク | どう使うか |
|---|---|
| [MDN「サーバー送信イベントの使用」](https://developer.mozilla.org/ja/docs/Web/API/Server-sent_events/Using_server-sent_events) | **SSEの全体像。まずここ** |
| [MDN EventSource](https://developer.mozilla.org/ja/docs/Web/API/EventSource) | メソッド・イベントの一覧 |

**このアプリのどこで使うか**: STEP4。**フロントで一番難しいのがここ**なので、時間をかけてよい。

---

## 6. 時刻の計算 — タイマー

サーバーは残り秒数を送ってこない。`フロントエンド実装要件.md` §3 のとおり**クライアントが計算する**。

```
時計ずれ = 手元の現在時刻 - 受信したserverTime   ← state受信のたびに更新
残り秒数 = timeLimitSec - (手元の現在時刻 - 時計ずれ - questionStartedAt)
```

必要な JavaScript の知識は2つだけ。

```ts
Date.now()                    // 今の時刻(ミリ秒の数値)
new Date(isoString).getTime() // ISO文字列("2026-09-13T13:05:00+09:00")を数値に変換
```

毎秒表示を更新するには `setInterval` を `useEffect` の中で使い、**後片付けで `clearInterval` する**。

- **0になっても何も起こさない**(0のまま表示。遷移はすべて裏方の操作)

### 📚 参考リンク

- [MDN Date](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [MDN setInterval](https://developer.mozilla.org/ja/docs/Web/API/Window/setInterval)

**このアプリのどこで使うか**: STEP5。**純粋な計算なので、テストが最も安く効く場所**でもある。

---

## 7. React Router — URLで画面を切り替える

1つのViteアプリの中で `/` `/monitor` `/admin` を出し分ける(→ `dev_policy/フォルダ構成_policy.md` F2)。

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

<BrowserRouter>
  <Routes>
    <Route path="/" element={<PhonePage />} />
    <Route path="/monitor" element={<MonitorPage />} />
    <Route path="/admin" element={<AdminPage />} />
  </Routes>
</BrowserRouter>
```

覚えるのは実質これだけ。このアプリに**画面遷移(リンクを押して移動)はほぼ無い**ので、Routerの高度な機能は要らない。

### 📚 参考リンク

- [React Router 公式](https://reactrouter.com/)

**このアプリのどこで使うか**: STEP3。

---

## 8. Vite — 環境変数の読み方

```ts
const apiUrl = import.meta.env.VITE_API_URL
```

**`VITE_` で始まる変数だけがフロントに渡る**(→ `.env.example`)。これはセキュリティの仕組みで、うっかりサーバーの秘密がブラウザに漏れないようになっている。

- `VITE_API_URL` … APIの場所
- `VITE_SURVEY_URL` … finishedフェーズで出すアンケートURL

### 📚 参考リンク

- [Vite公式「環境変数とモード」](https://vite.dev/guide/env-and-mode)

---

## 9. Tailwind CSS — クラス名でスタイルを書く

```tsx
<p className="text-6xl font-bold text-white">問題文</p>
```

CSSファイルを別に書かず、**クラス名だけで見た目を作る**。85インチの大画面という特殊要件があるので、文字サイズを何度も調整することになる。その試行錯誤が速いのが利点。

### 📚 参考リンク

- [Tailwind公式 Viteでの導入](https://tailwindcss.com/docs/installation/using-vite)
- [Tailwind公式 ドキュメント](https://tailwindcss.com/docs)(クラス名は毎回ここで検索する)

---

## 10. このアプリで絶対に守ること

`フロントエンド実装要件.md` から、**知らずに破ってしまいがちなもの**を抜き出した。

| ルール | なぜ |
|---|---|
| **`dangerouslySetInnerHTML` を使わない** | Reactの自動エスケープを素通しにする唯一の穴。問題文に仕込まれたスクリプトが `localStorage` のトークンを盗むXSS経路になる |
| **フロントに進行ロジックを書かない** | 差分適用・フェーズ予測を書かない。stateを受け取って再描画するだけ |
| **未知の `type` が来ても白画面にしない** | フォールバック表示を用意する(将来のtype追加への保険) |
| **エラーは `error.code` で分岐**し、`message` は表示に使わない | 日本語文言はフロントが持つ |
| **モックデータは仕様書のJSONと1文字も違わない形にする** | ずれるとバック結合時に全部やり直しになる |

---

## 11. つまずいたときの調べ方

1. **エラーメッセージをそのままコピーして検索する。** Reactのエラーは親切で、多くは公式ドキュメントへのリンクが出る
2. **公式ドキュメントを最優先。** React・MDN・TypeScriptの公式は日本語版があり、質が高い
3. **ブラウザの開発者ツール**(F12)の Console タブを常に開いておく。赤いエラーは全部読む
4. **30分詰まったら質問する**(→ `docs/ガイドライン/開発フローガイド.md`)

### 検索するときのコツ

- `React useEffect クリーンアップ` のように**日本語**で調べると、日本語記事に当たる
- 古い記事に注意。**クラスコンポーネント(`class extends React.Component`)が出てきたら古い記事**。今は関数コンポーネント + フックが標準
