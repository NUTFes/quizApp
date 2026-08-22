import { useRemainingTime } from '../../../lib/useRemainingTime'
import { ViewerState } from '../../../types'

type Props = { state: ViewerState }

export function RemainingTime({ state }: Props) {
  const remaining = useRemainingTime({
    serverTime: state.serverTime,
    timeLimitSec: state.timeLimitSec,
    questionStartedAt: state.questionStartedAt,
  })

  const isClosed = remaining <= 0

  if (isClosed) return <p>締切!</p>

  return <p>{remaining}</p>
}
