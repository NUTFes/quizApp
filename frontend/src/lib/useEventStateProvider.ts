import { useEffect, useRef, useState } from 'react'
import type { AdminState, MonitorState, ViewerState } from '../types'
import { assertStateContract } from './assertStateContract'
import { BASE, getAdminToken } from './config'
import { ApiError, getAdminState, getMonitorState, getViewerState } from './api'

type EventState = AdminState | MonitorState | ViewerState

type Opts<Type extends EventState> = {
  path: string
  getState: () => Promise<Type>
  view?: 'phone' | 'monitor' | 'admin'
  // 認証が切れていることが分かったときに呼ぶ(管理者画面だけが渡す)。
  // EventSource は失敗理由(ステータスコード)を教えてくれないので、
  // つながらなくなったら getState を1回叩いて 401 かどうかを確かめる
  onUnauthorized?: () => void
}

function useEventState<Type extends EventState>({
  path,
  getState,
  view,
  onUnauthorized,
}: Opts<Type>): Type | null {
  const [state, setState] = useState<Type | null>(null)

  // 呼び出し側がその場で作った関数を渡しても、依存配列に入れずに済むようにする。
  // 依存に入れると、レンダーのたびに接続を張り直してしまう
  const onUnauthorizedRef = useRef(onUnauthorized)
  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized
  })

  useEffect(() => {
    const updateState = (nextState: Type) => {
      assertStateContract(nextState, view)
      setState(nextState)
    }

    const es = new EventSource(`${BASE}${path}`)
    let revision = 0
    let closed = false

    // 初回接続時、再接続時に State を能動的にとってくる
    es.onopen = () => {
      const runnningAt = ++revision
      getState()
        .then((state) => {
          // getState を呼んだときと、返ってきたときで revision が変わっていたら、または、すでに接続を切っていたら、返ってきた state を捨てる
          // これをしないと、ページ切り替えの度、アンマウントされる仕様により、エラー表示となり、デバッグがしずらくなる
          if (closed || runnningAt !== revision) return
          updateState(state)
        })
        .catch((e) => {
          // 既に接続を切っていたら エラーが出ないようにする
          if (closed) return
          if (e instanceof ApiError && e.status === 401) {
            onUnauthorizedRef.current?.()
            return
          }
          console.error('SSE 接続時に State が取得できませんでした', e)
        })
    }

    // 接続が失敗・切断したとき。EventSource は自動で再接続を繰り返すので、
    // トークンが無効になった場合は「つながらないまま」になり画面が固まる。
    // 401 かどうかだけを確かめて、そうならログイン画面へ戻してもらう
    // (→ docs/実装要件/フロントエンド実装要件.md §4)。
    // 通信できないだけのときは何もしない(EventSource の再接続に任せる)。
    let probing = false
    es.onerror = () => {
      if (onUnauthorizedRef.current === undefined || closed || probing) return
      probing = true
      getState()
        .then(() => {
          probing = false
        })
        .catch((e) => {
          probing = false
          if (closed) return
          if (e instanceof ApiError && e.status === 401) onUnauthorizedRef.current?.()
        })
    }

    // SSE でのサーバーからのState送信があったらrevision を増やす
    es.addEventListener('state', (event: MessageEvent) => {
      revision++
      updateState(JSON.parse(event.data) as Type)
    })

    // コンポーネントレンダー終了時に接続を解除
    return () => {
      closed = true
      es.close()
    }
  }, [path, getState, view])

  return state
}

export const useAdminState = (onUnauthorized?: () => void) =>
  useEventState<AdminState>({
    path: `/api/admin/events?token=${encodeURIComponent(getAdminToken())}`,
    getState: getAdminState,
    view: 'admin',
    onUnauthorized,
  })

export const useMonitorState = () =>
  useEventState<MonitorState>({
    path: '/api/events?view=monitor',
    getState: getMonitorState,
    view: 'monitor',
  })

export const useViewerState = () =>
  useEventState<ViewerState>({
    path: '/api/events?view=phone',
    getState: getViewerState,
    view: 'phone',
  })
