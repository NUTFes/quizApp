import { useEffect, useState } from 'react'
import { AdminState, Question, QuestionListItem } from '../../types'
import {
  advanceText,
  ApiError,
  getAdminState,
  getQuestions,
  reset,
  showAnswer,
  showQuestion,
} from '../../lib/api'
import { DEV_QUESTIONS } from './parts/__devFixtures'
import { QuestionList } from './parts/QuestionList'

// 操作パネル
export function OperationPanel() {
  const [adminState, setAdminState] = useState<AdminState | null>(null)
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [questionID, setQuestionID] = useState<string>('')
  const [questions, setQuestions] = useState<QuestionListItem[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

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
  // 問題一覧の取得。
  // 出題すると asked が変わるので、進行操作のたびに取り直す(→ run の中でも呼ぶ)。
  const loadQuestions = () =>
    getQuestions()
      .then((res) => setQuestions(res.questions))
      .catch((err) => {
        // GET /api/admin/questions(#80)は未実装。それまでの間、開発中だけ仮データで画面を作る。
        // import.meta.env.DEV は本番ビルドで false に置き換わるので、この分岐ごと成果物から消える。
        // ★ #80 がマージされたら、この if と __devFixtures.ts を削除すること。
        if (import.meta.env.DEV && err instanceof ApiError && err.status === 404) {
          console.warn('問題一覧APIが未実装のため、開発用の仮データを表示しています')
          setQuestions(DEV_QUESTIONS)
          return
        }
        setQuestions(null)
      })

  useEffect(() => {
    void loadQuestions()
  }, [])

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
      <section>
        <h2>問題一覧</h2>
        {questions === null ? (
          <p>問題一覧を取得できませんでした。</p>
        ) : (
          <QuestionList
            items={questions}
            selectedId={selectedId}
            onSelect={setSelectedId}
            currentQuestionId={q?.id ?? null}
            disabled={busy}
          />
        )}
      </section>
      <div>
        <button name="advance-text" onClick={() => run(advanceText)} disabled={busy}>
          {busy ? '処理中...' : '問題文を進める'}
        </button>
        <button name="show-answer" onClick={() => run(showAnswer)} disabled={busy}>
          {busy ? '処理中...' : '正答を表示'}
        </button>
        <button name="reset-waiting" onClick={() => run(() => reset('waiting'))} disabled={busy}>
          {busy ? '処理中...' : '待機画面へ'}
        </button>
        <form>
          <input
            type="text"
            name="question-id"
            value={questionID}
            onChange={(e) => setQuestionID(e.target.value)}
          />
          <button
            name="show-question"
            onClick={() => run(() => showQuestion(Number(questionID)))}
          ></button>
        </form>
      </div>
      {qDetail(q)}
      {error != null && <p>{error}</p>}
    </div>
  )
}
