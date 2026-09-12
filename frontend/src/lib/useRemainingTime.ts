import { useEffect, useState } from 'react'

type UseRemainingTimeProps = {
  serverTime: string
  timeLimitSec: number | null
  questionStartedAt: string | null
}

export function useRemainingTime({
  serverTime,
  timeLimitSec,
  questionStartedAt,
}: UseRemainingTimeProps): number {
  const [remainingTime, setRemainingTime] = useState(0)

  useEffect(() => {
    // nullの場合処理をせず、useEffectを出る
    if (timeLimitSec === null || questionStartedAt === null) {
      return
    }

    // 時間ずれ = 手元の現在時刻 - 受信したserverTime
    const clockOffset = Date.now() - new Date(serverTime).getTime()

    const updateRemainingTime = () => {
      // 残り秒数（ms） = timeLimitSec - (手元の現在時刻 - 時計ずれ - questionStartedAt)
      const remaining =
        timeLimitSec * 1000 - (Date.now() - clockOffset - new Date(questionStartedAt).getTime())

      // マイナスが入らないようにし、ms 単位を 1000 で割って 1秒段位へ変換する
      // 切り上げをするのは、残り0.1秒の時に、０秒と表示されてほしくないから。
      setRemainingTime(Math.max(0, Math.ceil(remaining / 1000)))
    }

    // 初回起動
    updateRemainingTime()

    // 表示に合わせて1秒で更新するようにする
    const intervalId = setInterval(updateRemainingTime, 1000)

    return () => {
      // setInterval の後片付け(clearInterval)を忘れない
      clearInterval(intervalId)
    }
  }, [serverTime, timeLimitSec, questionStartedAt])

  // 問題フェーズではないときは前の値が残った remainigTime を読まない
  if (timeLimitSec === null || questionStartedAt === null) {
    return 0
  }
  // 残り時間を返す
  return remainingTime
}
