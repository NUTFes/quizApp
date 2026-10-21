# 問題詳細API(#79) 実装手順書

`GET /api/admin/questions/:id` を実装する。→ API仕様書 §4.2

**担当: PM本人。** 本来は初心者タスク(【初心者T3】)だが、管理者画面の「選択中の問題」パネルがこれを待っているため、
今回は自分で取ることにした(2026-09-12 決定)。

---

## 0. なぜ今これが要るか

管理者画面の問題リストが返す `QuestionListItem` には、**選択肢も正答も入っていない**(§4.1)。
Figma の「選択中の問題」パネルは選択肢A〜Dと正答を出しているので、そのままでは描けない。
1問だけ全部入りで取る口がこのAPIになる。

---

## 1. ⚠️ Issue #79 の本文は古い

**本文を読む前にここを読むこと。** 書かれた当時と構成が変わっている。

| #79 の記述 | 実際 |
| --- | --- |
| 「依存: #11 がマージされてから」 | 済。着手できる |
| 「`routes.go`(新規)を作る」 | **作らない。** `RegisterRoutes` は `handler.go` にある |
| 「`list.go` は #80 の人が作る」 | 済(#98 でマージ済み) |
| 「`handler.go` という名前は使いません」 | 現状 `handler.go` が PUT 用ハンドラとして存在する |

**新規に作るのは `detail.go` 1本だけ。** 登録は `handler.go` の `RegisterRoutes` に1行足す。

---

## 2. 作業環境

ワークツリーを切って作業する。**`origin/main` から切ること。**(このワークツリーは作成済み。8cc75cf から切った)

```bash
git worktree add ../quizApp-79-question-detail -b feat/79-question-detail origin/main
cd ../quizApp-79-question-detail
```

別フォルダで同時に開発環境を起動すると**ポートがぶつかる**ので、ずらしてから起動する。
このワークツリーの `.env` は **shift 50 で設定済み**(5223/3050/5482)。

```bash
mise trust                # 新しいフォルダでは最初の1回だけ必要
mise run ports:shift 50   # .env に 5223/3050/5482 が書かれる(設定済みなら不要)
mise run ports            # 実際の番号を確認
mise run up
mise run db:migrate && mise run db:seed
```

---

## 3. 触るファイル

| ファイル | 内容 |
| --- | --- |
| `backend/internal/question/detail.go` | **新規。** ハンドラ本体 |
| `backend/internal/question/handler.go` | 登録の1行だけ |

`model.go` は触らない。`Question` 構造体の JSON タグは §1 の形にすでに一致しているので、**詰め替えずそのまま返せる。**
(一覧が `listItem` に詰め替えているのは、一覧だけ形が違うから。詳細は §1 そのままでよい)

---

## 4. 実装

### 4-1. `detail.go`

```go
// GET /api/admin/questions/:id(1問の詳細)のハンドラ(§4.2)。
//
// 一覧(§4.1)と違い、選択肢・正答・解説を含む §1 の Question をそのまま返す。
// 管理者画面が「この問題を出す」前に中身を確認するために使う。
package question

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"gorm.io/gorm"
)

func getQuestion(c *gin.Context, db *gorm.DB) {
	raw := c.Param("id")

	// URLのパラメータは常に文字列で来る。数字でないものが来ても 500 にしない。
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil {
		platform.RespondError(c, http.StatusNotFound, "QUESTION_NOT_FOUND",
			"questionId="+raw+" は存在しません")
		return
	}

	var q Question
	if err := db.First(&q, uint(id)).Error; err != nil {
		// 「行が無い」は利用者の入力の問題なので 404。
		// これを 500 にすると「サーバーが壊れた」という意味になり、当日の切り分けができなくなる。
		if errors.Is(err, gorm.ErrRecordNotFound) {
			platform.RespondError(c, http.StatusNotFound, "QUESTION_NOT_FOUND",
				"questionId="+raw+" は存在しません")
			return
		}
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
			"問題データを読み込めませんでした")
		return
	}

	c.JSON(http.StatusOK, q)
}
```

### 4-2. `handler.go` に1行

```go
return func(r *gin.Engine) {
	g := r.Group("/api/admin", platform.RequireToken(adminToken))
	g.GET("/questions", func(c *gin.Context) { listQuestions(c, db) })
	g.GET("/questions/:id", func(c *gin.Context) { getQuestion(c, db) }) // ← 足す

	gImport := r.Group("/api/admin", platform.RequireToken(adminToken, importToken))
	gImport.PUT("/questions", func(c *gin.Context) { putQuestions(c, db) })
}
```

**`g`(ADMIN_TOKEN のみ)に入れること。`gImport` に入れない。**
`gImport` は GAS 用に IMPORT_TOKEN でも通るグループなので、そこに入れると GAS のトークンで正答まで読めてしまう。

---

## 5. 落とし穴

### 数字でない id を 404 にしている理由

`/api/admin/questions/abc` は形式としては不正なので `400 INVALID_REQUEST` のほうが正確に見える。
**それでも 404 にする。** §4.2 の契約表に書かれているエラーは `QUESTION_NOT_FOUND` の1つだけで、
コードを増やすなら**API仕様書を先に直す**のがこのリポジトリのルールだから。
仕様を増やすほどの実害が無い(裏方が手でURLを打つことはない)ので、契約どおりに寄せる。

### `c.JSON` でエラーを自作しない

必ず `platform.RespondError` を使う。形が全API共通でないとフロントの `code` 分岐が壊れる。

### `message` に何を書いてもよいが、`code` は契約

`QUESTION_NOT_FOUND` という文字列をフロントが分岐に使う。**勝手に変えない。**

---

## 6. 動作確認

```bash
T='Authorization: Bearer dev-admin-token'
P=3050   # mise run ports で確認した番号（このワークツリーは 3050）

curl -s  -H "$T" localhost:$P/api/admin/questions/1      # 200。choices と correctChoiceId が入っている
curl -i  -H "$T" localhost:$P/api/admin/questions/9999   # 404 QUESTION_NOT_FOUND
curl -i  -H "$T" localhost:$P/api/admin/questions/abc    # 404(500 になっていないこと)
curl -i           localhost:$P/api/admin/questions/1      # 401 UNAUTHORIZED
```

確認する点。

- [ ] 200 の中身が §1 の `Question` フル形(`choices` / `correctChoiceId` / `explanation` / `asked` がある)
- [ ] 404 の形が `{"error":{"code":"QUESTION_NOT_FOUND","message":...}}`
- [ ] 数字でない id で 500 になっていない
- [ ] 認証なしで 401

### 自動テストについて

`question` パッケージのハンドラは Postgres が要る(`image` のように DB 無しで httptest だけでは叩けない)。
DB 付きのテスト基盤はまだ無いので、**今回は `detail_test.go` を作らず、上の curl 4本を確認手段にする。**
テスト基盤を入れるなら別イシューで扱う。

---

## 7. PRを出す前に

```bash
mise run lint
```

PR本文には **curl の実行結果を貼る**(4本とも)。「動作確認した」だけでは追試できない。

---

## 8. マージしたあとにやること

1. **#79 の本文の古い記述を直すか、PRで触れておく。** 放置すると次に同じ場所を触る人が存在しない手順を読む
2. 管理者画面の「選択中の問題」イシューから「#79 待ち」の注記を外す
3. `frontend/src/lib/api.ts` の `getQuestionById` は**すでに存在する**ので、フロント側の追加実装は不要
