import { ViewerQuestion } from '../../../types'
import { ChoiceCard } from './ChoiceCard'

type Props = {
  question: ViewerQuestion | null
  correctChoiceId: string | null
}

export function ChoiceList({ question, correctChoiceId }: Props) {
  if (question === null) return null

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
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
