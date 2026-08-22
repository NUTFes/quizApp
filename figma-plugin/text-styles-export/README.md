# QuizApp Text Styles Export

Figma のローカル Text Style を読み取り、**名前と値の対応**を JSON と Tailwind の `@theme` ブロックで出力する、読み取り専用のプラグインです。

Issue #52（色・フォントのトークン定義）で、Figma で決めた文字を `frontend/src/index.css` へ写すために使います。**対応表を手で書いてメンテしないための道具**です。

> 色は [`color-styles-export`](../color-styles-export/) です。混ざると読みにくいので分けてあります。

## このプラグインが行うこと

- このファイルの**ローカル** Text Style を全件読み取る
- スタイル名から CSS 変数名を作る（`heading/lg` → `--text-heading-lg`）
- サイズ・行間・字間・ウェイトを Tailwind の修飾キーに展開する
- 使われている書体を集めて `--font-*` にする
- そのまま `index.css` に貼れる `@theme { ... }` を出力する
- 記録用の JSON を出力する

## このプラグインが行わないこと

- **Figma への書き込み**（一切しません。選択範囲も変えません）
- ライブラリ（リモート）のスタイルの出力 — **ローカルのものだけ**が対象です
- 色（Paint Style）、影（Effect Style）の出力
- ネットワーク通信

## 使い方

1. Figma **デスクトップアプリ**で対象ファイルを開く
2. `Plugins → Development → Import plugin from manifest…` でこのフォルダの `manifest.json` を選ぶ
3. `Plugins → Development → QuizApp Text Styles Export` を実行する
4. 上の欄（Tailwind）と下の欄（JSON）をそれぞれコピーする

Figma 側でスタイルを直したら、`再読み込み` を押せば出力が更新されます。

## 出力例

```css
@theme {
  --font-noto-sans-jp: "Noto Sans JP", sans-serif;

  --text-body-md: 16px;
  --text-body-md--line-height: 24px;
  --text-body-md--font-weight: 400;
  --text-heading-lg: 36px;
  --text-heading-lg--line-height: 1.4;
  --text-heading-lg--letter-spacing: 0.02em;
  --text-heading-lg--font-weight: 700;
}
```

**`--text-heading-lg` の4行は、Tailwind の1つのユーティリティにまとまります。** `text-heading-lg` と書けば、サイズ・行間・字間・ウェイトが一度に当たります。

## 警告が出る場合

Text Style は「フォント・サイズ・行間・字間・ウェイト」の束なので、`@theme` に写しきれない指定があります。**落ちるものは必ず報告します。**

| warning | 意味 | 対応 |
| --- | --- | --- |
| `… に変換されるスタイルが2件あります` | 別名のスタイルが**同じ CSS 変数名**になる（`caption/sm` と `Caption/SM`） | どちらかを Figma でリネームする。**CSS 側にも `⚠️ 重複` のコメントが入ります** |
| `… の行間が Auto です` | 行間がフォント任せになっている | **書体を変えると行間も動きます。**値で指定することを勧めます |
| `… のウェイトを数値に変換できません` | `Bold` `Regular` などに当てはまらない | Figma 側でウェイト名を確認する |
| `… の指定は @theme では再現できません` | `Condensed` など、ウェイト以外の修飾 | 使う場所で個別に指定する |
| `… は斜体ですが` | `@theme` に斜体の出力先がない | 使う場所で `italic` クラスを足す |
| `… は大文字変換や下線の指定を持っています` | `textCase` / `textDecoration` | 使う場所で `uppercase` `underline` を足す |
| `書体が3種類あります` | 書体が多い | **日本語のWebフォントは1書体で数MB。**本番は会場で200人が同時に読み込みます |

**警告が残ったまま `@theme` を採用しないでください。**

## 命名について

CSS 変数名はスタイル名から機械的に作られます。つまり **Figma の名前がそのままコードの名前になります。**

- `/` は `-` になる（`heading/lg` → `heading-lg`）
- 先頭の `text/` は落ちる（`text/body/md` → `--text-body-md`）
- 大文字は小文字になる（**そのため `caption/sm` と `Caption/SM` は衝突します**）

## 参考資料

- Issue #52
- [`figma-plugin/color-styles-export/`](../color-styles-export/) — 色の版
- [`figma-plugin/text-inventory/`](../text-inventory/) — どのスタイルがどこで使われているかを調べる版
- [Figma Plugin API: `getLocalTextStylesAsync`](https://developers.figma.com/docs/plugins/api/properties/figma-getlocaltextstylesasync/)
- [Tailwind CSS: `@theme`](https://tailwindcss.com/docs/theme)
