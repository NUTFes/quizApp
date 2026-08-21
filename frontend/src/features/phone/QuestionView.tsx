// 問題表示画面
import { ViewerState } from '../../types'

type props = { state: ViewerState | null}

export function QuestionView({ state }: props){
  return <div>出題中</div>
}
