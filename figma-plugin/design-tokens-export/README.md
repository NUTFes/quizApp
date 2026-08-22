# QuizApp Design Tokens Export

Figma のローカル Color Style と Text Style を読み取り、**名前と値の対応**を JSON と Tailwind の `@theme` ブロックで出力する、読み取り専用のプラグインです。

Issue #52（色・フォントのトークン定義）で、Figma で決めたものを `frontend/src/index.css` へ写すために使います。**対応表を手で書いてメンテしないための道具**です。

## このプラグインが行うこと

- このファイルの**ローカル** Color Style / Text Style を全件読み取る
- スタイル名から CSS 変数名を作る（`text/primary` → `--color-text-primary`、`heading/lg` → `--text-heading-lg`）
- 色: 不透明度が 100% 未満なら 8桁 hex にする（`#0ba4c8` + 40% → `#0ba4c866`）
- 文字: サイズ・行間・字間・ウェイトを Tailwind の修飾キーに展開する
- 使われている書体を集めて `--font-*` にする
- そのまま `index.css` に貼れる `@theme { ... }` を出力する
- 記録用の JSON を出力する

## このプラグインが行わないこと

- **Figma への書き込み**（一切しません。選択範囲も変えません）
- ライブラリ（リモート）のスタイルの出力 — **ローカルのものだけ**が対象です
- Effect Style（影）の出力
- ネットワーク通信

## 使い方

1. Figma **デスクトップアプリ**で対象ファイルを開く
2. `Plugins → Development → Import plugin from manifest…` でこのフォルダの `manifest.json` を選ぶ
3. `Plugins → Development → QuizApp Design Tokens Export` を実行する
4. 上の欄（Tailwind）と下の欄（JSON）をそれぞれコピーする

Figma 側でスタイルを直したら、`再読み込み` を押せば出力が更新されます。

## 出力例

```css
@theme {
  /* 色 */
  --color-bg-base: #101014;
  --color-state-correct: #22c55e;

  /* フォント */
  --font-noto-sans-jp: "Noto Sans JP", sans-serif;

  /* 文字 */
  --text-body-md: 16px;
  --text-body-md--line-height: 24px;
  --text-body-md--font-weight: 400;
  --text-heading-lg: 36px;
  --text-heading-lg--line-height: 1.4;
  --text-heading-lg--letter-spacing: 0.02em;
  --text-heading-lg--font-weight: 700;
}
```

`--text-heading-lg` の4行は Tailwind の1つのユーティリティにまとまります。`text-heading-lg` と書けば、サイズ・行間・字間・ウェイトが一度に当たります。

```json
{
  "count": 12,
  "warnings": [],
  "styles": [
    {
      "name": "bg/base",
      "cssVariable": "--color-bg-base",
      "cssValue": "#101014",
      "paints": [{ "type": "SOLID", "hex": "#101014" }],
      "styleId": "S:..."
    }
  ]
}
```

## 警告が出る場合

| warning | 意味 | 対応 |
| --- | --- | --- |
| `… に変換されるスタイルが2件あります` | 別名のスタイルが**同じ CSS 変数名**になる（`text/primary` と `Text/Primary` など） | どちらかを Figma でリネームする。放置すると片方が黙って消える |
| `… は単色ではないため CSS 変数にできません` | グラデーションや画像塗り | CSS 変数にはできない。使う場所で個別に書く |
| `… は英数字を含まないため CSS 変数名にできません` | スタイル名が日本語だけ | Figma 側で英数字の名前に変える |
| `… の行間が Auto です` | Figma の行間が Auto | **フォントを変えると行間も変わります。**値で指定することを勧めます |
| `… のウェイトを数値に変換できません` | `Bold` `Regular` などに当てはまらない | Figma 側でウェイト名を確認する |
| `… の指定は @theme では再現できません` | `Condensed`、大文字変換、下線など | 使う場所でクラスを足す |
| `書体が3種類あります` | 書体が多い | **日本語のWebフォントは1書体で数MB。**本番で200人が同時に読み込むので絞る |

**警告が残ったまま `@theme` を採用しないでください。** 出力から黙って抜け落ちます。

## 命名について

CSS 変数名はスタイル名から機械的に作られます。つまり **Figma の名前がそのままコードの名前になります。**

- `/` は `-` になる（`text/primary` → `text-primary`）
- 先頭の `color/` `text/` は落ちる（`Color/Border/Default` → `--color-border-default`）
- 大文字は小文字になる

役割で名前を付けてください（`--color-primary`）。`--color-blue` のような見た目の名前にすると、色を変えたときに名前が嘘になります。

## 参考資料

- Issue #52
- [Figma Plugin API: `getLocalPaintStylesAsync`](https://developers.figma.com/docs/plugins/api/properties/figma-getlocalpaintstylesasync/)
- [Figma Plugin API: `getLocalTextStylesAsync`](https://developers.figma.com/docs/plugins/api/properties/figma-getlocaltextstylesasync/)
- [Tailwind CSS: `@theme`](https://tailwindcss.com/docs/theme)
