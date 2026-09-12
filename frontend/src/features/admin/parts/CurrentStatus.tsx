import { AdminState } from '../../../types'
import { phaseLabel } from '../labels'

type Props = {
  state: AdminState
  remainingTime: number
}

export function CurrentStatus({ state, remainingTime }: Props) {
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
  return <div></div>
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-10">
      <p className="w-24 font-bold">{label}</p>
      <div>{children}</div>
    </div>
  )
}
