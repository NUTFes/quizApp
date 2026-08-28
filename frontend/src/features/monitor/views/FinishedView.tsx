import { MonitorState } from '../../../types'
import { MonitorLayout } from '../parts/MonitorLayout'
import { MonitorQrCode } from '../parts/MonitorQrCode'

type Props = { state: MonitorState }

// 終了、アンケート誘導画面
export function FinishedView({ state }: Props) {
  return (
    <MonitorLayout>
      <div className="flex min-h-0 flex-1 px-12 py-9">
        <section className="flex w-full items-center justify-between overflow-hidden rounded-[80px] bg-brand pr-[100px] shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
          <div className="flex h-full w-[1006px] shrink-0 flex-col justify-center gap-8 pl-[100px]">
            <h2 className="text-p-message-l leading-[1.15] text-surface">
              アンケートのご協力を
              <br />
              お願いいたします！（3〜5分）
            </h2>
            <p className="text-p-message-m text-surface">
              第45回技大祭にご来場いただき、誠にありがとうございます！
            </p>
            <p className="text-p-message-m text-surface">
              アンケートにご回答いただいた方の中から、
              抽選で20名様にAmazonギフトカート500円分をプレゼント！
            </p>
            <div className="flex h-24 w-[906px] items-center gap-8 rounded-[48px] bg-surface px-7 shadow-[0_10px_14px_0_rgba(25,32,133,0.1)]">
              <span className="size-5.5 shrink-0 rounded-[11px] bg-info" />
              <p className="text-p-message-m">右のQRコードを読み取ってください</p>
            </div>
            <p className="text-p-instruction-alt text-info">
              ※お連れ様もそれぞれご回答いただけます
            </p>
          </div>
          <div className="flex size-[668px] shrink-0 items-center justify-center overflow-hidden rounded-[80px] bg-canvas p-12">
            <MonitorQrCode
              joinUrl={state.joinUrl}
              size={572}
              alt="スマホ画面へのアクセス用QRコード"
            />
          </div>
        </section>
      </div>
    </MonitorLayout>
  )
}
