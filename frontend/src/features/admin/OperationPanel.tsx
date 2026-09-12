// 操作盤。中身は #107 以降で入れる。
//
// ここに置いているのは、認証を通ったあとの行き先を #106 の時点で確定させるため。
// AdminPage は「認証状態の分岐だけを持つ」ので、遷移先が無いとログインの動作確認が

import { useAdminState } from '../../lib/useEventState'
import { useRemainingTime } from '../../lib/useRemainingTime'
import { AdminState } from '../../types'
import { CurrentStatus } from './parts/CurrentStatus'
import { AdminStatus } from './parts/StatusBadge'

// できない(型検査もビルドも通らない)。props は取らない形を保つこと。
export function OperationPanel() {
  // SSE でつなぎっぱなしにする
  const state = useAdminState()
  const remaingTime = useRemainingTime({
    serverTime: state?.serverTime ?? '',
    timeLimitSec: state?.timeLimitSec ?? null,
    questionStartedAt: state?.questionStartedAt ?? null,
  })

  if (state === null) return <p> 接続中...</p>

  return (
    <div>
      <CurrentStatus state={state} status={toStatus(state, remaingTime)}></CurrentStatus>
      {/*ここからは、以降のイシューで足していく */}
    </div>
  )
}

function toStatus(state: AdminState, remaingTime: number): AdminStatus | null {
  if (state.phase === 'answer') return 'answer'
  if (state.phase !== 'question') return null

  const hasTimeLimit = state.timeLimitSec !== null && state.questionStartedAt !== null
  if (hasTimeLimit && remaingTime === 0) return 'closed'
  return 'accepting'
}
