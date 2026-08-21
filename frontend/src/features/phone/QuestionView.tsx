// 問題表示画面
import { ViewerState } from '../../types'
import { ChoiceList } from './parts/ChoiceList'
import { QuestionText } from './parts/QuestionText'

type props = { state: ViewerState | null}

export function QuestionView({ state }: props){
  if (state === null) return null
  if (state.question === null) return null

  return (
    <div>
      <h1>解答</h1>

      <ChoiceList
        question={state.question}
        correctChoiceId={state.answer?.correctChoiceId ?? null}
      />
    </div>
  )
}
