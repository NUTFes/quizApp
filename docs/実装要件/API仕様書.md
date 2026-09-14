# docs/api.md — クイズアプリ API仕様書

> フロント班とバック班の契約書。この文書だけを見て両班が独立に実装できることをゴールとする。
> 前提決定: 形式は4択/2択(○×は2択に統合)/あるなし/早押し(**早押しはv1未実装・フェーズ2**。仕様上の形だけ先に確保)・スマホは表示専用(回答APIなし)・phase遷移はすべて管理者操作・問題はスプレッドシートから同期・画像はサーバー配置をURL参照。

---

## 0. 共通ルール(全APIに適用)

- リクエスト/レスポンスはすべて JSON(UTF-8)。`Content-Type: application/json`。
  - **唯一の例外: §3.6 `POST /api/admin/images`(画像の投入)のリクエストのみ `multipart/form-data`。** レスポンスはJSON。画像をJSONに載せるにはbase64にする必要があり、①転送量が1.33倍(5MB → 6.7MB)・サーバーのピークメモリも約2倍(エンコード後の文字列とデコード後のバイト列が同時に載る)②フロントは `FormData` に `append` するだけで済むのに `FileReader` の非同期処理が1段挟まる ③`curl -F` の1行でテストできなくなる(当日サーバーに触らない以上これは効く)、の3点で割に合わないため。**このAPI以外でmultipartを増やさないこと。**
- **エラーの形は全API共通**:

  ```json
  { "error": { "code": "QUESTION_NOT_FOUND", "message": "questionId=99 は存在しません" } }
  ```

  - `code` は機械用。**フロントはcodeで分岐**し、ユーザーに見せる日本語はフロント側で持つ。
  - `message` は開発者向けデバッグ文言。表示に使わない(バックが自由に変えてよい)。
- 日時はすべて **ISO 8601 + タイムゾーン付き**(例: `"2026-09-13T13:05:00+09:00"`)。
- **キーは消さない**: 値が無いときは `null`、空リストは `[]`。同一宛先内ではphaseによらずキー構成は常に一定。
- 状態変更系API(§3.1〜§3.4、§3.8)の成功レスポンスは、**すべて「更新後のstate(管理者向け・§2.1の形)」**。個別の形を覚える必要はない。
- **残り時間の計算**: サーバーは残り秒数を送らない。クライアントが `serverTime` と `questionStartedAt` + `timeLimitSec` から計算する(端末時計のずれを `serverTime` で補正)。
  - **「締切」も同じ計算で出す**。残り0秒になったらクライアントが締切表示に切り替える(→ `画面・要件.md` §4)。**`close` のようなphaseは無く、APIも増えない**。サーバーは最後まで `phase: "question"` を配り続ける。
  - 判断基準: **配ったデータから計算で復元できるものはクライアントに任せ、復元できないものはサーバーが配る。** 締切は `questionStartedAt` から復元できるのでクライアント側、`askedCount`(今何問目)は復元できないのでサーバー側。
- **認証**: Cookie・セッションは使わない。管理者APIはすべて **`Authorization: Bearer <トークン>` ヘッダ**で認証する。閲覧系(モニタ/スマホ)は認証なし。
  - トークンはサーバーの環境変数に置いた固定文字列2つ。ログイン処理・セッション管理・有効期限は無い。

    | 環境変数 | 用途 | 通る範囲 |
    | --- | --- | --- |
    | `ADMIN_TOKEN` | 管理者画面の操作者が入力する | 管理者APIすべて |
    | `IMPORT_TOKEN` | GASのスクリプトプロパティに置く | §3.5 の問題投入のみ |

  - 管理者画面はトークン入力欄で受け取り、`localStorage` に保存して以降のリクエストに毎回付ける(リロードしても再入力不要にすること。当日の事故防止)。
  - **SSEのみ例外**: `EventSource` はヘッダを付けられないので、`?token=` クエリで渡す(§5)。
  - **トークンの運用ルール**(2026-08-07決定): ①長いランダム文字列で発行する(推測できる単語は禁止)。②本番用トークンは直前に発行し、イベント終了後に無効化する(使い捨て)。③開発用と本番用は必ず別の値にする(SSEでURLにトークンが載るため、ログ・履歴・スクショ経由の漏洩を前提とした運用にする)。
- エラーオブジェクトは `code` / `message` に加えて、**任意で `details` 配列**を持つことがある(複数件のエラーを同時に返す場合。§3.5でのみ使用)。
- **再接続手順**: SSEが切れたら、再接続後にまず `GET /api/state` で最新stateを取得してからイベント受信を再開する(フロント必須実装)。

### phase(状態)の遷移図

```
              show-question                 show-answer
   waiting ──────────────────▶ question ──────────────────▶ answer
                              │    ▲                          │
                              │    │ advance-text             │ revival {"to":"video"}
                              └────┘                          ▼
                                                   revival-video
                                                          │
                                           revival {"to":"entry"}
                                                          ▼
                                                   revival-entry
                                                          │
                                           show-question(次の問題)
                                                          ▼
                                                      question

   どのphaseからでも:
   - revival {"to":"video" | "entry"} → 指定した敗者復活phase
   - reset   {"to":"waiting" | "finished"} → 待機または終了
```

- 遷移はすべて管理者の操作。時間切れによる自動遷移は**ない**(タイマーは表示のみ)。
- ただし `question` の中には**「締切」という表示状態**がある。残り0秒でクライアントが自分で切り替えるもので、**phaseは `question` のまま**動かない(§0・`画面・要件.md` §4)。バック班がこのために書くコードは無い。
- `answer` 中に `show-question` を呼ぶと次の問題へ(waitingを経由しない)。
- 同じ問題を `question` 中に再度 `show-question` すると**その問題をやり直し**(セグメント・タイマーがリセット)。
- 敗者復活の通常の流れは `answer → revival-video → revival-entry → question`。ただし運営が途中から復旧できるよう、`revival` はどのphaseからでも呼べる。
- `revival-entry` 中に `show-question` を呼ぶと次の問題へ戻る。敗者復活では全問題の `asked` を変更しないため、`askedCount` は途切れない。

---

## 1. データモデル

### Question(問題)

```json
{
  "id": 5,
  "number": 12,
  "type": "four_choice",
  "difficulty": "hard",
  "textSegments": ["この問題文は", "スラッシュ区切りで", "少しずつ表示される"],
  "imageUrl": "/images/q5.png",
  "choices": [
    { "id": "A", "text": "選択肢A", "imageUrl": null },
    { "id": "B", "text": "選択肢B", "imageUrl": null },
    { "id": "C", "text": "選択肢C", "imageUrl": "/images/q5-c.png" },
    { "id": "D", "text": "選択肢D", "imageUrl": null }
  ],
  "correctChoiceId": "B",
  "explanation": "正答の解説。ある問題だけ。無ければ null",
  "asked": false
}
```

| フィールド | 説明 |
| --- | --- |
| `id` | サーバー内部ID。API呼び出しで使うのはこちら |
| `number` | 表示用のクイズ番号(司会者が口頭で指示する番号) |
| `type` | `"four_choice"` \| `"two_choice"` \| `"arunashi"` \| `"hayaoshi"`(hayaoshiは**v1未実装**。投入時に弾く→§3.5.3) |
| `difficulty` | `"easy"` \| `"normal"` \| `"hard"` |
| `textSegments` | 問題文。スプシ入稿時に `/` で区切った配列。**全typeで配列に統一**(区切り不要な問題は要素1個)。形を揃えてフロントの分岐を減らす |
| `imageUrl` | 問題画像。無ければ `null`。パスはサーバー上の静的ファイル |
| `choices` | 2択なら要素2個(○×は `text` に `"○"` `"×"`)。4択なら4個。arunashiは2個(`text` は§3.5.6の書式)。**hayaoshiは `[]`**(選択肢なし・判定は人力) |
| `correctChoiceId` | 正解の選択肢id。**管理者向けにしか出さない**(§2.2参照)。**hayaoshiのみ `null`**(正答の表示方法はフェーズ2実装時に決定) |
| `explanation` | 正答の解説。**ほとんどの問題は `null`**(スプシの `explanation` 列が空)。解説文は正答を含みうるため、**閲覧者向けでは `question` ではなく `answer` オブジェクトに入れて配信する**(§2.2 原則3')。管理者向け(この表)では `Question` の一部として常に届く |
| `asked` | このゲーム中に出題済みか。**スプシ由来ではなくサーバーが管理する**(投入時は必ず `false`)。`show-question` で `true`、`reset` で全問 `false` に戻る。管理者の問題一覧で「もう出した問題」を潰すために使い、**`askedCount`(State)の集計元**でもある |

### State(現在の状態)— アプリの中心

管理者向けのフル形。**フロントの型名は `AdminState`**。閲覧者(モニタ/スマホ)向けは別の形になるので、§2.2 に `ViewerState` として別途定義する(**同じ型を使い回せない**)。

```json
{
  "phase": "question",
  "serverTime": "2026-09-13T13:05:10+09:00",
  "timeLimitSec": 30,
  "questionStartedAt": "2026-09-13T13:05:00+09:00",
  "revealedSegments": 2,
  "totalSegments": 3,
  "askedCount": 3,
  "question": { …Questionの形そのまま(correctChoiceId含む)… }
}
```

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `phase` | `"waiting"` \| `"question"` \| `"answer"` \| `"revival-video"` \| `"revival-entry"` \| `"finished"` | 現在の進行状態。遷移は**すべて管理者の操作**で、時間切れによる自動遷移は無い(→§0の遷移図) |
| `serverTime` | `string` | サーバーの現在時刻(ISO 8601)。**端末時計のずれを補正する基準**。state を受け取るたびに更新する(→§0) |
| `timeLimitSec` | `number \| null` | 制限時間の秒数。既定30、範囲5〜120(→§3.1)。**`waiting` / `revival-video` / `revival-entry` / `finished` では `null`** |
| `questionStartedAt` | `string \| null` | タイマーの起点(ISO 8601)。`waiting` / `revival-video` / `revival-entry` / `finished` では `null` |
| `revealedSegments` | `number` | 現在何セグメントまで公開しているか。`waiting` / `revival-video` / `revival-entry` / `finished` では `0` |
| `totalSegments` | `number` | 出題中の問題のセグメント総数。`waiting` / `revival-video` / `revival-entry` / `finished` では `0`。**閲覧者には送らない**(§2.2) |
| `askedCount` | `number` | 今何問目か。詳細は下記 |
| `question` | `Question \| null` | 出題中の問題(§1の形そのまま。`correctChoiceId` を含む)。`waiting` / `revival-video` / `revival-entry` / `finished` では `null` |

- **キーは消えない。** `waiting` / `revival-video` / `revival-entry` / `finished` でも上記8つのキーはすべて存在し、問題関連の値が `null` / `0` になるだけ(→§0)。
- `phase` が `waiting` / `revival-video` / `revival-entry` / `finished` のとき: `question` `questionStartedAt` `timeLimitSec` は `null`、`revealedSegments` `totalSegments` は `0`。**キーは残る**。
- `askedCount` は**「今何問目か」**。`asked` が `true` の問題を数えた値で、`asked` から**毎回導出する**(この数を別途保存しない。二重管理を避けるため)。**出題中の問題自身を含む**ので、1問目を出している最中は `1`(`0` ではない)。画面には「第1問」と出る。
  - **同じ問題を `show-question` し直しても増えない**(`asked` が既に `true` のため)。`reset` すると `0` に戻る。
  - **`waiting` / `finished` では必ず `0`**(`reset` が全問題の `asked` を `false` にするため)。一方、**`revival-video` / `revival-entry` では直前の値を保持する**。敗者復活を挟んでも「第8問 → 第9問」を維持するため。ただし敗者復活画面には問題番号を表示しない(→ `画面・要件.md` §4)。
  - **総問題数(分母)は持たない。** 勝ち残り式で当日その場で出題を増減させるため、「全N問」を先に確定できない。画面表示は「第3問」のように分子だけを出す(→ `画面・要件.md` §6)。

---

## 2. 状態の取得(閲覧系・認証なし)

### 2.1 GET /api/admin/state

管理者向けの現在state(上記フル形)を返す。**認証必須**。

- 401 `UNAUTHORIZED`: 未ログイン

### 2.2 GET /api/state?view=monitor|phone

モニタ/スマホ向けのstate。認証なし。`view` 省略時は `phone`。

**閲覧者向けstateの設計原則(重要)**:

1. `question.textSegments` には**表示済みセグメントだけ**を入れる(未公開の続きはネットワーク上に流れない)
2. `correctChoiceId` は `answer` オブジェクトの中にのみ存在し、`answer` phase になるまで `answer: null`。**question phase中の閲覧者向けJSONに正解情報のキーは存在しない**
3. `difficulty` `totalSegments` は閲覧者に送らない。`question.asked` も送らない(管理者の一覧専用)
3'. **`explanation` は `question` ではなく `answer` オブジェクトの中に入れる。** 解説文は正答を含みうるため、`correctChoiceId` とまったく同じ扱いにする。したがって question phase では `answer: null` の中に隠れ、**閲覧者向けJSONに解説のキーは現れない**。原則2と同じ仕組みなので、**隠すべき情報はすべて `answer` の中1箇所にまとまる**
3''. **`askedCount` は閲覧者にも送る。** モニタ/スマホが「第3問」を表示するのに使う。秘密情報ではないので削らない。**フロント側で数えてはいけない**(QRから途中参加した端末・再接続した端末が別の数を表示してしまうため)
4. **type=hayaoshi のとき、`view=phone` の `textSegments` は常に空配列**(スマホは type を見て「モニターをご覧ください」を表示する)。`view=monitor` には通常どおり表示済みセグメントを送る。手元で先に読めると早押しが成立しないため(→ docs/画面・要件.md §5)。※hayaoshi自体がフェーズ2実装

**モニタ向け実例(`view=monitor`, phase=question)**:

```json
{
  "phase": "question",
  "serverTime": "2026-09-13T13:05:10+09:00",
  "timeLimitSec": 30,
  "questionStartedAt": "2026-09-13T13:05:00+09:00",
  "askedCount": 3,
  "joinUrl": "https://quiz.example.jp/play",
  "question": {
    "number": 12,
    "type": "four_choice",
    "textSegments": ["この問題文は", "スラッシュ区切りで"],
    "imageUrl": "/images/q5.png",
    "choices": [
      { "id": "A", "text": "選択肢A", "imageUrl": null },
      { "id": "B", "text": "選択肢B", "imageUrl": null },
      { "id": "C", "text": "選択肢C", "imageUrl": "/images/q5-c.png" },
      { "id": "D", "text": "選択肢D", "imageUrl": null }
    ]
  },
  "answer": null
}
```

**モニタ向け実例(phase=answer)** — 変わるのは `answer` だけ:

```json
{
  "phase": "answer",
  "serverTime": "2026-09-13T13:06:02+09:00",
  "timeLimitSec": 30,
  "questionStartedAt": "2026-09-13T13:05:00+09:00",
  "askedCount": 3,
  "joinUrl": "https://quiz.example.jp/play",
  "question": { …同上(textSegmentsは全セグメント公開済み)… },
  "answer": { "correctChoiceId": "B", "explanation": "解説文。無い問題では null" }
}
```

**モニタ向け実例(phase=waiting)** — QRコード表示に使う:

```json
{
  "phase": "waiting",
  "serverTime": "2026-09-13T12:50:00+09:00",
  "timeLimitSec": null,
  "questionStartedAt": null,
  "askedCount": 0,
  "joinUrl": "https://quiz.example.jp/play",
  "question": null,
  "answer": null
}
```

**モニタ向け実例(phase=revival-video / revival-entry)** — 問題関連は空、出題数は保持する:

```json
{
  "phase": "revival-entry",
  "serverTime": "2026-09-13T14:00:00+09:00",
  "timeLimitSec": null,
  "questionStartedAt": null,
  "askedCount": 8,
  "joinUrl": "https://quiz.example.jp/play",
  "question": null,
  "answer": null
}
```

`joinUrl` はキーを一定にするため届くが、敗者復活画面には表示しない。`revival-video` も `phase` 以外は同じ形。

**スマホ向け(`view=phone`)**: モニタ向けから `joinUrl` を除いた形(自分がすでにそのURLにいるため)。それ以外は完全に同一。

#### 2.2.1 ViewerState の定義

**§1 の `AdminState` とは別の形。同じ型を使い回せない。** フロントの型名は `ViewerState`。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `phase` | `Phase` | §1と同じ |
| `serverTime` | `string` | §1と同じ |
| `timeLimitSec` | `number \| null` | §1と同じ |
| `questionStartedAt` | `string \| null` | §1と同じ |
| `askedCount` | `number` | §1と同じ。**閲覧者にも送る**(原則3''。「第3問」の表示に使う) |
| `joinUrl` | `string` | 参加用URL。QRコードの生成元。**`view=monitor` にのみ存在し、`view=phone` には無い**。**phaseによらず常に送る**が、`revival-video` / `revival-entry` / `finished` では画面に出さない(→ `画面・要件.md` §4) |
| `question` | `ViewerQuestion \| null` | 下記。**§1の `Question` とは別の形** |
| `answer` | `{ "correctChoiceId": string \| null, "explanation": string \| null } \| null` | 正答と解説。**`answer` phase になるまで `null`**(原則2・3')。`correctChoiceId` は `hayaoshi` のみ `null`(扱いはフェーズ2で決定)、`explanation` は解説の無い問題で `null` |

**§1 に有って ViewerState に無いもの**: `revealedSegments` / `totalSegments`(原則1により `textSegments` が既に公開分だけに削られているため、フロントが自分で切り出す必要が無い)。

**§1 に無くて ViewerState に有るもの**: `joinUrl`(monitorのみ)/ `answer`。

> **アンケートURLはstateに入らない。** フロントの環境変数 `VITE_SURVEY_URL` から読む(当日までURLが決まらず、決まってもアプリの再デプロイなしに差し替えたいため)。サーバーは一切関与しない。

**モニタ向けとスマホ向けの差は `joinUrl` の有無だけ**なので、別々の型として全項目を書き下さず、**`ViewerState` を拡張する**:

```ts
type MonitorState = ViewerState & { joinUrl: string }   // view=monitor
// view=phone は ViewerState をそのまま使う(専用の型を作らない)
```

> **全項目をコピーした `MonitorState` を作らないこと。** 二重管理になり、片方だけ直して壊れる。`joinUrl` は `ViewerState` 側に `?` で持たせるのも不可(スマホ向けJSONに**キーごと存在しない**ことと、モニタ向けには**必ず存在する**ことの両方を型で表せなくなるため)。

#### 2.2.2 ViewerQuestion の定義

閲覧者向けに削った `Question`。フロントの型名は `ViewerQuestion`。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `number` | `number` | 表示用のクイズ番号 |
| `type` | `QuestionType` | §1と同じ |
| `textSegments` | `string[]` | **表示済みセグメントだけ**(原則1)。`hayaoshi` かつ `view=phone` では常に `[]`(原則4) |
| `imageUrl` | `string \| null` | §1と同じ |
| `choices` | `Choice[]` | §1と同じ |

**§1 の `Question` に有って `ViewerQuestion` に無いもの**: `id` / `difficulty` / `asked` / `correctChoiceId` / `explanation`(原則2・3・3')。**`explanation` は消えるのではなく `answer` の中へ移動する**(`correctChoiceId` と同じ移動)。

> **`ViewerQuestion` に省略可能(`?`)なフィールドは1つも無い。** キー構成は phase によらず一定で、値が `null` / `[]` になるだけ(§0)。**閲覧者向けJSON全体で「キーが生え消えするフィールド」はゼロ**。

---

## 3. 状態変更(管理者API・認証必須)

状態変更系API(§3.1〜§3.4、§3.8)は、成功時に**すべて `200 OK` + 更新後のstate(§2.1のフル形)**を返す。
副作用として**全宛先へSSE `state` イベントが配信される**(中身は§5の出し分け)。以下、この2点は各APIで省略する。

§3.5(問題投入)・§3.6(画像投入)・§3.7(画像一覧)は進行状態を変えるAPIではないため、成功レスポンスとSSEの扱いを各節に記載する。

共通エラー: 未ログイン → 401 `UNAUTHORIZED`(全APIで共通なので以下の表からも省略)。

### 3.1 POST /api/admin/show-question

指定した問題を出題状態にする。phaseを `question` にし、`revealedSegments=1`、タイマー起点(`questionStartedAt`)を現在時刻にセットする。制限時間は `timeLimitSec` で上書きでき、**省略時はサーバーが30秒を適用**する(スプシに秒数列は持たない。2026-08-07決定)。

**リクエスト**: `{ "questionId": 5, "timeLimitSec": 45 }`(`timeLimitSec` は任意。省略時30)

| 状況 | ステータス | code |
| --- | --- | --- |
| questionId が存在しない | 404 | `QUESTION_NOT_FOUND` |
| timeLimitSec が範囲外(5〜120秒以外・数値以外) | 400 | `INVALID_REQUEST` |

- **連打・再実行**: すでに同じ問題を出題中でも 200(その問題を最初からやり直す)。別問題なら即座に切り替わる。`answer` phase から呼べば次の問題へ進む操作になる。
- **その問題の `asked` を `true` にする。** これにより `askedCount`(§1)が1つ進む。すでに `true` の問題を出し直した場合は**変化しない**ので、やり直しで「第4問」に飛ぶことはない。

### 3.2 POST /api/admin/advance-text

問題文のセグメントを1つ進める(`revealedSegments += 1`)。問読みに合わせて押す。

**リクエスト**: `{}`(ボディなしでも可)

| 状況 | ステータス | code |
| --- | --- | --- |
| phase が `question` でない | 409 | `INVALID_PHASE` |

- **連打対応**: 全セグメント表示済みの状態で押されたら**何もせず 200**(現stateを返す)。エラーにしない。

### 3.3 POST /api/admin/show-answer

正解を公開する。phaseを `answer` にする。未公開セグメントがあれば全公開扱いにする。

**リクエスト**: `{}`

| 状況 | ステータス | code |
| --- | --- | --- |
| phase が `question` でない(`answer` 中の再押下を除く) | 409 | `INVALID_PHASE` |

- **連打対応**: すでに `answer` なら何もせず 200。

### 3.4 POST /api/admin/reset

ゲーム全体を指定phaseへ戻す/終わらせる。どのphaseからでも呼べる。

**リクエスト**: `{ "to": "waiting" }` または `{ "to": "finished" }`(省略時 `waiting`)

| 状況 | ステータス | code |
| --- | --- | --- |
| `to` が `waiting`/`finished` 以外 | 400 | `INVALID_REQUEST` |

- 個別の問題のやり直しはresetではなく `show-question` の再実行で行う(§3.1)。
- **全問題の `asked` を `false` に戻す**(`to` が `waiting` / `finished` のどちらでも)。結果として `askedCount` は `0` になる。

### 3.5 PUT /api/admin/questions

**GAS(Google Apps Script)から呼ぶ、問題データの投入API。** サーバーの問題一覧を送られた内容で**全置換**する(サーバーからシートを読みに行く方式ではない。理由は§3.5.4)。

**認証**: `Authorization: Bearer <IMPORT_TOKEN または ADMIN_TOKEN>`。GASはスクリプトプロパティに置いた `IMPORT_TOKEN` を使う。
このAPIは管理者画面のボタンからも呼べる(§3.5.5)。管理者画面には「最終投入日時と件数」も表示する。

#### 3.5.1 リクエスト

GAS側でシートを読み、**この形に整形してから**送る。列→JSONの変換はGASの責務、内容の検証はサーバーの責務。

```json
{
  "questions": [
    {
      "sourceRow": 3,
      "number": 12,
      "type": "four_choice",
      "difficulty": "hard",
      "textSegments": ["学園祭の来場者数は", "およそ何人?"],
      "imageUrl": "/images/q5.png",
      "choices": [
        { "id": "A", "text": "1000人", "imageUrl": null },
        { "id": "B", "text": "3000人", "imageUrl": null },
        { "id": "C", "text": "5000人", "imageUrl": null },
        { "id": "D", "text": "10000人", "imageUrl": null }
      ],
      "correctChoiceId": "B",
      "explanation": null
    }
  ]
}
```

- `sourceRow` は**スプレッドシートの行番号**。サーバーはこれをエラー・警告にそのまま載せて返すので、GAS側で「何行目がダメか」をトーストやセル色で示せる。`id` はサーバーが採番するので送らない。
- `textSegments` は GAS が `/` で split した結果。空要素は除去して送る。
- 2択のとき `choices` は要素2個(`id` は `"A"` `"B"`)。

#### 3.5.2 成功レスポンス `200 OK`

このAPIのみstateではなく取り込み結果を返す。

```json
{
  "imported": 30,
  "importedAt": "2026-09-10T18:22:04+09:00",
  "warnings": [
    { "sourceRow": 12, "reason": "画像 /images/q7.png がサーバーに存在しません" }
  ]
}
```

- `warnings` は**取り込みを止めない軽微な問題**のみ(画像の実体が無い等)。問題なければ `[]`。

#### 3.5.3 エラーレスポンス

| 状況 | ステータス | code |
| --- | --- | --- |
| `Authorization` ヘッダが無い/トークン不一致 | 401 | `UNAUTHORIZED` |
| 内容が不正(型違い・correctChoiceIdが選択肢に無い・choices数がtypeと不一致・numberの重複・arunashiの書式違反 等) | 400 | `SYNC_VALIDATION_ERROR` |
| type が `hayaoshi`(**v1では未対応**。フェーズ2実装後に解放。解放後は `textSegments` 2要素以上=問題文に `/` 区切りがあることを必須とする) | 400 | `SYNC_VALIDATION_ERROR` |
| `questions` が空配列 | 400 | `INVALID_REQUEST` |
| phase が `waiting` / `finished` 以外(本番進行中の置換は禁止。`revival-video` / `revival-entry` を含む) | 409 | `INVALID_PHASE` |

バリデーションエラーは**全件まとめて** `details` に入れて返す(1件ずつ直して再送、を避けるため):

```json
{
  "error": {
    "code": "SYNC_VALIDATION_ERROR",
    "message": "2件の問題が不正です",
    "details": [
      { "sourceRow": 5, "reason": "correctChoiceId 'E' が choices に存在しません" },
      { "sourceRow": 9, "reason": "type が two_choice ですが choices が4件あります" }
    ]
  }
}
```

- エラー時は**1件も取り込まない**(全置換なので中途半端な状態を作らない)。既存データはそのまま残る。
- 成功時の副作用: SSE配信(問題一覧が変わったことを管理者画面へ通知)。
- **冪等**: 同じ内容を何度送っても結果は同じ。GAS側でのリトライ・二度押しは安全。

#### 3.5.4 GAS方式にするための前提条件(インフラ)

**GASはGoogleのサーバー上で動くため、バックエンドがインターネットから到達可能でなければこのAPIは呼べない。** 以下が満たせない場合は§3.5.5の代替手段を使う。

1. サーバーが公開URLを持つ(会場LAN内のみのIPでは不可)
2. **HTTPS + 正規の証明書**(Let's Encrypt等)。GASの `UrlFetchApp` は自己署名証明書を拒否する
3. 上記が本番当日ではなく**準備期間中に**用意できていること

- 一度投入した問題データはサーバー側に永続化されるので、**当日Googleに繋がらなくても動作する**。投入は準備期間中に済ませておく運用でよい。
- CORSの考慮は不要(GASはサーバー間通信でブラウザではない)。

#### 3.5.5 代替手段(公開URLが用意できない場合)

**新しいエンドポイントは不要。** 認証がトークン一本化されたことで、`PUT /api/admin/questions` は誰が叩いても同じ形になった。公開URLが用意できない場合は、呼び出し元をGASから管理者画面に変えるだけでよい:

- GASでJSON(§3.5.1の形)を生成 → ダイアログに表示してコピー
- 管理者画面のテキストエリアに貼り付け → ブラウザから同じAPIを叩く(トークンは `ADMIN_TOKEN`)

バック班の実装は**この1本だけ**。フロント班は投入画面(テキストエリア+結果表示)を作っておけば、GAS直送が使えても使えなくても無駄にならない。

#### 3.5.6 スプレッドシートの列定義(入稿ルール・1行=1問)

| 列 | 内容 | 例 |
| --- | --- | --- |
| number | 表示用クイズ番号 | 12 |
| type | `four_choice` / `two_choice` / `arunashi`(`hayaoshi` はv1不可) | four_choice |
| difficulty | `簡単` / `普通` / `難しい`(**日本語で書く**。GASが英語に変換して送る) | 難しい |
| text | 問題文。区切りたい位置に `/` | 学園祭の来場者数は/およそ何人? |
| choiceA〜choiceD | 選択肢文。2択はC/Dを空欄 | 1000人 |
| correct | 正解の列名 | B |
| imageUrl | 問題画像パス(任意) | /images/q5.png |
| imageA〜imageD | 選択肢画像パス(任意) | |
| explanation | 正答の解説(任意)。**入っている問題だけ、answer phase で画面に表示される** | |

- 1行目はヘッダ行。GASは2行目以降を読む(`sourceRow` は実際の行番号)。
- **difficulty は日本語で入稿し、GASが英語に変換する**(2026-08-16決定)。入稿するのは非エンジニアの運営メンバーなので、`hard` と打たせるより「難しい」を選ばせる方が表記ゆれ(`Hard` `HARD` `hard␣`)が起きにくい。一方 API・DB・フロントの内部表現は `easy` / `normal` / `hard` の1種類に統一する(§1)。**表記が2種類あるのは入り口だけ**、という切り分け。

  | シート(入稿) | API以降(内部) |
  | --- | --- |
  | 簡単 | `easy` |
  | 普通 | `normal` |
  | 難しい | `hard` |

  この3つ以外の値はGASが行番号つきでエラーにする(§3.5.3)。管理者画面で一覧表示するときは逆向きに引き直して日本語で出す(裏方が当日読むものなので)。
- **arunashi の選択肢の書式**(2026-08-07決定): `ラベル:項目/項目/項目`(ラベルと項目群の区切りは**コロン `:`**、項目どうしの区切りは**スラッシュ `/`**)。例: choiceA=「ある:いか/くも/あり」/ choiceB=「ない:アルパカ/くま/マントヒヒ」。項目区切りは早押しの `textSegments` 区切りと同じ `/` に統一(入稿者は「区切りはスラッシュ」で覚えられる)。GASはこの書式をバリデーションし、違反行はエラーにする(フロントはこの書式を前提に分解表示してよい)。
- **GASコードの管理**: GASのコードはGoogleサーバー上にありgit管理から漏れるため、コピーをリポジトリ(`tools/gas/`)にコミットし、更新のたびに同期する。
- **GAS側の設定**: サーバーURLとAPIキーはコードに直書きせず、スクリプトプロパティ(`PropertiesService.getScriptProperties()`)に置く。シートを共有した相手にキーが渡らないようにするため。

---

### 3.6 POST /api/admin/images

**問題・選択肢画像の投入API。** 管理者画面から画像1枚をアップロードし、`GET /images/...`(§6)で配信される場所へ保存する。

**当日、運営はサーバー(Proxmox上の本番CT)に触らない。** このAPIが無いと当日は画像を1枚も追加できない。

| 項目 | 内容 |
| --- | --- |
| Content-Type | `multipart/form-data`(**§0の唯一の例外**) |
| フィールド名 | `file`(1リクエストにつき1枚) |
| 認証 | `Authorization: Bearer <ADMIN_TOKEN>` |
| サイズ上限 | **画像1枚 5MB**(ちょうど5MBは可)。リクエスト全体は 5MB + 64KB |

```bash
curl -F "file=@q5.png" -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://<host>/api/admin/images
```

**認証は `ADMIN_TOKEN` のみ。`IMPORT_TOKEN` では 401 になる。** §3.5 は両方通るが、GASが送るのはシートの文字列だけで画像は送らない。トークンの通用範囲は狭いほうがよい。

#### 3.6.1 成功レスポンス `200 OK`

```json
{ "imageUrl": "/images/q5.png" }
```

- 返る `imageUrl` は、**そのままスプレッドシートの `imageUrl` 列に書ける形**(§3.5.1)。
- このAPIは state を返さず、**SSEも配信しない**。画像を上げるのは管理者自身で、このレスポンスを受け取った時点で変化を知っているため(管理者以外が画像を変える経路は存在しない)。

#### 3.6.2 ファイル名の扱い

**アップロードする側がファイル名を決める。サーバーは生成しない。** スプレッドシートには運営メンバーが手で `/images/q5.png` と書くので、サーバーがランダムな名前を付けるとシートに何を書けばよいか分からなくなる。**「手元で `q5.png` にリネームしてアップロード → シートに `/images/q5.png` と書く」**という流れにする。

受け付けるファイル名の条件(1つでも外れたら 400):

- **ディレクトリを含まないこと**(`../q5.png` `sub/q5.png` `C:\...\q5.png` はすべて拒否)
- 使える文字は **英数字と `.` `_` `-` のみ**(スペース・日本語は不可)
- `.` `-` で始まらないこと / `..` を含まないこと
- 拡張子は **`.png` / `.jpg` / `.jpeg` のみ**(大文字小文字は問わない)
- 100バイト以内

**同名ファイルの上書きは許可する。** `frontend/nginx.conf` の `location /images/` が「画像はファイル名を変えずに差し替えることがある」ことを前提に長期キャッシュを切っており、上書き禁止にすると運用と矛盾する。

#### 3.6.3 中身の検証

**拡張子ではなく中身で種類を判定し、拡張子と一致しなければ拒否する。** 先頭512バイトから判定する(Goの `http.DetectContentType`)。

拡張子だけを信じると、`evil.png` という名前の**中身がHTMLのファイル**を置ける。それが `/images/evil.png` で配信されブラウザにHTMLとして解釈されると、**このアプリと同一オリジンで任意のJavaScriptが実行され、`localStorage` に保存した `ADMIN_TOKEN` が読み取れる**。

二重の防御として、nginx の `location /images/` に `X-Content-Type-Options: nosniff` を付ける(サーバーが `image/png` と返しているのにブラウザが中身を見て解釈し直す挙動=MIMEスニッフィングの禁止)。

#### 3.6.4 エラーレスポンス

| 状況 | ステータス | code |
| --- | --- | --- |
| `Authorization` ヘッダが無い/トークン不一致/`IMPORT_TOKEN` | 401 | `UNAUTHORIZED` |
| `multipart/form-data` でない / `file` フィールドが無い | 400 | `INVALID_REQUEST` |
| ファイル名が §3.6.2 の条件を満たさない | 400 | `INVALID_FILE_NAME` |
| 中身が拡張子と一致しない(PNG/JPEGでない) | 400 | `INVALID_FILE_TYPE` |
| 画像が5MBを超える / リクエスト全体が 5MB + 64KB を超える | 413 | `FILE_TOO_LARGE` |

- **上限は「画像1枚」と「リクエスト全体」の2つ。** 送信データには画像のほかに multipart の区切り・ヘッダ・ファイル名が乗るため、全体の上限を画像と同じ 5MB にすると **5MBちょうどに縮めた画像が 413 になる**。そこで画像1枚はバックエンドが画像本体だけを数えて 5MB で判定し、リクエスト全体には包みのぶん 64KB の余裕を持たせる。
- **全体の上限は nginx と Go の両方に同じ値で設定する**(nginx `client_max_body_size 5184k` / Go `MaxRequestBytes`)。本番は nginx が先に弾くが、**開発環境ではバックエンドを直接叩く(nginxを経由しない)ため Go 側にも上限が要る**。
- ⚠️ **nginx が弾いた 413 は nginx の HTMLページで、§0 のJSONエラー形式ではない。** `frontend/src/lib/api.ts` の `request` は `res.json().catch(() => null)` があるのでクラッシュはしないが `code` が `'UNKNOWN'` になる。**413 は `code` ではなく `ApiError.status` で分岐すること。**

#### 3.6.5 この文書で決めないこと

- **削除API** — 上書きできるので当日の要件にならない
- **クラウドストレージ・署名付きURL** — スコープ外

### 3.7 GET /api/admin/images

**サーバー上の問題・選択肢画像の一覧取得API。** 管理者画面がサーバーに存在する画像を確認し、アップロード時の同名上書き事故を防ぐために使用する。

| 項目 | 内容 |
| --- | --- |
| 認証 | `Authorization: Bearer <ADMIN_TOKEN>` |
| 対象 | `GET /images/...` の配信元（現在は `./static/images` 固定） |
| 対象拡張子 | `.png` / `.jpg` / `.jpeg`（大文字小文字を問わない） |
| 並び順 | `imageUrl` の昇順 |

**認証は `ADMIN_TOKEN` のみ。`IMPORT_TOKEN` では 401 になる。**

#### 3.7.1 成功レスポンス `200 OK`

```json
{
  "images": [
    {
      "imageUrl": "/images/q5.png",
      "size": 123456,
      "updatedAt": "2026-09-13T12:30:00+09:00"
    }
  ]
}
```

- `imageUrl`: `/images/` から始まり、そのままスプレッドシートの `imageUrl` 列に書ける。
- `size`: ファイルサイズ（バイト）。
- `updatedAt`: ISO 8601形式の更新日時（タイムゾーン付き）。
- 画像がない場合は `{"images":[]}`。`null` にはしない。
- ディレクトリおよび `.gitkeep` は返さない。
- DBは使用しない。
- SSE、削除、ページング、サムネイルは行わない。

### 3.8 POST /api/admin/revival

敗者復活の画面を切り替える。どのphaseからでも呼べる。

**リクエスト**:

```json
{ "to": "video" }
```

または:

```json
{ "to": "entry" }
```

| `to` | 更新後の `phase` |
| --- | --- |
| `"video"` | `"revival-video"` |
| `"entry"` | `"revival-entry"` |

| 状況 | ステータス | code |
| --- | --- | --- |
| `to` が未指定、または `video` / `entry` 以外 | 400 | `INVALID_REQUEST` |

- 成功時は `200 OK` + 更新後の管理者向けstate(§2.1)を返し、全宛先へSSE `state` イベントを配信する。
- **全問題の `asked` は変更しない。** したがって敗者復活の前後で `askedCount` は変わらない。
- `revival-video` / `revival-entry` 中は出題していないため、問題関連の項目は §1 のとおり `null` / `0` になる。
- `revival-entry` から §3.1 `show-question` を呼べば、そのまま次の問題へ戻れる。
- 待機・終了へ移る場合は従来どおり §3.4 `reset` を使う。新しい2フェーズからも呼べる。

---

## 4. 問題一覧・認証(管理者API)

### 4.1 GET /api/admin/questions

問題ストック画面用の一覧。難易度・形式での絞り込みはフロント側で行う(全件返す)。

**成功レスポンス** `200 OK`:

```json
{
  "questions": [
    {
      "id": 5, "number": 12, "type": "four_choice", "difficulty": "hard",
      "textPreview": "この問題文はスラッシュ区切りで少しずつ表示される",
      "hasImage": true, "asked": false
    }
  ]
}
```

**フロントの型名は `QuestionListItem`**。§1の `Question` とは別物なので使い回さない(下記のとおり `textSegments` → `textPreview`、`imageUrl` → `hasImage` と形が変わり、`choices` `correctChoiceId` `explanation` は含まれない)。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | `number` | §1のとおり。§4.2・§3.1 で使う |
| `number` | `number` | 表示用のクイズ番号 |
| `type` | `QuestionType` | §1のとおり |
| `difficulty` | `Difficulty` | §1のとおり。管理者画面では日本語に引き直して表示する(→第7版) |
| `textPreview` | `string` | セグメント**結合済みの全文**(`textSegments.join("")`)。一覧では区切り位置に意味が無いため配列で送らない |
| `hasImage` | `boolean` | 下記 |
| `asked` | `boolean` | §1のとおり(このゲーム中に出題済みか。`show-question` で `true`、`reset` で `false`)。裏方が「もう出した問題」を潰すために使う |

- **`hasImage` は「問題画像・選択肢画像のいずれか1つでも存在するか」**(`imageUrl !== null || choices.some(c => c.imageUrl !== null)`)。一覧では「この問題は画像を含む=表示時に画像の準備が要る」ことが分かればよく、問題文の画像か選択肢の画像かを区別する必要が無いため。
- **URLではなく boolean にしている理由**: 一覧が知りたいのは「画像があるか」であって画像そのものではない。URLを返すとフロントが `<img>` を並べたくなり、**問題が数十件あれば画像を数十枚読み込む重い一覧**ができてしまう(サムネイルを出すにしても原寸画像の縮小表示は通信量の無駄で、別途サムネイル用URLが要る)。**一覧は「有無・要約」、詳細(§4.2)は「実体」**という役割分担にする。画像の実体が必要になるのは、その問題を選んで詳細を見るときだけ。
- 0件なら `"questions": []`。

### 4.2 GET /api/admin/questions/:id

1問の詳細(§1のQuestionフル形、`correctChoiceId` `explanation` 含む)。出題前の内容確認用。

| 状況 | ステータス | code |
| --- | --- | --- |
| 存在しないid | 404 | `QUESTION_NOT_FOUND` |

### 4.3 GET /api/admin/verify

**login / logout は存在しない。** 管理者画面は起動時にこのAPIを叩き、保存済みトークンが有効かを確かめる。401ならトークン入力画面を出す。

**成功** `200 OK` `{ "ok": true }`

| 状況 | ステータス | code |
| --- | --- | --- |
| トークンが無効/未指定 | 401 | `UNAUTHORIZED` |

- ログアウトは**フロント側で `localStorage` を消すだけ**(サーバーに状態が無いのでAPIは不要)。

---

## 5. SSE仕様(リアルタイム配信)

### 接続エンドポイント

| 宛先 | URL | 認証 |
| --- | --- | --- |
| 管理者 | `GET /api/admin/events?token=<ADMIN_TOKEN>` | クエリのtoken必須(不一致は401) |
| モニタ | `GET /api/events?view=monitor` | なし |
| スマホ | `GET /api/events?view=phone` | なし |

- **管理者チャンネルだけURLにトークンを載せる**のは、ブラウザの `EventSource` が任意のヘッダを付けられないため。他の管理者APIは `Authorization` ヘッダを使う(§0)。
- そのためトークンがアクセスログやブラウザ履歴に残る。**トークンを本番用と開発用で分け、当日終了後に捨てる**運用でカバーする。
- ヘッダで揃えたい場合は `EventSource` をやめて `fetch` + `ReadableStream` で自前受信する手もあるが、自動再接続を自分で書く必要があるので**非推奨**。

### イベント一覧

| イベント名 | data | 発生タイミング |
| --- | --- | --- |
| `state` | 宛先ごとのstate JSON(§2.1 / §2.2 とまったく同じ形) | §3の状態変更API成功のたび |
| `ping` | `{}` | 30秒ごと(接続維持・切断検知用) |

- **タイマー専用イベントは無い**。カウントダウンは各クライアントが `serverTime` / `questionStartedAt` / `timeLimitSec` から自前で描画する(§0)。
- `state` イベントのdataは、同じ宛先が `GET /api/state` で取るものと**同一スキーマ**。フロントは「stateを受け取って画面全体を再描画する」1関数だけ書けばよい(差分適用は不要)。

### 出し分けの実例(同じ瞬間・phase=question)

管理者に届く `state`(抜粋):

```json
{ "phase": "question", "revealedSegments": 2, "totalSegments": 3, "askedCount": 3,
  "question": { "textSegments": ["この問題文は", "スラッシュ区切りで", "少しずつ表示される"],
                "correctChoiceId": "B", "difficulty": "hard", "asked": true, … } }
```

スマホに届く `state`(抜粋)— **`correctChoiceId` も `explanation` も3つ目のセグメントも存在しない**(前2つは `answer: null` の中に隠れている)。**`askedCount` は同じ値が届く**:

```json
{ "phase": "question", "askedCount": 3,
  "question": { "textSegments": ["この問題文は", "スラッシュ区切りで"], … },
  "answer": null }
```

### 再接続

- クライアントはEventSourceの自動再接続に任せてよいが、**再接続成功時に必ず `GET /api/state` を1回叩いて再描画**してから受信を再開する(切断中のイベント取りこぼし対策)。

---

## 6. 静的ファイル(画像・動画)

### 6.1 画像

- 問題・選択肢画像はサーバーの `GET /images/...` で配信する(認証なし)。
- **入稿は管理者画面からのアップロード(§3.6 `POST /api/admin/images`)。** スプシには `/images/ファイル名` のパスを書く。
  - **当日、運営はサーバー(Proxmox上の本番CT)に触らない。** かつては「サーバーの静的フォルダへ手動配置」と決めていたが、それだとサーバーに直接置くかGitHubにコミットしてpullするしかなく、**当日は画像を1枚も追加できない**。APIを経由する経路に置き換えた(2026-09-09変更)。
  - 準備期間中にサーバーへ直接置くこと自体は禁止しない(配信先は同じ)。当日その場で追加できる経路を必ず用意しておく、という趣旨。
- **ファイル名はアップロードする側が決める**(サーバーは生成しない)。同名アップロードは**上書き**する。詳細は §3.6.2。
- `PUT /api/admin/questions`(§3.5)は参照先ファイルの存在チェックを行い、無ければ `warnings` で知らせる(取り込み自体は成功させる)。
- nginx の `location /images/` は、**長期キャッシュしない**(名前を変えずに差し替える運用のため。当日「差し替えたのに古いのが出る」を避ける)。あわせて `X-Content-Type-Options: nosniff` を付ける(§3.6.3)。

### 6.2 動画(敗者復活用)

- 敗者復活で流す動画はサーバーの `GET /videos/...` で配信する(認証なし)。画像と同じ `r.Static` の作りだが、**別ディレクトリ・別locationの独立した経路**(#121)。
- **アップロードAPIは無い。入稿はCT(本番サーバー)へ scp で直接置く。** §6.1で画像のアップロードAPIに置き換えた「手動配置の廃止」は**画像だけの話であり、動画には適用しない**。
  - 理由: 画像投入API(§3.6)は5MB上限。動画は確実に超えるためそもそも同じ経路に乗らない。動画は当日差し替える頻度が低く、準備期間中〜当日にCTへ scp する運用で足りると判断した。
- ファイル名はアップロードする側(scpする人)が決める。同名での上書きに対応する(長期キャッシュしない設定のため、差し替えれば当日から反映される)。
- nginx の `location /videos/` も画像と同じく長期キャッシュせず(`max-age=300`)、`X-Content-Type-Options: nosniff` を付ける。
- **`.mp4` は Content-Type を明示登録する。** 実行環境(alpine)に `/etc/mime.types` が無く、Goの組み込みMIMEテーブルにも `.mp4` が無いため、登録しないとファイル内容のスニッフィング任せになる。スマホで撮った動画をリネームしただけのファイルは `video/mp4` と判定されないことがあり、`nosniff` と組み合わさるとブラウザが再生を拒否する(`backend/internal/platform/router.go` の `mime.AddExtensionType`)。

---

## 7. スコープ外(この文書で決めないこと)

- Go内部の実装方法・DBテーブルの細部
- 画面デザイン
- 回答送信・集計機能(スマホは表示専用と確定済み)
- 音響連携(効果音は音響スタッフの手動操作。要件確認メモ参照)

## 変更履歴(新しい順)

- 2026-09-14 第15版。**敗者復活用の `revival-video` / `revival-entry` フェーズと `POST /api/admin/revival` を追加**した(#120)。①敗者復活は動画と参加受付で画面全体が2回変わるため、1フェーズ内の表示値ではなく独立した2フェーズとして表す ②通常の流れは `answer → revival-video → revival-entry → question` だが、当日の復旧を妨げないよう `revival` 自体はどのphaseからでも呼べる ③`reset` は全問題の `asked` を消して `askedCount` を0に戻すため敗者復活には使わない。専用APIはphaseだけを更新し、「第8問 → 敗者復活 → 第9問」を維持する ④敗者復活中は出題していないので問題関連項目を `null` / `0` にする一方、`askedCount` は保持する ⑤動画配信・画面・フォームURL・管理者ボタンは後続Issue #121〜#126の範囲 ⑥問題の一括投入は全問題を作り直して `asked` を消すため、`waiting` / `finished` のときだけ許可し、敗者復活中を含む本番進行中は409で拒否する
- 2026-09-14 第14版。**§6 を「静的ファイル(画像・動画)」に改め、§6.2として動画の配信経路 `GET /videos/...` を追記**した(#121)。①敗者復活の動画配信は `/images/` の配信の作りをそのまま真似るが、**アップロードAPIは持たない**(動画は5MB上限の画像投入APIに確実に収まらないため)。**入稿はCTへの scp 固定**で、§6.1で画像について書いた「手動配置の廃止(2026-09-09)」は画像だけの話であり動画には適用されないことを明記した(そのままでは同一節内で矛盾して見えるため) ②実行環境(alpine)にMIMEタイプ定義が無く `.mp4` が拡張子で解決できないため `mime.AddExtensionType` で明示登録する必要があることを明記。登録しないとファイル内容のスニッフィングに委ねられ、動画によっては `video/mp4` と判定されず、nginx の `nosniff` と組み合わさってブラウザが再生を拒否する事故につながる
- 2026-09-13 第13版。**画像一覧API `GET /api/admin/images` を §3.7 として新設**した(#104)。①管理者画面から、画像のURL・ファイルサイズ・更新日時を確認できるようにした。同名アップロードによる意図しない上書きを防ぎ、「すでに投入済みか」を当日サーバーへ入らず確認するため ②対象は `GET /images/...` の配信元である `./static/images`。#103 で `STATIC_DIR` 環境変数は廃止され、画像の配信・投入・存在チェックが `platform.StaticDir` の同じ場所を見る設計に一本化されている ③`.png` / `.jpg` / `.jpeg` のみを `imageUrl` 昇順で返す。画像が無い場合は `{"images":[]}` とし、`.gitkeep`・ディレクトリ・その他の拡張子は含めない ④認証は `ADMIN_TOKEN` のみで、`IMPORT_TOKEN` は通さない。SSE・削除・ページング・サムネイル生成は行わない
- 2026-09-09 第12版。**画像投入API `POST /api/admin/images` を §3.6 として新設**した(#103)。①**§6 の「サーバーの静的フォルダへの手動配置」を廃止**した。**当日、運営はサーバー(本番CT)に触らない**ため、手動配置だと当日は画像を1枚も追加できない。管理者画面から投入できる経路を契約として持つ ②**このAPIのリクエストのみ `multipart/form-data`** とし、**§0「すべてJSON」の唯一の例外**として明記した。base64+JSONは転送量1.33倍・サーバーのピークメモリ約2倍で、`curl -F` の1行で試せる利点も失う。**例外はこの1本に限る** ③**ファイル名はアップロードする側が決める**(サーバーは生成しない)。スプシには運営メンバーが手で `/images/q5.png` と書くため、サーバーがランダムな名前を付けるとシートに何を書けばよいか分からなくなる。**同名の上書きは許可**(nginx が「名前を変えずに差し替える」前提でキャッシュを切っているため、禁止すると運用と矛盾する) ④**中身をマジックナンバーで検証**する(§3.6.3)。拡張子だけを信じると中身がHTMLの `evil.png` を置けてしまい、同一オリジンでJSが動いて `localStorage` の `ADMIN_TOKEN` が読まれる ⑤**認証は `ADMIN_TOKEN` のみ。`IMPORT_TOKEN` は通さない**(GASは画像を送らない)。§0 の「通る範囲」表はそのまま(`IMPORT_TOKEN` は §3.5 のみ) ⑥**サイズ上限は「画像1枚 5MB」と「リクエスト全体 5MB + 64KB」の2つに分ける**(全体には multipart の包みが乗るので、同じ5MBにすると5MBちょうどの画像が通らない)。全体の上限は nginx と Go の両方に置く(開発ではバックエンドを直接叩くためGo側にも要る)。nginx が弾く413はJSON形式ではないので、**フロントは `code` ではなく `status` で分岐する**。**一覧API・削除API・投入UIは別Issue**
- 2026-08-17 第11版。**§4.1 問題一覧レスポンスに項目表を追加**した(仕様の抜けの補完。**API・サーバーの変更はゼロ**)。①`hasImage` が**何の画像を指すのか未定義だった**。`Question` には問題画像(`imageUrl`)と選択肢画像(`choices[].imageUrl`)の2種類があり、どちらを見るかでバックの実装が変わる。**「いずれか1つでも存在すれば `true`」で確定**(一覧のバッジは「この問題は画像を含む」ことが分かればよく、どちらの画像かを区別する意味が無いため) ②**なぜURLではなく boolean なのかを明記**。URLを返すとフロントが `<img>` を並べたくなり、数十件の一覧で画像を数十枚読み込む重い画面ができてしまう。**一覧は「有無・要約」、詳細(§4.2)は「実体」**という役割分担を文章として残した ③このレスポンスは §1 の `Question` とは形が違う(`textSegments`→`textPreview`、`imageUrl`→`hasImage`、`choices`・`correctChoiceId`・`explanation` は無い)のに**区別する名前が無かった**ため、フロントの型名を **`QuestionListItem`** として確定。第8版で `AdminState` / `ViewerState` を確定させたのと同じ趣旨
- 2026-08-16 第10版。**`finished` フェーズの表示要素を確定**した(仕様の抜けの補完。**API・型の変更はゼロ**)。①`finished` は「終了メッセージ+アンケート誘導」としか決まっておらず、**参加用QR(`joinUrl`)を出し続けるのかが未定**だった。参加QRは「途中参加者向け」であり終わったクイズに参加する人はいないこと、`finished` ではアンケートQRを出すため**同じ画面にQRが2つ並ぶと85インチの遠くからどちらを読むか判別できない**ことから、**`finished` では参加QRを出さずアンケートQRに差し替える**と決定 ②ただし**APIは全フェーズで `joinUrl` を送る**(§0「キーは消さない」を維持)。**「送るか」ではなく「画面に出すか」の話**であり、出し分けはフロントの責務であることを §2.2.1 に明記 ③**`askedCount` は `waiting` / `finished` で必ず `0`** になる(`finished` へは `reset {"to":"finished"}` でしか入らず、`reset` が全問の `asked` を `false` に戻すため)。素直に表示すると「**第0問**」と出るため、**問題番号は `question` / `answer` でのみ表示する**と明記 ④**アンケートURLはstateに入らない**(フロントの環境変数 `VITE_SURVEY_URL`)。当日までURLが決まらず、決まってもアプリの再デプロイなしに差し替えたいため。`画面・要件.md` §4 に全フェーズ×表示要素の対応表を新設
- 2026-08-16 第9版。**閲覧者向けの `explanation` を `question` から `answer` オブジェクトの中へ移した。** 第8版では `explanation` だけ phase でキーの有無が変わり、§0「キーは消さない」の唯一の例外として注記していたが、**例外にする必要が無かった**。①解説文は正答を含みうるため隠す理由は `correctChoiceId` と同一であり、公開されるタイミング(`answer` phase)も同一。**同じ理由・同じタイミングで出し入れするものを、別の仕組みで表現していた**のが誤り ②`answer` という入れ物は、§0を守りながら中身のキーを一度も露出させないための仕組み(原則2)。`explanation` も同じ入れ物に入れれば済む ③結果として**§0の例外がゼロになり**、`ViewerQuestion` から省略可能(`?`)フィールドが消え、**閲覧者向けJSON全体で「キーが生え消えするフィールド」が無くなった** ④隠すべき情報が `answer` の中1箇所に集約されるため、**バックの出し分けは「answer が null なら中身を作らない」の1判定で済む**(#11)。**`AdminState` 側は変更なし**(管理者には `question.explanation` として従来どおり届く)。`correctChoiceId` が既に `question`(管理者)→ `answer`(閲覧者)と移動しているため、新しい不揃いは生まれない
- 2026-08-16 第8版。**§1 State と §2.2 閲覧者向けstateに項目表を追加**した。①`Question` には項目表があるのに `State` は JSON実例と補足だけで、**`phase` の取りうる値が §1 に一度も列挙されていなかった**(§0の遷移図と `画面・要件.md` §4 にしか無かった)。データモデルの節だけを見て型が書けない状態だったため、`Question` と同じ形式の表を追加 ②**`timeLimitSec` の null が未定義だった**。§1の補足は `waiting`/`finished` で null になるものとして `question`・`questionStartedAt` しか挙げていないが、§2.2 の waiting 実例は `"timeLimitSec": null` であり矛盾していた。**`number | null` で確定**とし表に明記 ③**閲覧者向けstateに定義が無く、JSON実例3つと文章だけだった**。§1の State とは形が異なる(`joinUrl`・`answer` が増え、`revealedSegments`・`totalSegments` が消え、`question` の中身も別物)にもかかわらず区別する名前が無く、**フロントが §1 だけを見て型を書くとモニタ・スマホの2画面で合わない**。§2.2.1 `ViewerState` / §2.2.2 `ViewerQuestion` として項目表を新設し、`AdminState` と併せて型名を仕様書側で確定させた ④`explanation` のみ phase でキーの有無が変わる点(§0「キーは消さない」の唯一の例外)を明記 ⑤モニタ向けとスマホ向けの差は `joinUrl` の有無だけなので、**`MonitorState = ViewerState & { joinUrl }` と拡張で表す**ことを明記(全項目をコピーした型を作ると二重管理になるため。`joinUrl` を `?` で持たせる案も、スマホ向けにキーごと無いこととモニタ向けに必ず有ることを同時に表せないため不可)。**API・サーバー・既存フロントの挙動変更はゼロ。既に決まっていたことを書き起こしただけ**
- 2026-08-16 第7版。**スプレッドシートの difficulty 列を日本語(`簡単`/`普通`/`難しい`)に変更**し、GASが `easy`/`normal`/`hard` へ変換して送る形にした。①入稿するのは非エンジニアの運営メンバーであり、英語を打たせると表記ゆれ(`Hard` `HARD` `hard␣`)が事故要因になる。**入力する人に合わせ、コード側の都合をシートに押し付けない**という判断 ②変換はGASで行う。`API仕様書.md` §3.5.1 が既に「列→JSONの変換はGASの責務」と定めており、`text`→`textSegments`・`correct`→`correctChoiceId` と同じ扱いに収まる(新しい仕組みは不要) ③**API・DB・フロントの内部表現は英語1種類のまま**。契約に表記を2種類持たせず、「入り口で正規化して中は1種類」を保つ。**サーバー・フロントの実装変更はゼロ** ④管理者画面の問題一覧では逆に日本語へ引き直して表示する(当日焦っている裏方が読むため)
- 2026-08-14 第6版。**モニタ/スマホに「今何問目か」を表示する**ため、State に `askedCount` を追加。①集計元の **`asked` を §1 Question に正式に追加**した(これまで §4.1 の一覧レスポンスにしか書かれておらず、保存が必要な値なのにデータモデルに載っていなかった)。②`askedCount` は `asked` から**毎回導出**し、カウンタを別に保存しない(同じ事実を2箇所に持つとズレるため。`show-question` のやり直しで増えない挙動も自動的に満たせる)。③**フロント側での集計を禁止**。QRから途中参加した端末・再接続した端末が別の数を表示してしまうため、サーバーが配る値を表示するだけにする。④**総問題数(分母)は持たない**。勝ち残り式で当日その場で出題数を増減させるため「全N問」を先に確定できず、表示は「第3問」のように分子のみとする ⑤**「締切」表示を追加**(時間切れの瞬間に画面が何も変わらず会場の空気が途切れるため)。ただし**`close` phaseは作らない**。残り0秒は `questionStartedAt` から各端末が計算で復元できるので、③と同じ基準で**クライアント側の表示状態**とした。**API・サーバーの変更はゼロ**(§0・`画面・要件.md` §4)
- 2026-08-13 第5版。①**`note`(司会者向け補足)を廃止し `explanation`(解説)に一本化**。当日司会者は何も参照できないため非公開メモは不要と判断。スプシの `explanation` 列と名前が一致し、`画面・要件.md` §6「解説はある問題だけanswerフェーズで表示」の受け皿が仕様書に無かった問題も解消。**解説文は正答を含みうるため、`answer` phase の閲覧者にのみ配信**する(question phaseではキーごと存在しない=正答と同じ扱い) ②**`remainingPlayers` と `POST /api/admin/remaining-players` を廃止**。`画面・要件.md` に表示要素としての記述が無く、裏方1人オペで「誰も見ない数字を人力で数えて入力する」操作を残す意味が無いため。API本数 **9本+閲覧2本 → 8本+閲覧2本**
- 2026-08-07 第4版(まとめ役レビュー反映)。①type に `hayaoshi` を追加(**実装はフェーズ2**。v1は投入時に弾く。choices空/correctChoiceId nullの形だけ先に確保し、`view=phone` へは textSegments を送らない原則を§2.2に追加) ②GAS push方式を追認、GASコードの `tools/gas/` 管理を追記 ③認証はBearerで確定、トークン運用ルール3点を§0に追記 ④`show-question` に任意 `timeLimitSec`(省略時30・範囲5〜120)を追加 ⑤type に `arunashi` を追加(形はtwo_choiceと同じ・入稿書式ルールを§3.5.6に追加)。レビュー詳細は `dev_policy/API仕様書レビュー結果.md`
- 2026-08-06 第3版。**Cookie/セッションを全廃**し、管理者APIを `Authorization: Bearer` トークンに一本化。`ADMIN_TOKEN` / `IMPORT_TOKEN` の2種。login・logoutを廃止し `GET /api/admin/verify` に置換。SSE管理者チャンネルのみ `?token=` クエリ。§3.5.5の代替エンドポイントは不要になり統合(APIは計10本+閲覧2本 → **9本+閲覧2本**)
- 2026-08-06 初版。決定事項: 4択/2択のみ / 回答APIなし / 遷移は全て手動 / スプシ同期+画像はURL参照 / タイマーイベント廃止(クライアント計算) / login・remaining-players APIを追加(計10本+閲覧2本)
- 2026-08-06 第2版。問題データの投入をサーバーpull(`POST /api/admin/sync-questions`)から**GASからのpush(`PUT /api/admin/questions`)**へ変更。API keyヘッダ認証・`sourceRow`によるエラー行特定・`details`配列の追加・公開URL前提の明記・代替手段(`POST /api/admin/import-questions`)を追加
