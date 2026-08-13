# Go・バックエンド入門 — このアプリを書くために必要な知識だけ

**「Goを網羅的に学ぶ」ためのドキュメントではない。** このクイズアプリのバックエンドを**自分の手で書くために必要な知識だけ**を、出てくる順に並べたもの。

- 作る順番 → [`dev_policy/バックエンド基盤の進め方.md`](../../dev_policy/バックエンド基盤の進め方.md)
- データの契約 → [`../実装要件/API仕様書.md`](../実装要件/API仕様書.md)
- 実装で守ること → [`../実装要件/バックエンド実装要件.md`](../実装要件/バックエンド実装要件.md)

> **読み方**: 上から順に読む必要はない。**STEPで詰まったら、対応する節に戻ってくる**使い方を想定している。
> 各節の最後に「**このアプリのどこで使うか**」を書いてある。

---

## 0. 全体像 — このバックエンドは何をしているのか

やっていることは3つだけ。

```
① ブラウザから HTTP リクエストが来る
      ↓
② DB から読む / DB に書く
      ↓
③ JSON にして返す

  + SSE で「今の state」を流し続ける(STEP以降)
```

**複雑な計算はほとんどない。** 参加者の回答を受け取る機能すら無い(正誤判定は人力)。
サーバーの仕事は「**状態を持って、3つの宛先(管理者/モニタ/スマホ)に中身を変えて配る**」こと。

だから必要な知識は「**データの形を定義する**」「**DBとやりとりする**」「**JSONで返す**」の3つに集約される。

---

## 1. Goの最低限

### パッケージ

Goのファイルは必ず**どのパッケージに属するか**を1行目で宣言する。**フォルダ = パッケージ**と考えてよい。

```go
package question    // internal/question/ の中のファイルは全部これ

import (
    "time"                      // 標準ライブラリ
    "gorm.io/gorm"              // 外部ライブラリ(go get で入れたもの)
)
```

### ⚠️ 大文字で始まると「公開」、小文字だと「非公開」

**Goで最初につまずく最重要ルール。**

```go
type Question struct {     // ✅ 大文字 → 他のパッケージから使える
    ID   uint              // ✅ 大文字 → 外から読める
    memo string            // ❌ 小文字 → このパッケージの中でしか見えない
}
```

**JSONに変換されるのは大文字のフィールドだけ。** 小文字にすると、JSONに一切出てこない(エラーも出ない)ので、原因が分からず何時間も溶かす。**構造体のフィールドは必ず大文字で始める。**

### 変数と関数

```go
var count int = 3
count := 3                 // ← 型を省略できる(よく使う)

func Add(a int, b int) int {
    return a + b
}
```

### 複数の戻り値とエラー

**Goには例外(try/catch)が無い。** 代わりに「値とエラーの2つを返す」のが作法。

```go
func FindQuestion(id uint) (*Question, error) {
    // ...
    if 見つからない {
        return nil, errors.New("not found")
    }
    return &q, nil          // 成功したらエラーは nil
}

// 呼ぶ側は必ずエラーを確認する
q, err := FindQuestion(5)
if err != nil {
    // エラー処理
    return
}
// ここから q を使う
```

この `if err != nil {` が大量に出てくるのがGoの見た目の特徴。**面倒に見えるが、エラーを握りつぶせない**のが利点。

### スライス(配列)とマップ

```go
segments := []string{"問題文は", "少しずつ", "表示される"}   // スライス
segments = append(segments, "追加")                        // 追加
len(segments)                                              // 長さ

m := map[string]int{"a": 1}                                // マップ(辞書)
```

**空のスライスと nil の違いに注意。**

```go
var a []string           // nil。JSONにすると null
b := []string{}          // 空スライス。JSONにすると []
```

契約は「**hayaoshi は `choices` が `[]`**」なので、**`nil` ではなく空スライス**にする必要がある。

### ポインタ — `null` を表現する道具

```go
var s string = "hello"
var p *string = &s        // & でアドレスを取る。p は「文字列へのポインタ」
fmt.Println(*p)           // * で中身を取り出す → hello

var q *string = nil       // ポインタは nil になれる ← これが「値が無い」の表現
```

**通常の `string` は nil になれない**(空文字 `""` にしかならない)。だから「**値が無い(null)**」を表したいときはポインタを使う。→ §3で詳しく

### 📚 参考リンク

| リンク | どう使うか |
|---|---|
| [A Tour of Go(日本語)](https://go-tour-jp.appspot.com/) | **まずここ。** ブラウザ上でGoを動かしながら基本を通せる |
| [Go by Example](https://gobyexample.com/) | 「スライスってどう書くんだっけ」を調べるとき。例が短くて速い |
| [Effective Go](https://go.dev/doc/effective_go) | 書き方の作法。あとで読めばよい |

**このアプリのどこで使うか**: 全部。特に「大文字=公開」は STEP2 で必ず踏む。

---

## 2. 構造体とJSONタグ — これが `model.go` の正体

### 構造体 = データの形

```go
type Choice struct {
    ID       string
    Text     string
    ImageURL *string
}
```

これだけ。**「このデータはこういうフィールドを持つ」という宣言**にすぎない。

### JSONタグ — Goの名前とJSONの名前をつなぐ

Goのフィールド名は大文字始まり(`TextSegments`)だが、契約のJSONは小文字始まり(`textSegments`)。**この橋渡しをするのがJSONタグ。**

```go
type Question struct {
    ID              uint     `json:"id"`
    Number          int      `json:"number"`
    Type            string   `json:"type"`
    Difficulty      string   `json:"difficulty"`
    TextSegments    []string `json:"textSegments"`
    ImageURL        *string  `json:"imageUrl"`
    Choices         []Choice `json:"choices"`
    CorrectChoiceID *string  `json:"correctChoiceId"`
    Note            *string  `json:"note"`
}
```

バッククォート(`` ` ``)で囲んだ部分がタグ。`json:"textSegments"` と書くと、JSON化したときそのキー名になる。

**これが `docs/実装要件/API仕様書.md` §1 の Question をGoで表現したもの。** タグの名前は仕様書と1文字も違えてはいけない。

### ⚠️ `omitempty` を使わないこと

```go
Note *string `json:"note,omitempty"`    // ❌ 使わない
```

`omitempty` は「値が空ならキーごと消す」オプション。しかし契約は

> **キーは常に存在し、値が `null` / `[]` になる**

なので、**キーを消してはいけない**。フロントは「キーはある前提」で書かれている(→ `フロントエンド実装要件.md` §1)。

### 📚 参考リンク

- [Go公式ブログ「JSON and Go」](https://go.dev/blog/json) — タグの仕組みの決定版
- [encoding/json のリファレンス](https://pkg.go.dev/encoding/json)

**このアプリのどこで使うか**: STEP2(`model.go`)、STEP6(見本エンドポイントのJSON返却)。

---

## 3. `null` をどう表現するか ← このアプリで最重要

契約には「値が `null` になりうる」フィールドが複数ある。

| フィールド | null になるとき |
|---|---|
| `imageUrl` | 画像が無い問題 |
| `note` | 司会者向け補足が無い問題 |
| **`correctChoiceId`** | **hayaoshi(フェーズ2)** |
| `question` / `questionStartedAt`(State) | `waiting` / `finished` フェーズ |

### 方法: ポインタを使う

```go
CorrectChoiceID *string `json:"correctChoiceId"`
```

- 値があるとき → `"B"` を指すポインタ → JSONでは `"B"`
- 値が無いとき → `nil` → **JSONでは `null`**

**`string` のままだと `null` を表現できない**(空文字 `""` になってしまい、「値が無い」と「空文字」の区別がつかない)。

### 使うときは必ず nil チェック

```go
if q.Note != nil {
    fmt.Println(*q.Note)      // * を付けて中身を取り出す
}
```

**nil のポインタに `*` を付けると、プログラムが落ちる**(panic)。必ず確認してから使う。

### ⚠️ `choices` は空スライスにする

`correctChoiceId` と違い、`choices` は**ポインタにしない**。契約が `[]`(空配列)だから。

```go
Choices []Choice `json:"choices"`     // ✅ nil ではなく []Choice{} を入れる
```

DBから読んだ結果が `nil` だと JSON が `null` になってしまうので、**空なら明示的に `[]Choice{}` を入れる**。

> `docs/実装要件/バックエンド実装要件.md` §1 の「**hayaoshi の予約席を最初から確保する**」がこれ。
> v1では hayaoshi を弾くが、**データの形だけは最初から対応**しておく。後からnullable化すると、DB制約・検証・フロント型の全層に波及する。

**このアプリのどこで使うか**: STEP2 が本番。ここを間違えると STEP6 以降で全部直すことになる。

---

## 4. GORM — GoとDBをつなぐ

### 何をしてくれるか

SQLを書かずに、**Goの構造体のままDBを読み書きできる**ようにする道具(ORM = Object-Relational Mapping)。

```go
var q Question
db.First(&q, 5)                       // SELECT * FROM questions WHERE id = 5
db.Where("type = ?", "four_choice").Find(&questions)
db.Create(&q)                         // INSERT
db.Save(&q)                           // UPDATE
```

### GORMタグ

JSONタグと同じ書き方で、**DBの列名や制約**を指定できる。1つのフィールドに両方書ける。

```go
type Question struct {
    ID     uint   `json:"id"     gorm:"primaryKey"`
    Number int    `json:"number" gorm:"uniqueIndex;not null"`
    Type   string `json:"type"   gorm:"not null"`
}
```

### ⚠️ 判断が必要: `choices` と `textSegments` をどうDBに入れるか

配列やオブジェクトの配列は、そのままではDBの1列に入らない。**選択肢は2つ。**

| 方法 | 中身 | 向き不向き |
|---|---|---|
| **A. JSONとして1列に入れる** | `choices` 列に JSON をそのまま保存 | **推奨。** 実装が単純。選択肢を検索する要件が無いので困らない |
| B. 別テーブルにする | `choices` テーブルを作って外部キーで結ぶ | 正式だが、テーブルもコードも増える |

**Aを推奨する。** このアプリは「選択肢だけを横断検索する」ような要件が無く、常に問題とセットで読むため。GORMには専用のタグがある。

```go
TextSegments []string `json:"textSegments" gorm:"serializer:json"`
Choices      []Choice `json:"choices"      gorm:"serializer:json"`
```

`serializer:json` を付けると、**保存時に自動でJSON文字列にし、読み込み時に自動で戻してくれる**。

### ⚠️ `AutoMigrate` は使わない

GORMには構造体からテーブルを自動生成する `AutoMigrate` があるが、**このプロジェクトでは使わない**。
`golang-migrate` でSQLファイルを管理する方針だから(→ §5)。**両方使うとテーブル定義の正が2箇所になって必ず壊れる。**

### 📚 参考リンク

| リンク | どう使うか |
|---|---|
| [GORM公式ドキュメント(日本語)](https://gorm.io/ja_JP/docs/) | **日本語がある。** 「モデルの宣言」「クエリ」の章から |
| [GORM モデルの宣言](https://gorm.io/ja_JP/docs/models.html) | タグの一覧 |

**このアプリのどこで使うか**: STEP2(モデル定義)、STEP3(DB接続)、STEP6以降(読み書き)。

---

## 5. マイグレーション(golang-migrate)— テーブルを作る

### 考え方

**「テーブルをこう変える」というSQLファイルを、順番に積み重ねていく**仕組み。誰の環境でも同じ手順でDBが作られる。

```
migrations/
├── 000001_init.up.sql      ← 適用するSQL(テーブルを作る)
└── 000001_init.down.sql    ← 取り消すSQL(テーブルを消す)
```

**`up` と `down` を必ずペアで作る。** `down` は「やり直したいとき」に使う。

### ファイル名の規則

```
{連番6桁}_{説明}.up.sql
{連番6桁}_{説明}.down.sql
```

連番は**一度使ったら二度と変えない**。既に適用された番号を書き換えると、他の人の環境と食い違う。

### 中身は普通のSQL

```sql
-- 000001_init.up.sql
CREATE TABLE questions (
    id               SERIAL PRIMARY KEY,
    number           INTEGER NOT NULL UNIQUE,
    type             TEXT    NOT NULL,
    difficulty       TEXT    NOT NULL,
    text_segments    JSONB   NOT NULL,
    image_url        TEXT,              -- NULL可 = nullable
    choices          JSONB   NOT NULL,  -- 空配列 [] を入れる
    correct_choice_id TEXT,             -- NULL可(hayaoshi用の予約席)
    note             TEXT               -- NULL可
);
```

- **`NOT NULL` を書かなければ NULL 可**。`correct_choice_id` に `NOT NULL` を付けないことが §3 の「予約席」の実体
- **列名はスネークケース**(`text_segments`)。GORMは `TextSegments` → `text_segments` に自動変換する

### 実行

```bash
mise run db:migrate
```

中で `docker compose exec backend migrate ...` が動く。**DBに触るのでコンテナの中で実行される**(`db` というホスト名はコンテナのネットワークでしか通じないため)。

### 📚 参考リンク

- [golang-migrate](https://github.com/golang-migrate/migrate) — ファイル名規則とCLIの使い方
- [PostgreSQL CREATE TABLE(日本語)](https://www.postgresql.jp/document/current/html/sql-createtable.html)

**このアプリのどこで使うか**: STEP2。

---

## 6. Gin — HTTPを扱う

### ルーティングとハンドラ

```go
r := gin.Default()

r.GET("/api/admin/state", GetState)        // このURLが来たらこの関数を呼ぶ

func GetState(c *gin.Context) {
    c.JSON(200, state)                     // 200番でJSONを返す
}
```

`*gin.Context`(慣習的に `c`)が、**リクエストとレスポンスの両方を持った箱**。ここから読み、ここに書く。

### よく使う操作

```go
c.Param("id")                    // URLの /questions/:id の部分を取る
c.Query("view")                  // ?view=monitor の部分を取る
c.GetHeader("Authorization")     // ヘッダを読む
c.ShouldBindJSON(&body)          // リクエストのJSONを構造体に詰める
c.JSON(200, data)                // JSONを返す
```

### ミドルウェア — 全部のリクエストの前に挟む処理

認証がこれ。**「トークンを確認して、ダメなら止める」を1箇所に書いて、複数のURLに適用できる。**

```go
func AuthRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if トークンが違う {
            c.AbortWithStatusJSON(401, エラー)   // ← Abort で後続を止める
            return
        }
        c.Next()                                  // ← 問題なければ次へ進む
    }
}

// 使う側
admin := r.Group("/api/admin", AuthRequired())
admin.GET("/state", GetState)
```

**`c.Abort...` を呼ばずに `return` すると、処理が続いてしまう**(よくあるバグ)。

### 📚 参考リンク

- [Gin 公式クイックスタート(日本語)](https://gin-gonic.com/ja/docs/quickstart/)
- [Gin 公式ドキュメント(日本語)](https://gin-gonic.com/ja/docs/)
- [Gin のリファレンス(pkg.go.dev)](https://pkg.go.dev/github.com/gin-gonic/gin) — 関数の細かい引数を調べるとき

**このアプリのどこで使うか**: STEP4(ルータ・共通エラー)、STEP5(認証ミドルウェア)、STEP6(ハンドラ)。

---

## 7. パッケージ構成 — `internal/` の意味

```
backend/internal/
├── question/    … 問題(モデル + ハンドラ + DB操作を同居させる)
├── event/       … 進行状態(State)
├── admin/       … 管理者操作・認証
├── sse/         … SSE配信
└── platform/    … 共通基盤(DB接続・ルータ・エラー)
```

**`internal/` はGoの特別なフォルダ名**で、この中のパッケージは**外部のプロジェクトからimportできない**。ライブラリとして公開するつもりが無いコードはここに置くのが慣習。

**1機能 = 1フォルダ**にしてあるのは、**1タスク=1フォルダでコンフリクトを防ぐ**ため(→ `dev_policy/フォルダ構成_policy.md`)。

他のパッケージのものを使うときは、パッケージ名を付ける。

```go
import "github.com/naoto-anzai/quizApp/backend/internal/question"

var q question.Question       // パッケージ名.型名
```

---

## 8. 時刻の扱い

契約の時刻は **RFC3339形式**(`"2026-09-13T13:05:00+09:00"`)。

```go
import "time"

var t time.Time
t = time.Now()
```

**`time.Time` は、JSONタグを付けるだけで自動的にRFC3339形式になる。** 特別な変換は要らない。

```go
QuestionStartedAt *time.Time `json:"questionStartedAt"`   // null になりうるのでポインタ
ServerTime        time.Time  `json:"serverTime"`          // 常にあるので値のまま
```

- [time パッケージ](https://pkg.go.dev/time)

**このアプリのどこで使うか**: STEP2(Stateのモデル)、STEP6(`serverTime` を返す)。

---

## 9. 環境変数

```go
import "os"

dsn := os.Getenv("DATABASE_URL")      // 無ければ空文字が返る
```

`docker-compose.yml` の `environment:` に書いた値がここで読める。

**このアプリのどこで使うか**: STEP3(DB接続)、STEP5(`ADMIN_TOKEN` / `IMPORT_TOKEN`)。

---

## 10. このアプリで絶対に守ること

`docs/実装要件/バックエンド実装要件.md` から、知らずに破りがちなものを抜き出した。

| ルール | なぜ |
|---|---|
| **`correctChoiceId` は NULL許容、`choices` は空配列許容** | hayaoshi の予約席。後から変えると全層に波及する |
| **`omitempty` を使わない** | 契約は「キーは残す、値が null」 |
| **未公開の正答は、公開向けJSONに最初から入れない** | クライアントで隠すのではなく**サーバーで抜く**。開発者ツールで覗けなくする(→ `画面・要件.md` §7) |
| **エラーの `code` は契約**、`message` は開発者向けで自由 | フロントが `code` で分岐する |
| **バリデーションはHTTPもDBも触らない純粋関数として書く** | テストしやすく、メンバータスクに切り出せる |
| **`AutoMigrate` を使わない** | テーブル定義の正が2箇所になる |

---

## 11. つまずいたときの調べ方

1. **エラーメッセージをそのまま検索する。** Goのエラーは短く具体的で、検索に強い
2. **`go doc` で手元で調べられる**。例: `go doc time.Time`
3. **[pkg.go.dev](https://pkg.go.dev/) が公式リファレンス。** ライブラリ名で検索すれば全関数の説明が出る
4. **30分詰まったら質問する**(→ `docs/ガイドライン/開発フローガイド.md`)

### よくあるエラーと意味

| エラー | 意味 |
|---|---|
| `undefined: xxx` | その名前が見つからない。importの漏れ、スペルミス、**小文字で定義していて外から見えない** |
| `cannot use x (type A) as type B` | 型が合わない。ポインタ(`*string`)と値(`string`)の取り違えが多い |
| `invalid memory address or nil pointer dereference` | **nilのポインタに `*` を付けた。** nilチェック漏れ |
| `missing go.sum entry` | `go mod tidy` を実行する |
| `imported and not used` | importしたのに使っていない。**Goは未使用importをエラーにする**(消せばよい) |
