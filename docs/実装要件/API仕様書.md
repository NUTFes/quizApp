# docs/api.md — クイズアプリ API仕様書

> フロント班とバック班の契約書。この文書だけを見て両班が独立に実装できることをゴールとする。
> 前提決定: 形式は4択/2択(○×は2択に統合)/あるなし/早押し(**早押しはv1未実装・フェーズ2**。仕様上の形だけ先に確保)・スマホは表示専用(回答APIなし)・phase遷移はすべて管理者操作・問題はスプレッドシートから同期・画像はサーバー配置をURL参照。

---

## 0. 共通ルール(全APIに適用)

- リクエスト/レスポンスはすべて JSON(UTF-8)。`Content-Type: application/json`。
- **エラーの形は全API共通**:

  ```json
  { "error": { "code": "QUESTION_NOT_FOUND", "message": "questionId=99 は存在しません" } }
  ```

  - `code` は機械用。**フロントはcodeで分岐**し、ユーザーに見せる日本語はフロント側で持つ。
  - `message` は開発者向けデバッグ文言。表示に使わない(バックが自由に変えてよい)。
- 日時はすべて **ISO 8601 + タイムゾーン付き**(例: `"2026-09-13T13:05:00+09:00"`)。
- **キーは消さない**: 値が無いときは `null`、空リストは `[]`。同一宛先内ではphaseによらずキー構成は常に一定。
- 状態変更系API(§3)の成功レスポンスは、**すべて「更新後のstate(管理者向け・§2.1の形)」**。個別の形を覚える必要はない。
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
     ▲                        │    ▲                          │
     │                        │    │ advance-text             │ show-question(次の問題)
     │                        └────┘ (セグメント表示を進める)   ▼
     │                                                     question
     │                  reset {"to":"waiting"}                │
     ├────────────────────◀───(どのphaseからでも)◀────────────┤
     │                                                        │
  finished ◀──────── reset {"to":"finished"} ◀────────────────┘
```

- 遷移はすべて管理者の操作。時間切れによる自動遷移は**ない**(タイマーは表示のみ)。
- ただし `question` の中には**「締切」という表示状態**がある。残り0秒でクライアントが自分で切り替えるもので、**phaseは `question` のまま**動かない(§0・`画面・要件.md` §4)。バック班がこのために書くコードは無い。
- `answer` 中に `show-question` を呼ぶと次の問題へ(waitingを経由しない)。
- 同じ問題を `question` 中に再度 `show-question` すると**その問題をやり直し**(セグメント・タイマーがリセット)。

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
| `explanation` | 正答の解説。**ほとんどの問題は `null`**(スプシの `explanation` 列が空)。**`answer` phase の閲覧者にだけ配信する**(§2.2)。解説文は正答を含みうるため、question phase では送らない |
| `asked` | このゲーム中に出題済みか。**スプシ由来ではなくサーバーが管理する**(投入時は必ず `false`)。`show-question` で `true`、`reset` で全問 `false` に戻る。管理者の問題一覧で「もう出した問題」を潰すために使い、**`askedCount`(State)の集計元**でもある |

### State(現在の状態)— アプリの中心

管理者向けのフル形。閲覧者(モニタ/スマホ)向けは§2.2で削った形になる。

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

- `phase` が `waiting` / `finished` のとき: `question` `questionStartedAt` は `null`、`revealedSegments` `totalSegments` は `0`。**キーは残る**。
- `askedCount` は**「今何問目か」**。`asked` が `true` の問題を数えた値で、`asked` から**毎回導出する**(この数を別途保存しない。二重管理を避けるため)。**出題中の問題自身を含む**ので、1問目を出している最中は `1`(`0` ではない)。画面には「第1問」と出る。
  - **同じ問題を `show-question` し直しても増えない**(`asked` が既に `true` のため)。`reset` すると `0` に戻る。
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
3'. **`explanation` は `answer` phase の閲覧者向けJSONにのみ含める。** question phase では**キーごと存在しない**。解説文は正答を含みうるため、正答と同じ扱いにする
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
  "question": { …同上(textSegmentsは全セグメント公開済み。**ここで初めて `explanation` が入る**)… },
  "answer": { "correctChoiceId": "B" }
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

**スマホ向け(`view=phone`)**: モニタ向けから `joinUrl` を除いた形(自分がすでにそのURLにいるため)。それ以外は完全に同一。

---

## 3. 状態変更(管理者API・認証必須)

成功時は**すべて `200 OK` + 更新後のstate(§2.1のフル形)**を返す。
副作用として**全宛先へSSE `state` イベントが配信される**(中身は§5の出し分け)。以下、この2点は各APIで省略する。

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
| phase が `question`/`answer`(本番進行中の置換は禁止) | 409 | `INVALID_PHASE` |

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

- `textPreview` はセグメント結合済みの全文。`asked` は§1のとおり(このゲーム中に出題済みか。`show-question` で `true`、`reset` で `false`)。裏方が「もう出した問題」を潰すために使う。
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

スマホに届く `state`(抜粋)— **`correctChoiceId` も3つ目のセグメントも `explanation` も存在しない。`askedCount` は同じ値が届く**:

```json
{ "phase": "question", "askedCount": 3,
  "question": { "textSegments": ["この問題文は", "スラッシュ区切りで"], … },
  "answer": null }
```

### 再接続

- クライアントはEventSourceの自動再接続に任せてよいが、**再接続成功時に必ず `GET /api/state` を1回叩いて再描画**してから受信を再開する(切断中のイベント取りこぼし対策)。

---

## 6. 静的ファイル(画像)

- 問題・選択肢画像はサーバーの `GET /images/...` で配信する(認証なし)。
- 入稿はサーバーの静的フォルダへの手動配置。スプシには `/images/ファイル名` のパスを書く。
- `sync-questions` は参照先ファイルの存在チェックを行い、無ければ `warnings` で知らせる(取り込み自体は成功させる)。

---

## 7. スコープ外(この文書で決めないこと)

- Go内部の実装方法・DBテーブルの細部
- 画面デザイン
- 回答送信・集計機能(スマホは表示専用と確定済み)
- 音響連携(効果音は音響スタッフの手動操作。要件確認メモ参照)

## 変更履歴(新しい順)

- 2026-08-16 第7版。**スプレッドシートの difficulty 列を日本語(`簡単`/`普通`/`難しい`)に変更**し、GASが `easy`/`normal`/`hard` へ変換して送る形にした。①入稿するのは非エンジニアの運営メンバーであり、英語を打たせると表記ゆれ(`Hard` `HARD` `hard␣`)が事故要因になる。**入力する人に合わせ、コード側の都合をシートに押し付けない**という判断 ②変換はGASで行う。`API仕様書.md` §3.5.1 が既に「列→JSONの変換はGASの責務」と定めており、`text`→`textSegments`・`correct`→`correctChoiceId` と同じ扱いに収まる(新しい仕組みは不要) ③**API・DB・フロントの内部表現は英語1種類のまま**。契約に表記を2種類持たせず、「入り口で正規化して中は1種類」を保つ。**サーバー・フロントの実装変更はゼロ** ④管理者画面の問題一覧では逆に日本語へ引き直して表示する(当日焦っている裏方が読むため)
- 2026-08-14 第6版。**モニタ/スマホに「今何問目か」を表示する**ため、State に `askedCount` を追加。①集計元の **`asked` を §1 Question に正式に追加**した(これまで §4.1 の一覧レスポンスにしか書かれておらず、保存が必要な値なのにデータモデルに載っていなかった)。②`askedCount` は `asked` から**毎回導出**し、カウンタを別に保存しない(同じ事実を2箇所に持つとズレるため。`show-question` のやり直しで増えない挙動も自動的に満たせる)。③**フロント側での集計を禁止**。QRから途中参加した端末・再接続した端末が別の数を表示してしまうため、サーバーが配る値を表示するだけにする。④**総問題数(分母)は持たない**。勝ち残り式で当日その場で出題数を増減させるため「全N問」を先に確定できず、表示は「第3問」のように分子のみとする ⑤**「締切」表示を追加**(時間切れの瞬間に画面が何も変わらず会場の空気が途切れるため)。ただし**`close` phaseは作らない**。残り0秒は `questionStartedAt` から各端末が計算で復元できるので、③と同じ基準で**クライアント側の表示状態**とした。**API・サーバーの変更はゼロ**(§0・`画面・要件.md` §4)
- 2026-08-13 第5版。①**`note`(司会者向け補足)を廃止し `explanation`(解説)に一本化**。当日司会者は何も参照できないため非公開メモは不要と判断。スプシの `explanation` 列と名前が一致し、`画面・要件.md` §6「解説はある問題だけanswerフェーズで表示」の受け皿が仕様書に無かった問題も解消。**解説文は正答を含みうるため、`answer` phase の閲覧者にのみ配信**する(question phaseではキーごと存在しない=正答と同じ扱い) ②**`remainingPlayers` と `POST /api/admin/remaining-players` を廃止**。`画面・要件.md` に表示要素としての記述が無く、裏方1人オペで「誰も見ない数字を人力で数えて入力する」操作を残す意味が無いため。API本数 **9本+閲覧2本 → 8本+閲覧2本**
- 2026-08-07 第4版(まとめ役レビュー反映)。①type に `hayaoshi` を追加(**実装はフェーズ2**。v1は投入時に弾く。choices空/correctChoiceId nullの形だけ先に確保し、`view=phone` へは textSegments を送らない原則を§2.2に追加) ②GAS push方式を追認、GASコードの `tools/gas/` 管理を追記 ③認証はBearerで確定、トークン運用ルール3点を§0に追記 ④`show-question` に任意 `timeLimitSec`(省略時30・範囲5〜120)を追加 ⑤type に `arunashi` を追加(形はtwo_choiceと同じ・入稿書式ルールを§3.5.6に追加)。レビュー詳細は `dev_policy/API仕様書レビュー結果.md`
- 2026-08-06 第3版。**Cookie/セッションを全廃**し、管理者APIを `Authorization: Bearer` トークンに一本化。`ADMIN_TOKEN` / `IMPORT_TOKEN` の2種。login・logoutを廃止し `GET /api/admin/verify` に置換。SSE管理者チャンネルのみ `?token=` クエリ。§3.5.5の代替エンドポイントは不要になり統合(APIは計10本+閲覧2本 → **9本+閲覧2本**)
- 2026-08-06 初版。決定事項: 4択/2択のみ / 回答APIなし / 遷移は全て手動 / スプシ同期+画像はURL参照 / タイマーイベント廃止(クライアント計算) / login・remaining-players APIを追加(計10本+閲覧2本)
- 2026-08-06 第2版。問題データの投入をサーバーpull(`POST /api/admin/sync-questions`)から**GASからのpush(`PUT /api/admin/questions`)**へ変更。API keyヘッダ認証・`sourceRow`によるエラー行特定・`details`配列の追加・公開URL前提の明記・代替手段(`POST /api/admin/import-questions`)を追加
