import { useRemainingTime } from '../../../lib/useRemainingTime'
import { ViewerState } from '../../../types'

type Props = Pick<
  ViewerState,
  'serverTime' | 'timeLimitSec' | 'questionStartedAt'
>

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function RemainingTime({ serverTime, timeLimitSec, questionStartedAt }: Props) {
  const remaining = useRemainingTime({
    serverTime: serverTime,
    timeLimitSec: timeLimitSec,
    questionStartedAt: questionStartedAt,
  })

  const isClosed = remaining <= 0

  if (isClosed) return <p>{formatTime(0)}</p>

  return <p>{formatTime(remaining)}</p>
}
