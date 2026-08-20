# Figma スペーシング Variables 設定指示書

この文書は、**これまでの会話を読んでいないエージェント**が、Figma のスペーシングを Variables 化する作業を行うための指示書である。

関連: [`Figma・Tailwindスペーシング対応表.md`](./Figma・Tailwindスペーシング対応表.md) / [`Figma・Tailwindスペーシング再集計指示書.md`](./Figma・Tailwindスペーシング再集計指示書.md) / Issue #54

---

## 0. ⚠️ この作業の性質 — あなたが書き換えるのは Figma ではなく、プラグインのコード

**MCP や REST API から Figma の Variables をノードにバインドすることはできない。**

| 手段 | Variables 作成 | ノードへのバインド |
| --- | :---: | :---: |
| Dev Mode MCP サーバー | ❌ 読み取り専用 | ❌ |
| Figma REST API | ⚠️ Enterprise プランのみ | ❌ 非対応 |
| **Figma プラグイン API** | ✅ | ✅ `node.setBoundVariable()` |

したがって、**あなたのゴールは「Figma プラグインのコードをリポジトリに書くこと」**である。

そのプラグインを Figma デスクトップアプリで実行するのは PM 本人が行う。**あなたは Figma を直接操作しない。**

### 成果物

```
figma-plugin/spacing-variables/
├── manifest.json
├── code.ts        （または code.js）
├── ui.html        （dry-run 結果を表示する。任意だが推奨）
└── README.md      （PM 向けの実行手順）
```

配置場所はリポジトリ直下の `figma-plugin/` とする。フロントエンドのビルド対象に含めない（`frontend/` の下に置かない）。

---

## 1. 前提（揃わなければ着手しない）

- [ ] 再集計の結果（`dev_policy/Figma・Tailwindスペーシング再集計結果.md`）がある
- [ ] 対象 Figma: [クイズデザインカンプ](https://www.figma.com/design/5H6rnQnOXO2Xk3xhKGVTOV/%E3%82%AF%E3%82%A4%E3%82%BA%E3%83%87%E3%82%B6%E3%82%A4%E3%83%B3%E3%82%AB%E3%83%B3%E3%83%97?node-id=161-1211&m=dev)

対象フレーム:

| 対象 | node ID |
| --- | --- |
| `Screens/Mobile` | `525:2371` |
| `Screens/Display` | `525:3394` |
| `admin` | `525:5184` |

---

## 2. 決定済みの方針（変更しない）

### 2.1 基本ルール

```
Figma の px ÷ 4 = Tailwind のクラス番号 = Variable 名の N
```

Variable 名は `space/N`。小数点は `.` ではなく **`-`** で書く（Figma に既存の `space/2-5` = 10px、`space/6` = 24px がこの表記のため。**新しい命名規則を作らず、既存のものを拡張する**）。

### 2.2 端数の扱い（2026-08-20 決定）

- **4px の倍数でなくてよい。2の倍数まで許容する。**

  理由: Tailwind の既定スケールには `0.5 / 1.5 / 2.5 / 3.5` が最初から含まれている。px が偶数なら 4 で割ると必ず `.5` 刻みになり、**Tailwind 標準の形に収まる**。一方 px が奇数だと `.25` `.75` になり、これは Tailwind に存在しない刻みになる。端数の多くは光学調整であり、丸めると意図を壊すため、標準の形に収まる範囲は残す。

- **値を変更するのは 1箇所だけ**（§3 参照）
  - `19px` → `20px`（Display 選択肢の交差軸 gap、9件）
- **奇数 px（`13px` `23px` `29px`）はすべて据え置く。バインドしない。**

  これらは「スケールから意図的に外した値」として扱う。丸めるとデザイナーの調整を壊すうえ、**丸めるには Figma を書き換える必要がある**（＝見た目が変わるリスクを取る）。据え置けば Figma に触らずに済む。

  特に Display の A〜D ラベルの `pl=26 / pr=29 / pb=23` は、文字を箱の中で光学的に中央へ寄せるための3点セット。`26px` を据え置くと決めた以上、他の2つを丸めると非対称が崩れる。

  **コード側では `py-[13px]` `pr-[29px]` `pb-[23px]` の任意値で書き、コンポーネントの中に閉じ込める。**

### 2.3 バインド対象の Variables（30個）

| px | Variable 名 | 対応する Tailwind |
| ---: | --- | --- |
| 2px | `space/0-5` | `p-0.5` |
| 4px | `space/1` | `p-1` |
| 8px | `space/2` | `p-2` |
| 10px | `space/2-5` | `p-2.5` |
| 12px | `space/3` | `p-3` |
| 14px | `space/3-5` | `p-3.5` |
| 16px | `space/4` | `p-4` |
| 18px | `space/4-5` | `p-4.5` |
| 20px | `space/5` | `p-5` |
| 24px | `space/6` | `p-6` |
| 26px | `space/6-5` | `p-6.5` |
| 28px | `space/7` | `p-7` |
| 30px | `space/7-5` | `p-7.5` |
| 32px | `space/8` | `p-8` |
| 36px | `space/9` | `p-9` |
| 38px | `space/9-5` | `p-9.5` |
| 40px | `space/10` | `p-10` |
| 48px | `space/12` | `p-12` |
| 52px | `space/13` | `p-13` |
| 54px | `space/13-5` | `p-13.5` |
| 60px | `space/15` | `p-15` |
| 62px | `space/15-5` | `p-15.5` |
| 64px | `space/16` | `p-16` |
| 66px | `space/16-5` | `p-16.5` |
| 68px | `space/17` | `p-17` |
| 80px | `space/20` | `p-20` |
| 92px | `space/23` | `p-23` |
| 100px | `space/25` | `p-25` |
| 120px | `space/30` | `p-30` |
| 180px | `space/45` | `p-45` |

`space/2-5` と `space/6` は**すでに存在する**（ステータスバー内で使用）。**新規作成せず、既存のものを再利用すること。**

### 2.4 バインドしないもの

| 対象 | 理由 |
| --- | --- |
| **奇数 px（`13px` `23px` `29px`）** | スケール外の値として意図的に残す（→ §2.2）。バインドせず、件数と node ID を報告する |
| `Mobile/Screen/Repechage/*` `Display/Screen/Repechage/*` | 実装対象外（対応表 §4） |
| `Mobile/System/Status Bar`（`475:8171`）配下 | 実装対象外（端末OS描画。対応表 §3） |
| `Display/Screen/Buzzer/*` | フェーズ2用として保留（対応表 §6）。**削除はしない**が今回はバインドしない |
| `160px` | 救済問題でのみ使用。除外により消滅 |
| 表に無い px 値 | 想定外。**勝手にバインドせず報告する** |

### 2.5 対象のプロパティ

Auto Layout の以下のみ。

| Figma プロパティ | `setBoundVariable` のフィールド名 |
| --- | --- |
| 上下左右 padding | `paddingTop` / `paddingBottom` / `paddingLeft` / `paddingRight` |
| Item spacing（主軸の gap） | `itemSpacing` |
| 折り返し時の交差軸 gap | `counterAxisSpacing` |

**対象外**: width / height、font-size / line-height、border-radius、border-width、色、影、絶対配置の座標。

---

## 3. Step 1: 値の変更（1箇所のみ。バインドとは別作業）

**これは「見た目が変わる」唯一の変更なので、バインド作業と混ぜない。別のコマンドまたは別モードとして実装する。**

| 対象 | 変更 | 件数 |
| --- | --- | ---: |
| `Screens/Display` 選択肢グリッドの**交差軸 gap**（`counterAxisSpacing`） | `19px` → `20px` | 9 |

- 代表 node: `525:3410` `525:3421` `525:3430`。**主軸の gap は `16px` のまま。変更しない**
- **これ以外の値変更を行ってはいけない。** 他の端数（`13px` `23px` `29px` など）は据え置きで確定している（→ §2.2）
- 実行前に、変更対象の node ID・現在値・変更後の値を**一覧で出力し、PM の確認を待つ**
- 実行後、PM に **before / after のスクリーンショット**を撮ってもらう旨を README に書く

⚠️ **値だけを見て一括置換してはいけない。** `19px` はステータスバーの `pb` にも存在する（対象外）。**フレームとプロパティで限定すること。**

---

## 4. Step 2: Variables を作成する

1. スペーシング用の Variable Collection を**探す**。既存の `space/2-5` `space/6` が属するコレクションがあるはずなので、**それを使う**
2. 見つからない場合のみ新規作成する（名前は `Spacing`）。**この場合は必ず報告する**（既存コレクションの見落としの可能性があるため）
3. §2.3 の各値について、`space/N` という名前の **FLOAT 型変数**を find-or-create する
4. **すでに同名の変数があれば作らない。**値が違う場合は**上書きせず報告する**

### プラグイン API の要点

```ts
const collections = figma.variables.getLocalVariableCollections()
const vars = figma.variables.getLocalVariables('FLOAT')
const v = figma.variables.createVariable('space/5', collection, 'FLOAT')
v.setValueForMode(collection.defaultModeId, 20)
```

---

## 5. Step 3: バインドする

対象フレームの配下を再帰的にたどり、Auto Layout を持つノードについて §2.5 のプロパティを見る。

```ts
node.setBoundVariable('paddingLeft', variable)
```

### 🚨 安全装置（必ず実装する）

1. **dry-run を既定にする。** 何もバインドせず「何をバインドする予定か」だけを出力するモードを用意し、**それを既定の動作にする**。実際に書き込むのは PM が明示的に選んだときだけ
2. **値を絶対に変えない。** バインドするのは、**変数の値と現在の値が完全に一致する場合だけ**。`26px` の padding に `space/7`（28px）を当てるようなことは決してしない。一致しなければスキップして報告する
3. **除外フレームに入ったら再帰を打ち切る**（§2.4）。フレーム名で判定する
4. **Variables 以外を一切変更しない。** ノードの追加・削除・移動・リネーム・値の変更をしない（Step 1 を除く）
5. **例外で中断したときの状態を報告する。** 途中まで書き込んだ場合、どこまで進んだかを出力する

---

## 6. 出力・報告

### 6.1 dry-run の出力

| 画面 | px | Variable | 対象件数 |
| --- | ---: | --- | ---: |

および:

- **バインドしたもの**の合計件数
- **スキップしたもの**の一覧と理由（奇数 px / 除外フレーム / 値が一致しない / 表に無い値）
- **奇数 px の内訳** — `13px` `23px` `29px` それぞれの件数と node ID の一覧（次の検討に使う）
- **表に無い px 値**があれば、その値・件数・node ID

### 6.2 PM 向け README

`figma-plugin/spacing-variables/README.md` に、次を**手順として**書く。

1. Figma **デスクトップアプリ**で対象ファイルを開く（ブラウザ版では開発中プラグインを読み込めない）
2. `Plugins → Development → Import plugin from manifest…` で `manifest.json` を選ぶ
3. 対象フレームを選択して実行する
4. **まず dry-run で結果を確認する**
5. 問題なければ書き込みを実行する
6. Step 1（`19px` → `20px`）は別途、before/after のスクリーンショットを残す

### 6.3 検算

作業後、**Dev Mode で数箇所を開き、`24px` ではなく `space/6` と表示されることを確認する**手順を README に書く。バインドが効いていない状態は Dev Mode 上で静かに `24px` と表示されるだけなので、実行結果のログだけを信用しない。

---

## 7. やってはいけないこと

- Figma を直接操作しようとする（MCP / REST でバインドはできない。プラグインのコードを書く）
- dry-run を省略して書き込む実装にする
- 変数の値と一致しない padding にバインドする（＝見た目を変える）
- 奇数 px（`13` `23` `29`）をバインドする、または勝手に丸める
- 除外フレーム（Repechage / Status Bar / Buzzer）に入る
- 既存の `space/2-5` `space/6` を作り直す・上書きする
- `space/N` 以外の命名規則を導入する
- Variables 以外のプロパティを変更する
- コミット、push、PR 作成
