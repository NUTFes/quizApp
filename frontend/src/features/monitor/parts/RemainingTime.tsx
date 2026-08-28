type Props = {
  remainingTime: number
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function RemainingTime({ remainingTime }: Props) {
  return <p className="text-center text-p-timelimit">{formatTime(remainingTime)}</p>
}
