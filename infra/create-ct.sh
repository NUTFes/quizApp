#!/usr/bin/env bash
# ============================================================
# create-ct.sh — 本番/リハーサル用の CT を作る
#
# 【どこで実行するか】Proxmox ホストの Shell(PVE GUI の「>_ Shell」)
# 【なぜスクリプトか】検証用CTと本番CTを「同じ条件」で作るため。
#   手打ちだと差分が入り、しかもCTを消した瞬間に手順の記録も消える。
#
# 2026-08-24 に VMID 201(quiz-stg)で全項目の検証済み。実測値は末尾の記録を参照。
# ============================================================
set -euo pipefail

# ---- ここだけ変えて使う ------------------------------------
VMID="${VMID:-202}"
HOSTNAME="${HOSTNAME:-quiz-prod}"
TEMPLATE="local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst"
STORAGE="local-lvm"
DISK_GB="12"          # 実測: アプリ入りで 1.4GB 程度。thin pool が逼迫しているため小さめ
CORES="2"
MEMORY_MB="4096"      # LXCのmemoryは「上限」であって予約ではない。ビルド時のみ膨らむ
SWAP_MB="512"
BRIDGE="vmbr0"
PUBKEY="/root/.ssh/quiz_deploy.pub"
DESC="quizApp ${HOSTNAME} / 撤収予定 YYYY-MM-DD / 連絡先 naoto"
# ------------------------------------------------------------

echo "=== ① 事前確認 ==========================================="
pveversion
echo "--- ストレージ(ZFSだと overlayfs が使えず fuse-overlayfs が要る) ---"
pvesm status
echo "--- thin pool の空き(Data% が 85% を超えていたら中止) ---"
lvs
echo "--- ホストの時刻同期(CTはホストの時計をそのまま使う。CT内にNTPを入れても無意味) ---"
timedatectl
echo "--- 使用中の VMID ---"
pct list

if pct status "$VMID" >/dev/null 2>&1; then
  echo "!! VMID ${VMID} は既に存在します。中止します。" >&2
  exit 1
fi
if [ ! -f "$PUBKEY" ]; then
  echo "!! 公開鍵 ${PUBKEY} がありません。" >&2
  echo "   手元(WSL)で ssh-keygen -t ed25519 -f ~/.ssh/quiz_deploy して、" >&2
  echo "   .pub の中身をこのホストに貼り付けて作成してください。" >&2
  exit 1
fi

read -rp "VMID=${VMID} hostname=${HOSTNAME} disk=${DISK_GB}G で作成します。よろしいですか? [y/N] " ans
[ "$ans" = "y" ] || { echo "中止しました"; exit 1; }

echo "=== ② CT 作成 ============================================"
pct create "$VMID" "$TEMPLATE" \
  --hostname "$HOSTNAME" \
  --description "$DESC" \
  --unprivileged 1 \
  --features nesting=1,keyctl=1 \
  --cores "$CORES" \
  --memory "$MEMORY_MB" \
  --swap "$SWAP_MB" \
  --rootfs "${STORAGE}:${DISK_GB}" \
  --net0 "name=eth0,bridge=${BRIDGE},ip=dhcp" \
  --timezone Asia/Tokyo \
  --onboot 1 \
  --ssh-public-keys "$PUBKEY" \
  --start 1

# ★ nesting/keyctl が無いと Docker は起動すらしない。作成直後に必ず確認する。
pct config "$VMID" | grep -E '^(features|unprivileged|rootfs):'

echo "起動待ち..."
sleep 10

echo "=== ③ Docker を入れる ===================================="
# Debian 標準の docker.io ではなく公式リポジトリを使う(docker compose v2 が必要なため)
pct exec "$VMID" -- bash -eux <<'EOS'
apt update && apt -y upgrade
apt install -y ca-certificates curl git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# デプロイ用の一般ユーザー(root で運用しない)
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
EOS

echo "=== ④ 検証(ここが本番の可否を決める) ====================="
pct exec "$VMID" -- bash -c '
set -x
systemctl is-active docker
docker info | grep -iE "storage driver|driver-type"
docker run --rm hello-world >/dev/null && echo "hello-world: OK"
docker compose version
echo "既定の fd 上限: $(ulimit -n) / hard: $(ulimit -Hn)"
echo "コンテナに指定した場合: $(docker run --rm --ulimit nofile=65535:65535 alpine sh -c "ulimit -n")"
# 永続ボリュームを持つコンテナまで確認する(hello-world だけでは不十分)
docker run --rm -d --name pgtest -e POSTGRES_PASSWORD=x -v /tmp/pgtest:/var/lib/postgresql/data postgres:16 >/dev/null
sleep 12
docker logs pgtest 2>&1 | grep -q "ready to accept connections" && echo "postgres 永続ボリューム: OK"
docker rm -f pgtest >/dev/null && rm -rf /tmp/pgtest
'

echo "=== ⑤ 後始末(12GBしかないので必須) ======================="
pct exec "$VMID" -- docker system prune -af
pct fstrim "$VMID"          # ★ これをやらないと、消した分がthin poolに返らない
lvs

cat <<'MSG'

============================================================
判定基準:
  Storage Driver が overlayfs / overlay2  → OK
  vfs だった場合                          → 12GB では即破綻。要相談
  postgres 永続ボリューム: OK が出ること
  lvs の data 行 Data% が 85% 未満であること

次にやること:
  pct snapshot <VMID> base-docker-ok      # 検証済みの状態を保存
  infra/deploy.sh をCT内で実行してアプリを載せる

--- 2026-08-24 quiz-stg(VMID 201)での実測 -------------------
  PVE 9.2.3 / ストレージは lvmthin(ZFSではない)
  Storage Driver : overlayfs (containerd snapshotter)  → OK
  fd 上限        : 既定 1024 / hard 524288 / 指定時 65535
                   → compose の ulimits で 65535 を明示すること
  ディスク実消費 : 12GB中 1.37GB (Data% 11.42)
  thin pool      : 68.33% → 70.87%(CT作成後)
  ホストNTP      : synchronized yes / JST
  コンテナ内TZ   : 指定しないと UTC のまま → compose で TZ=Asia/Tokyo
============================================================
MSG
