# AGENTS.md — 技大祭クイズアプリ 引き継ぎ書

このリポジトリで作業するAIエージェント/開発者向けの引き継ぎドキュメント。
新しいセッション・新しいフォルダで作業を続けるときは、まずこれを読む。詳細は各リンク先へ。

---

## 0. まず作業スタイル(このプロジェクト特有・重要)

- **ユーザーはほぼ初心者チームのまとめ役**(プロジェクトリーダー初経験)。技術用語は前提にせず、**第一原理から噛み砕いて説明する**。専門用語には必ず一言の補足を付ける。
- **やり取りは日本語**。回答も日本語で。
- **教えてから決める**の順で進む。いきなり結論や設計を出すより、「なぜそうなるか」を理解してもらってから決定に進むと噛み合う。
- **決定したら必ず両方に反映する**: ①関連する `docs/` または `dev_policy/` のファイル、②(Claude Codeの場合)永続メモリ。反映漏れが後で食い違いを生む。
- `AskUserQuestion` のような選択UIより、**自由記述の対話**を好むユーザー。相談は散文で。
- `docs/` = 確定版・メンバー配布用の完全版。`dev_policy/` = 検討過程・TODO・まとめ役の作業用。**この2層を混ぜない**。

---

## 1. 何を作っているか(1分で把握)

技大祭(NUTFES / nutmeg)の**リアルタイムクイズ大会アプリ**。ただし普通の回答アプリではない。

- **ゲーム形式**: 勝ち残り × 移動形式。会場を2×2の4エリアに分け、参加者は選択肢に対応するエリアへ**物理的に移動**して回答。正誤判定・脱落は**人力**。
- **アプリに回答機能はない**。アプリの役目は「モニタ・スマホ・管理者の3画面を、裏方1人の操作で一斉に切り替える」こと。
- 3画面: **モニタ**(会場の85インチ大画面・主役)/ **スマホ**(参加者の手元ミラー・操作要素ゼロ)/ **管理者**(裏方1人の操作盤)。
- 規模: 例年 約200人。SSE同時接続=参加人数分。

詳細な要件 → [`docs/画面・要件.md`](docs/画面・要件.md)(画面仕様の**正**)

---

## 2. 技術構成

| 層 | 技術 |
|---|---|
| フロント | Vite + React + TypeScript(1アプリ内で `/`=スマホ, `/monitor`, `/admin` をルート分け予定)。Tailwind・React Routerは未導入(動作確認後に追加) |
| バック | Go(+ 予定: Gin + GORM + golang-migrate)。**現状はまだ標準ライブラリのみ**(§4参照) |
| リアルタイム | **SSE(一方向配信)**。WebSocketは不採用(回答機能がなく下り一方向で足りるため) |
| DB | PostgreSQL 16(Docker) |
| 問題入稿 | Googleスプレッドシート → GAS が整形 → `PUT /api/admin/questions` でpush投入 |
| 環境 | Docker Compose(frontend/backend/db)+ mise(コマンド集約・バージョン固定) |

詳細 → [`docs/技術スタック.md`](docs/技術スタック.md) / [`docs/mise入門.md`](docs/mise入門.md) / [`docs/docker-compose入門.md`](docs/docker-compose入門.md)

### 確定済みの重要な設計判断

- **配信の出し分け(3宛先)**: 同じ状態でも、管理者/モニタ/スマホで**サーバーが中身を変えて**送る。未公開の正答・早押しの問題文は、公開向けJSONに**そもそも入れない**(クライアントで隠すのではなくサーバーで抜く=開発者ツールで覗けない)。
- **認証は Bearerトークン**方式で確定(Cookie不採用)。`ADMIN_TOKEN`(管理者API)/ `IMPORT_TOKEN`(問題投入)。SSEのみ `?token=` クエリ。ログイン機能はなく `verify` で照合するだけ。トークンは長いランダム文字列・本番用は使い捨て運用。
- **タイマー**: サーバーは残り秒数を送らない。`serverTime` と `questionStartedAt` + `timeLimitSec` からクライアントが計算(端末時計のズレを serverTime で補正)。
- **問題形式(type)**: `four_choice`(2×2配置)/ `two_choice`(左右・○×も含む)/ `arunashi`(左右)/ `hayaoshi`(**v1未実装・フェーズ2**)。

---

## 3. リポジトリ構成

```
quizApp/
├── AGENTS.md            … このファイル
├── README.md           … 開発環境セットアップ手順
├── mise.toml           … コマンド集約 + ツール版固定(go1.25/node22/pnpm10)
├── docker-compose.yml  … 3コンテナの編成
├── .env.example        … 環境変数の見取り図
├── frontend/           … Vite+React+TS(最小構成・Hello World済み)
│   └── src/            …   将来 features/ types/ lib/ shared/ を切る
├── backend/            … Go。cmd/server/main.go が入口
│   └── (将来) internal/{question,event,admin,sheetsync,sse,platform}/, migrations/
├── docs/               … 確定版ドキュメント(下記)
├── dev_policy/         … 検討過程・方針メモ(下記)
└── .github/            … CI(ci.yml)・PR/Issueテンプレート
```

### docs/(確定版・メンバー配布用)

| ファイル | 内容 |
|---|---|
| `画面・要件.md` | 何を作るか。**画面仕様の正** |
| `技術スタック.md` | 使う技術と理由(HTML/CSS経験者向け) |
| `API仕様書.md` | **フロント/バックの契約書。最重要。第4版**。変更はここを先に直す |
| `バックエンド実装要件.md` | 契約に書かない実装側の要件(nullable設計・検証・出し分け等) |
| `フロントエンド実装要件.md` | 同・フロント側(state全再描画・タイマー計算・型別表示等) |
| `バックエンド初心者タスク.md` | API仕様から割った初心者向けIssue案7本 |
| `mise入門.md` / `docker-compose入門.md` / `CI・コードチェック入門.md` | 初心者向け技術解説 |

### dev_policy/(検討過程・TODO)

`README.md`(索引)、`画面・要件確定_policy.md`、`API・データ設計_policy.md`、`技術スタック_policy.md`、`フォルダ構成_policy.md`、`開発環境_policy.md`、`Git運用・CI_policy.md`、`タスク分割・進め方_policy.md`、`インフラ・デプロイ_policy.md`、`API設計完了の基準.md`、`API仕様書レビュー結果.md`。

### 姉妹フォルダ(git管理外)

`../pre_QuizApp/` にユーザーの作業メモ・元資料(`pre_res/`)・手順書がある。**docsはpre_QuizApp側で執筆してからquizAppへ手動同期する運用**だったが、最近は直接quizAppを編集することも増えている。編集時はどちらが最新か確認する。

---

## 4. 現在の状態(2026-08-11時点)

### できていること

- ドキュメント一式(要件・技術・API仕様書 第4版・実装要件・初心者タスク)
- 基盤ファイル一式(mise.toml / docker-compose.yml / frontend最小構成 / backend最小構成 / .gitignore等 / README / CI / テンプレート)
- backend最小サーバー: `GET /api/health`(`{"status":"ok"}`)+ SSE `GET /api/events`(接続挨拶 + 15秒ハートビート)

### ⚠️ backendが標準ライブラリのみな理由(誤解しないこと)

現状の `backend/cmd/server/main.go` は **Gin/GORMを使わず net/http だけ**で書いてある。これは意図的:
Gin/GORMを go.mod に入れると **go.sum(検証ハッシュ台帳)が必要**になり、これは `go get` を実行しないと生成できない。ファイルを手書きしただけの状態で `mise run up` すると go.sum が無くて止まる。
→ **標準ライブラリのみなら go.sum 不要で確実に起動する**。Gin/GORMは WSL2 で実際に `go get` するときに go.sum ごと正しく入る。本物のエンドポイント実装に着手する最初のステップが「Gin/GORM/golang-migrate を go get する」こと。

### まだ動かしていない(次の関門)

`mise run up` による起動確認は**まだWSL2で実行していない**。これが基盤づくりの最後の検収。

---

## 5. すぐ次にやること(優先順)

1. **未コミット分をコミット & push**(基盤ファイル群とドキュメント群は分けると履歴が読みやすい)
2. **WSL2へ移行**: WindowsユーザーはWSL2内にcloneする必要がある(Windows側フォルダだとDockerのホットリロードが遅い/効かない)。手順: WSL2にmise導入 → `git clone` → `mise trust` → `mise install` → `mise run up`
3. **検収**: http://localhost:5173 で「技大祭クイズ 🎉」、http://localhost:3000/api/health で `{"status":"ok"}` が出れば基盤完成
4. **GitHubでmainブランチ保護**(PR必須・CI必須。GitHub UIでの手作業)
5. その後の開発: バックは Gin/GORM 導入 → 見本エンドポイント `GET /api/admin/state` をリーダー+まとめ役で作る(初心者タスクの写経元)。フロントはモックで各画面。

### 未解決の宿題

- **`explanation`(解説)フィールドがAPI仕様書に無い**。`docs/画面・要件.md` §6 では「解説はある問題だけanswerフェーズで表示」が確定事項。仕様書の `note`(司会者向け)とは別物。**リーダーに意図を確認**して仕様書 or 画面・要件.md のどちらかを直す必要がある。
- インフラ運用者への確認Q1〜Q6(→ `dev_policy/インフラ・デプロイ_policy.md`)。GAS push方式のため**公開HTTPS URLが準備期間中に必要**になり優先度が上がっている。

---

## 6. 開発ルール(コードを書くとき)

1. **新機能は feature フォルダに新フォルダを切る**(front: `src/features/`、back: `internal/`)。既存フォルダに別機能を混ぜない。1タスク=1フォルダでコンフリクトを防ぐ。
2. **API仕様を変えるときは `docs/API仕様書.md` を先に直す**。実装とずれたら仕様書が正。
3. `main` へ直接pushしない。ブランチ → PR → approve1件 → **squash merge**。コミット/PRは日本語1行でよい。
4. 使うコマンドは `mise run <task>`(`mise tasks` で一覧)。直接 `docker compose` を叩かない。
5. エラーレスポンスの `code` は契約(フロントが分岐に使う)。`message` は開発者向けで自由。
