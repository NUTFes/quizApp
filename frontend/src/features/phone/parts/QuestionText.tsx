type Props = { segments: string[] }

export function QuestionText({ segments }: Props) {
  return <p className="items-center px-6 pb-3 text-question-body">{segments.join('')}</p>
}
