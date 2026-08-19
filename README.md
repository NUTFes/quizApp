# quizApp — 技大祭 リアルタイムクイズアプリ

技大祭(NUTFES / nutmeg)向けのリアルタイムクイズ大会アプリ。
モニタ(会場の大画面)・スマホ(参加者の手元ミラー)・管理者画面の3画面を、裏方1人の操作で一斉に切り替える。

- 何を作るか → [`docs/実装要件/画面・要件.md`](docs/実装要件/画面・要件.md)
- 使っている技術 → [`docs/実装要件/技術スタック.md`](docs/実装要件/技術スタック.md)
- API仕様(フロント/バックの契約) → [`docs/実装要件/API仕様書.md`](docs/実装要件/API仕様書.md)

---

## 開発環境の作り方

### 用意するもの(各自1回だけ)

1. **Docker Desktop**
2. **mise**(ツールのバージョン管理+コマンド集約 → [`docs/入門/mise入門.md`](docs/入門/mise入門.md))
3. **Windowsの人は WSL2**。リポジトリは **WSL2の中に** clone すること
   (Windows側フォルダだと Docker のホットリロードが遅い/効かない)

### ⚠️ mise を入れたら、最初に「有効化」する(全員必須・1回だけ)

**mise はインストールしただけでは効きません。** シェルに1行足して初めて、指定バージョンの Go / Node / pnpm にパスが通ります。
これをやらないと **`go: command not found`** や、自前の古い pnpm が動いてしまう事故が起きます(仕組み → [`docs/入門/mise入門.md`](docs/入門/mise入門.md) §5)。

```bash
# bash を使っている人(WSL2の初期状態はこれ)
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc && exec bash

# zsh を使っている人(Macの初期状態はこれ)
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc && exec zsh
```

> `~/.local/bin/mise` の部分は mise を入れた場所。`which mise` で確認できる。

### 立ち上げ手順

```bash
git clone https://github.com/NUTFes/quizApp.git
cd quizApp

mise trust        # このリポジトリの mise.toml を信用する(初回のみ)
mise install      # Go / Node / pnpm を指定バージョンで入れる
mise run up       # 3つのコンテナ(frontend / backend / db)を起動
```

**`mise install` のあと、バージョンが揃っているか確認する:**

```bash
go version    # go1.25.x
node -v       # v22.x
pnpm -v       # 10.x
```

ここで `command not found` が出たら、**上の「有効化」をやっていない**。

起動したら:

| URL | 何が見えるか |
|---|---|
| <http://localhost:5173> | フロント(「技大祭クイズ 🎉」が出れば成功) |
| <http://localhost:3000/api/health> | バックエンド(`{"status":"ok"}` が返れば成功) |

止めるときは `mise run down`。困ったら `mise run logs` でログを見る。
使えるコマンド一覧は `mise tasks`。

---

## フォルダ構成

```
quizApp/
├── frontend/   … 画面(Vite + React + TypeScript)
├── backend/    … サーバー(Go)。cmd/server が入口
├── docs/       … 確定版ドキュメント(要件・技術・API仕様)
├── dev_policy/ … 開発方針・検討過程のメモ
├── mise.toml            … コマンド集約 + ツールのバージョン固定
└── docker-compose.yml   … 3コンテナの編成
```

## 開発のルール

1. **新しい機能は feature フォルダに新フォルダを切る**(front: `src/features/`、back: `internal/`)。既存フォルダに別機能を混ぜない
2. **API仕様を変えるときは `docs/実装要件/API仕様書.md` を先に直す**(実装とずれたら仕様書が正)
3. `main` へは直接pushせず、ブランチ→PR→レビュー1件→squash merge
4. コミット/PRは「何をしたか分かる日本語1行」でよい
5. `mise run lint`、`mise run fix`は`mise run up`でコンテナが起動している状態で実行すること
6. ホスト側の`pnpm install`は エディタ(VSCode)の補完・ESLint表示のために任意で実行するもの


詳しい手順 → [`docs/ガイドライン/開発フローガイド.md`](docs/ガイドライン/開発フローガイド.md)

## メンバー

<!-- 練習用Issueで、自分の行を1行追加する。担当は フロント / バック / インフラ / レビュー から -->

| 名前 | 担当 | ひとこと |
|---|---|---|
| naoto-anzai | PM・インフラ・フロント・バック | みんなタスク割遅くなってごめん！ |
| hengin-eer | レビュー・フロント・バック | レビューをスパスパ捌くので皆はじゃんじゃんPR投げてきてね！ |
| sanpayy | フロント | 怖がらずにガンガンやって早めに慣れていきましょう！ | 
| keigo-take | バック | タスク頑張ります！|
| gold-fish | バック | これからタスクガンバル |
## まだ準備中のもの

- Tailwind CSS・React Router(最小構成が動いてから追加)
- 本番用の `docker-compose.prod.yml` と `docs/deploy.md`
