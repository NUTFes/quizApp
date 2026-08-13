// ============================================================
// eslint.config.js — リンター(危ないコードの癖を指摘する道具)の設定
//
// 何のためにあるか → ../docs/CI・コードチェック入門.md §2②
// 書式(インデント等)はここでは扱わない。それは Prettier の担当。
//   pnpm lint      … チェックする
//   pnpm lint:fix  … 自動で直せるものは直す
// ============================================================

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  // チェックしないもの(ビルド結果・依存パッケージ)
  { ignores: ['dist', 'node_modules'] },

  {
    // 対象は TypeScript / TSX ファイル
    files: ['**/*.{ts,tsx}'],

    extends: [
      js.configs.recommended, // JavaScriptの基本ルール
      ...tseslint.configs.recommended, // TypeScript向けルール
      prettier, // ← 最後に置く。Prettierと衝突する書式系ルールを全部オフにする
    ],

    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser, // window, document などをエラー扱いしない
    },

    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },

    rules: {
      // Reactのフック(useState等)の使い方の間違いを検出する
      ...reactHooks.configs.recommended.rules,

      // ホットリロードが効かなくなる書き方を警告
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // 未使用の変数はエラー。ただし _ で始まる名前は「意図的に使わない」とみなす
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
)
