// 読み込み中画面
export function LoadingView() {
  return (
    <main className="min-h-dvh pt-[env(safe-area-inset-top)]">
      <header className="flex h-15.5 items-center shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
        <div className="h-full w-15.5 px-3 py-4">
          <img src="" alt="logo" className="flex h-full w-full justify-center rounded-[10px]" />
        </div>
        <p className="flex justify-center py-2.5 text-[17px] font-bold">45th Quiz</p>
      </header>
      <div className="h-[643px] w-full">
        <div className="flex h-full justify-center space-y-7 rounded-[28px] px-8 pt-8 shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <p className="flex items-center px-8 py-4 text-left text-2xl">しばらくお待ちください</p>
        </div>
      </div>
      <footer className="h-full w-full">
        <div className="px-2.5 pt-8 text-center text-base">第45回 技大祭実行委員会</div>
      </footer>
    </main>
  )
}
