// 操作盤。認証を通ったあとに表示される画面。
//
// この画面で唯一、サーバーと通信する場所。状態の受け取りと計算をここに寄せ、
// 各パネルには props で配る。パネル側が通信すると、/dev/admin で描画できなくなる
// (トークンも fetch も無い場所で全状態を並べたいため)。
import { useAdminState } from '../../lib/useEventState'
import { useRemainingTime } from '../../lib/useRemainingTime'
import type { AdminState } from '../../types'
import { CurrentStatus } from './parts/CurrentStatus'
import type { AdminStatus } from './parts/StatusBadge'

export function OperationPanel() {
  // SSE でつなぎっぱなしにする。状態が変わるたびに新しい state が届く
  const state = useAdminState()
  const remainingTime = useRemainingTime({
    serverTime: state?.serverTime ?? '',
    timeLimitSec: state?.timeLimitSec ?? null,
    questionStartedAt: state?.questionStartedAt ?? null,
  })

  if (state === null) return <p>接続中...</p>

  return (
    <div>
      <CurrentStatus state={state} status={toStatus(state, remainingTime)} />
      {/*ここからは、以降のイシューで足していく */}
    </div>
  )
}

function toStatus(state: AdminState, remainingTime: number): AdminStatus | null {
  if (state.phase === 'answer') return 'answer'
  if (state.phase !== 'question') return null

  const hasTimeLimit = state.timeLimitSec !== null && state.questionStartedAt !== null
  if (hasTimeLimit && remainingTime === 0) return 'closed'
  return 'accepting'
}
