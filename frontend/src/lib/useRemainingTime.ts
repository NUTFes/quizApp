import { useEffect, useState } from 'react'

type UseRemainingTimeProps = {
  serverTime: string
  timeLimitSec: number | null
  questionStartedAt: string | null
}

type RemainingTimeState = {
  timingKey: string
  seconds: number | null
}

function calculateRemainingTimeAtReceipt({
  serverTime,
  timeLimitSec,
  questionStartedAt,
}: UseRemainingTimeProps): number | null {
  if (timeLimitSec === null || questionStartedAt === null) return null

  const elapsed = new Date(serverTime).getTime() - new Date(questionStartedAt).getTime()
  return Math.max(0, Math.ceil((timeLimitSec * 1000 - elapsed) / 1000))
}

export function useRemainingTime({
  serverTime,
  timeLimitSec,
  questionStartedAt,
}: UseRemainingTimeProps): number | null {
  const timingKey = `${serverTime}|${timeLimitSec}|${questionStartedAt}`
  const receivedRemainingTime = calculateRemainingTimeAtReceipt({
    serverTime,
    timeLimitSec,
    questionStartedAt,
  })
  const [remainingTime, setRemainingTime] = useState<RemainingTimeState>(() => ({
    timingKey,
    seconds: receivedRemainingTime,
  }))

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
      setRemainingTime({
        timingKey,
        seconds: Math.max(0, Math.ceil(remaining / 1000)),
      })
    }

    // 初回起動
    updateRemainingTime()

    // 表示に合わせて1秒で更新するようにする
    const intervalId = setInterval(updateRemainingTime, 1000)

    return () => {
      // setInterval の後片付け(clearInterval)を忘れない
      clearInterval(intervalId)
    }
  }, [serverTime, timeLimitSec, questionStartedAt, timingKey])

  // 問題フェーズではないときや制限時間がないときは、0秒と区別して null を返す
  if (timeLimitSec === null || questionStartedAt === null) {
    return null
  }
  // 残り時間を返す
  // 受け取った時刻が変わった最初の描画では、前の問題の state ではなく、
  // サーバー時刻同士から同期的に計算した値を返す。
  return remainingTime.timingKey === timingKey ? remainingTime.seconds : receivedRemainingTime
}
