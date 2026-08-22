// 待機画面
const fontFamily = "Zen Kaku Gothic New"

export function WaitingView() {
  return (
    <main className="min-h-dvh pt-[env(safe-area-inset-top)]">
      <header className="h-15.5 flex items-center shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
        <div className="h-full w-15.5 px-3 py-4">
          <img src="" alt="logo" className="justify-center h-full w-full rounded-[10px]" />
        </div>
        <p className="text-[17px] font-bold justify-center py-2.5">
          45th Quiz
        </p>
      </header>
      <div className="px-5 pt-7 h-113 w-full">
        <div className="h-full rounded-[28px] pt-8 px-8 space-y-7 shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <div className="pb-4">
            <p className="flex justify-start text-left text-4xl pt-8">
              まもなく
              <br />
              始まります
            </p>
          </div>
          <p className="py-4 text-base">
            会場中央へお集まりください
          </p>
          <p className="py-4 text-sm">
            この画面はモニターと自動で同期します
            <br />
            操作やログインは必要ありません
          </p>
        </div>
      </div>
      <div className="px-4 pt-7 pb-2.5">
        <div className="rounded-[20px] shadow-[0_6px_16px_0_rgba(25,32,133,0.08)] h-[153px] w-full flex items-center justift-start p-6 text-xl">
          移動の際は走らないでください
        </div>
      </div>
      <footer className="w-full h-full">
        <div className="pt-8 px-2.5 text-center text-base">
          第45回 技大祭実行委員会
        </div>
      </footer>
    </main>
  )
}