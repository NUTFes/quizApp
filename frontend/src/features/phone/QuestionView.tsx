// 問題表示画面
import { ViewerState } from '../../types'
import { QuestionText } from './parts/QuestionText'

type props = { state: ViewerState | null}

export function QuestionView({ state }: props){
  if (state === null) return null
  if (state.question === null) return null

  return (
  <div>
    <QuestionText segments={state.question.textSegments} />
  </div> 
  )
}
