// 問題表示画面
import { useRemainingTime } from '../../../lib/useRemainingTime'
import { ViewerState } from '../../../types'
import { QuestionLayout } from '../parts/QuestionLayout'
type props = { state: ViewerState }

export function QuestionView({ state }: props) {
  // useRemainingTimeで 表示時間を求める
  const remainingTime = useRemainingTime({
    serverTime: state.serverTime,
    timeLimitSec: state.timeLimitSec,
    questionStartedAt: state.questionStartedAt,
  })
  const isAccepting = remainingTime > 0

  return (
    <QuestionLayout
      state={state}
      status={isAccepting ? 'accepting' : 'closed'}
      remainingTime={remainingTime}
      footMessage={
        isAccepting ? '歩きスマホや走っての移動はご遠慮ください' : '移動はご遠慮ください'
      }
    >
      <div className="p-6 text-center text-instruction text-surface">
        {isAccepting ? '選んだ選択肢のエリアに' : '回答を締め切りました'}
        <br />
        {isAccepting ? '移動してください' : 'その場でお待ちください'}
      </div>
    </QuestionLayout>
  )
}
