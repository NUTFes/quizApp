#!/usr/bin/env bash
# ============================================================
# deploy.sh — アプリを本番CTにデプロイする
#
# 【どこで実行するか】CT の中(PVEホストで pct enter <VMID> して入る)
# 【前提】infra/create-ct.sh でCTが作られ、Docker が動いていること
#         /opt/quizApp に clone 済みで、.env.prod が置いてあること
#
# 初回だけ手でやること:
#   git clone https://github.com/NUTFes/quizApp.git /opt/quizApp
#   cd /opt/quizApp
#   cp .env.prod.example .env.prod && chmod 600 .env.prod && vi .env.prod
# ============================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/quizApp}"

# compose に渡すファイル。中身は下の「② 構成の確定」で組み立てる。
# .env.prod に STG_CF_TUNNEL_TOKEN があれば docker-compose.stg-tunnel.yml を重ね、
# 自分たちの Cloudflare トンネル(cloudflared)も一緒に起動する。
COMPOSE=""

# デプロイする対象。ブランチ名でもタグ名でもよい。
#   通常          : bash infra/deploy.sh                      (= main)
#   本番/リハーサル: REF=rehearsal-2026-09-01 bash infra/deploy.sh
#
# ★ 本番はタグを使うこと。ブランチはポインタが動くので「当日動いていたもの」を
#   後から特定できない。タグは動かないので特定でき、戻すのも REF を変えるだけ。
#   デプロイ専用ブランチは作らない(→ dev_policy/Git運用・CI_policy.md GitHub Flow)。
#
# ★ REF を省略したときは main ではなく「いまチェックアウト中のもの」を使う。
#   main 固定にすると、検証中のブランチで作業しているときに REF を書き忘れただけで
#   勝手に main に戻され、docker-compose.prod.yml ごと消えて謎のエラーになる
#   (2026-08-25 に実際に踏んだ)。既定値は cd したあとで決める。
REF="${REF:-}"

# .env.prod から値を1つ読む。見つからなければ空文字を返す。
# ★ grep で書くと「行が無い」ときに終了コード1が返り、冒頭の set -euo pipefail で
#   デプロイ全体がその場で止まる。STG_CF_TUNNEL_TOKEN のような任意項目は
#   行が無いのが正常(既存CTの .env.prod には無い)なので、no-match でも
#   成功扱いになる awk で読む。
env_value() {
  awk -F= -v key="$1" '$0 ~ "^" key "=" { sub(/^[^=]*=/, ""); print; exit }' .env.prod
}

cd "$APP_DIR"

if [ ! -f .env.prod ]; then
  echo "!! .env.prod がありません。.env.prod.example をコピーして値を埋めてください。" >&2
  exit 1
fi

# ★ 空欄を早期に検出する。
# backend は ADMIN_TOKEN が空だと起動時に log.Fatal で落ちる(cmd/server/main.go)。
# restart: always と組み合わさるとクラッシュループになり、原因が分かりにくい。
# ここで止めれば「どの値が空か」がその場で分かる。
missing=""
for key in POSTGRES_PASSWORD ADMIN_TOKEN IMPORT_TOKEN; do
  value="$(env_value "$key")"
  [ -z "$value" ] && missing="${missing} ${key}"
done
if [ -n "$missing" ]; then
  echo "!! .env.prod の次の値が空です:${missing}" >&2
  echo "   生成例: openssl rand -hex 24  /  openssl rand -hex 32" >&2
  exit 1
fi

# REF 省略時の既定値 = いまチェックアウト中のブランチ。
# detached HEAD(= タグでデプロイ済み)なら、そのまま動かさない。
if [ -z "$REF" ]; then
  REF="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$REF" = "HEAD" ]; then
    echo "=== ① コードを取得(現状維持) ============================="
    echo "detached HEAD のため切り替えません。別のものを入れるなら REF=<タグ名> を指定してください。"
    REF=""
  else
    echo "(REF 未指定のため、いまのブランチ ${REF} を使います)"
  fi
fi

if [ -n "$REF" ]; then
  echo "=== ① コードを取得(${REF}) ==============================="
  git fetch --prune --tags origin
  if git rev-parse -q --verify "refs/tags/${REF}" >/dev/null; then
    # タグ: detached HEAD で固定する(動かない = 何が動いているか特定できる)
    git checkout -q --detach "refs/tags/${REF}"
  else
    # ブランチ: 追従する。--ff-only なので、勝手なマージコミットは作られない
    git checkout -q "${REF}"
    git merge --ff-only "origin/${REF}"
  fi
fi
echo "デプロイ対象: $(git --no-pager log -1 --format='%h %s')"

# ★ 切り替えた先に本番用ファイルが無いことがある(まだマージされていないブランチ等)。
#   ここで止めないと docker compose の "no such file or directory" になり、
#   原因が REF の指定ミスだと気づきにくい。
if [ ! -f docker-compose.prod.yml ]; then
  echo "!! docker-compose.prod.yml がありません。REF の指定が間違っている可能性があります。" >&2
  echo "   いまの HEAD: $(git --no-pager log -1 --format='%h %s')" >&2
  echo "   本番構成が入っているブランチ/タグを REF= で指定してください。" >&2
  exit 1
fi

echo "=== ② 構成の確定 ========================================="
# ★ トンネルを使うかどうかは .env.prod の STG_CF_TUNNEL_TOKEN の有無だけで決める。
#   起動オプションを手で覚える形にすると、練習環境で書き忘れた時に
#   「デプロイは成功したのに外から繋がらない」という分かりにくい形で出る。
COMPOSE="docker compose -f docker-compose.prod.yml"
tunnel_token="$(env_value STG_CF_TUNNEL_TOKEN)"
if [ -n "$tunnel_token" ]; then
  if [ ! -f docker-compose.stg-tunnel.yml ]; then
    echo "!! STG_CF_TUNNEL_TOKEN があるのに docker-compose.stg-tunnel.yml がありません。" >&2
    echo "   REF がトンネル対応より前のタグ/ブランチを指している可能性があります。" >&2
    exit 1
  fi
  COMPOSE="$COMPOSE -f docker-compose.stg-tunnel.yml"
  echo "cloudflared あり(STG_CF_TUNNEL_TOKEN が設定されています)"
else
  echo "cloudflared なし(STG_CF_TUNNEL_TOKEN が空。外部公開は組織の Cloudflare 側に任せます)"
fi
COMPOSE="$COMPOSE --env-file .env.prod"
unset tunnel_token        # 値をこのあとのログに出さない

echo "=== ③ ビルドして起動 ====================================="
# ★ --remove-orphans が必須。これが無いと、トンネルを使うのをやめて
#   STG_CF_TUNNEL_TOKEN を空にして再デプロイしても、起動済みの cloudflared は
#   今の構成に含まれない「orphan」として残り続ける。restart: always なので
#   CT を再起動しても生き返り、個人のドメイン経由での公開が意図せず続く。
$COMPOSE up -d --build --remove-orphans

echo "=== ④ マイグレーション ==================================="
# ★ 順序が重要。アプリより先にスキーマを作る。
#   backend の起動を待ってから実行する(コンテナが上がりきる前だと失敗する)。
sleep 5
$COMPOSE exec -T backend sh -c 'migrate -path /app/migrations -database "$DATABASE_URL" up'

echo "=== ⑤ 疎通確認 ==========================================="
$COMPOSE ps
echo "--- フロント ---"
curl -sf -o /dev/null -w "  GET /            -> %{http_code}\n" http://localhost:8080/
echo "--- API ---"
curl -sf -w "\n" http://localhost:8080/api/health
echo "--- SSE(接続できたら5秒で切る。hello イベントが出れば成功) ---"
# ★ view は必須。付け忘れると 400 の JSON が返るだけで、SSE の確認にならない
#   (backend/internal/sse/handler.go)。
curl -sN --max-time 5 "http://localhost:8080/api/events?view=monitor" || true

if [ -f docker-compose.stg-tunnel.yml ] && echo "$COMPOSE" | grep -q docker-compose.stg-tunnel.yml; then
  echo "--- トンネル(Registered tunnel connection が出ていれば接続済み) ---"
  $COMPOSE logs --tail 20 cloudflared
  echo "  ※ 外からの疎通は https://<設定したホスト名>/api/events?view=monitor で確認する。"
  echo "    Cloudflare のダッシュボードで Routes を設定するまでは 404 や 530 になる。"
fi

echo "=== ⑥ 後始末(ディスクが12GBしかないため必須) ============="
docker image prune -f
df -h /

# 当日「何が動いているか」を即答できるようにディスクに残す
git --no-pager log -1 --format="%H %s" > /opt/DEPLOYED_REF
echo "REF=${REF}" >> /opt/DEPLOYED_REF
echo "deployed_at=$(date '+%Y-%m-%d %H:%M:%S %Z')" >> /opt/DEPLOYED_REF
echo "--- /opt/DEPLOYED_REF ---"; cat /opt/DEPLOYED_REF

cat <<'MSG'

============================================================
このあとホスト側(PVEのShell)でやること:
  pct fstrim <VMID>    # 消したイメージの分をthin poolに返す
  lvs                  # data 行の Data% が 85% 未満か確認

ログを見る(トンネルを使っている場合は -f docker-compose.stg-tunnel.yml も足す):
  docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f
============================================================
MSG
