type Props = {
  remainingTime: number
  timeLimitSec: number | null
}
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
    <div className="mr-6 ml-5 h-[9px] w-full rounded-sm bg-surface">
      <div className="h-full rounded-sm bg-accent" style={{ width: `${progress * 100}%` }} />
    </div>
  )
}

export function RemainingTime({ remainingTime, timeLimitSec }: Props) {
  const divClass = 'flex items-center'
  const timeClass = 'flex pl-6 pb-1 text-timelimit'

  const isClosed = remainingTime <= 0

  if (isClosed)
    return (
      <div className={divClass}>
        <p className={timeClass}>{formatTime(0)}</p>
        <TimeView seconds={0} max={timeLimitSec}></TimeView>
      </div>
    )
  return (
    <div className={divClass}>
      <p className={timeClass}>{formatTime(remainingTime)}</p>
      <TimeView seconds={remainingTime} max={timeLimitSec}></TimeView>
    </div>
  )
}
