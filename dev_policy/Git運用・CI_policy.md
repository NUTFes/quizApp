# Git運用・CI policy

## 方針

初心者チームなので、**ルールは少なく・機械(CI/保護設定)に守らせる**。口頭ルールは守られない前提で設計する。

## ブランチ戦略

**GitHub Flow(main + 作業ブランチのみ)** を採用。develop等の中間ブランチは作らない。

- `main`: 常に動く状態を保つ。直接push禁止(ブランチ保護)
- 作業ブランチ: `feat/issue番号-短い説明`(例: `feat/12-monitor-question-view`)、修正は `fix/...`
- 1ブランチ = 1 Issue = 1 PR。大きくなりそうなら Issue を先に分割する

## PR運用ルール

1. PRは**必ずIssueに紐づける**(説明文に `closes #12`)
2. レビューは**approve 1人で merge 可**。まとめ役+経験があるメンバーをレビュワー既定にする
3. マージ方式は **Squash merge に統一**(初心者のWIPコミットがmainに残らない、履歴が1PR=1コミットで読める)
4. PRテンプレート(`.github/PULL_REQUEST_TEMPLATE.md`)を置く: 「やったこと / 動作確認方法 / スクショ」
5. レビューで大事なのは動作確認。**レビュワーは手元で `mise run up` して動かして見る**文化にする

## main ブランチ保護設定(GitHubリポジトリ設定でやること)

- Require a pull request before merging(approve 1件必須)
- Require status checks to pass(CI通過必須)
- 管理者にも適用(まとめ役自身の事故も防ぐ)

## CI(GitHub Actions)

v1では**シンプルに3ジョブだけ**。テスト文化は後から育てる。

`.github/workflows/ci.yml` の内容:

| ジョブ | 内容 | 落ちる条件 |
|---|---|---|
| lint | ESLint + Prettier(--check) | コードスタイル違反 |
| typecheck | `tsc --noEmit`(front/back/shared) | 型エラー |
| build | フロント・バックのビルド | ビルド不能 |

- トリガー: PRと mainへのpush
- pnpmキャッシュを効かせて数分で終わるようにする(遅いCIは無視されるようになる)
- テスト(vitest)はジョブ枠だけ用意しておき、最初は通る空テスト1本から始める

## コミットメッセージ

厳密なConventional Commitsは求めない。「日本語でよいので、何をしたか分かる1行」だけルール化。Squash mergeなのでPRタイトルさえまともなら履歴は保たれる。

## TODO(開発開始前)

- [ ] リポジトリ作成後、main保護設定を入れる
- [ ] ci.yml を作成し、スケルトンリポジトリでgreenになることを確認
- [ ] PRテンプレート・Issueテンプレート(タスク用)を作成
- [ ] ESLint + Prettier の設定をルートに置き、エディタ設定(`.vscode/settings.json` + 拡張機能recommendations)もコミットする
- [ ] メンバー向けに「clone → ブランチ作成 → 変更 → PR → レビュー → merge」を1周する練習Issue(READMEに名前を足す等)を用意する
