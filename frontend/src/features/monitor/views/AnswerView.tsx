import type { MonitorState } from '../../../types'
import { NoticeBody } from '../parts/NoticeBody'
import { QuestionLayout } from '../parts/QuestionLayout'
import { LoadingView } from './LoadingView'

type Props = { state: MonitorState }

// 回答表示画面
export function AnswerView({ state }: Props) {
  if (state.question === null) return <LoadingView />

  if (state.question.type === 'hayaoshi') {
    return <NoticeBody>早押しクイズの正解を表示しています</NoticeBody>
  }

  return <QuestionLayout state={state} status="answer" remainingTime={0} />
}
