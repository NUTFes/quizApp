// 問題表示画面
import { useRemainingTime } from '../../../lib/useRemainingTime'
import type { MonitorState } from '../../../types'
import { QuestionLayout } from '../parts/QuestionLayout'
import { HayaoshiView } from './HayaoshiView'
type Props = { state: MonitorState }

export function QuestionView({ state }: Props) {
  // useRemainingTimeで 表示時間を求める
  const remainingTime = useRemainingTime({
    serverTime: state.serverTime,
    timeLimitSec: state.timeLimitSec,
    questionStartedAt: state.questionStartedAt,
  })
  const isAccepting = remainingTime > 0

  if (state.question?.type === 'hayaoshi') {
    return <HayaoshiView state={state} />
  }

  return (
    <QuestionLayout
      state={state}
      status={isAccepting ? 'accepting' : 'closed'}
      remainingTime={remainingTime}
    />
  )
}
