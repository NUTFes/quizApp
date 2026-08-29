# 問題の画像の置き場

ここに置いた画像は `/images/<ファイル名>` で配信される。
問題データ(JSON)の `imageUrl` / `imageA`〜`imageD` には、この
**URLパス**を書く(ファイル名だけでもフルURLでもない)。

    "imageUrl": "/images/q1.png"

配信経路:
  本番 frontend/nginx.conf の location /images/ → backend
  開発 frontend/vite.config.ts の proxy '/images' → backend
  実体 backend/internal/platform/router.go の r.Static("/images", "./static/images")

## 反映のしかた

**このディレクトリは git 管理下にある。** 画像をコミットして push すれば、
`infra/deploy.sh` の①(git fetch + checkout)で各環境に降りる。
CT へ scp する必要はない。

    git add backend/static/images/q1.png
    git commit -m "問題画像を追加する"
    git push
    # CT 側で deploy.sh を回すと反映される

`docker-compose.prod.yml` はこのディレクトリをボリュームで backend に
渡しているので、イメージの再ビルドは不要(ファイルが置かれた時点で配信される)。

## ★ このリポジトリは public ★

コミットした画像は、当日より前に誰でも見られる。
**写真1枚で答えが割れる問題の画像は、ここに入れない。**
その種の画像は git に入れず、当日 scp で直接置く:

    scp -i ~/.ssh/quiz_deploy q1.png root@<CTのIP>:/opt/quizApp/backend/static/images/

同じ理由で `infra/seed-questions.sql` も架空の問題しか書かない
(→ dev_policy/インフラ・デプロイ_policy.md)。

## 決めごと

- ファイル名は半角英数字とハイフン。日本語名はURLエンコードが絡んで
  シートに書くパスと実体の対応が追いにくくなる
- モニタ表示用なので長辺1920px・数百KB程度に落としてから入れる。
  CT のディスクは12GBしかない
- 打ち間違いは `PUT /api/admin/questions` の `warnings` が教えてくれる。
  投入のたびに `warnings` が `[]` であることを確認する
