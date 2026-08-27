import { ReactNode } from 'react'
import { ViewerState } from '../../../types'
import { QuestionNumber } from './QuestionNumber'
import { QuestionText } from './QuestionText'
import { RemainingTime } from './RemainingTime'
import { ChoiceList } from './ChoiceList'
import { PhoneLayout } from './PhoneLayout'

type Status = 'accepting' | 'closed' | 'answer'

const STATUS = {
  accepting: { text: '回答受付中', style: 'bg-accepting-answer' },
  closed: { text: '回答締切', style: 'bg-closed-answer' },
  answer: { text: '正解発表', style: 'bg-live' },
} as const satisfies Record<Status, { text: string; style: string }>

type QuestionLayoutProps = {
  state: ViewerState
  status: Status
  footMessage?: string
  children: ReactNode
}

export function QuestionLayout({ state, status, footMessage, children }: QuestionLayoutProps) {
  if (state.question === null) return null
  return (
    <PhoneLayout questionType={state.question.type} footMessage={footMessage}>
      <div className="w-full">
        <div className="mx-5 my-7 rounded-[20px] border border-border-soft bg-surface shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <div className="flex">
            <QuestionNumber count={state.askedCount} />
            <p
              className={`m-2 ml-auto flex items-center justify-center rounded-[20px] px-5 py-2 text-status-answer shadow-[0_6px_16px_0_rgba(25,32,133,0.08)] ${STATUS[status].style}`}
            >
              {STATUS[status].text}
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
