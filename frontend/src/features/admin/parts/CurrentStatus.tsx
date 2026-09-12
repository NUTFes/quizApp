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
  if (question === null) {
    return (
      <section>
        <h2>出題中の問題</h2>
        <p>{phaseLabel(state.phase)}</p> {/*待機・終了*/}
      </section>
    )
  }

  const correct = question.choices.find((choice) => choice.id === question.correctChoiceId)
  return (
    <section>
      <header>
        <h2>出題中の問題</h2>
        {status !== null && <StatusBadge status={status} />}
      </header>
      <Row label="第何問">第{state.askedCount}問</Row>
      <Row label="ID">{question.id}</Row>
      <Row label="問題形式">{questionTypeLabel(question.type)}</Row>
      <Row label="難易度">{difficultyLabel(question.difficulty)}</Row>
      <Row label="制限時間">{state.timeLimitSec === null ? 'なし' : `${state.timeLimitSec}秒`}</Row>

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
        {question.choices.map((c) => (
          <p key={c.id}>
            {c.id}: {c.text}
          </p>
        ))}
      </Row>
      <Row label="正答">{correct === undefined ? '未設定' : `${correct.id}: ${correct.text}`}</Row>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-10">
      <p className="w-24 font-bold">{label}</p>
      <div>{children}</div>
    </div>
  )
}
