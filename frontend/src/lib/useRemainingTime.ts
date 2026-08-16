import { useEffect, useState } from "react";

type UseRemainingTimeProps = {
  serverTime: string
  timeLimitSec: number | null
  questionStartedAt: string | null
};

export function useRemainingTime({
  serverTime,
  timeLimitSec,
  questionStartedAt,
}: UseRemainingTimeProps): number {
    const [remainingTime, setRemainingTime] = useState(0);

    // nullの場合処理は開始しない
    useEffect(() => {
        if (timeLimitSec === null || questionStartedAt === null) {
            setRemainingTime(0);
            return;
        }

        // 時間ずれ = 手元の現在時刻 - 受信したserverTime
        const clockOffset = Date.now() - new Date(serverTime).getTime();

        const updateRemainingTime = () => {
            // 残り秒数 = timeLimitSec - (手元の現在時刻 - 時計ずれ - questionStartedAt)
            const remaining = timeLimitSec * 1000 - (Date.now() - clockOffset - new Date(questionStartedAt).getTime());

            console.log({
                serverTime,
                clockOffset,
                questionStartedAt,
                timeLimitSec,
                remainingSec: Math.max(0, Math.ceil(remaining / 1000)),
            });

            // 0のままにする
            setRemainingTime(Math.max(0, Math.ceil(remaining / 1000)));
        };

        // 初回起動
        updateRemainingTime();

        const intervalId = setInterval(updateRemainingTime, 1000);

        return () => {
            // setInterval の後片付け(clearInterval)を忘れない
            clearInterval(intervalId);
        };
    }, [serverTime, timeLimitSec, questionStartedAt]);

    // 残り時間を返す
    return remainingTime;
}
