import { useState } from 'react'
import { AdminState } from '../../../types'

type Props = {
  state: AdminState
  remaining: number | null
  busy: boolean
  onAdvanceText: () => void
  onShownAnswer: () => void
  onReset: (to: 'waiting' | 'finished') => void
}

export function ControlPanel({
  state,
  remainingSec,
  busy,
  onAdvanceText,
  onShowAnswer,
  onReset,
}: Props) {
  const [confirmingAnswer, setConfirmingAnswer] = useState(false)
  const isQuestion = state.phase === 'question'
  // ダイアログの開いてるときにフェーズが変わったらこれは閉じる
  const dialogOpen = confirmingAnswer && isQuestion
  // ロック操作をして、排他的制御する
  const locked = busy || dialogOpen

  const canAdvance = isQuestion && state.revealedSegments < state.totalSegments

  return ()
}
