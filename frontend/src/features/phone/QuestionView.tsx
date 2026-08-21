// 問題表示画面
import { ViewerState } from '../../types'
import { ChoiceList } from './parts/ChoiceList'
import { RemainingTime } from './parts/RemainingTime'

type props = { state: ViewerState | null}

export function QuestionView({ state }: props){
  if (state === null) return null
  if (state.question === null) return null

  return (
    <div>
      <h1>解答</h1>
      <RemainingTime
        state={state}
      />

      <ChoiceList
        question={state.question}
        correctChoiceId={state.answer?.correctChoiceId ?? null}
      />
    </div>
  )
}
