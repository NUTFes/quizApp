import { PhoneFooter } from './parts/PhoneFooter'
import { PhoneHeader } from './parts/PhoneHeader'

// 待機画面
export function WaitingView() {
  return (
    <main className="min-h-dvh bg-canvas pt-[env(safe-area-inset-top)] font-zen-kaku-gothic-new text-brand">
      <PhoneHeader />
      <div className="w-full px-5 pt-7">
        <div className="h-full space-y-7 rounded-[28px] bg-brand px-8 pt-8 shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <div className="pb-4">
            <p className="flex justify-start pt-8 text-left text-surface text-message-xl">
              まもなく
              <br />
              始まります
            </p>
          </div>
          <p className="py-4 text-accent text-notes">会場中央へお集まりください</p>
          <p className="py-4 text-surface text-message-s">
            この画面はモニターと自動で同期します
            <br />
            操作やログインは必要ありません
          </p>
        </div>
      </div>
      <div className="px-4 pt-7 pb-2.5">
        <div className="flex min-h-[153px] w-full items-center justify-start rounded-[20px] border border-border-soft bg-surface p-6 text-instruction-alt text-brand shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          移動の際は走らないでください
        </div>
      </div>
      <PhoneFooter />
    </main>
  )
}
