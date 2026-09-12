import { AdminState } from '../../../types'
import { phaseLabel } from '../labels'
import { AdminStatus } from './StatusBadge'

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
    <div>
      <header>
        <h2>出題中の問題</h2>
        {status !== null && <StatusBadge status={status} />}
      </header>
    </div>
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
