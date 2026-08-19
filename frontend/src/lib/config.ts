export const BASE = import.meta.env.VITE_API_URL
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
// 毎回呼び出す度に実行されてほしいから、定数としては扱えないため、関数オブジェクトで定義
export const getAdminToken = () => localStorage.getItem('adminToken') ?? ''
