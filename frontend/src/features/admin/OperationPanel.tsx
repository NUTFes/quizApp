// 操作盤。中身は #107 以降で入れる。
//
// ここに置いているのは、認証を通ったあとの行き先を #106 の時点で確定させるため。
// AdminPage は「認証状態の分岐だけを持つ」ので、遷移先が無いとログインの動作確認が

import { useAdminState } from '../../lib/useEventState'
import { useRemainingTime } from '../../lib/useRemainingTime'

// できない(型検査もビルドも通らない)。props は取らない形を保つこと。
export function OperationPanel() {
  // SSE でつなぎっぱなしにする
  const state = useAdminState()
  const remaingTime = useRemainingTime({
    serverTime: state?.serverTime ?? '',
    timeLimitSec: state?.timeLimitSec ?? null,
    questionStartedAt: state?.questionStartedAt ?? null,
  })
  return <p>ログイン済み（操作盤は #107 以降で作る）</p>
}
