import { PhoneFooter } from './parts/PhoneFooter'
import { PhoneHeader } from './parts/PhoneHeader'

// 読み込み中画面
export function LoadingView() {
  return (
    <main className="min-h-dvh bg-canvas pt-[env(safe-area-inset-top)] font-zen-kaku-gothic-new text-brand">
      <PhoneHeader />
      <div className="w-full px-5 pt-7">
        <div className="flex h-full justify-center space-y-7 rounded-[28px] bg-brand px-8 pt-8 shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <p className="flex items-center px-8 py-4 text-left text-surface text-message-m">
            しばらくお待ちください
          </p>
        </div>
      </div>
      <PhoneFooter />
    </main>
  )
}
