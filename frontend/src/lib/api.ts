const BASE = import.meta.env.VITE_API_URL

// 共通機能部分をrequest 関数でまとめる
async function request(path: string) {
    const res = await fetch(`${BASE}${path}`)
    return res.json()
}

export const getState = () => request()
export const getAdminState = () => request()
export const showQuestion = () => request()
export const advanceText = () => request()
export const showAnswer = () => request()
export const reset = () => request()
export const putQuestions = () => request()
export const getQuestions = () => request()
export const getQuestion = () => request()