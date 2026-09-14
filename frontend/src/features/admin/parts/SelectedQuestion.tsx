import type { ReactNode } from 'react'
import type { Question } from '../../../types'
import { difficultyLabel, questionTypeLabel } from '../labels'

// 「出題中の問題」(CurrentStatus・#107)とそっくりだが別物。
// こちらは「これから出そうとしている」問題(問題一覧で選んだだけで、まだ出題していない)。
// 見出しは CurrentStatus/ShowQuestionForm どちらとも違う文言にして、取り違え事故を防ぐ
// (→ フロントエンド実装要件.md §7)。
export type SelectedQuestionProps =
  | { status: 'empty' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; question: Question }

export function SelectedQuestion(props: SelectedQuestionProps) {
  return (
    <section className="w-full max-w-[440px] rounded-3xl border border-border-soft bg-surface px-6 font-zen-kaku-gothic-new text-black">
      <header className="flex min-h-12 items-center pt-3">
        <h2 className="text-admin-header leading-[normal] text-brand">選択中の問題（詳細）</h2>
      </header>
      {renderBody(props)}
    </section>
  )
}

function renderBody(props: SelectedQuestionProps) {
  switch (props.status) {
    case 'empty':
      return (
        <p className="py-3 pl-2 text-current-question leading-[normal]">
          問題一覧から選んでください
        </p>
      )
    case 'loading':
      return <p className="py-3 pl-2 text-current-question leading-[normal]">取得中です…</p>
    case 'error':
      return (
        <p className="py-3 pl-2 text-current-question leading-[normal] text-red-700">
          {props.message}
        </p>
      )
    case 'loaded': {
      const { question } = props
      const correct = question.choices.find((choice) => choice.id === question.correctChoiceId)
      return (
        <dl className="grid min-h-[365px] grid-cols-[minmax(62px,0.2fr)_minmax(0,1fr)] content-start gap-2.5 py-3 pl-2 text-current-question leading-[normal]">
          <Row label="ID">{question.id}</Row>
          <Row label="問題形式">{questionTypeLabel(question.type)}</Row>
          <Row label="難易度">{difficultyLabel(question.difficulty)}</Row>
          <Row label="問題文">{question.textSegments.join('')}</Row>
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
      )
    }
  }
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="col-span-2 grid grid-cols-subgrid items-start gap-x-2.5">
      <dt>{label}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}
