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
  | { status: 'error'; message: string; onRetry: () => void }
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
        <div className="flex flex-col items-start gap-3 py-3 pl-2 text-current-question leading-[normal]">
          <p className="text-red-700">{props.message}</p>
          <button
            type="button"
            onClick={props.onRetry}
            className="rounded-lg border border-border-soft px-3 py-1 text-sm"
          >
            もう一度取得する
          </button>
        </div>
      )
    case 'loaded': {
      const { question } = props
      const correct = question.choices.find((choice) => choice.id === question.correctChoiceId)
      return (
        <dl className="grid min-h-[365px] grid-cols-[minmax(62px,0.2fr)_minmax(0,1fr)] content-start gap-2.5 py-3 pl-2 text-current-question leading-[normal]">
          <Row label="ID">{question.id}</Row>
          <Row label="問題形式">{questionTypeLabel(question.type)}</Row>
          <Row label="難易度">{difficultyLabel(question.difficulty)}</Row>
          <Row label="問題文">
            {/* 「次を表示」で公開される順番がそのまま並ぶよう、区切りを保ったまま出す
                (一覧の textPreview と違い、こちらは区切りに意味がある→ API仕様書 §1) */}
            <ol className="flex list-decimal flex-col gap-1 pl-4">
              {question.textSegments.map((segment, i) => (
                <li key={i}>{segment}</li>
              ))}
            </ol>
          </Row>
          <Row label="問題画像">
            {question.imageUrl === null ? (
              'なし'
            ) : (
              <img
                src={question.imageUrl}
                alt="問題画像"
                className="max-h-[160px] max-w-full rounded-lg object-contain"
              />
            )}
          </Row>
          <Row label="選択肢">
            <div className="flex flex-col gap-2.5">
              {question.choices.map((c) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  <p>
                    {c.id}: {c.text}
                  </p>
                  {c.imageUrl !== null && (
                    <img
                      src={c.imageUrl}
                      alt={`選択肢${c.id}の画像`}
                      className="max-h-[80px] max-w-[120px] rounded-lg object-contain"
                    />
                  )}
                </div>
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
