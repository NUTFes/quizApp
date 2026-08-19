export const BASE: string = import.meta.env.VITE_API_URL
if (!BASE) {
  throw new Error(
    'VITE_API_URL が設定されていません。.env.example をコピーして .env を作り、mise run down && mise run up で開発サーバーを再起動してください。'
  )
}
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
// 毎回呼び出す度に実行されてほしいから、定数としては扱えないため、関数オブジェクトで定義
export const getAdminToken = () => localStorage.getItem('adminToken') ?? ''
