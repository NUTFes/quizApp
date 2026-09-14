import type {
  AdminState,
  ImageInfo,
  ImageUploadResult,
  ImportResult,
  MonitorState,
  Question,
  QuestionImport,
  QuestionListItem,
  ViewerState,
} from '../types'
import { RowIssue } from '../types/rowIssue'
import { BASE, getAdminToken } from './config'

type Options = {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  auth?: boolean
}

// Error を自作、 code で分岐できるようにする
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly details: RowIssue[] = [],
  ) {
    super(message)
  }
}
// 共通機能部分をrequest 関数でまとめる
async function request<Type>(path: string, opts: Options = {}) {
  const { method = 'GET', body, auth = false } = opts
  const headers: Record<string, string> = {} // 型宣言をすることで{}初期化後のキー指定エラーを避ける
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (auth) {
    headers['Authorization'] = `Bearer ${getAdminToken()}`
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(
      data?.error?.code ?? 'UNKNOWN',
      res.status,
      data?.error?.message ?? res.statusText,
      data?.error?.details ?? [],
    )
  }
  return res.json() as Promise<Type>
}

export const getViewerState = () => request<ViewerState>('/api/state?view=phone')
export const getMonitorState = () => request<MonitorState>('/api/state?view=monitor')
export const getAdminState = () =>
  request<AdminState>('/api/admin/state', {
    auth: true,
  })
export const showQuestion = (questionId: number, timeLimitSec?: number) =>
  request<AdminState>('/api/admin/show-question', {
    method: 'POST',
    body: {
      questionId,
      timeLimitSec, // undefined の時、自動的にキーは削除される（JSON.stringfy()）ため、そのまま書く
    },
    auth: true,
  })
export const advanceText = () =>
  request<AdminState>('/api/admin/advance-text', {
    method: 'POST',
    auth: true,
  })
export const showAnswer = () =>
  request<AdminState>('/api/admin/show-answer', {
    method: 'POST',
    auth: true,
  })
export const revival = (to: 'video' | 'entry') =>
  request<AdminState>('/api/admin/revival', {
    method: 'POST',
    body: {
      to,
    },
    auth: true,
  })
export const reset = (to: 'waiting' | 'finished' = 'waiting') =>
  request<AdminState>('/api/admin/reset', {
    method: 'POST',
    body: {
      to,
    },
    auth: true,
  })
export const putQuestions = (questions: QuestionImport[]) =>
  request<ImportResult>('/api/admin/questions', {
    method: 'PUT',
    body: {
      questions,
    },
    auth: true,
  })
export const getQuestions = () =>
  request<{ questions: QuestionListItem[] }>('/api/admin/questions', {
    auth: true,
  })
export const getQuestionById = (id: number) =>
  request<Question>(`/api/admin/questions/${id}`, {
    auth: true,
  })
export const getImages = () =>
  request<{ images: ImageInfo[] }>('/api/admin/images', {
    auth: true,
  })
export const uploadImage = async (file: File, name: string): Promise<ImageUploadResult> => {
  const body = new FormData()
  body.append('file', file, name)

  const res = await fetch(`${BASE}/api/admin/images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAdminToken()}`,
    },
    // Content-Type は指定しない。multipart の boundary をブラウザに付けてもらう
    body,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(
      data?.error?.code ?? 'UNKNOWN',
      res.status,
      data?.error?.message ?? res.statusText,
      data?.error?.details ?? [],
    )
  }
  return res.json() as Promise<ImageUploadResult>
}
export const verify = () =>
  request<{ ok: true }>('/api/admin/verify', {
    auth: true,
  })
