import type { ViewerQuestion } from '../../../types'
import { ChoiceCard } from './ChoiceCard'

type Props = {
  question: ViewerQuestion | null
  correctChoiceId: string | null
}

export function ChoiceList({ question, correctChoiceId }: Props) {
  if (question === null) return null

  const rowClass = question.type === 'four_choice' ? 'grid-rows-2' : 'grid-rows-1'

  return (
    <div className={`grid h-full w-full grid-cols-2 gap-x-4 gap-y-[19px] ${rowClass}`}>
      {question.choices.map((c) => (
        <ChoiceCard
          key={c.id}
          choice={c}
          isCorrect={c.id === correctChoiceId}
          type={question.type}
        />
      ))}
    </div>
  )
}
