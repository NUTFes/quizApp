// 待機画面
const colors = {
  main_bg: "#FFFFFF",
  header_bg: "#F6F8FF",
  Brand: "#192085"
}
const fontFamily = "Zen Kaku Gothic New"

export function WaitingView() {
  return (
    <main className="min-h-dvh pt-[env(safe-area-inset-top)]" style={{ backgroundColor: colors.main_bg }}>
      <header className="h-15.5 flex items-center shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]" style={{ backgroundColor: colors.header_bg }}>
        <div className="h-full w-15.5 px-3 py-4">
          <img src="" alt="logo" className="justify-center h-full w-full rounded-[10px]" />
        </div>
        <p className="text-[17px] font-bold justify-center py-2.5" style={{ color: colors.Brand, fontFamily: fontFamily }}>
          45th Quiz
        </p>
      </header>
      <div>
        <p>
          まもなく
          <br />
          始まります
        </p>
        <p>
          会場中央へお集まりください
        </p>
        <p>
          この画面はモニターと自動で同期します
          <br />
          操作やログインは必要ありません
        </p>
      </div>
      <div>
        移動の際は走らないでください
      </div>
      <div>
        <footer>
          第45回 技大祭実行委員会
        </footer>
      </div>
    </main>
  )
}