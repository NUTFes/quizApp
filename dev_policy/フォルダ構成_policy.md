# フォルダ構成 policy

> 2026-07-20 更新: バックエンドGo化に伴い backend/ をGo標準レイアウトに変更。
> `packages/shared`(TS型共有)は廃止し、`docs/api.md` を契約とする方式に変更。
>
> 2026-08-27 更新: 構成案を実装の現状に合わせて全面的に書き直した。
> 主な差分は「feature名が計画時と変わった(`quiz`→`phone` など)」「回答受付機能が
> スコープ外になり `answer/` が消えた」「feature内部を `views/` + `parts/` に分ける
> 運用が定着した」「docs/ が3分割された」の4点。

## 方針

- **1リポジトリのモノレポ**。フロント/バックを別リポジトリにすると、初心者チームではPRレビュー・環境構築・仕様書参照が全部二重になる。
- コンテナは **frontend / backend / db の3つ**に分ける。
- 「機能追加を見通した動的なフォルダ構成」→ **feature単位で閉じたフォルダを切る**構成にする。新機能=新フォルダ追加で済み、既存フォルダを触らない。

## 構成

`(未)` は「置き場所だけ決まっていて、まだ中身が無い」もの。

```
quizApp/
├── mise.toml                 # ツールバージョン + タスク定義(up/down等)
├── docker-compose.yml        # 開発用(frontend / backend / db)
├── docker-compose.prod.yml   # 本番用の差分
├── README.md                 # 環境構築と開発ルール(新メンバーの入口)
├── AGENTS.md                 # AIエージェント向けのリポジトリ説明
├── .github/
│   ├── workflows/ci.yml
│   ├── CODEOWNERS
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/                     # 確定版ドキュメント(消さない・勝手に変えない)
│   ├── 実装要件/             #   API仕様書・画面要件・技術スタック。仕様の正
│   ├── ガイドライン/         #   GitHub運用・デプロイ・レビュー・開発フロー
│   └── 入門/                 #   初心者向け解説(Git, Go, React, mise 等)
├── dev_policy/               # 開発方針・検討過程のメモ(docs/ になる前段階)
├── infra/                    # 本番サーバ構築・デプロイのシェルスクリプト
├── figma-plugin/             # デザイントークン書き出し用のFigmaプラグイン
├── frontend/
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   ├── nginx.conf            # 本番配信設定(/api/ を backend へプロキシ)
│   ├── vite.config.ts        # 開発時は /api を backend へプロキシ(本番と同じ形にする)
│   └── src/
│       ├── main.tsx          # エントリポイント
│       ├── App.tsx           # ルーティング
│       ├── index.css         # Tailwind設定 + デザイントークン定義
│       ├── types/            # API仕様書から書き起こしたAPI型定義
│       ├── features/         # ★機能単位。ここがメインの作業場所
│       │   ├── phone/        #   スマホ画面(参加者)
│       │   │   ├── PhonePage.tsx  # phase で views/ を出し分ける入口
│       │   │   ├── views/         # phase ごとの画面まるごと1枚
│       │   │   └── parts/         # 画面をまたいで使う部品(ヘッダー等)
│       │   ├── monitor/      #   モニタ画面(会場の大画面)
│       │   ├── admin/        #   管理者画面(進行操作)
│       │   └── dev/          #   開発用ページ(デザイントークン確認など)
│       └── lib/              # SSEクライアント、APIクライアント、共通フック
│           └── mock/         #   バックエンド未完成でも画面を作れるモックデータ
└── backend/
    ├── Dockerfile
    ├── Dockerfile.prod
    ├── go.mod
    ├── cmd/
    │   └── server/
    │       └── main.go       # エントリポイント(起動処理だけ。ロジックを書かない)
    ├── migrations/           # golang-migrate のSQLファイル(DB設計の履歴)
    └── internal/             # ★アプリ本体。Goでは internal/ 配下が外部非公開の慣習
        ├── question/         #   問題データのモデル(一覧・詳細APIは未実装)
        ├── event/            #   進行状態管理(EventState)と進行制御API
        ├── admin/            #   管理者操作(verify)
        ├── sheetsync/        #   スプシ→DB同期(バリデーション含む)
        ├── sse/              #   SSEブロードキャスタ(接続管理・配信) (未)
        └── platform/         #   共通基盤: DB接続、ルータ登録、認証ミドルウェア、エラー応答
```

### frontend/src/features/ の中の分け方

feature の中は、ファイルが増えてきた時点で次の2つに分ける。**最初から作らなくてよい。**

| フォルダ | 入れるもの | 目安 |
| --- | --- | --- |
| `views/` | 画面まるごと1枚。`XxxView.tsx` | phase や状態ごとに1ファイル |
| `parts/` | 画面の一部。複数の view から使うもの | ヘッダー、選択肢カード等 |

判断に迷ったら **「単体で1画面として成立するか」** で決める。成立するなら `views/`、しないなら `parts/`。

`phone/` がこの形になっている(→ `PhonePage.tsx` が入口、`views/` が5画面、`parts/` が部品)。`monitor/` `admin/` はまだファイルが少ないので平置きのままでよい。

## ルール(README に転記済み)

1. **新しい機能は feature フォルダ(front: `features/`、back: `internal/`)に新フォルダを切る。** 既存featureのフォルダ内に別機能のコードを足さない。
2. feature間の直接importは最小限にする。共有したくなったら front は `lib/`、back は `platform/` に昇格させる。

   **どちらに置くか迷ったら、話題ではなく「誰が使うか」で決める。** 判断が割れた実例を残しておく(→ #10)。

   | 問い | `platform` 行き | feature 行き |
   | --- | --- | --- |
   | URL を持つか | 持たない | 持つ |
   | ドメイン知識を含むか | 含まない | 含む |
   | その feature を消したら一緒に消えるか | 消えない | 消える |

   例: 認証ミドルウェアは「管理者の話題」だが、`IMPORT_TOKEN` を使う `sheetsync` からも呼ぶので `platform/auth.go`。一方 `GET /api/admin/verify` は URL を持ち admin 固有なので `admin/`。

   **ファイル名は「役割」で付ける。「仕組み」で付けない。** `middleware.go` `utils.go` `helpers.go` のような入れ物の名前は、無関係なコードを呼び寄せて、そのうち誰も開きたくないファイルになる。`platform/` の既存ファイル（`response.go` = エラー応答、`router.go` = ルータ組み立て）もこの規則で付いている。
3. **API仕様の変更は `docs/実装要件/API仕様書.md` を先に直す。** フロントの `types/` とGoの構造体は仕様書に従う(実装とずれたら仕様書が正)。
4. 1ファイルが300行を超えたら分割を検討する(初心者向けの機械的な目安)。

この構成の利点: **「1タスク = 1 featureフォルダ」でタスクを切れる**ので、初心者同士のコンフリクトがほぼ起きない(→ タスク分割_policy参照)。

## 計画から変わったところ

書いた当時の想定と実装がズレた点。同じ判断を繰り返さないために残す。

| 計画 | 現状 | 理由 |
| --- | --- | --- |
| `features/quiz/` `features/answer/` | `features/phone/` に統合 | 参加者が見る画面は1つで、phase によって中身が変わるだけだった。URLも分かれない |
| `internal/answer/`(回答受付・集計) | **無し** | 参加者はスマホで回答せず、会場の選択肢エリアへ物理的に移動する方式になった(→ 画面・要件.md) |
| `features/venue-map/` | **無し** | 会場案内図モーダルは今回のスコープ外 |
| `src/app/`(ルーティング) | `src/App.tsx` | ルートが3つだけなのでフォルダを切る量ではなかった |
| `src/shared/`(汎用UI部品) | **無し**。共有は `lib/` | 共有したくなった実物がフック・APIクライアントで、UI部品ではなかった |
| `docs/api.md` `docs/screens.md` | `docs/実装要件/` 以下に分割 | 文書が増え、種類別(実装要件/ガイドライン/入門)の方が探しやすくなった |
| feature内に `components/` `hooks/` `index.ts` | `views/` + `parts/` | 「画面」と「部品」の区別のほうが、実際に迷う場面に効いた。`index.ts` は再export する物が無く不要だった |

## 決定事項・残決定

| # | 項目 | 状態 |
|---|---|---|
| F1 | リポジトリ名 | `NUTFes/quizApp` で確定 |
| F2 | スマホ/モニタ/管理者のフロント分割 | **1つのViteアプリでルート分け**(`/`, `/monitor`, `/backstage-0248`)。ビルド・配信が1本で済む |
| F3 | Goのパッケージ構成 | 上記(internal/機能別)で確定 |
