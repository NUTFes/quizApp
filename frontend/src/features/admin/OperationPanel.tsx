// 操作盤。認証を通ったあとに表示される画面。
//
// この画面で唯一、サーバーと通信する場所。状態の受け取りと計算をここに寄せ、
// 各パネルには props で配る。パネル側が通信すると、/dev/admin で描画できなくなる
// (トークンも fetch も無い場所で全状態を並べたいため)。
import { useEffect, useState } from 'react'
import { useAdminState } from '../../lib/useEventState'
import type { AdminState } from '../../types'
import { CurrentStatus } from './parts/CurrentStatus'
import type { AdminStatus } from './parts/StatusBadge'

type Props = {
  // トークンが無効になったことが分かったときに呼ぶ。AdminPage がログイン画面へ戻す
  // (→ docs/実装要件/フロントエンド実装要件.md §4「どのAPIでも401ならトークン入力画面に戻す」)
  onAuthExpired: () => void
}

export function OperationPanel({ onAuthExpired }: Props) {
  // SSE でつなぎっぱなしにする。状態が変わるたびに新しい state が届く
  const state = useAdminState(onAuthExpired)
  const remainingSec = useDeadlinePassed(state)

  if (state === null) return <p>接続中...</p>

  return (
    <div>
      <CurrentStatus state={state} status={toStatus(state, remainingSec)} />
      {/*ここからは、以降のイシューで足していく */}
    </div>
  )
}

// 会場に出ている状態を決める。バッジを出さないときは null を返す
function toStatus(state: AdminState, remainingSec: number): AdminStatus | null {
  if (state.phase === 'answer') return 'answer'
  if (state.phase !== 'question') return null
  return remainingSec === 0 ? 'closed' : 'accepting'
}

// 残り時間を求める。
//
// lib/useRemainingTime は残り秒数を state に持ち、最初の値が入るのは描画の後。
// その値で締切を判定すると、制限時間つきの問題を受け取った最初の1描画が必ず「残り0秒」に
// なり、「回答締切」が一瞬映る。次の問題へ進んだ直後も同じことが起きる。
//
// ここでは受信時点の経過時間を state の中身だけから求める。
// serverTime も questionStartedAt もサーバーの時計なので、手元の時計を使わずに
// 「受け取った時点で何秒経っていたか」が分かる。最初の描画から正しい値になる。
//
// そこに「受け取ってから手元で進んだ時間」を足して、締切を跨いだ瞬間に表示を切り替える。
//
// 制限時間なし(timeLimitSec が null)の出題では、いつまでも締切にしない。
function useDeadlinePassed(state: AdminState | null): boolean {
  const serverTime = state?.serverTime ?? ''
  const timeLimitSec = state?.timeLimitSec ?? null
  const questionStartedAt = state?.questionStartedAt ?? null
  const hasDeadline = timeLimitSec !== null && questionStartedAt !== null

  // 受け取ってから手元で進んだ時間。どの state に対する計測かも一緒に持つ
  const [sinceReceive, setSinceReceive] = useState({ serverTime: '', elapsedMs: 0 })

  useEffect(() => {
    if (!hasDeadline) return
    const receivedAt = Date.now()
    const intervalId = setInterval(
      () => setSinceReceive({ serverTime, elapsedMs: Date.now() - receivedAt }),
      1000,
    )
    return () => clearInterval(intervalId)
  }, [serverTime, hasDeadline])

  if (!hasDeadline) return false

  const elapsedAtReceiveMs = new Date(serverTime).getTime() - new Date(questionStartedAt).getTime()
  // 1つ前の state に対する計測が残っていたら使わない
  const extraMs = sinceReceive.serverTime === serverTime ? sinceReceive.elapsedMs : 0
  return elapsedAtReceiveMs + extraMs >= timeLimitSec * 1000
}
