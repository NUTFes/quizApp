# フォルダ構成 policy

> 2026-07-20 更新: バックエンドGo化に伴い backend/ をGo標準レイアウトに変更。
> `packages/shared`(TS型共有)は廃止し、`docs/api.md` を契約とする方式に変更。

## 方針

- **1リポジトリのモノレポ**。フロント/バックを別リポジトリにすると、初心者チームではPRレビュー・環境構築・仕様書参照が全部二重になる。
- コンテナは **frontend / backend / db の3つ**に分ける。
- 「機能追加を見通した動的なフォルダ構成」→ **feature単位で閉じたフォルダを切る**構成にする。新機能=新フォルダ追加で済み、既存フォルダを触らない。

## 構成案

```
quiz-app/
├── mise.toml                 # ツールバージョン + タスク定義(up/down等)
├── docker-compose.yml        # 開発用(frontend / backend / db)
├── docker-compose.prod.yml   # 本番用の差分
├── .github/
│   └── workflows/ci.yml
├── docs/
│   ├── api.md                # API仕様書(フロント/バック間の唯一の契約。最重要)
│   └── screens.md            # 画面仕様(確定版)
├── dev_policy/               # ←今作っているこのフォルダ
├── frontend/
│   ├── Dockerfile
│   └── src/
│       ├── app/              # ルーティング、全体レイアウト
│       ├── types/            # api.md から書き起こしたAPI型定義(将来tygoで自動生成化)
│       ├── features/         # ★機能単位。ここがメインの作業場所
│       │   ├── quiz/         #   問題表示・回答(スマホ)
│       │   ├── answer/       #   正答表示
│       │   ├── monitor/      #   モニタ画面
│       │   ├── admin/        #   管理者画面
│       │   └── venue-map/    #   会場案内図モーダル
│       │       ├── components/
│       │       ├── hooks/
│       │       └── index.ts  #   外に公開するものだけexport
│       ├── shared/           # 汎用UI部品(Button等)・ユーティリティ
│       └── lib/              # SSEクライアント、APIクライアント(モック⇔本物の差し替え口)
└── backend/
    ├── Dockerfile
    ├── go.mod
    ├── cmd/
    │   └── server/
    │       └── main.go       # エントリポイント(起動処理だけ。ロジックを書かない)
    ├── migrations/           # golang-migrate のSQLファイル(DB設計の履歴)
    └── internal/             # ★アプリ本体。Goでは internal/ 配下が外部非公開の慣習
        ├── question/         #   問題CRUD(モデル+ハンドラ+DB操作をパッケージ内に同居)
        ├── event/            #   進行状態管理(EventState)
        ├── answer/           #   回答受付・集計
        ├── admin/            #   管理者操作・認証
        ├── sheetsync/        #   スプシ→DB同期(バリデーション含む)
        ├── sse/              #   SSEブロードキャスタ(接続管理・配信)
        └── platform/         #   共通基盤: DB接続、ルータ登録、ミドルウェア
```

## ルール(README に転記する)

1. **新しい機能は feature フォルダ(front: `features/`、back: `internal/`)に新フォルダを切る。** 既存featureのフォルダ内に別機能のコードを足さない。
2. feature間の直接importは最小限にする。共有したくなったら front は `shared/`、back は `platform/` に昇格させる。
3. **API仕様の変更は `docs/api.md` を先に直す。** フロントの `types/` とGoの構造体は api.md に従う(実装とずれたら api.md が正)。
4. 1ファイルが300行を超えたら分割を検討する(初心者向けの機械的な目安)。

この構成の利点: **「1タスク = 1 featureフォルダ」でタスクを切れる**ので、初心者同士のコンフリクトがほぼ起きない(→ タスク分割_policy参照)。

## 決定事項・残決定

| # | 項目 | 状態 |
|---|---|---|
| F1 | リポジトリ名 | 例: `nutfes-quiz`(nutmegの既存命名規則があればそれに従う) |
| F2 | スマホ/モニタ/管理者のフロント分割 | **1つのViteアプリでルート分け**(`/`, `/monitor`, `/admin`)。ビルド・配信が1本で済む |
| F3 | Goのパッケージ構成 | 上記(internal/機能別)。バックエンドリーダーと基盤構築時にすり合わせて確定 |

## TODO(開発開始前)

- [ ] GitHubにリポジトリ作成(組織アカウント下)
- [ ] 上記スケルトンを空フォルダ+READMEで作ってコミット(Hello Worldデモをこの構成に載せる)
- [ ] ルール4項目をルートREADMEに記載
