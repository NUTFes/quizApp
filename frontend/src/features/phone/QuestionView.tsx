// 問題表示画面
import { ViewerState } from '../../types'
import { ChoiceList } from './parts/ChoiceList'
import { QuestionNumber } from './parts/QuestionNumber'
import { QuestionText } from './parts/QuestionText'
import { RemainingTime } from './parts/RemainingTime'

type props = { state: ViewerState | null }

export function QuestionView({ state }: props) {
  if (state === null) return null
  if (state.question === null) return null

  return (
    <div>
      <h1>問題</h1>
      <QuestionNumber count={state.askedCount}/>
      <QuestionText segments={state.question?.textSegments ?? []} />
      <RemainingTime state={state} />
      <ChoiceList
        question={state.question}
        correctChoiceId={state.answer?.correctChoiceId ?? null}
      />
    </div>
  )
}
