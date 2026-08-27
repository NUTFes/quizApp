type Props = {
  correctText: string | null
  explanation: string | null
  correctId: string | null
}

export function AnswerText({ correctText, explanation, correctId }: Props) {
  // explanationなし
  if (explanation === null) {
    return (
      <div className="px-6 pt-4 pb-6 text-surface">
        <div className="flex">
          <img src="" alt="" className="h-11.5 w-11.5" />
          <p className="px-5 py-2.5 text-pre-answer">正解は</p>
        </div>
        <div className="flex items-center justify-center pt-3">
          <p className="py-1 pr-1 pl-4 text-correct-id text-info">{correctId}</p>
          <p className="pr-5 pl-1 text-correct-body">{correctText}</p>
        </div>
      </div>
    )
  }

  // explanationあり
  return (
    <div className="px-6 pt-4 text-surface">
      <div className="flex border-b border-surface pb-3">
        <img
          src="../../../assets/correctAnswerIcon.svg"
          alt="correct answer icon"
          className="h-12.5 w-12.5"
        />
        <div>
          <p className="px-3 text-pre-answer-exp">正解は</p>
          <div className="flex justify-center">
            <p className="py-1 pr-1 pl-4 text-correct-id-exp text-info">{correctId}</p>
            <p className="py-1 pr-4 pl-1 text-correct-body-exp">{correctText}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-3 text-explanation">{explanation}</div>
    </div>
  )
}
