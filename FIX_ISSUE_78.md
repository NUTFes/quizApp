# Fix for #78

**Issue:** 【初心者T2】GET /images/... で画像を配信する

**Analysis:**
**バックエンドの最初の1本。** まず全員がこれで「書く → 登録する → curl で叩く」の1周を体験します。

> 📘 **先に読むもの**: [`dev_policy/初心者タスク共通の実装手順書.md`](../blob/main/dev_policy/初心者タスク共通の実装手順書.md)
> 環境の起動・ブランチの切り方・CI の通し方・PR の出し方は全部そこにまとまっています。この Issue には**このタスク固有のこと**だけ書いてあります。

## ①ゴール

サーバーに置いた画像ファイルを `GET /images/ファイル名` で配信する（**認証なし**）。→ [`API仕様書.md`](../blob/main/docs/実装要件/API仕様書.md) **§6**

```
backend/static/images/test.png  を置く
  ↓
http://localhost:3000/images/test.png  がブラウザで表示される
```

## ②触ってよいファイル

- `backend/internal/platform/router.go` — 静的配信を**1行**足す
- `backend/static/images/` — フォルダを作る（`.gitkeep` を置く）

## ③写経元・参考

- `backend/internal/platform/router.go` の既存の `r.GET("/api/health", ...)` の並び
- Gin の静的配信: https://gin-gonic.com/ja/docs/routing/ の `router.Static`

## ④動作確認方法

```bash
mise run up
# 適当な画像を backend/static/images/test.png に置く
curl -I http://localhost:3000/images/test.png     # 200 と Content-Type: image/png
```

- [ ] ブラウザで `http://localhost:3000/images/test.png` を開くと画像が表示される
- [ ] **認証ヘッダ無しで見える**こと（参加者のスマホか

**Fix applied:** Automated fix attempt via bot. Requires manual review.
