# 問題一覧API(#80) 実装手順書

`GET /api/admin/questions` を実装するための手順書。**エージェント(codex)に渡す前提**で、
このファイル1枚と実際のコードだけで完結するように書いてある。

- 対象イシュー: #80【初心者T4】GET /api/admin/questions(問題一覧)
- 作業ブランチ: `feat/80-get-admin-questions`(`origin/main` から分岐済み)
- 仕様の正: [`docs/実装要件/API仕様書.md`](../docs/実装要件/API仕様書.md) **§4.1**(食い違ったら仕様書が正)

---

## 0. 最初に読むもの・作業の前提

| 読むもの | 何が分かるか |
| --- | --- |
| [`AGENTS.md`](../AGENTS.md) | このリポジトリの全体像・作業スタイル |
| [`docs/実装要件/API仕様書.md`](../docs/実装要件/API仕様書.md) §0, §1, §4.1 | 共通ルール・`Question` の形・このAPIの仕様 |
| `backend/internal/event/state.go` の `buildState` | **「DBの型 → APIの型」に詰め替える**お手本。今回やることと同じ |
| `backend/internal/admin/admin.go` | 認証つきルート登録の最小例 |

**このリポジトリは public。** 本番の問題データ・正答・トークンをコミットしないこと。

### 守ってほしい進め方

- **やり取り・コメント・コミットメッセージは日本語。**
- コメントは「何をしているか」ではなく **「なぜそうしたか」** を書く。既存コードの密度に合わせる。
- **スコープを広げない。** このタスクは `GET /api/admin/questions` **1本だけ**(→ §7)。
- 迷ったら仕様書 §4.1 に従う。仕様書に無いことは**足さない**。

---

## 1. ゴール

全問題を「一覧用の形」で返す。認証必須。

**リクエスト**

```
GET /api/admin/questions
Authorization: Bearer <ADMIN_TOKEN>
```

**成功レスポンス** `200 OK`

```json
{
  "questions": [
    {
      "id": 5,
      "number": 12,
      "type": "four_choice",
      "difficulty": "hard",
      "textPreview": "この問題文はスラッシュ区切りで少しずつ表示される",
      "hasImage": true,
      "asked": false
    }
  ]
}
```

| フィールド | 型 | 作り方 |
| --- | --- | --- |
| `id` | number | `Question.ID` |
| `number` | number | `Question.Number` |
| `type` | string | `Question.Type`(そのまま) |
| `difficulty` | string | `Question.Difficulty`(そのまま。**日本語に直すのはフロントの仕事**) |
| `textPreview` | string | `strings.Join(Question.TextSegments, "")` — **区切り文字を挟まない** |
| `hasImage` | bool | `Question.ImageURL != nil` **または** `Choices` のどれかに `ImageURL != nil` |
| `asked` | bool | `Question.Asked` |

**含めてはいけないもの**: `choices` / `correctChoiceId` / `explanation` / `textSegments`。
一覧に正答を混ぜると、管理者画面のデバッグ中に画面共有などで漏れる余地ができる。

**エラー**

| 状況 | ステータス | code |
| --- | --- | --- |
| トークンが無い / 違う | 401 | `UNAUTHORIZED`(`platform.RequireToken` が自動で返す) |
| DB読み込みに失敗 | 500 | `INTERNAL` |

エラーの形は §0 のとおり `{"error":{"code":..., "message":...}}`。**必ず `platform.RespondError` を使う**
(`c.JSON` で自作しないこと。フロントは `code` で分岐している)。

---

## 2. 触るファイル

| ファイル | 何をするか |
| --- | --- |
| `backend/internal/question/list.go` | **新規作成。** このタスクの本体 |
| `backend/internal/question/routes.go` | **新規作成。** ルート登録(下記の注意を読むこと) |
| `backend/cmd/server/main.go` | 登録を**1行**足す |

### ⚠️ `handler.go` を作らないこと・触らないこと

`internal/question/handler.go` は **PR #93(イシュー #62 `PUT /api/admin/questions`)が持っているファイル**で、
レビュー中。そこに相乗りすると毎回コンフリクトする。**必ず `list.go` を新規に作る。**

`routes.go` については、作業を始める時点で状況が2通りある。**まず確認すること**:

```bash
git fetch origin && git log --oneline origin/main -3
ls backend/internal/question/
```

| 状況 | どうするか |
| --- | --- |
| `question/` に `routes.go` も `handler.go` も無い(分岐時点の状態) | `routes.go` を新規作成し、下記の骨格どおりに書く |
| `origin/main` が進んで #62 がマージ済み(`handler.go` に `RegisterRoutes` がある) | **`RegisterRoutes` を二重に定義しない。** 既存の `RegisterRoutes` に `g.GET("/questions", ...)` を**1行**足すだけにして、`routes.go` は作らない |

### 触ってはいけないもの

- `backend/internal/event/` 配下(進行制御。別の担当)
- `backend/internal/platform/` 配下(認証・共通レスポンス。**変更が必要だと思ったら、変更せずに報告する**)
- `frontend/` 配下(フロントは別ブランチ `feat/20-admin-page` で並行作業中)
- `docs/` 配下(仕様の変更は別イシュー)

---

## 3. 実装

### 3-1. `backend/internal/question/list.go`(新規)

骨格は以下。**コメントも含めてそのまま使ってよい**が、`TODO` は自分で埋めること。

```go
// GET /api/admin/questions(問題一覧)のハンドラ(§4.1)。
//
// 一覧は「どの問題を出すか選ぶ」ための画面で使う。
// 正答や選択肢は不要なので、DBの Question をそのまま返さず一覧専用の形に詰め替える。
package question

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"gorm.io/gorm"
)

// listItem は §4.1 の一覧1件分。
//
// DBの Question とは別物なので使い回さない:
// textSegments(配列) → textPreview(結合した文字列)、imageUrl → hasImage(有無) と形が変わり、
// choices / correctChoiceId / explanation は含めない。
type listItem struct {
	ID          uint   `json:"id"`
	Number      int    `json:"number"`
	Type        string `json:"type"`
	Difficulty  string `json:"difficulty"`
	TextPreview string `json:"textPreview"`
	HasImage    bool   `json:"hasImage"`
	Asked       bool   `json:"asked"`
}

// listQuestions は全問題を一覧の形で返す。
func listQuestions(c *gin.Context, db *gorm.DB) {
	var questions []Question
	if err := db.Order("number").Find(&questions).Error; err != nil {
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "問題データを読み込めませんでした")
		return
	}

	// 0件のときに JSON が "questions": null にならないよう、必ず長さ0のスライスで初期化する。
	// フロントは questions.map() を呼ぶので、null が来ると画面が壊れる。
	items := make([]listItem, 0, len(questions))
	for _, q := range questions {
		items = append(items, toListItem(q))
	}

	c.JSON(http.StatusOK, gin.H{"questions": items})
}

// toListItem は DB の Question を一覧1件分に詰め替える。
func toListItem(q Question) listItem {
	// TODO: 上の対応表(手順書 §1)のとおりに埋める
	// - TextPreview は区切り文字を挟まずに結合する
	// - HasImage は問題画像だけでなく選択肢画像も見る
	return listItem{}
}
```

> `strings` は `toListItem` の中で使う。埋めるまでは「未使用のimport」でビルドが通らないので、
> `toListItem` を先に書き上げてから `go build` すること。

**`Order("number")` にしている理由**: 一覧は人が目で探すもので、DBの返す順は保証が無い。
スプレッドシートのクイズ番号順に並んでいるのが裏方にとって自然だから。

### 3-2. `backend/internal/question/routes.go`(新規)

```go
package question

import (
	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"gorm.io/gorm"
)

// RegisterRoutes は、エンドポイントの登録を行う。
//
// db と adminToken を引数で受け取りグローバルにしないのは、
// 各関数がどんな値を必要とするのか明示的にするため(event パッケージと同じ方針)。
func RegisterRoutes(db *gorm.DB, adminToken string) platform.RegisterFunc {
	return func(r *gin.Engine) {
		g := r.Group("/api/admin", platform.RequireToken(adminToken))
		g.GET("/questions", func(c *gin.Context) { listQuestions(c, db) })
	}
}
```

### 3-3. `backend/cmd/server/main.go` に1行

```go
	r := platform.NewRouter(
		registerEvents,
		admin.RegisterRoutes(adminToken),
		event.RegisterRoutes(db, adminToken, joinURL),
		question.RegisterRoutes(db, adminToken), // ← この1行を足す
	)
```

`import` に `"github.com/naoto-anzai/quizApp/backend/internal/question"` を足すのを忘れないこと。

---

## 4. 落とし穴(ここで事故る)

| 落とし穴 | 何が起きるか | 対策 |
| --- | --- | --- |
| **`var items []listItem` のまま返す** | 0件のとき `{"questions": null}` になり、フロントの `.map()` が落ちる | `make([]listItem, 0, len(questions))` で初期化。**実際に0件で確認する**(§5-3) |
| **`hasImage` で問題画像しか見ない** | 選択肢だけ画像の問題が「画像なし」になる | `q.ImageURL != nil \|\| いずれかの choice.ImageURL != nil` |
| **`textPreview` を `"/"` や `" "` で結合する** | 一覧に区切り記号が出る | `strings.Join(segments, "")`(空文字で結合) |
| **`Question` をそのまま返す** | 正答が一覧に混ざる(仕様違反) | 専用の `listItem` に詰め替える |
| **`c.JSON` でエラーを自作する** | フロントの `code` 分岐が壊れる | `platform.RespondError` を使う |
| **認証グループの外にルートを置く** | 誰でも問題文が見られる | `r.Group("/api/admin", platform.RequireToken(adminToken))` の中に置く |

---

## 5. 動作確認

### 5-1. 起動

```bash
mise run up          # frontend / backend / db が立つ
mise run db:migrate  # 初回のみ
mise run db:seed     # 開発用の架空問題を投入
```

> **ポートについて**: このブランチ(`origin/main` 基準)の compose は **5173 / 3000 / 5432 固定**。
> 他のワークツリーで開発環境が起動していると `port is already allocated` で失敗するので、
> そちらで `mise run down` してから起動すること。

### 5-2. 正常系

```bash
T='Authorization: Bearer dev-admin-token'
curl -s -H "$T" localhost:3000/api/admin/questions | python3 -m json.tool
```

- [ ] seed した問題が**全部**返る
- [ ] `textPreview` が結合済みの1つの文字列になっている(配列でも区切り記号入りでもない)
- [ ] 画像付きの問題が `"hasImage": true`、無い問題が `false`
- [ ] `choices` / `correctChoiceId` / `explanation` / `textSegments` が**含まれていない**
- [ ] `number` の昇順に並んでいる

### 5-3. 0件

```bash
docker compose exec db psql -U quiz -d quiz -c 'DELETE FROM questions;'
curl -s -H "$T" localhost:3000/api/admin/questions
# → {"questions":[]} であること。{"questions":null} は不合格
mise run db:seed   # 確認が終わったら戻す
```

### 5-4. 認証

```bash
curl -s -i localhost:3000/api/admin/questions | head -1                      # 401
curl -s -H 'Authorization: Bearer wrong' localhost:3000/api/admin/questions  # UNAUTHORIZED
```

- [ ] どちらも 401 で、本文が `{"error":{"code":"UNAUTHORIZED",...}}` の形

### 5-5. 既存機能を壊していないこと

```bash
curl -s localhost:3000/api/health
curl -s -H "$T" localhost:3000/api/admin/state | head -c 200
```

---

## 6. 仕上げ

```bash
mise run fix    # gofmt など自動で直せるものを直す
mise run lint   # CIと同じ内容。これが通らないPRは出さない
```

コミットは**意味のかたまりごとに分けて**、日本語1行の要約 + 必要なら本文で「なぜ」を書く。
例:

```
問題一覧API GET /api/admin/questions を実装

一覧では正答も選択肢も不要なので、DBの Question をそのまま返さず
一覧専用の listItem に詰め替える(§4.1)。0件のとき JSON が null に
ならないよう、スライスは必ず長さ0で初期化している。
```

PRは `main` へ。本文に「#80」を書いてイシューと紐づける。

---

## 7. このタスクでやらないこと

| やらないこと | どこでやるか |
| --- | --- |
| `GET /api/admin/questions/:id`(1問の詳細) | イシュー #79 |
| `PUT /api/admin/questions`(問題投入) | イシュー #62 / PR #93 |
| SSEでの一覧配信 | イシュー #77。**一覧はSSEに乗せない**(変わるのは投入時だけなので、都度取得で足りる) |
| 難易度の日本語化・絞り込み・並べ替えUI | 管理者画面(#20)。**サーバーは全件をそのまま返す**(§4.1) |
| ページング | 問題数はせいぜい数十件。**入れない** |

---

## 8. 完了条件

- [ ] §5-2 のチェックが全部通る
- [ ] §5-3 で `{"questions":[]}` が返る
- [ ] §5-4 で 401 が返る
- [ ] `mise run lint` が通る
- [ ] `handler.go` を新規作成していない / 既存ファイルを不必要に触っていない
- [ ] 本番の問題データ・正答・トークンをコミットしていない
