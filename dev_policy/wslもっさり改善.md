# WSL2 もっさり解消タスク（Claude Code 向け指示書）

## 背景

- 環境: Windows + WSL2、VS Code Remote-WSL で複数リモート接続を同時起動
- 用途: 1つの React プロジェクトを複数の git worktree に分けてブランチ並行開発
- 症状: キー入力のエコー遅延、上下スクロールの遅延。定常的ではなく**波がある**
- 既に実施済み:
  - `/etc/wsl.conf` で `interop.appendWindowsPath = false`
  - プロジェクトを `/mnt/c` ではなく ext4 側（`/home/...`）に配置
  - VS Code 統合ターミナルではなく Windows Terminal から直接 WSL に入る運用

## 作業ルール

- **調査フェーズを先に完了させ、結果を報告してから修正に入ること。** 原因が確定しないまま設定を変えない
- `sudo` を伴うコマンド、設定ファイルの書き換えは**実行前に必ず確認を取る**
- 変更するファイルは事前にバックアップを取る（例: `sudo cp /etc/sysctl.conf /etc/sysctl.conf.bak`）
- `wsl --shutdown` は Windows 側で実行する必要があり、実行すると**このセッションを含む全 WSL プロセスが落ちる**。自分で実行せず、必要なタイミングで作業者に依頼すること
- `C:\Users\<user>\.wslconfig` は Windows 側のファイル。`/mnt/c/Users/<user>/.wslconfig` から読めるが、**書き換えは提案のみ**とし、内容を提示して作業者に委ねること

---

## フェーズ1: 現状調査

以下をすべて実行し、結果をまとめて報告する。

### 1-1. メモリとプロセス

```bash
free -m
ps -eo pid,rss,comm --sort=-rss | head -20
```

確認点:

- `available` の残量（数GB 残っているか）
- `tsserver` / `node` が何プロセス、合計どれだけ RSS を消費しているか
- swap が使われていないか

### 1-2. inotify の使用状況（最重要）

```bash
cat /proc/sys/fs/inotify/max_user_watches
cat /proc/sys/fs/inotify/max_user_instances
find /proc/*/fd -lname 'anon_inode:inotify' 2>/dev/null | wc -l
```

確認点:

- `max_user_watches` が既定値（8192 など）のままなら枯渇の可能性が高い
- 枯渇すると VS Code / Vite がポーリングにフォールバックし、周期的な CPU スパイク＝「波」を生む

### 1-3. ディスク

```bash
df -h /
du -sh ~/.vscode-server 2>/dev/null
```

確認点: ルートの使用率が高いと vhdx の疎ファイル拡張で待ちが発生する

### 1-4. worktree と node_modules の重複

```bash
git worktree list
```

各 worktree について:

```bash
du -sh */node_modules 2>/dev/null
ls -d */node_modules 2>/dev/null | wc -l
```

確認点: worktree ごとに実体の `node_modules` があると、ディスク・inotify・tsserver インデックスを重複消費する

### 1-5. 圧力の時系列記録

もっさりする瞬間に何が詰まっているかを特定する。60秒ほど回して、作業者に「遅くなった時刻」を聞いて突き合わせる。

```bash
timeout 60 bash -c 'while true; do
  echo "=== $(date +%H:%M:%S)"
  grep some /proc/pressure/cpu /proc/pressure/io /proc/pressure/memory
  free -m | sed -n 2p
  sleep 2
done' | tee /tmp/psi.log
```

判定:

| 跳ねる指標                | 原因                                                        |
| ------------------------- | ----------------------------------------------------------- |
| `io` の avg10             | ディスク待ち（Defender / vhdx / swap）                      |
| `memory` + available 枯渇 | メモリ不足 → `.wslconfig` の割り当て                        |
| `cpu` のみ                | WSL 内プロセスの食い過ぎ（tsserver / watcher / dev server） |
| どれも平穏                | WSL 外（Windows ホスト側）が原因                            |

---

## フェーズ2: 修正

調査結果に応じて該当するものだけ実施する。

### 2-1. inotify 上限の引き上げ

1-2 で枯渇が確認された場合のみ。

```bash
sudo cp /etc/sysctl.conf /etc/sysctl.conf.bak
```

`/etc/sysctl.conf` に追記:

```
fs.inotify.max_user_watches=524288
fs.inotify.max_user_instances=1024
```

反映:

```bash
sudo sysctl -p
cat /proc/sys/fs/inotify/max_user_watches   # 524288 になっているか確認
```

効かない場合は `/etc/wsl.conf` の `[boot] systemd=true` の有無を確認し、`wsl --shutdown` が必要な旨を作業者に伝える。

### 2-2. VS Code の監視対象を削減

各 worktree の `.vscode/settings.json` を作成または更新。既存の設定がある場合はマージすること（上書き禁止）。

```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/.next/**": true,
    "**/coverage/**": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true
  },
  "files.exclude": {
    "**/.git": true
  },
  "typescript.tsserver.maxTsServerMemory": 3072
}
```

`.vscode/settings.json` がリポジトリ管理下にある場合は、コミットしてよいか作業者に確認する。

### 2-3. node_modules の重複解消

1-4 で重複が確認された場合。**どちらを選ぶか作業者に確認してから実施する。**

**案A: pnpm への移行（推奨・恒久対策）**

グローバルストアからハードリンクを張るため、worktree が増えても実ディスクはほぼ増えない。

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm import        # package-lock.json から pnpm-lock.yaml を生成
pnpm install
```

移行前に確認すべきこと:

- CI 設定（`npm ci` を使っていないか）
- Dockerfile
- postinstall スクリプトや、フラットな node_modules に依存したパッケージの有無

**案B: シンボリックリンク（暫定）**

全 worktree で `package.json` が同一である場合に限る。

```bash
cd <worktree-path>
rm -rf node_modules
ln -s ../<main-worktree>/node_modules node_modules
```

依存が変わるブランチでは実体を持たせる必要があるため、`package.json` の差分を先に確認すること:

```bash
git diff <main-branch> -- package.json package-lock.json
```

### 2-4. `.wslconfig` の見直し（提案のみ）

1-1 でメモリ枯渇や swap 使用が確認された場合。**Claude Code は編集せず、以下を提示して作業者に委ねる。**

`C:\Users\<user>\.wslconfig`:

```ini
[wsl2]
memory=16GB
processors=12
swap=0
autoMemoryReclaim=disabled
sparseVhd=true
pageReporting=false
```

- `memory` は物理 RAM の 5〜7 割程度
- `swap=0` はメモリを十分割り当てた場合のみ。不足すると OOM で落ちる
- `processors` は物理コア数より少なく残す（Windows 側の VS Code クライアント UI が飢えないように）
- 反映には `wsl --shutdown` が必要

現在の物理 RAM とコア数を先に確認して、具体的な数値を埋めて提示すること:

```bash
nproc
free -g | sed -n 2p
```

### 2-5. Windows 側の対処（提案のみ）

1-5 で「どれも平穏なのにもっさり」だった場合、Windows Defender が疑わしい。以下を作業者に渡す（管理者 PowerShell で実行）。

```powershell
Get-ChildItem "$env:LOCALAPPDATA\Packages" -Filter ext4.vhdx -Recurse -ErrorAction SilentlyContinue |
  ForEach-Object { Add-MpPreference -ExclusionPath $_.DirectoryName }

Add-MpPreference -ExclusionPath "\\wsl$"
Add-MpPreference -ExclusionPath "\\wsl.localhost"
Add-MpPreference -ExclusionProcess "vmmem.exe"
Add-MpPreference -ExclusionProcess "wsl.exe"
Add-MpPreference -ExclusionProcess "wslservice.exe"
```

あわせて、Defender のスケジュールスキャン時刻が「遅くなる時間帯」と一致していないか確認するよう伝える。

---

## フェーズ3: 運用の変更（作業者への提案）

設定チューニングより効果が大きい可能性が高い。調査結果とあわせて提案する。

- **VS Code のリモートウィンドウは、いま手で編集している1つだけに絞る。** 残りの worktree は Windows Terminal + tmux から `claude` を直接起動する。拡張機能ホストと tsserver が worktree の数だけ立つのを防げる

  ```bash
  tmux new -s wt-a -c ~/work/worktree-a
  tmux new -s wt-b -c ~/work/worktree-b
  # Ctrl-b s でセッション切り替え。接続断でも生き残る
  ```

- dev サーバー（Vite / webpack）を全 worktree で同時に起動しない。動作確認するブランチだけ立ち上げる

- 同時 worktree 数の上限を、`free -m` の available が常時数GB残る範囲に決める

---

## 完了報告に含めるもの

1. フェーズ1 の各コマンドの出力
2. 波の原因の判定（io / memory / cpu / WSL外 のどれか）とその根拠
3. 実施した修正と、実施しなかった項目およびその理由
4. `wsl --shutdown` や Windows 側での作業など、作業者が手動で行う必要がある残タスク
5. 修正後の再計測結果（1-1、1-2、可能なら 1-5 を再実行して比較）
