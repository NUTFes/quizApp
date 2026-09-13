import { QuestionListItem } from '../../../types'

type Props = {
  items: QuestionListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  currentQuestionId: number | null
}

export function QuestionList({ items, selectedId, onSelect, currentQuestionId }: Props) {
  if (items.length === 0) {
    return <p>問題がまだ投入されていません</p>
  }

  return (
    <table>
      <thread>
        <tr></tr>
      </thread>
    </table>
  )
}
