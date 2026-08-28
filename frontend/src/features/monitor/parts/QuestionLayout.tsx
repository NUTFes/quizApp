import type { MonitorState } from '../../../types'
import { ChoiceList } from './ChoiceList'
import { MonitorLayout } from './MonitorLayout'
import { NoticeBody } from './NoticeBody'
import { QuestionNumber } from './QuestionNumber'
import { QuestionText } from './QuestionText'
import { StatusPanel, type MonitorQuestionStatus } from './StatusPanel'

type QuestionLayoutProps = {
  state: MonitorState
  status: MonitorQuestionStatus
  remainingTime: number
}

export function QuestionLayout({ state, status, remainingTime }: QuestionLayoutProps) {
  if (state.question === null) return <NoticeBody />

  const question = state.question

  return (
    <MonitorLayout state={state} questionType={question.type}>
      <div className="grid min-h-0 flex-1 grid-cols-[1228px_548px] gap-12 px-12 py-12">
        <section className="grid min-h-0 grid-rows-[257px_minmax(0,1fr)] gap-12">
          <div className="flex h-full items-start gap-6 overflow-hidden rounded-[28px] border-2 border-border-soft bg-surface pt-4 pr-9.5 pb-4 pl-8 shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
            <QuestionNumber count={state.askedCount} />
            <QuestionText
              segments={question.textSegments}
              multiline={question.type === 'arunashi'}
            />
          </div>
          <div className="min-h-0">
            <ChoiceList
              question={question}
              correctChoiceId={state.answer?.correctChoiceId ?? null}
            />
          </div>
        </section>
        <StatusPanel state={state} status={status} remainingTime={remainingTime} />
      </div>
    </MonitorLayout>
  )
}
