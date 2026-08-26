import { useEffect, useState } from 'react'
import { AdminState } from '../../types'
import { getAdminState } from '../../lib/api'

// 操作パネル
export function OperationPanel() {
  const [adminState, setAdminState] = useState<AdminState | null>(null)
  useEffect(() => {
    let cancelled = false
    getAdminState()
      .then((state) => {
        // getState を呼んだときと、返ってきたときで revision が変わっていたら、または、すでに接続を切っていたら、返ってきた state を捨てる
        // これをしないと、ページ切り替えの度、アンマウントされる仕様により、エラー表示となり、デバッグがしずらくなる
        if (cancelled) return
        setAdminState(state)
      })
      .catch((e) => {
        // 既に接続を切っていたら エラーが出ないようにする
        if (cancelled) return
        console.error('SSE 接続時に State が取得できませんでした', e)
        return
      })
    return () => {
      cancelled = true
    }
  }, [])
  return (
    <div>
      <h1>操作画面</h1>
    </div>
  )
}
