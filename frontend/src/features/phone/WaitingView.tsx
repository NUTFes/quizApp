// 待機画面
export function WaitingView() {
  return (
    <main className="min-h-dvh bg-canvas pt-[env(safe-area-inset-top)] font-zen-kaku-gothic-new text-brand">
      <header className="flex h-15.5 items-center bg-canvas shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
        <div className="h-full w-15.5 px-3 py-4">
          <img
            src=""
            alt="logo"
            className="flex h-full w-full justify-center rounded-[10px] bg-brand"
          />
        </div>
        <p className="flex justify-center py-2.5 text-header">45th Quiz</p>
      </header>
      <div className="w-full px-5 pt-7">
        <div className="h-full space-y-7 rounded-[28px] border border-border-soft bg-surface px-8 pt-8 shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <div className="pb-4">
            <p className="flex justify-start pt-8 text-left text-message-xl">
              まもなく
              <br />
              始まります
            </p>
          </div>
          <p className="py-4 text-notes">会場中央へお集まりください</p>
          <p className="py-4 text-message-s">
            この画面はモニターと自動で同期します
            <br />
            操作やログインは必要ありません
          </p>
        </div>
      </div>
      <div className="px-4 pt-7 pb-2.5">
        <div className="flex min-h-[153px] w-full items-center justify-start rounded-[20px] bg-brand p-6 text-instruction-alt text-surface shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          移動の際は走らないでください
        </div>
      </div>
      <footer className="h-full w-full">
        <div className="px-2.5 pt-8 text-center text-notes">第45回 技大祭実行委員会</div>
      </footer>
    </main>
  )
}
