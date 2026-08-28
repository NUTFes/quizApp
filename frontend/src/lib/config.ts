// API のベースURL。
//
// 未設定なら空文字 = 相対パスにする。本番はフロント(nginx)とAPIが同一サブドメイン
// (quiz.○○○.jp)に同居し、パスで振り分ける構成なので、'/api/state' で正しく届く。
// 開発では docker-compose.yml の VITE_API_URL=http://localhost:3000 が入る。
//
// ここで throw してはいけない。Vite の環境変数は「ビルドした瞬間の値」がJSに
// 焼き込まれ、実行時に読み直されない。本番ビルドで渡し忘れると localhost:3000 が
// 全参加者の端末に配られて全滅する。「手順を守る」より「間違えられない形」を採る。
// → dev_policy/インフラ・デプロイ_policy.md §フロントに localhost が焼き込まれる事故
export const BASE: string = import.meta.env.VITE_API_URL ?? ''
export const SURVEY_URL: string = import.meta.env.VITE_SURVEY_URL ?? ''
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// アンケート(Google Form)のURL。finished フェーズの導線に使う。
// state には含まれない値なので、サーバーからではなくここから取る
// (→ docs/実装要件/画面・要件.md §6)。
//
// BASE と同じく、ここで throw してはいけない。ビルド時に渡し忘れても
// 「アンケートのリンクが出ない」だけで済むように、空文字を許す。
// 呼び出し側は空文字のときリンク自体を描画しないこと(href="" は
// 「現在のページ」を指すので、押すとリロードされてしまう)。
export const SURVEY_URL: string = import.meta.env.VITE_SURVEY_URL ?? ''
// 毎回呼び出す度に実行されてほしいから、定数としては扱えないため、関数オブジェクトで定義
export const getAdminToken = () => localStorage.getItem('adminToken') ?? ''
