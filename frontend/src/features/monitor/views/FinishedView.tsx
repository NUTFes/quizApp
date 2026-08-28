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
          <div className="flex h-full w-[1006px] shrink-0 flex-col justify-center gap-10 pl-[100px]">
            <h2 className="text-p-message-l text-surface">
              ご参加
              <br />
              ありがとうございました
            </h2>
            <p className="text-p-note text-info">第45回 技大祭 クイズ大会</p>
            <div className="flex h-[169px] w-fit items-center justify-center rounded-[48px] bg-surface px-7 shadow-[0_10px_14px_0_rgba(25,32,133,0.1)]">
              <p className="text-p-instruction">アンケートにご協力お願いいたします</p>
            </div>
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
