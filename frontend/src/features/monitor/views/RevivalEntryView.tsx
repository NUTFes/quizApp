import { REVIVAL_URL } from '../../../lib/config'
import { MonitorLayout } from '../parts/MonitorLayout'
import { MonitorQrCode } from '../parts/MonitorQrCode'

// 敗者復活、参加受付画面
export function RevivalEntryView() {
  return (
    <MonitorLayout>
      <div className="flex min-h-0 flex-1 px-12 py-9">
        <section className="flex w-full items-center justify-between overflow-hidden rounded-[80px] bg-brand pr-[100px] shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
          <div className="flex h-full w-[1006px] shrink-0 flex-col justify-center gap-8 pl-[100px]">
            <h2 className="text-p-message-l leading-[1.15] text-surface">
              敗者復活に
              <br />
              参加しよう！
            </h2>
            <p className="text-p-message-m text-surface">
              敗者復活への参加を希望する方は、
              <br />
              右のQRコードからフォームを開いてください。
            </p>
            <p className="text-p-message-m text-surface">
              フォームに必要事項を入力して、送信してください。
            </p>
            <p className="text-p-instruction-alt text-info">
              ※参加受付が終わるまで、この画面のままお待ちください
            </p>
            <div className="flex h-24 w-[906px] items-center gap-8 rounded-[48px] bg-surface px-7 shadow-[0_10px_14px_0_rgba(25,32,133,0.1)]">
              <span className="size-5.5 shrink-0 rounded-[11px] bg-info" />
              <p className="text-p-message-m">右のQRコードを読み取ってください</p>
            </div>
          </div>
          <div className="flex size-[668px] shrink-0 items-center justify-center overflow-hidden rounded-[80px] bg-canvas p-12">
            {REVIVAL_URL === '' ? (
              <p className="text-p-instruction text-brand">敗者復活URL未設定</p>
            ) : (
              <MonitorQrCode url={REVIVAL_URL} size={572} alt="敗者復活参加フォームのQR" />
            )}
          </div>
        </section>
      </div>
    </MonitorLayout>
  )
}
