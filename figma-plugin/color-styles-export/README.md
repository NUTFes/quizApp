# QuizApp Color Styles Export

Figma のローカル Color Style を読み取り、**名前と hex の対応**を JSON と Tailwind の `@theme` ブロックで出力する、読み取り専用のプラグインです。

Issue #52（色・フォントのトークン定義）で、Figma で決めた色を `frontend/src/index.css` へ写すために使います。

## このプラグインが行うこと

- このファイルの**ローカル** Color Style を全件読み取る
- スタイル名から CSS 変数名を作る（`text/primary` → `--color-text-primary`）
- 不透明度が 100% 未満なら 8桁 hex にする（`#0ba4c8` + 40% → `#0ba4c866`）
- そのまま `index.css` に貼れる `@theme { ... }` を出力する
- 記録用の JSON を出力する

## このプラグインが行わないこと

- **Figma への書き込み**（一切しません。選択範囲も変えません）
- ライブラリ（リモート）のスタイルの出力 — **ローカルのものだけ**が対象です
- Text Style、Effect Style の出力 — 色（Paint Style）だけです
- ネットワーク通信

## 使い方

1. Figma **デスクトップアプリ**で対象ファイルを開く
2. `Plugins → Development → Import plugin from manifest…` でこのフォルダの `manifest.json` を選ぶ
3. `Plugins → Development → QuizApp Color Styles Export` を実行する
4. 上の欄（Tailwind）と下の欄（JSON）をそれぞれコピーする

Figma 側でスタイルを直したら、`再読み込み` を押せば出力が更新されます。

## 出力例

```css
@theme {
  --color-bg-base: #101014;
  --color-state-correct: #22c55e;
  --color-text-primary: #ffffff;
}
```

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

**警告が残ったまま `@theme` を採用しないでください。** 出力から黙って抜け落ちます。

## 命名について

CSS 変数名はスタイル名から機械的に作られます。つまり **Figma の名前がそのままコードの名前になります。**

- `/` は `-` になる（`text/primary` → `text-primary`）
- 先頭の `color/` は落ちる（`Color/Border/Default` → `--color-border-default`）
- 大文字は小文字になる

役割で名前を付けてください（`--color-primary`）。`--color-blue` のような見た目の名前にすると、色を変えたときに名前が嘘になります。

## 参考資料

- Issue #52
- [Figma Plugin API: `getLocalPaintStylesAsync`](https://developers.figma.com/docs/plugins/api/properties/figma-getlocalpaintstylesasync/)
- [Tailwind CSS: `@theme`](https://tailwindcss.com/docs/theme)
