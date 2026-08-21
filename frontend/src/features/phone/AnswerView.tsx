// 回答表示画面
import { ViewerState } from '../../types'
import { ChoiceList } from './parts/ChoiceList'
import { QuestionNumber } from './parts/QuestionNumber'
import { QuestionText } from './parts/QuestionText'

type props = { state: ViewerState | null }

export function AnswerView({ state }: props) {
  if (state === null) return null
  const explanation = state.answer?.explanation
  const answer = state.answer?.correctChoiceId

  return (
    <div>
      <h1>回答</h1>
      {answer && <p>{answer}</p>}
      <QuestionNumber count={state.askedCount} />
      <QuestionText segments={state.question?.textSegments ?? []} />
      <ChoiceList question={state.question} correctChoiceId={state.answer?.correctChoiceId ?? null} />
      {explanation && <p>{explanation}</p>}
    </div>
  )
}
