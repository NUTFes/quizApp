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

  return (
    <main className="min-h-dvh pt-[env(safe-area-inset-top)]">
      <header className="flex h-15.5 items-center shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
        <div className="h-full w-15.5 px-3 py-4">
          <img src="" alt="logo" className="flex h-full w-full justify-center rounded-[10px]" />
        </div>
        <p className="flex justify-center py-2.5 text-[17px] font-bold">45th Quiz</p>
        <p className="flex ml-auto justify-center py-2.5 pr-4 text-[17px] font-bold">{`${questionType}クイズ`}</p>
      </header>
      <div className="w-full">
        <div className="rounded-[20px] mx-5 my-7 shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <div className="flex h-[49px]">
            <QuestionNumber count={state.askedCount} />
            <p className="flex items-center justify-center ml-auto rounded-[20px] px-5 py-2 text-xs bg-amber-200 m-2">
              回答受付中
            </p>
          </div>
          <QuestionText segments={state.question?.textSegments ?? []} />
          <RemainingTime
            serverTime={state.serverTime}
            timeLimitSec={state.timeLimitSec}
            questionStartedAt={state.questionStartedAt}
          />
        </div>
        <div className='flex justify-between px-5 w-full'>
          <ChoiceList
            question={state.question}
            correctChoiceId={state.answer?.correctChoiceId ?? null}
          />
        </div>
      </div>
    </main>
  )
}
