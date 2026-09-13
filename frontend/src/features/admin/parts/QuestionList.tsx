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
      <thead>
        <tr>
          <th></th>
          <th>ID</th>
          <th>問題文</th>
          <th>形式</th>
          <th>難易度</th>
          <th>出題済み</th>
          <th>画像あり</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr>
            <td>
              <label>
                <input
                  type="radio"
                  name="question"
                  value={item.id}
                  checked={selectedId === item.id}
                  onChange={() => onSelect(item.id)}
                />
                出題する問題を選ぶ
              </label>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
