import { ReactNode } from 'react'
import { ViewerState } from '../../../types'
import { QuestionNumber } from './QuestionNumber'
import { QuestionText } from './QuestionText'
import { RemainingTime } from './RemainingTime'
import { ChoiceList } from './ChoiceList'
import { PhoneLayout } from './PhoneLayout'

type QuestionLayoutProps = {
  state: ViewerState
  statusStyle: string
  statusText: string
  footMessage?: string
  children: ReactNode
}

export function QuestionLayout({
  state,
  statusStyle,
  statusText,
  footMessage,
  children,
}: QuestionLayoutProps) {
  if (state.question === null) return null
  return (
    <PhoneLayout questionType={state.question.type} footMessage={footMessage}>
      <div className="w-full">
        <div className="mx-5 my-7 rounded-[20px] border border-border-soft bg-surface shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <div className="flex">
            <QuestionNumber count={state.askedCount} />
            <p
              className={`m-2 ml-auto flex items-center justify-center rounded-[20px] px-5 py-2 text-status-answer shadow-[0_6px_16px_0_rgba(25,32,133,0.08)] ${statusStyle}`}
            >
              {statusText}
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
        {children}
      </div>
    </PhoneLayout>
  )
}
