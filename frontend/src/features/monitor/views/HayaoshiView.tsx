import type { MonitorState } from '../../../types'
import { MonitorLayout } from '../parts/MonitorLayout'
import { LoadingView } from './LoadingView'

type HayaoshiViewProps = {
  state: MonitorState
  showAnswer?: boolean
}

export function HayaoshiView({ state, showAnswer = false }: HayaoshiViewProps) {
  const question = state.question

  if (question === null) return <LoadingView />

  const correctChoice = question.choices.find(
    (choice) => choice.id === state.answer?.correctChoiceId,
  )
  const correctAnswer = correctChoice?.text ?? state.answer?.explanation ?? '—'

  return (
    <MonitorLayout state={state} questionType="hayaoshi">
      <div
        className={`grid min-h-0 flex-1 gap-12 px-12 py-12 ${
          showAnswer ? 'grid-rows-[461px_339px]' : 'grid-rows-1'
        }`}
      >
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border-2 border-border-soft bg-surface pt-4 pr-9 pb-9 pl-9 shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
          <p className="w-[75px] shrink-0 text-p-count-number-alt">Q{state.askedCount}</p>
          <p
            className={`flex min-h-0 flex-1 px-20 py-2.5 text-brand ${
              showAnswer ? 'items-center text-p-question-body-m' : 'text-p-question-body-l'
            }`}
          >
            {question.textSegments.join('')}
          </p>
        </section>

        {showAnswer && (
          <section className="flex items-center gap-20 overflow-hidden rounded-[28px] border-2 border-border-soft bg-info px-20 pt-4 pb-9 shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
            <p className="w-48 shrink-0 text-p-answer">正解</p>
            <p className="min-w-0 flex-1 text-center text-p-answer">{correctAnswer}</p>
          </section>
        )}
      </div>
    </MonitorLayout>
  )
}
