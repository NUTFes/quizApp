type Props = {
  correctText: string | null
  explanation: string | null
  correctId: string | null
}

export function AnswerText({ correctText, explanation, correctId }: Props) {
  // explanationなし
  if (explanation === null) {
    return (
      <div className="px-6 pt-4 pb-6">
        <div className="flex">
          <img src="" alt="" className="h-11.5 w-11.5 " />
          <p className="px-5 py-2.5 text-2xl">正解は</p>
        </div>
        <div className="flex justify-center items-center pt-3">
          <p className="pl-4 py-1 pr-1 text-4xl">{correctId}</p>
          <p className="pl-1 pr-5 text-[28px]">{correctText}</p>
        </div>
      </div>
    )
  }

  // explanationあり
  return (
    <div className="px-6 pt-4">
      <div className="flex border-b pb-3">
        <img src="" alt="" className="h-12.5 w-12.5 " />
        <div>
          <p className="px-3 text-xs">正解は</p>
          <div className="flex justify-center text-2xl ">
            <p className="pl-4 py-1 pr-1">{correctId}</p>
            <p className="pl-1 py-1 pr-4">{correctText}</p>
          </div>
        </div>
      </div>
      <div className="text-xs px-5 py-3">{explanation}</div>
    </div>
  )
}
