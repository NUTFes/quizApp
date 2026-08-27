import { PhoneFooter } from './parts/PhoneFooter'
import { PhoneHeader } from './parts/PhoneHeader'

// 終了、アンケート誘導画面
export function FinishedView() {
  return (
    <main className="min-h-dvh bg-canvas pt-[env(safe-area-inset-top)] font-zen-kaku-gothic-new text-brand">
      <PhoneHeader />
      <div className="w-full px-5 pt-7">
        <div className="flex w-full flex-col items-center justify-center rounded-[28px] border border-border-soft bg-surface shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <p className="flex justify-center px-8 pt-16 pb-17 text-left text-message-l">
            ご参加
            <br />
            ありがとうございました
          </p>
          <p className="w-full px-8 pt-4 pb-8 text-left text-notes">45th クイズ大会</p>
        </div>
      </div>
      <div className="w-full px-5 pt-20">
        <div className="w-full rounded-[20px] border border-border-soft bg-surface pb-4 shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <p className="flex justify-center px-8 py-8 text-center text-instruction-alt-black">
            アンケートにご協力ください
          </p>
          <a
            href=""
            className="mx-auto flex h-[57px] w-full items-center justify-center rounded-[20px] bg-live text-link text-brand"
          >
            Googleフォームを開く
          </a>
        </div>
      </div>
      <PhoneFooter />
    </main>
  )
}
