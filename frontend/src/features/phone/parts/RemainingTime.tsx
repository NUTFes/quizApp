import { useRemainingTime } from '../../../lib/useRemainingTime'
import { ViewerState } from '../../../types'

type Props = Pick<
  ViewerState,
  'serverTime' | 'timeLimitSec' | 'questionStartedAt'
>

export function RemainingTime({ serverTime, timeLimitSec, questionStartedAt }: Props) {
  const remaining = useRemainingTime({
    serverTime: serverTime,
    timeLimitSec: timeLimitSec,
    questionStartedAt: questionStartedAt,
  })

  const isClosed = remaining <= 0

  if (isClosed) return <p>締切!</p>

  return <p>{remaining}</p>
}
