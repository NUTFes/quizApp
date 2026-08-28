import { MonitorState } from '../../../types'
import { MonitorLayout } from '../parts/MonitorLayout'
import { MonitorQrCode } from '../parts/MonitorQrCode'

type Props = { state: MonitorState }

// 待機画面
export function WaitingView({ state }: Props) {
  return (
    <MonitorLayout>
      <div className="flex min-h-0 flex-1 px-12 py-9">
        <section className="flex w-full items-center justify-between overflow-hidden rounded-[80px] bg-brand pr-[100px] shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
          <div className="relative flex h-full w-[1006px] shrink-0 flex-col justify-center gap-10 pl-[100px]">
            <div className="flex items-center gap-10">
              <h2 className="text-p-message-xl text-surface">
                まもなく
                <br />
                始まります
              </h2>
              <span className="size-[260px] shrink-0 self-start rounded-full bg-info opacity-40" />
              <span className="size-[110px] shrink-0 self-end rounded-[55px] bg-live" />
            </div>
            <p className="text-p-note text-info">第45回 技大祭 クイズ大会</p>
            <p className="text-p-message-m text-surface">会場中央へお集まりください</p>
            <div className="flex h-24 w-[820px] items-center gap-8 rounded-[48px] bg-surface px-7 shadow-[0_10px_14px_0_rgba(25,32,133,0.1)]">
              <span className="size-5.5 shrink-0 rounded-[11px] bg-info" />
              <p className="text-p-message-m">QRコードを読み取って参加してください</p>
            </div>
          </div>
          <div className="flex size-[668px] shrink-0 items-center justify-center overflow-hidden rounded-[80px] bg-canvas p-12">
            <MonitorQrCode url={state.joinUrl} size={572} alt="スマホ画面へのアクセス用QRコード" />
          </div>
        </section>
      </div>
    </MonitorLayout>
  )
}
