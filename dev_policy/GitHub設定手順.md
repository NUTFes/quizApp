# GitHub設定手順(PM作業用)

**GitHubのWeb画面で行う設定作業の手順書。** 上から順にやれば終わる。
ブラウザで https://github.com/NUTFes/quizApp を開いて、この文書を横に置きながら進める。

- 所要時間: 30〜40分
- 必要な権限: リポジトリのAdmin(PMのアカウント)

> ## 📌 実施状況(2026-08-13 現在)
>
> **手順2〜5 は実施済み。** 残っているのは以下。
>
> | 手順 | 状態 |
> |---|---|
> | 1. コラボレーター招待 | ⬜️ 未(org移管により、org側のメンバー管理になっている可能性あり) |
> | 2. マージ方式の固定 | ✅ 完了(squashのみ / PR_TITLE / 自動削除ON) |
> | 3. mainブランチ保護 | ✅ 完了(approve1 / 管理者にも適用 / force push禁止 / **PMのみapprove bypass可**) |
> | 4. CI必須チェック | ✅ 完了(`frontend` + `backend`) |
> | 5. ラベル | ✅ 完了(難易度3 + 領域4 + `bug`) |
> | 6. マイルストーン | ⏸ **保留**(タスクを起票してから期限を引き直す) |
> | 7. CODEOWNERSのユーザー名 | ⬜️ 未(ユーザー名の確認待ち) |
> | 8. 練習PRでの動作確認 | ⬜️ 未 |
>
> ### ⚠️ 前提の変更: リポジトリを public にした
>
> 無料プランのプライベートリポジトリでは**ブランチ保護もCODEOWNERSも使えない**ため、
> リポジトリを public に変更した(NUTFes org は free プラン)。
>
> **本番の問題データと正答は絶対にコミットしないこと。** 誰でも見られる状態になっている。
> 問題はスプレッドシート→GAS経由でDBに入る設計なので、リポジトリには入らない。
> `db:seed` のサンプルデータを作るときも、本番問題を流用しない。
- **なぜこの設定にするのか** → [`../docs/GitHub運用ガイド.md`](../docs/ガイドライン/GitHub運用ガイド.md)

---

## ⚠️ 実施順序の注意

**手順4(必須チェックの指定)は、CIが一度も走っていないとチェック名が選択肢に出てこない。**

なので、この順で進める:

```
手順1〜3 を先にやる
   ↓
ESLint/Prettier導入のPRを出す(CIが走る)
   ↓
手順4(必須チェックの指定)をやる
   ↓
手順5〜7
```

CI導入のPRがまだマージされていない段階では、手順4だけ飛ばして後で戻ってくる。

---

## 手順1. コラボレーターを招待する

レビュワーがレビューできるようにするため。**招待していない人はCODEOWNERSに書いても指名されない。**

1. `Settings` タブ → 左メニュー **`Collaborators`**
2. **`Add people`** ボタン
3. GitHubユーザー名かメールアドレスで検索して招待
4. 権限は **`Write`** を選ぶ
   - `Read` だとレビューはできるが、ブランチをpushできない
   - `Write` なら開発もレビューもできる

### 招待する人

| 呼び名 | 役割 | GitHubユーザー名 |
|---|---|---|
| キンギョ | バックエンドリーダー(開発+レビュー) | ⬜️ 記入する |
| ともちゃん | レビュー担当(フロント側) | ⬜️ 記入する |
| みゆちゃん | レビュー担当(バック側) | ⬜️ 記入する |
| (フロント開発メンバー) | 開発 | ⬜️ 記入する |

- [ ] 全員を招待した
- [ ] 全員が招待を承諾した(承諾されるまで有効にならない)

---

## 手順2. マージ方式を固定する

**squash mergeを「口頭ルール」から「強制」に変えるための設定。**
→ 理由: [`GitHub運用ガイド.md`](../docs/ガイドライン/GitHub運用ガイド.md) 3-3

1. `Settings` タブ → 左メニュー **`General`**(最初に開く画面)
2. 下にスクロールして **`Pull Requests`** のセクションを探す
3. 以下のとおりチェックを設定する

| 項目 | 設定 |
|---|---|
| Allow merge commits | ⬜️ **OFF(チェックを外す)** |
| Allow squash merging | ☑️ **ON** |
| Allow rebase merging | ⬜️ **OFF(チェックを外す)** |
| Automatically delete head branches | ☑️ **ON** |

> **`Allow squash merging` を先にONにしてから、他の2つをOFFにする。**
> 3つ全部OFFにはできない(最低1つは必要)ので、順番を間違えるとエラーになる。

さらに、`Allow squash merging` の下にあるプルダウン:

| 項目 | 設定 |
|---|---|
| Default commit message | **`Pull request title`** を選ぶ |

これで、squash時のコミットメッセージがPRのタイトルそのものになる。

- [ ] マージ方式を squash のみにした
- [ ] ブランチ自動削除をONにした
- [ ] コミットメッセージを Pull request title にした

---

## 手順3. mainブランチを保護する

**PRとレビューを経ないと `main` に入れられないようにする。**
→ 理由: [`GitHub運用ガイド.md`](../docs/ガイドライン/GitHub運用ガイド.md) 3-2

1. `Settings` タブ → 左メニュー **`Branches`**
2. **`Add branch protection rule`**(または `Add rule`)ボタン
3. **`Branch name pattern`** に `main` と入力
4. 以下を設定する

### 設定内容

| 項目 | 設定 | 意味 |
|---|---|---|
| **Require a pull request before merging** | ☑️ ON | 直接pushを禁止 |
| └ Require approvals | ☑️ ON / **`1`** | レビュー1件必須 |
| └ Dismiss stale pull request approvals when new commits are pushed | ⬜️ OFF | ONだと修正のたび再approveが必要になり待ちが増える |
| └ Require review from Code Owners | ⬜️ **OFF** | ONだと特定の人待ちが発生する(→運用ガイド3-7) |
| **Require status checks to pass before merging** | ☑️ ON | CI必須 |
| └ Require branches to be up to date before merging | ⬜️ **OFF** | ONだとPRが並んだとき待ち行列になる |
| └ (チェック名の指定) | **手順4で行う** | |
| **Require conversation resolution before merging** | ☑️ ON | 未解決コメントを残したままマージできない |
| **Do not allow bypassing the above settings** | ☑️ **ON** | **PM自身にも適用される。重要** |
| └ Allow specified actors to bypass required pull requests | ☑️ ON / **`naoto-anzai`** | **準備期間中の例外。** approve待ちだけをPMに免除(CI必須・直接push禁止は残る)→ 運用ガイド3-2 |
| Allow force pushes | ⬜️ OFF | 履歴の破壊を防ぐ |
| Allow deletions | ⬜️ OFF | mainブランチ自体の削除を防ぐ |

5. 一番下の **`Create`**(または `Save changes`)を押す

- [ ] ルールを作成した
- [ ] `Do not allow bypassing` がONになっている(自分にも適用される)

> **注意**: これを設定すると、PM自身も `main` に直接pushできなくなる。
> 今後は全部PR経由になる。それが目的なので、面倒でもここは変えない。

---

## 手順4. CIの必須チェックを指定する

**⚠️ ESLint/Prettier導入のPRがマージされ、CIが一度走ったあとで実施する。**
CIが走った実績がないと、チェック名が選択肢に出てこない。

1. `Settings` → `Branches` → 作った `main` のルールの **`Edit`**
2. **`Require status checks to pass before merging`** の下の検索ボックスに `frontend` と入力
3. 候補に出てきた **`frontend`** を選択
4. 同様に **`backend`** を選択
5. **`Save changes`**

| 必須にするチェック名 | 中身 |
|---|---|
| `frontend` | ESLint / Prettier / tsc / vite build |
| `backend` | gofmt / go vet / go build |

- [ ] `frontend` を必須にした
- [ ] `backend` を必須にした

---

## 手順5. ラベルを作る

**Issueの難易度・領域を示すラベル。** PMが起票時に付ける。
→ 理由: [`GitHub運用ガイド.md`](../docs/ガイドライン/GitHub運用ガイド.md) 3-13

1. `Issues` タブ → **`Labels`** ボタン
2. **`New label`** で1つずつ作る(名前・説明・色を入力して `Create label`)

### 作るラベル(8個)

| 名前 | 説明 | 色 |
|---|---|---|
| `good first issue` | 1ファイルで完結。見本をコピーして作れる | `#7057ff`(既定であるはず) |
| `easy` | 1つのfeatureフォルダ内で完結。設計判断なし | `#0e8a16`(緑) |
| `hard` | 複数箇所にまたがる/設計を含む。PM・リーダー担当 | `#b60205`(赤) |
| `frontend` | 画面側(`frontend/`) | `#1d76db`(青) |
| `backend` | サーバー側(`backend/`) | `#5319e7`(紫) |
| `infra` | Docker・CI・デプロイ | `#fbca04`(黄) |
| `docs` | ドキュメント | `#c5def5`(水色) |
| `bug` | 不具合(既定であるはず) | `#d73a4a`(赤) |

> `good first issue` と `bug` はGitHubが最初から用意しているので、**無ければ作る**程度でよい。
> 既定のラベル(`duplicate`, `enhancement`, `question` など)で使わないものは削除してよい。使わないラベルが並んでいると選ぶとき迷う。

- [ ] 難易度3つを作った
- [ ] 領域4つを作った
- [ ] `bug` がある
- [ ] 使わない既定ラベルを整理した

---

## 手順6. マイルストーンを作る

**フェーズごとの締切を見えるようにする。** 本番日から逆算する。

1. `Issues` タブ → **`Milestones`** → **`New milestone`**

| 名前 | 説明 | 期日の目安 |
|---|---|---|
| `Phase 1: 画面とAPIの並行製作` | モック画面 + API実装 | ⬜️ 記入する |
| `Phase 2: 結合` | モックを本物に差し替え、通しリハーサル | **本番1ヶ月前** |
| `Phase 3: 磨き・本番準備` | デザイン調整、負荷確認、デプロイ | 本番直前 |

> **Phase 2 の期日を「本番1ヶ月前」に置くのが逆算の起点**
> (→ [`タスク分割・進め方_policy.md`](./タスク分割・進め方_policy.md))

- [ ] 3つのマイルストーンを作った
- [ ] 本番日から逆算して期日を入れた

---

## 手順7. CODEOWNERSのユーザー名を埋める

**これだけはWeb画面ではなくファイル編集。** PR経由で変更する。

1. `.github/CODEOWNERS` を開く
2. `@REPLACE_ME_*` を、手順1で確認した実際のGitHubユーザー名に置き換える

| 置き換える箇所 | 入れる人 |
|---|---|
| `@REPLACE_ME_経験者A` | ともちゃん |
| `@REPLACE_ME_経験者B` | みゆちゃん |
| `@REPLACE_ME_バックエンドリーダー` | キンギョ |

3. ブランチを切ってPRを出し、マージする

- [ ] ユーザー名を埋めた
- [ ] PRを出してマージした

---

## 手順8. 動作確認

設定が効いているかを、**練習用Issueの1周**で確かめる。

1. 練習用Issue(READMEに名前を追加する内容)を起票する
2. メンバーの誰か1人にブランチ→PRまでやってもらう
3. 以下を確認する

- [ ] PRを出すと、CODEOWNERSで指名されたレビュワーに自動でレビュー依頼が飛んでいる
- [ ] CIが自動で走っている
- [ ] approveが0件の状態では、マージボタンが押せない(グレーアウトしている)
- [ ] approve 1件 + CI緑 でマージボタンが押せるようになる
- [ ] マージ方式が **Squash and merge** しか選べない
- [ ] マージ後、ブランチが自動で消えている
- [ ] PM自身も `main` に直接pushできない(`git push` が拒否される)

**最後の項目が一番大事。** ここが通ってしまうなら、手順3の `Do not allow bypassing` がONになっていない。

---

## 全体チェックリスト

- [ ] 手順1: コラボレーター招待(4人)
- [ ] 手順2: マージ方式をsquashのみに固定
- [ ] 手順3: mainブランチ保護
- [ ] 手順4: CI必須チェックの指定(**CIが走ったあとで**)
- [ ] 手順5: ラベル8個
- [ ] 手順6: マイルストーン3つ
- [ ] 手順7: CODEOWNERSのユーザー名
- [ ] 手順8: 練習PRで動作確認
