type Props = {
  segments: string[]
  multiline?: boolean
}

export function QuestionText({ segments, multiline = false }: Props) {
  if (multiline) {
    return (
      <p className="flex h-[193px] min-w-0 flex-1 flex-col justify-center text-p-question-body">
        {segments.map((segment, index) => (
          <span key={`${index}-${segment}`}>{segment}</span>
        ))}
      </p>
    )
  }

  return (
    <p className="flex h-[193px] min-w-0 flex-1 items-center text-p-question-body">
      {segments.join('')}
    </p>
  )
}
