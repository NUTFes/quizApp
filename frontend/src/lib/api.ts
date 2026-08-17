import { data } from "react-router-dom"

const BASE = import.meta.env.VITE_API_URL

type Options = {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
}

// Error を自作、 code で分岐できるようにする
export class ApiError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message)
  }
}
// 共通機能部分をrequest 関数でまとめる
async function request(path: string, opts: Options = {}) {
    const {method = 'GET', body} = opts 
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
    if(!res.ok){
        const data = await res.json().catch(() => null)
        throw new ApiError(
          data?.error?.code ?? 'UNKNOWN', 
          res.status, 
          data?.error?.message ?? res.statusText,
        )
    }
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