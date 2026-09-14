# Phase型・契約チェック・VITE_REVIVAL_URLの受け皿(#122)実装手順書

対象 Issue: **#122**(【敗者復活3/7】)
関連: #120(バックエンド側。フェーズ追加とdocs修正はこちらの担当)、#123〜#126(実際の敗者復活画面。今回は作らない)

---

## 0. これは何か

**「画面は作らない」と Issue 本文に明記されている、型と設定だけのタスクです。** `revival-video` / `revival-entry` という2つの新フェーズを、フロントの型・契約チェック・環境変数の"受け皿"として通すところまでが範囲です。実際にその2フェーズで何を表示するかは #123〜#126 が決めます。

**易しいIssueですが、抜け漏れが起きやすい理由が2つあります。**

1. `VITE_REVIVAL_URL` は**ビルド時に焼き込まれる値**なので、1箇所でも渡し忘れると「本番だけ空になる」事故になり、しかも気づきにくい(開発では動いて見える)
2. 今回の変更で `frontend/src/features/admin/labels.ts` の型チェックが**Issue本文に書かれていない場所で**落ちます(§3-4で説明)。焦らず対応してください。

### 読む順番

| # | 読むもの | 何が分かるか |
|---|---|---|
| 1 | [`docs/入門/React・TypeScript入門.md`](../docs/入門/React・TypeScript入門.md) | このリポジトリのフロント全体の作り |
| 2 | [`docs/ガイドライン/開発フローガイド.md`](../docs/ガイドライン/開発フローガイド.md) | Issueを取る→ブランチ→PRの一般的な流れ(本書では繰り返しません) |
| 3 | **この文書** | #122 固有の、具体的な変更箇所と手順 |
| 4 | [Issue #122 本文](https://github.com) | 受け入れ条件の一次情報 |

---

## 1. 変更するファイル一覧(全8ファイル)

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `frontend/src/types/phase.ts` | `Phase` 型に2値追加 |
| 2 | `frontend/src/lib/assertStateContract.ts` | `VALID_PHASES` に2値追加 / waiting・finishedと同じ扱いの条件に2値追加(配列化) |
| 3 | `frontend/src/features/admin/labels.ts` | **(Issueに明記なし・型チェックのために必須)** `PHASE_LABEL` に2値追加 |
| 4 | `frontend/src/vite-env.d.ts` | `VITE_REVIVAL_URL` の型定義 |
| 5 | `frontend/src/lib/config.ts` | `REVIVAL_URL` の定義 |
| 6 | `.env.example` | `VITE_REVIVAL_URL=`(空) |
| 7 | `.env.prod.example` | `VITE_REVIVAL_URL=`(空。**2箇所ある**) |
| 8 | `docker-compose.yml` / `docker-compose.prod.yml` / `frontend/Dockerfile.prod` | 動作確認用の仮URL・本番へのビルド引数の受け渡し |

**今回さわらないもの(意図的にスコープ外):**

- `docs/実装要件/*.md` … #120 が「4. docsを直す」として担当。#122 の Issue 本文には docs の項目自体が無い
- `frontend/src/features/phone/PhonePage.tsx` / `MonitorPage.tsx` の `switch` … 両方とも `default:` があるので型チェックは通る。新フェーズは `LoadingView` に落ちるだけで、画面自体は #123〜#126 が作る
- `frontend/src/lib/mock/**` … モック追加は今回不要(画面を作らないため使い道がない)

---

## 2. 環境を動かす

このworktreeは既に `feat/122-phase-type` ブランチです。まだ起動していなければ:

```bash
mise run up
```

型チェック・lintはコンテナ越しに実行するので、起動しておかないと §5 の確認コマンドが動きません。

---

## 3. 手順

### 3-1. `Phase` 型に2値足す

`frontend/src/types/phase.ts`:

```ts
export type Phase = 'waiting' | 'question' | 'answer' | 'finished' | 'revival-video' | 'revival-entry'
```

現状は1行だけのファイルなので、この1行を書き換えるだけです。

### 3-2. 契約チェックに通す

`frontend/src/lib/assertStateContract.ts` の2箇所を直します。

**① `VALID_PHASES` に足す:**

```ts
const VALID_PHASES = ['waiting', 'question', 'answer', 'finished', 'revival-video', 'revival-entry'] as const
```

**② `waiting` / `finished` と同じ扱いにする。** 現状はこう書かれています:

```ts
if (state.phase === 'waiting' || state.phase === 'finished') {
```

Issue の指示どおり、**条件を並べるのではなく配列+`includes`に切り出します**(この先3個目・4個目が増えても1箇所で済むように)。ファイル先頭付近、`VALID_PHASES` の下あたりに定数を足し、判定を置き換えてください:

```ts
// question を出していないフェーズ。question/timeLimitSec/questionStartedAt が
// null であるべき、という制約を共有する
const NO_QUESTION_PHASES = ['waiting', 'finished', 'revival-video', 'revival-entry'] as const

// ...

if (NO_QUESTION_PHASES.includes(state.phase as (typeof NO_QUESTION_PHASES)[number])) {
  if (state.question !== null && state.question !== undefined) {
    errors.push(`question must be null when phase is "${state.phase}".`)
  }
  if (!isTimeLimitNull || !isStartedAtNull) {
    errors.push(`questionStartedAt and timeLimitSec must be null when phase is "${state.phase}".`)
  }
}
```

`question` / `answer` 側の条件(`if (state.phase === 'question' || state.phase === 'answer')`)は変更不要です。新フェーズはそちらに該当しません。

### 3-3. 【Issueに書かれていない追加対応】`labels.ts` の型エラーを直す

`frontend/src/features/admin/labels.ts` に、`Phase` の**全パターンを埋めることを強制される**マップがあります:

```ts
const PHASE_LABEL: Record<Phase, string> = {
  waiting: '待機中',
  question: '出題中',
  answer: '正答発表',
  finished: '終了',
}
```

`Phase` に2値足した時点で、`Record<Phase, string>` はキー不足でコンパイルエラーになります(`pnpm typecheck` が落ちる)。管理者画面の状態バッジ(`CurrentStatus.tsx`)が参照しているだけなので、2値分を足せば直ります:

```ts
const PHASE_LABEL: Record<Phase, string> = {
  waiting: '待機中',
  question: '出題中',
  answer: '正答発表',
  finished: '終了',
  'revival-video': '敗者復活(動画)',
  'revival-entry': '敗者復活(受付)',
}
```

日本語の文言はここでの仮置きです。運用上おかしければ自由に変えて構いません(このIssueの受け入れ条件には文言の指定がありません)。

### 3-4. `VITE_REVIVAL_URL` を通す

**`VITE_SURVEY_URL` と完全に同じ扱いにする**のが Issue の指示です。実際に `grep -rn VITE_SURVEY_URL` した結果、コードに関係する箇所は以下の6ファイルでした(docsは対象外・§1参照)。

#### ① `frontend/src/vite-env.d.ts`

現状:

```ts
interface ImportMetaEnv {
  readonly VITE_API_URL?: string // 未設定可。空なら相対パス(→ lib/config.ts)
  readonly VITE_USE_MOCK: string
  readonly VITE_SURVEY_URL?: string // 未設定可。空ならアンケート導線を出さない(→ lib/config.ts)
}
```

`VITE_SURVEY_URL` の行の下に1行足す:

```ts
  readonly VITE_REVIVAL_URL?: string // 未設定可。空なら敗者復活の参加導線を出さない(→ lib/config.ts)
```

#### ② `frontend/src/lib/config.ts`

現状の該当行:

```ts
export const SURVEY_URL: string = import.meta.env.VITE_SURVEY_URL ?? ''
```

この下に足す:

```ts
export const REVIVAL_URL: string = import.meta.env.VITE_REVIVAL_URL ?? ''
```

`SURVEY_URL` の上にあるコメント(「ここで throw してはいけない」「呼び出し側は空文字のときリンク自体を描画しないこと」)は `REVIVAL_URL` にもそのまま当てはまります。同じ注意書きを踏襲するか、コメントを2変数共通の説明に書き直すかは実装者の判断で構いません(意味を変えないこと)。

#### ③ `.env.example`

`VITE_SURVEY_URL=`(27行目)の下に足す:

```
# 敗者復活の参加用Google FormのURL(revival-entryフェーズで表示)
VITE_REVIVAL_URL=
```

**⚠️ 空のままコミットしてください。** 本番のフォームURLをここに書かない(Issueの警告どおり。このリポジトリはpublicです)。

#### ④ `.env.prod.example`

**ここは `VITE_SURVEY_URL=` が32行目と40行目の2箇所にあります**(履歴上の重複で、既存のバグではなく意図的な二重定義かは不明ですが、今回はこの構造を壊さず踏襲します)。**両方に** `VITE_REVIVAL_URL=` を追加してください。40行目側には既存の `VITE_SURVEY_URL` と同じように説明コメントを足すのがおすすめです:

```
# 敗者復活の参加用Google FormのURL(revival-entryフェーズの導線)。
# ★ ビルド時に焼き込まれる。値を変えたら frontend の再ビルドが必要。
# 空のままだと敗者復活の参加導線が表示されないだけで、他は正常に動く。
VITE_REVIVAL_URL=
```

こちらも空のままコミットします。実URLは `.env.prod`(gitignore済み)にのみ書きます。

#### ⑤ `docker-compose.yml`

29行目、動作確認用の仮URLの行:

```yaml
      - VITE_SURVEY_URL=${VITE_SURVEY_URL:-https://example.com/survey}   # 動作確認用の仮
```

この下に足す:

```yaml
      - VITE_REVIVAL_URL=${VITE_REVIVAL_URL:-https://example.com/revival}   # 動作確認用の仮
```

#### ⑥ `docker-compose.prod.yml`

22行目、`args` の中:

```yaml
      args:
        - VITE_SURVEY_URL=${VITE_SURVEY_URL}
```

この下に足す:

```yaml
        - VITE_REVIVAL_URL=${VITE_REVIVAL_URL}
```

#### ⑦ `frontend/Dockerfile.prod`

**ここが一番間違えやすい箇所です。** Issue には「ARGとENVを2ステージ分(24行目付近と34行目付近)」と書かれていますが、実際にファイルを開くと **`FROM node:22 AS build` という1つのビルドステージの中に、`ARG VITE_SURVEY_URL` / `ENV VITE_SURVEY_URL=...` の組が2回**(23〜24行目と34〜35行目)出てきます(間に `RUN pnpm build` が2回走る、過去の変更が積み重なった結果の構造です)。**「2ステージ」は文字どおりのDockerビルドステージが2つあるという意味ではなく、この2箇所を指しています。** 今回はこの構造自体を直さず(スコープ外)、両方に同じようにミラーしてください。

1つ目(22〜25行目付近):

```dockerfile
# サーベイ用URLは渡す
ARG VITE_SURVEY_URL
ENV VITE_SURVEY_URL=$VITE_SURVEY_URL
RUN pnpm build
```

→ 下に足す:

```dockerfile
# 敗者復活の参加用URLも渡す
ARG VITE_REVIVAL_URL
ENV VITE_REVIVAL_URL=$VITE_REVIVAL_URL
```

2つ目(33〜37行目付近、コメントの直後):

```dockerfile
ARG VITE_SURVEY_URL
ENV VITE_SURVEY_URL=$VITE_SURVEY_URL

RUN pnpm build
```

→ 同様に足す:

```dockerfile
ARG VITE_REVIVAL_URL
ENV VITE_REVIVAL_URL=$VITE_REVIVAL_URL
```

**ここで渡し漏れると、本番ビルドだけ `REVIVAL_URL` が空になります。** `docker-compose.prod.yml` の `args` に足しても、`Dockerfile.prod` 側で `ARG` 宣言が無いと値は届きません(Docker のビルド引数の仕様)。

---

## 4. 動作確認(受け入れ条件との対応)

Issue の受け入れ条件は3つです。上から順に確認してください。

### ① `mise run lint` と型チェックが通る

```bash
mise run lint
```

`pnpm typecheck` の行で `labels.ts` のエラーが出ないこと(§3-3を忘れていると `Property 'revival-video' is missing` 系のエラーが出ます)。

### ② `VITE_REVIVAL_URL` を設定して `npm run build` した成果物に、その URL が入っている

**⚠️ #122の時点では、このコマンドは何も出力せず非0終了します。** `REVIVAL_URL`(`config.ts`)を実際に使う画面がまだ無いため、Viteの本番ビルド(Rollup)が未参照のexportをtree-shakingで消してしまうからです。配線ミスではありません(§0の注意点も参照)。

```bash
docker compose exec frontend sh -c \
  "VITE_REVIVAL_URL=https://example.com/revival-test pnpm build && grep -rl 'example.com/revival-test' dist/assets/"
```

`dist/assets/` 配下の `.js` ファイル名が1つ出てくれば、値が焼き込まれています。**現状のコードでは出ません。** 配線そのものが正しいかは、一時的に `frontend/src/main.tsx` などから `REVIVAL_URL` を1行importして確認し、確認し終えたら必ず元に戻してください(このIssueのスコープでは画面を作らないので、恒久的な参照コードは残さない)。この受け入れ条件が本当の意味で満たされるのは、#123〜#126のいずれかが `REVIVAL_URL` を画面で使い始めてからです。

### ③ 未設定でもビルドが通り、`REVIVAL_URL` が `''` になる

```bash
docker compose exec frontend sh -c \
  "unset VITE_REVIVAL_URL; pnpm build && grep -rl 'example.com/revival-test' dist/assets/ || echo 'OK: 前回ビルドの値は残っていない'"
```

ビルド自体がエラーなく終わり、直前のテスト用URLが残っていないことを確認します(dist は毎回上書きされるので、これで「未設定でも壊れない」ことの確認になります)。

### 参考: 本番向けDockerイメージのビルドで一気に確認する

```bash
docker compose -f docker-compose.prod.yml build frontend \
  --build-arg VITE_REVIVAL_URL=https://example.com/revival-test
```

これが失敗せず通れば、`docker-compose.prod.yml` → `Dockerfile.prod` の配線(§3-4⑥⑦)が繋がっています。

---

## 5. PRの出し方

流れそのものは [`開発フローガイド.md`](../docs/ガイドライン/開発フローガイド.md) のとおりです。このIssue特有の点だけ:

- 証拠として §4 の3つのコマンドの実行結果をそのまま貼る(特に②③はビルド成果物の中身なので、目視ではなくコマンド結果で示す)
- **`.env.example` / `.env.prod.example` に実URLが入っていないこと**をdiffで確認してからpushする(`git diff` で `VITE_REVIVAL_URL=` の後ろが空であることを目で見る)
- 画面(#123〜#126)やdocs(#120)には触れていない旨をPR説明に一言書いておくと、レビュワーが範囲を把握しやすい

---

## 6. 詰まったら

| 症状 | 原因 |
|---|---|
| `pnpm typecheck` が `labels.ts` で落ちる | §3-3 を忘れている(`PHASE_LABEL` の埋め漏れ) |
| ビルドは通るがURLが焼き込まれない | `Dockerfile.prod` 側に `ARG` 宣言が無い(§3-4⑦)。`docker-compose.prod.yml` の `args` だけでは届かない |
| 開発環境(`mise run up`)では動くのに本番ビルドだけ空になる | ビルド時の値と実行時の値を混同している。`VITE_*` は**ビルドした瞬間**に焼き込まれ、コンテナ起動時の環境変数は効かない |
| `assertStateContract` の警告が消えない | `VALID_PHASES` に足し忘れている(§3-2①) |
