# 開発環境 policy(Docker + mise)

> 2026-07-20 更新: バックエンドGo化に伴い、mise.toml / compose を Go + Gin + golang-migrate 前提に変更。
> Goのホットリロードは air を採用。

## ゴール

新メンバーが **「Docker Desktop と mise を入れる → `git clone` → `mise run up`」だけでアプリ一式が手元で動く** 状態。README の環境構築手順が10行以内に収まること。

## 方針

- **mise の役割**: ①Go/Node/pnpmのバージョン固定 ②タスクランナー(`mise run up` 等のコマンド集約)
- **Docker の役割**: DB(Postgres)と、フロント/バックの実行環境をコンテナ化し「入れるものはDockerとmiseだけ」にする
- 開発時はソースを bind mount + ホットリロード(フロント: Vite / バック: **air**(Goファイル変更を検知して自動再ビルド&再起動))。コンテナ再ビルドなしでコード変更が即反映される構成にする。

## mise.toml 案

```toml
[tools]
go = "1.25"          # 最新安定版で固定(基盤構築時に確定)
node = "22"          # LTSで固定
pnpm = "latest"

[tasks.up]
description = "開発環境を起動(初回はビルドも実行)"
run = "docker compose up -d --build"

[tasks.down]
description = "開発環境を停止"
run = "docker compose down"

[tasks.logs]
run = "docker compose logs -f"

[tasks."db:migrate"]
description = "マイグレーションを適用"
run = "docker compose exec backend migrate -path /app/migrations -database $DATABASE_URL up"

[tasks."db:reset"]
description = "DBを作り直してマイグレーション+サンプルデータ投入"
run = "docker compose down -v db && docker compose up -d db && mise run db:migrate && mise run db:seed"

[tasks."db:seed"]
description = "サンプル問題データを投入(開発用)"
run = "docker compose exec backend go run ./cmd/seed"

[tasks.lint]
run = "docker compose exec backend go vet ./... && pnpm --dir frontend lint"

[tasks.test]
run = "docker compose exec backend go test ./... && pnpm --dir frontend test"
```

(コマンド詳細は基盤構築時に調整。思想=「タスク名だけ覚えれば中身を知らなくても操作できる」が変わらなければよい)

## docker-compose.yml 案(開発用)

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    volumes:
      - ./frontend:/app
      - /app/node_modules        # ホストのnode_modulesと衝突させない
    environment:
      - VITE_API_URL=http://localhost:3000

  backend:
    build: ./backend             # Dockerfileでairを入れ、CMDはair(ホットリロード起動)
    ports: ["3000:3000"]
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql://quiz:quiz@db:5432/quiz?sslmode=disable
      - ADMIN_PASSWORD=dev-password
      - GOOGLE_CREDENTIALS_JSON=   # スプシ同期用(開発では空でもよい。同期機能だけ無効になる)
      - SPREADSHEET_ID=
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    environment:
      - POSTGRES_USER=quiz
      - POSTGRES_PASSWORD=quiz
      - POSTGRES_DB=quiz
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U quiz"]
      interval: 3s
      retries: 10

volumes:
  db-data:
```

## 「開発していく中で変更する部分」を見越した設計

| よくある変更 | 備え |
|---|---|
| 環境変数の追加 | `.env.example` を必ず用意し、読む変数はここに全部列挙。`.env` はgitignore。スプシ認証JSONは絶対にコミットしない |
| Goパッケージ追加 | `go get` 後に `mise run up`(--build付き)で再ビルド、をREADMEに明記 |
| npmパッケージ追加 | 同上(frontendコンテナの再ビルド) |
| DBスキーマ変更 | golang-migrateに一本化。「migrations/ にSQLを足したら `mise run db:migrate`」だけ覚えればよい |
| ポート衝突 | 使用ポート(5173/3000/5432)をREADMEに明記 |
| 本番との差分 | compose本体は開発用、`docker-compose.prod.yml` に本番差分(→インフラ_policy) |

## Windows勢への注意(チームにWindowsユーザーがいる前提)

- Docker Desktop + WSL2 を標準とし、**リポジトリはWSL2側のファイルシステムにcloneする**(Windows側だとbind mountのホットリロードが遅い/効かないことがある。airもViteも同様)
- 改行コード事故防止に `.gitattributes` で `* text=auto eol=lf` を設定
- mise はWSL2内にインストールする手順で統一

## TODO(開発開始前)

- [ ] mise.toml / docker-compose.yml / 各Dockerfile(backendはair入り) / .env.example を作成
- [ ] `mise run up` → フロント表示 → GinへのAPI疎通 → DB接続 → SSE疎通、まで通す
- [ ] まっさらなPC(or 別メンバーのPC)でREADME手順どおりに構築できるか検証する(これが一番大事)
- [ ] つまずきやすいポイントをREADMEのトラブルシューティング節に追記
