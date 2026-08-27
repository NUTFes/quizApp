// 回答表示画面
import { ViewerState } from '../../types'
import { AnswerText } from './parts/AnswerText'
import { ChoiceList } from './parts/ChoiceList'
import { PhoneFooter } from './parts/PhoneFooter'
import { PhoneHeader } from './parts/PhoneHeader'
import { QuestionNumber } from './parts/QuestionNumber'
import { QuestionText } from './parts/QuestionText'
import { RemainingTime } from './parts/RemainingTime'

type props = { state: ViewerState | null }

export function AnswerView({ state }: props) {
  if (state === null) return null
  if (state.question === null) return null
  const explanation = state.answer?.explanation
  const answer = state.answer?.correctChoiceId
  const correctChoice = state.question.choices.find((choice) => choice.id === answer)

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

  const attentionText = '次の問題までその場でお待ちください'

  return (
    <main className="min-h-dvh bg-canvas pt-[env(safe-area-inset-top)] font-zen-kaku-gothic-new text-brand">
      <PhoneHeader questionType={questionType} />
      <div className="w-full">
        <div className="mx-5 my-7 rounded-[20px] border border-border-soft bg-surface shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <div className="flex">
            <QuestionNumber count={state.askedCount} />
            <p className="m-2 ml-auto flex items-center justify-center rounded-[20px] bg-live px-5 py-2 text-status-answer shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
              正解発表
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
      <div className="mx-4 mt-7 mb-2.5 flex min-h-[153px] items-center justify-center rounded-[20px] bg-brand shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
        <AnswerText
          correctText={correctChoice?.text ?? null}
          explanation={explanation ?? null}
          correctId={answer ?? null}
        />
      </div>
      <PhoneFooter footMessage={attentionText} />
    </main>
  )
}
