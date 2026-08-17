import { data } from "react-router-dom"
import { AdminState, MonitorState, ViewerState } from "../types"

const BASE = import.meta.env.VITE_API_URL

type Options = {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  auth?: boolean
}

// Error を自作、 code で分岐できるようにする
export class ApiError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message)
  }
}
// 共通機能部分をrequest 関数でまとめる
async function request<Type>(path: string, opts: Options = {}) {
    const {method = 'GET', body, auth=false} = opts 
    const headers: Record<string, string> = {}// 型宣言をすることで{}初期化後のキー指定エラーを避ける
    if(body !== undefined){
      headers['Content-Type'] = 'application/json'
    }
    if(auth){
      headers['Authorization'] = `Bearer ${localStorage.getItem('adminToken') ?? ''}`
    }
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
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
    return res.json() as Promise<Type>
}

export const getViewerState = () => 
  request<ViewerState>('/api/state?view=phone')
export const getMonitorState = () => 
  request<MonitorState>('/api/state?view=monitor')
export const getAdminState = () => 
  request<AdminState>('/api/admin/state',{
    auth:true
  })
export const showQuestion = () => request()
export const advanceText = () => request()
export const showAnswer = () => request()
export const reset = () => request()
export const putQuestions = () => request()
export const getQuestions = () => request()
export const getQuestion = () => request()