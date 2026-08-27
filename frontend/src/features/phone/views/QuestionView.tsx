// 問題表示画面
import { useRemainingTime } from '../../../lib/useRemainingTime'
import { ViewerState } from '../../../types'
import { ChoiceList } from '../parts/ChoiceList'
import { PhoneLayout } from '../parts/PhoneLayout'
import { QuestionNumber } from '../parts/QuestionNumber'
import { QuestionText } from '../parts/QuestionText'
import { RemainingTime } from '../parts/RemainingTime'

type props = { state: ViewerState }

export function QuestionView({ state }: props) {
  // useRemainingTimeで問題終了かどうかの判定を行う
  const isAccepting = useRemainingTime({
    serverTime: state.serverTime,
    timeLimitSec: state.timeLimitSec,
    questionStartedAt: state.questionStartedAt,
  })

  if (state.question === null) return null

  const isAcceptText = isAccepting ? '回答受付中' : '回答締切'
  const isAcceptStyle = isAccepting ? 'bg-accepting-answer' : 'bg-closed-answer'
  const announceTextTop = isAccepting ? '選んだ選択肢のエリアに' : '回答を締め切りました'
  const announceTextBottom = isAccepting ? '移動してください' : 'その場でお待ちください'
  const attentionText = isAccepting
    ? '歩きスマホや走っての移動はご遠慮ください'
    : '移動はご遠慮ください'

  return (
    <PhoneLayout questionType={state.question.type} footMessage={attentionText}>
      <div className="w-full">
        <div className="mx-5 my-7 rounded-[20px] border border-border-soft bg-surface shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <div className="flex">
            <QuestionNumber count={state.askedCount} />
            <p
              className={`m-2 ml-auto flex items-center justify-center rounded-[20px] px-5 py-2 text-status-answer shadow-[0_6px_16px_0_rgba(25,32,133,0.08)] ${isAcceptStyle}`}
            >
              {isAcceptText}
            </p>
          </div>
          <QuestionText segments={state.question?.textSegments ?? []} />
          <RemainingTime
            serverTime={state.serverTime}
            timeLimitSec={state.timeLimitSec}
            questionStartedAt={state.questionStartedAt}
          />
        </div>
        <div className="flex w-full justify-between px-5">
          <ChoiceList
            question={state.question}
            correctChoiceId={state.answer?.correctChoiceId ?? null}
          />
        </div>
      </div>
      <div className="mx-4 mt-7 mb-2.5 flex min-h-[153px] items-center justify-center rounded-[20px] bg-brand p-6 text-center text-instruction text-surface shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
        {announceTextTop}
        <br />
        {announceTextBottom}
      </div>
    </PhoneLayout>
  )
}
