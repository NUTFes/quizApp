type Props = { segments: string[] }

export function QuestionText({ segments }: Props) {
  return <p>{segments.join('')}</p>
}