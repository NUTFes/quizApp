import { Phase } from '../../../types'

type Props = {
  phase: Phase
  remainingSec: number | null
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function RemainingTime({ phase, remainingSec }: Props) {
  return (
    <div className="flex items-baseline gap-4 font-zen-kaku-gothic-new">
      <p className="text-admin-pre-timelimit text-brand">残り時間</p>
      {/* 締切の瞬間に文字数が変わってもボタンが動かないよう、幅を固定する */}
      <p
        className="min-w-[4.5em] text-admin-timelimit leading-none tabular-nums"
        aria-live="polite"
      >
        {phase !== 'question' ? (
          <span className="text-neutral-300">--:--</span>
        ) : remainingSec === null ? (
          <span className="text-admin-header">制限なし</span>
        ) : remainingSec === 0 ? (
          <span className="text-red-700">締切</span>
        ) : (
          formatTime(remainingSec)
        )}
      </p>
    </div>
  )
}
