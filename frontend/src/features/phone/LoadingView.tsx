// 読み込み中画面
export function LoadingView() {
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
        <div className="flex h-full justify-center space-y-7 rounded-[28px] bg-brand px-8 pt-8 shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <p className="flex items-center px-8 py-4 text-left text-surface text-message-m">
            しばらくお待ちください
          </p>
        </div>
      </div>
      <footer className="h-full w-full">
        <div className="px-2.5 pt-8 text-center text-notes">第45回 技大祭実行委員会</div>
      </footer>
    </main>
  )
}
