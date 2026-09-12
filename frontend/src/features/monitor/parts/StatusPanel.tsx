import type { ReactNode } from 'react'
import type { MonitorState, QuestionType } from '../../../types'
import { RemainingTime } from './RemainingTime'

export type MonitorQuestionStatus = 'accepting' | 'closed' | 'answer'

type StatusPanelProps = {
  state: MonitorState
  status: MonitorQuestionStatus
  remainingTime: number
}

const STATUS = {
  accepting: { label: '回答受付中', color: 'bg-accepting-answer' },
  closed: { label: '回答締切', color: 'bg-closed-answer' },
  answer: { label: '正解発表', color: 'bg-live' },
} as const satisfies Record<MonitorQuestionStatus, { label: string; color: string }>

function getCorrectLabel(type: QuestionType, correctChoiceId: string | null): string {
  if (correctChoiceId === null) return '—'
  if (type === 'two_choice') return correctChoiceId === 'A' ? '○' : '×'
  if (type === 'arunashi') return correctChoiceId === 'A' ? 'ある' : 'なし'
  return correctChoiceId
}

export function StatusPanel({ state, status, remainingTime }: StatusPanelProps) {
  const question = state.question
  const answer = state.answer
  const correctChoice = question?.choices.find((choice) => choice.id === answer?.correctChoiceId)
  const correctLabel =
    question === null ? '—' : getCorrectLabel(question.type, answer?.correctChoiceId ?? null)
  const answerDescription = answer?.explanation ?? correctChoice?.text ?? ''

  return (
    <aside className="flex h-full flex-col gap-6 overflow-hidden rounded-[28px] border-2 border-border-soft bg-surface p-6 shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
      <div
        className={`flex h-[94px] shrink-0 items-center justify-center rounded-3xl shadow-[0_6px_16px_0_rgba(25,32,133,0.08)] ${STATUS[status].color}`}
      >
        <p className="text-p-status-answer">{STATUS[status].label}</p>
      </div>

      {status === 'answer' ? (
        <>
          {/* 解説が長いときは 335px を下限に伸び、下の案内カードを押しつぶす。
              そのため shrink-0（自分は縮まない）と min-h（下限）の組み合わせにする */}
          <div className="flex min-h-[335px] shrink-0 flex-col rounded-3xl border-2 border-border-soft bg-brand px-9 pb-12 text-surface shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
            <div className="flex items-start gap-3 pt-3">
              <p className="pt-7 text-p-note">正解は</p>
              <p className="text-p-correct-id">{correctLabel}</p>
            </div>
            {/* min-h-0 を付けない。付けると高さが auto のときに 0 まで潰れ、解説が消える */}
            <p className="flex flex-1 items-center justify-center text-center text-p-correct-body">
              {answerDescription}
            </p>
          </div>
          <InstructionCard>
            次の問題まで
            <br />
            その場でお待ちください
          </InstructionCard>
        </>
      ) : (
        <>
          <div className="flex h-[335px] shrink-0 flex-col rounded-3xl border-2 border-border-soft bg-surface p-12 shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
            <p className="text-p-pre-timelimit">残り時間</p>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <RemainingTime remainingTime={remainingTime} />
            </div>
          </div>
          <InstructionCard>
            {status === 'accepting' ? (
              <>
                選んだ選択肢のエリアに
                <br />
                移動してください
              </>
            ) : (
              <>
                回答を締め切りました
                <br />
                その場でお待ちください
              </>
            )}
          </InstructionCard>
        </>
      )}
    </aside>
  )
}

function InstructionCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl border-2 border-border-soft bg-surface px-6 py-12 text-center text-p-instruction-alt shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
      <p>{children}</p>
    </div>
  )
}
