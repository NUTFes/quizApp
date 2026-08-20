# QuizApp Spacing Variables

QuizAppのFigmaで、具体的なpx値になっているAuto Layoutの余白を`space/*` Variablesへ安全にバインドする、プロジェクト専用の開発中プラグインです。

## このプラグインが行うこと

- 既定の`dry-run`では、Figmaを変更せず対象・除外・競合を一覧表示する
- 決定済みの30個の`space/*` FLOAT Variablesをfind-or-createする
- Variableの値と現在のpadding・gapが完全に一致する場合だけバインドする
- Displayの選択肢グリッド9件に限り、`counterAxisSpacing`を`19px`から`20px`へ変更する別モードを提供する
- 実行結果を画面とJSONで報告する

## このプラグインが行わないこと

- `13px`、`23px`、`29px`の丸め・バインド
- 救済問題、iOSステータスバー、Displayの早押し画面を起点とする探索
- width / height、文字、角丸、線、色、影、絶対配置の変更
- 同名Variableの上書き、値が違う既存Variableの修正
- ネットワーク通信

> 共有コンポーネントについて
>
> 通常画面と除外画面の両方で使うフッターなどは、通常画面からメインコンポーネントを1回だけバインドします。その結果、除外画面上の同じインスタンスにもバインドが継承されます。除外画面専用のコンポーネントへは入りません。

## ファイル

| ファイル        | 役割                                             |
| --------------- | ------------------------------------------------ |
| `manifest.json` | Figmaがプラグインを読み込むための設定            |
| `code.js`       | 対象検出、Variables作成、バインド、19px→20px変更 |
| `ui.html`       | dry-run結果と確認UI                              |

JavaScriptを直接使用するため、ビルドや`npm install`は不要です。

## 実行前の準備

1. 念のため対象Figmaを複製するか、復元できるようVersion historyの状態を確認する
2. Figma **デスクトップアプリ**で対象ファイルを開く
3. **Design Mode**でファイルを編集できることを確認する
   - Dev Modeのプラグインは読み取り専用なので、書き込みには使えません
   - View権限しかない場合も書き込めません
4. `Plugins → Development → Import plugin from manifest…`を開く
5. このフォルダの`manifest.json`を選ぶ

対象ファイル:

[クイズデザインカンプ](https://www.figma.com/design/5H6rnQnOXO2Xk3xhKGVTOV/%E3%82%AF%E3%82%A4%E3%82%BA%E3%83%87%E3%82%B6%E3%82%A4%E3%83%B3%E3%82%AB%E3%83%B3%E3%83%97?node-id=161-1211&m=dev)

## 実行手順

### 1. 最初のdry-run

1. Figmaのレイヤーパネルで、次の最上位フレームを選択する
   - `Screens/Mobile`（`525:2371`）
   - `Screens/Display`（`525:3394`）
   - `admin`（`525:5184`）
2. 複数を一度に処理する場合は、`Shift`を押しながら3つを選択する
3. `Plugins → Development → QuizApp Spacing Variables`を実行する
4. `dry-run（変更なし）`を押す

この時点ではFigmaを一切変更しません。初回はDisplayの`19px`が9件見つかり、Step 1待ちとして書き込みが停止される想定です。

dry-runの「対象件数」は、実際に`setBoundVariable()`を呼ぶFigmaプロパティ数です。たとえば1ノードの上下paddingは`paddingTop`と`paddingBottom`の2プロパティになるため、再集計表の`py` 1件とは数え方が異なります。奇数pxの表には、比較できるようプロパティ数とノード数を両方表示します。

次を確認します。

- 選択した画面が正しい
- 除外フレームが救済問題・早押し・ステータスバーだけ
- 奇数pxが`13px`、`23px`、`29px`だけ
- 表にない想定外のpx値がない
- `space/2-5`と`space/6`が既存Variableとして再利用される
- 同名Variable、型、値、コレクションの競合がない

`Spacing`コレクションを新規作成予定と表示された場合は、既存コレクションを見落としていないか確認してください。問題がなければ新規作成して構いません。

### 2. Step 1の19px→20px

これは見た目が変わる唯一の処理です。Variables作成・バインドとは分けて実行します。

1. 選択範囲に`Screens/Display`を含める
2. `変更対象を確認（変更なし）`を押す
3. `counterAxisSpacing`が`19px → 20px`になる対象が**9件**あることを確認する
4. 表示されたnode IDと階層を確認する
5. **変更前のスクリーンショットを保存する**
6. 確認チェックを入れ、`9件を20pxへ変更`を押す
7. **変更後のスクリーンショットを保存する**

対象数が9件でない場合や、すでにVariableへバインドされた対象がある場合、書き込みボタンは有効になりません。値だけを見て他の`19px`を変更することはありません。

### 3. もう一度dry-run

1. 改めて対象の最上位フレームを選択する
2. `dry-run（変更なし）`を押す
3. `Step 1（19px→20px）実行待ち`が消えたことを確認する
4. バインド予定表、Variables作成計画、除外、奇数px、停止理由を確認する

停止理由が残っている場合は、Variables作成・バインドを実行しないでください。

### 4. Variables作成・バインド

1. dry-run結果に問題がなければ、確認チェックを入れる
2. `Variables作成・バインド`を押す
3. 実行結果の次の件数を確認する
   - 新規作成したVariables
   - バインドした指定
   - スキップ
   - エラー
4. `JSONをコピー`で監査用ログを保存する

途中で例外が起きた場合、画面には「どこまで作成・バインドしたか」が表示されます。**そのまま再実行せず**、JSONを保存してFigma側の状態を確認してください。

## 実行後の検算

ログだけで完了と判断せず、FigmaのDev Modeで実物を確認します。

1. 通常画面のカードなど、元が`24px`だった余白を数箇所開く
2. 具体値の`24px`ではなく`space/6`と表示されることを確認する
3. 元が`10px`だった箇所では`space/2-5`と表示されることを確認する
4. `13px`、`23px`、`29px`が具体値のまま残っていることを確認する
5. 救済問題・早押し・ステータスバー専用のコンポーネントが今回の対象になっていないことを確認する
6. Step 1のbefore / after画像を比較し、選択肢グリッド以外が変わっていないことを確認する

バインドに失敗している場合、Dev Modeでは静かに`24px`のまま表示されます。そのため、プラグインの成功件数だけではなく、この目視確認が必要です。

## 異常時の対応

### 書き込みボタンが有効にならない

- 指定された最上位フレームだけを選択しているか確認する
- dry-runまたはStep 1の対象確認を、同じ選択範囲でやり直す
- 結果の「書き込みを止めている理由」を確認する
- Step 1を終えてからバインド用dry-runをやり直す

### 既存Variableの競合が出る

プラグインは次の場合に停止し、上書きしません。

- 同名Variableが複数ある
- 同名VariableがFLOAT型ではない
- 既存Variableの値が期待するpxと違う
- 複数モードのうち1つでも値が違う
- `space/2-5`と`space/6`が別コレクションにある

競合内容をJSONで保存し、Figma側のVariables構成を確認してから方針を決めてください。

### 途中まで書き込まれた

1. それ以上操作せず、結果JSONを保存する
2. `createdVariables`、`bound`、`changed`、`errors`を確認する
3. 必要に応じてFigmaのUndoまたはVersion historyから戻す
4. 状態を確認せずに再実行しない

## 実装上の安全装置

- dry-runが既定で、選択が変わると書き込み承認を破棄する
- 書き込み直前に対象を再走査する
- padding・gapの現在値とVariable値が完全一致するときだけバインドする
- 別Variableへバインド済みの指定は上書きしない
- 既存Variableは全モードで値が一致するときだけ再利用する
- コンポーネントインスタンスは、編集可能なローカルのメインコンポーネントをたどる
- リモートライブラリのコンポーネントはスキップして報告する
- Step 1は`Screens/Display`内の`Answer Options`かつ`counterAxisSpacing = 19`の9件だけ
- 例外時は作成・変更済みの件数とnode IDを報告する

## 参考資料

- [`dev_policy/FigmaスペーシングVariables設定指示書.md`](../../dev_policy/FigmaスペーシングVariables設定指示書.md)
- [`dev_policy/Figma・Tailwindスペーシング再集計結果.md`](../../dev_policy/Figma・Tailwindスペーシング再集計結果.md)
- [Figma Plugin manifest](https://developers.figma.com/docs/plugins/manifest/)
- [Figma Plugin API: Working with Variables](https://developers.figma.com/docs/plugins/working-with-variables/)
- [Figma Plugin API: `setBoundVariable`](https://developers.figma.com/docs/plugins/api/properties/nodes-setboundvariable/)
