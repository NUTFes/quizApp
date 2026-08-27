// 問題表示画面
import { useRemainingTime } from '../../lib/useRemainingTime'
import { ViewerState } from '../../types'
import { ChoiceList } from './parts/ChoiceList'
import { QuestionNumber } from './parts/QuestionNumber'
import { QuestionText } from './parts/QuestionText'
import { RemainingTime } from './parts/RemainingTime'

type props = { state: ViewerState | null }

export function QuestionView({ state }: props) {
  if (state === null) return null
  if (state.question === null) return null

  let questionType
  switch (state.question.type) {
    case 'four_choice':
      questionType = '4択'
      break
    case 'two_choice':
      questionType = '〇×'
      break
    case 'arunashi':
      questionType = 'あるなし'
      break
  }
  // useRemainingTimeで問題終了かどうかの判定を行う
  const isAccepting = useRemainingTime({
    serverTime: state.serverTime,
    timeLimitSec: state.timeLimitSec,
    questionStartedAt: state.questionStartedAt,
  })
  const isAcceptText = isAccepting ? '回答受付中' : '回答締切'
  const isAcceptStyle = isAccepting ? 'bg-amber-200' : 'bg-gray-300'
  const announceTextTop = isAccepting ? '選んだ選択肢のエリアに' : '回答を締め切りました'
  const announceTextBottom = isAccepting ? '移動してください' : 'その場でお待ちください'
  const attentionText = isAccepting
    ? '歩きスマホや走っての移動はご遠慮ください'
    : '移動はご遠慮ください'

  return (
    <main className="min-h-dvh pt-[env(safe-area-inset-top)]">
      <header className="flex h-15.5 items-center shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
        <div className="h-full w-15.5 px-3 py-4">
          <img src="" alt="logo" className="flex h-full w-full justify-center rounded-[10px]" />
        </div>
        <p className="flex justify-center py-2.5 text-[17px] font-bold">45th Quiz</p>
        <p className="ml-auto flex justify-center py-2.5 pr-4 text-[17px] font-bold">{`${questionType}クイズ`}</p>
      </header>
      <div className="w-full">
        <div className="mx-5 my-7 rounded-[20px] shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <div className="flex">
            <QuestionNumber count={state.askedCount} />
            <p
              className={`m-2 ml-auto flex items-center justify-center rounded-[20px] px-5 py-2 text-xs shadow-[0_6px_16px_0_rgba(25,32,133,0.08)] ${isAcceptStyle}`}
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
      <div className="mx-4 mt-7 mb-2.5 flex min-h-[153px] items-center justify-center rounded-[20px] p-6 text-center text-2xl shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
        {announceTextTop}
        <br />
        {announceTextBottom}
      </div>
      <footer className="h-full w-full">
        <div className="px-2.5 pt-8 text-center text-base">{attentionText}</div>
      </footer>
    </main>
  )
}
