import type { MonitorState } from '../../../types'
import { QuestionLayout } from '../parts/QuestionLayout'
import { HayaoshiView } from './HayaoshiView'
import { LoadingView } from './LoadingView'

type Props = { state: MonitorState }

// 回答表示画面
export function AnswerView({ state }: Props) {
  if (state.question === null) return <LoadingView />

  if (state.question.type === 'hayaoshi') {
    return <HayaoshiView state={state} showAnswer />
  }

  return <QuestionLayout state={state} status="answer" remainingTime={0} />
}
