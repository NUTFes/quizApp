#!/usr/bin/env bash
# ============================================================
# runner-job-guard.sh — CT のランナーに「CD のジョブ以外」を実行させない
#
# 【何のためか】
#   ランナーはリポジトリに登録するので、書き込み権限がある人なら誰でも、
#   作業ブランチに置いた別のワークフローで runs-on: [self-hosted, quiz-stg] と
#   書くだけで CT 上でコードを実行できてしまう。Environment の承認は
#   environment: を書いたジョブしか守らないので、承認を迂回される。
#   ランナーは docker を使える(= CT の root 相当)うえ .env.prod を読める。
#
#   本来は組織の runner group で「使えるワークフロー」を絞るのが正攻法だが、
#   NUTFes は GitHub Free プランで runner group を作れない。そこで GitHub の
#   「ジョブ開始前スクリプト」(ACTIONS_RUNNER_HOOK_JOB_STARTED)を使い、
#   ランナー側で弾く。このスクリプトが 0 以外で終わると、ジョブの手順は
#   1つも実行されずに失敗になる。
#
# 【どこに置くか】CT の /usr/local/sbin/quiz-runner-job-guard.sh(root 所有)
#   ★ /opt/quizApp の中を直接指さないこと。/opt/quizApp は deploy ユーザーが
#     書き換えられるので、ガード自体を書き換えられる。コピーして置く。
#   手順 → docs/ガイドライン/デプロイ手順.md 3.5 ②
#
# 【判定に使う値】GITHUB_WORKFLOW_REF / GITHUB_JOB は GitHub が設定する既定の変数で、
#   ワークフローの env: では上書きできない(GITHUB_* は上書き不可)。
# ============================================================
set -euo pipefail

# このランナーが実行してよいジョブ名。ランナーの .env に書く(stg: deploy-stg / prod: deploy-prod)。
# ★ 未設定なら全部拒否する。設定漏れで「何でも通る」にならないようにするため。
allowed_job="${QUIZ_RUNNER_ALLOWED_JOB:-}"
expected_workflow="NUTFes/quizApp/.github/workflows/cd.yml@refs/heads/main"

reject() {
  echo "::error::このランナーは CD(${expected_workflow} の ${allowed_job:-<未設定>})専用です。$1" >&2
  echo "  workflow_ref=${GITHUB_WORKFLOW_REF:-} job=${GITHUB_JOB:-} event=${GITHUB_EVENT_NAME:-}" >&2
  exit 1
}

[ -n "$allowed_job" ] || reject "QUIZ_RUNNER_ALLOWED_JOB が設定されていません。"
[ "${GITHUB_WORKFLOW_REF:-}" = "$expected_workflow" ] || reject "main の cd.yml 以外からは実行しません。"
[ "${GITHUB_JOB:-}" = "$allowed_job" ] || reject "このランナーで実行してよいジョブではありません。"
case "${GITHUB_EVENT_NAME:-}" in
  workflow_run | workflow_dispatch) ;;
  *) reject "想定外のイベントです。" ;;
esac

# cd.yml 側で「ガードを通ってきたか」を確かめるための印。
# ガードを入れ忘れたランナーでは CD が失敗するので、無防備なまま使い続けることがない。
echo "QUIZ_RUNNER_GUARD=passed" >> "$GITHUB_ENV"
echo "runner-job-guard: OK (${GITHUB_JOB})"
