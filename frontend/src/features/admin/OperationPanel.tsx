import { useEffect, useState } from 'react'
import { AdminState, Question } from '../../types'
import { advanceText, ApiError, getAdminState, showAnswer } from '../../lib/api'

// 操作パネル
export function OperationPanel() {
  const [adminState, setAdminState] = useState<AdminState | null>(null)
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (progressFn: () => Promise<AdminState>) => {
    setBusy(true)
    setError(null)

    try {
      const nextState = await progressFn()
      setAdminState(nextState)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // エラーのタイプを判定し、
        // アクセスが出来ないエラーじゃない事と、 401 エラーであることを確認
        setError('トークンが失効しています')
      } else {
        // 通信関係のエラーなどでアクセス自体が出来ない
        setError('サーバーに接続できませんでした')
      }
    } finally {
      setBusy(false)
    }
  }
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

  if (adminState == null) return <p>接続中...</p>

  const q = adminState.question
  const qDetail = (question: Question | null) => {
    if (question == null) return <p>表示中の問題はありません</p>
    return (
      <div>
        <p>問題タイプ : {question.type}</p>
        <p>クイズ番号 : {question.number}</p>
        <p>問題文 : {question.textSegments.join(' / ')}</p>
      </div>
    )
  }
  return (
    <div>
      <h1>操作画面</h1>
      <p>局面 : {adminState.phase}</p>
      <p>第{adminState.askedCount}問</p>
      <p>
        進行状況 : {adminState.revealedSegments} / {adminState.totalSegments}
      </p>
      <div>
        <button name="advance-text" onClick={() => run(advanceText)} disabled={busy}>
          問題文を進める
        </button>
        <button name="show-answer" onClick={() => run(showAnswer)} disabled={busy}>
          正答を表示
        </button>
      </div>
      {qDetail(q)}
    </div>
  )
}
