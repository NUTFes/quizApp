import { ViewerQuestion } from '../../../types'
import { ChoiceCard } from './ChoiceCard'

type Props = {
  question: ViewerQuestion | null
  correctChoiceId: string | null
}

export function ChoiceList({ question, correctChoiceId }: Props) {
  if (question === null) return null

  const layout =
    question.type === 'four_choice'
      ? 'grid grid-cols-2' // 2×2
      : 'grid grid-cols-2' // 左右（2つしか無いので同じ書き方で並ぶ）

  return (
    <div className={layout}>
      {question.choices.map((c) => (
        <ChoiceCard key={c.id} choice={c} isCorrect={c.id === correctChoiceId} />
      ))}
    </div>
  )
}
