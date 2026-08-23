import { useRemainingTime } from '../../../lib/useRemainingTime'
import { ViewerState } from '../../../types'

type Props = Pick<ViewerState, 'serverTime' | 'timeLimitSec' | 'questionStartedAt'>
type TimeViewProps = {
  seconds: number | null
  max: number | null
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function TimeView({ seconds, max }: TimeViewProps) {
  const time = seconds ?? 0
  const maxTime = max ?? 0
  const progress = maxTime > 0 ? Math.max(0, Math.min(1, time / maxTime)) : 0

  return (
  <div className="h-[9px] w-full ml-5 mr-6 rounded-sm bg-gray-200">
    <div
      className="h-full rounded-sm bg-amber-300"
      style={{ width: `${progress * 100}%` }}
    />
  </div>
)
}

export function RemainingTime({ serverTime, timeLimitSec, questionStartedAt }: Props) {
  const remaining = useRemainingTime({
    serverTime: serverTime,
    timeLimitSec: timeLimitSec,
    questionStartedAt: questionStartedAt,
  })
  const divClass = 'flex items-center'
  const timeClass = 'flex pl-6 pb-1 text-xs'

  const isClosed = remaining <= 0

  if (isClosed)
    return (
      <div className={divClass}>
        <p className={timeClass}>{formatTime(0)}</p>
        <TimeView seconds={0} max={timeLimitSec}></TimeView>
      </div>
    )
  return (
    <div className={divClass}>
      <p className={timeClass}>{formatTime(remaining)}</p>
      <TimeView seconds={remaining} max={timeLimitSec}></TimeView>
    </div>
  )
}
