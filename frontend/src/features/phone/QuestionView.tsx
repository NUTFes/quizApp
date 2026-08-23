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
    case "four_choice": 
      questionType = "4択"
      break
    case "two_choice":
      questionType = "〇×"
      break
    case "arunashi":
      questionType = "あるなし"
      break
  }

  return (
    <main className="min-h-dvh pt-[env(safe-area-inset-top)]">
      <header className="flex h-15.5 items-center shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
        <div className="h-full w-15.5 px-3 py-4">
          <img src="" alt="logo" className="flex h-full w-full justify-center rounded-[10px]" />
        </div>
        <p className="flex justify-center py-2.5 text-[17px] font-bold">45th Quiz</p>
        <p className="flex ml-auto justify-center py-2.5 pr-4 text-[17px] font-bold">{ `${questionType}クイズ` }</p>
      </header>
      <div>
        <QuestionNumber count={state.askedCount} />
        <QuestionText segments={state.question?.textSegments ?? []} />
        <RemainingTime
          serverTime={state.serverTime}
          timeLimitSec={state.timeLimitSec}
          questionStartedAt={state.questionStartedAt}
        />
        <ChoiceList
          question={state.question}
          correctChoiceId={state.answer?.correctChoiceId ?? null}
        />
      </div>
    </main>
  )
}
