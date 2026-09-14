// 操作盤。認証を通ったあとに表示される画面。
//
// 進行状態の受け取りと操作APIはここに寄せ、各パネルには props で配る。
// 画像投入だけは進行状態と独立した一連の処理なので、ImagePanel 内でAPIを呼ぶ。
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdminState } from '../../lib/useEventState'
import { useRemainingTime } from '../../lib/useRemainingTime'
import type { AdminState, QuestionListItem } from '../../types'
import { advanceText, ApiError, getQuestions, reset, showAnswer, showQuestion } from '../../lib/api'
import { NETWORK_ERROR_MESSAGE, toMessage } from './errorMessages'
import { ACTION_LABEL, ActionLabel } from './labels'
import { ControlPanel } from './parts/ControlPanel'
import { CurrentStatus } from './parts/CurrentStatus'
import { ErrorBanner, OperationFailure } from './parts/ErrorBanner'
import { ImagePanel } from './parts/ImagePanel'
import { QuestionList } from './parts/QuestionList'
import { ShowQuestionForm } from './parts/ShowQuestionForm'
import type { AdminStatus } from './parts/StatusBadge'

type Props = {
  // トークンが無効になったことが分かったときに呼ぶ。AdminPage がログイン画面へ戻す
  // (→ docs/実装要件/フロントエンド実装要件.md §4「どのAPIでも401ならトークン入力画面に戻す」)
  onAuthExpired: () => void
}

export function OperationPanel({ onAuthExpired }: Props) {
  // SSE でつなぎっぱなしにする。状態が変わるたびに新しい state が届く
  const state = useAdminState(onAuthExpired)
  const remainingTime = useRemainingTime({
    serverTime: state?.serverTime ?? '',
    timeLimitSec: state?.timeLimitSec ?? null,
    questionStartedAt: state?.questionStartedAt ?? null,
  })

  const [failure, setFailure] = useState<OperationFailure | null>(null)
  const [busy, setBusy] = useState(false) // 連続で操作できないようにするための排他処理のためのロック
  const inFlight = useRef(false)
  const [timeLimitInput, setTimelimitInput] = useState('30') // 制限時間のための箱 state

  const [questions, setQuestions] = useState<QuestionListItem[] | null>(null)
  const [questionListError, setQuestionListError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // 呼び出し側がその場で作った関数を渡しても、依存配列に入れずに済むようにする
  // (lib/useEventState.ts の onUnauthorizedRef と同じ理由)
  const onAuthExpiredRef = useRef(onAuthExpired)
  useEffect(() => {
    onAuthExpiredRef.current = onAuthExpired
  })

  // 問題一覧の取得。showQuestion/reset は asked を書き換えるので、成功後にも呼び直す
  // (呼ばないと、出題した/リセットした直後の一覧が古い asked のまま表示される)
  const refreshQuestions = useCallback(() => {
    getQuestions()
      .then(({ questions }) => setQuestions(questions))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          onAuthExpiredRef.current()
          return
        }
        setQuestionListError(e instanceof ApiError ? toMessage(e.code) : NETWORK_ERROR_MESSAGE)
      })
  }, [])

  useEffect(() => {
    refreshQuestions()
  }, [refreshQuestions])

  if (state === null) return <p>接続中...</p>

  const run = async (
    action: ActionLabel,
    request: () => Promise<unknown>,
    onSuccess?: () => void,
  ) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setFailure(null)
    try {
      await request()
      onSuccess?.()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired()
        return
      }
      setFailure({
        action,
        message: err instanceof ApiError ? toMessage(err.code) : NETWORK_ERROR_MESSAGE,
        occurredAt: new Date(),
      })
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  const remainingSec =
    state.phase === 'question' && state.timeLimitSec !== null ? remainingTime : null
  // ShowQuestionForm は id ではなく QuestionListItem そのものを欲しがる(問題文・出題済みの警告表示に使うため)
  const selectedQuestion = questions?.find((q) => q.id === selectedId) ?? null

  return (
    <div>
      <CurrentStatus state={state} status={toStatus(state, remainingSec)} />
      {questionListError !== null && <p>{questionListError}</p>}
      {questions !== null && (
        <QuestionList
          items={questions}
          selectedId={selectedId}
          onSelect={setSelectedId}
          currentQuestionId={state.question?.id ?? null}
        />
      )}
      <ShowQuestionForm
        selected={selectedQuestion}
        currentQuestionId={state.phase === 'question' ? (state.question?.id ?? null) : null}
        timeLimitInput={timeLimitInput}
        busy={busy}
        onTimeLimitInputChange={setTimelimitInput}
        onSubmit={(id, sec) =>
          run(ACTION_LABEL.showQuestion, () => showQuestion(id, sec), refreshQuestions)
        }
      />
      <ControlPanel
        state={state}
        remainingSec={remainingSec}
        busy={busy}
        onAdvanceText={() => run(ACTION_LABEL.advanceText, advanceText)}
        onShowAnswer={() => run(ACTION_LABEL.showAnswer, showAnswer)}
        onReset={(to) =>
          run(
            to == 'finished' ? ACTION_LABEL.resetFinished : ACTION_LABEL.resetWaiting,
            () => reset(to),
            refreshQuestions,
          )
        }
      />
      <ErrorBanner failure={failure} onDismiss={() => setFailure(null)} />
      <ImagePanel onAuthExpired={onAuthExpired} />
      {/*ここからは、以降のイシューで足していく */}
    </div>
  )
}

// 会場に出ている状態を決める。バッジを出さないときは null を返す
function toStatus(state: AdminState, remainingSec: number | null): AdminStatus | null {
  if (state.phase === 'answer') return 'answer'
  if (state.phase !== 'question') return null
  // 制限時間なしの時はずっと受付中
  // 其れ以外の時で、0の時だけ締め切る
  return remainingSec === 0 ? 'closed' : 'accepting'
}
