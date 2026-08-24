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
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

# デプロイする対象。ブランチ名でもタグ名でもよい。
#   通常          : bash infra/deploy.sh                      (= main)
#   本番/リハーサル: REF=rehearsal-2026-09-01 bash infra/deploy.sh
#
# ★ 本番はタグを使うこと。ブランチはポインタが動くので「当日動いていたもの」を
#   後から特定できない。タグは動かないので特定でき、戻すのも REF を変えるだけ。
#   デプロイ専用ブランチは作らない(→ dev_policy/Git運用・CI_policy.md GitHub Flow)。
REF="${REF:-main}"

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
  value="$(grep -E "^${key}=" .env.prod | head -1 | cut -d= -f2-)"
  [ -z "$value" ] && missing="${missing} ${key}"
done
if [ -n "$missing" ]; then
  echo "!! .env.prod の次の値が空です:${missing}" >&2
  echo "   生成例: openssl rand -base64 24  /  openssl rand -hex 32" >&2
  exit 1
fi

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
echo "デプロイ対象: $(git --no-pager log -1 --format='%h %s')"

echo "=== ② ビルドして起動 ====================================="
$COMPOSE up -d --build

echo "=== ③ マイグレーション ==================================="
# ★ 順序が重要。アプリより先にスキーマを作る。
#   backend の起動を待ってから実行する(コンテナが上がりきる前だと失敗する)。
sleep 5
$COMPOSE exec -T backend sh -c 'migrate -path /app/migrations -database "$DATABASE_URL" up'

echo "=== ④ 疎通確認 ==========================================="
$COMPOSE ps
echo "--- フロント ---"
curl -sf -o /dev/null -w "  GET /            -> %{http_code}\n" http://localhost:8080/
echo "--- API ---"
curl -sf -w "\n" http://localhost:8080/api/health
echo "--- SSE(接続できたら5秒で切る。hello イベントが出れば成功) ---"
curl -sN --max-time 5 http://localhost:8080/api/events || true

echo "=== ⑤ 後始末(ディスクが12GBしかないため必須) ============="
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

ログを見る:
  docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f
============================================================
MSG
