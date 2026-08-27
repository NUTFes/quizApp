type HeaderProps = {
  questionType?: string
}

export function PhoneHeader({ questionType }: HeaderProps) {
  return (
    <header className="flex h-13 items-center bg-canvas shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
      <div className="h-full w-14 px-3 py-4">
        <img
          src=""
          alt="logo"
          className="flex h-full w-full justify-center rounded-[10px] bg-brand"
        />
      </div>
      <p className="flex justify-center py-2.5 text-header">45th Quiz</p>
      {questionType != undefined && (
        <p className="ml-auto flex justify-center py-2.5 pr-4 text-header">{`${questionType}クイズ`}</p>
      )}
    </header>
  )
}
