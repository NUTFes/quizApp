import type { ReactNode } from 'react'
import type { AdminState } from '../../../types'
import { difficultyLabel, phaseLabel, questionTypeLabel } from '../labels'
import { StatusBadge, type AdminStatus } from './StatusBadge'

type Props = {
  state: AdminState
  status: AdminStatus | null
}

export function CurrentStatus({ state, status }: Props) {
  const question = state.question
  const correct = question?.choices.find((choice) => choice.id === question.correctChoiceId)

  return (
    <section className="w-full max-w-[440px] rounded-3xl border border-border-soft bg-surface px-6 font-zen-kaku-gothic-new text-black">
      <header className="flex min-h-12 flex-wrap items-center justify-between gap-2 pt-3">
        <h2 className="shrink-0 text-admin-header leading-[normal] text-brand">出題中の問題</h2>
        {question !== null && status !== null && <StatusBadge status={status} />}
      </header>
      {question === null ? (
        <p className="py-3 pl-2 text-current-question leading-[normal]">
          {phaseLabel(state.phase)}
        </p>
      ) : (
        <dl className="grid min-h-[365px] grid-cols-[minmax(62px,0.2fr)_minmax(0,1fr)] content-start gap-2.5 py-3 pl-2 text-current-question leading-[normal]">
          <Row label="第何問">第{state.askedCount}問</Row>
          <Row label="ID">{question.id}</Row>
          <Row label="問題形式">{questionTypeLabel(question.type)}</Row>
          <Row label="難易度">{difficultyLabel(question.difficulty)}</Row>
          <Row label="制限時間">
            {state.timeLimitSec === null ? 'なし' : `${state.timeLimitSec}秒`}
          </Row>

          <Row label="問題文">
            {question.textSegments.map((segment, i) => (
              <span key={i}>
                {segment}
                {/* まだモニタに出ていない区切り。裏方が先に読み上げると事故る */}
                {i >= state.revealedSegments && '（未公開）'}
              </span>
            ))}
          </Row>
          <Row label="公開状況">
            {state.revealedSegments} / {state.totalSegments} 区切り
          </Row>

          <Row label="選択肢">
            <div className="flex flex-col gap-2.5">
              {question.choices.map((c) => (
                <p key={c.id}>
                  {c.id}: {c.text}
                </p>
              ))}
            </div>
          </Row>
          <Row label="正答">
            {correct === undefined ? '未設定' : `${correct.id}: ${correct.text}`}
          </Row>
        </dl>
      )}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="col-span-2 grid grid-cols-subgrid items-start gap-x-2.5">
      <dt>{label}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}
