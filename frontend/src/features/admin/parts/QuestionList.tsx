import React from 'react'
import { QuestionListItem } from '../../../types'
import { difficultyLabel, questionTypeLabel } from '../labels'

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
          <tr
            key={item.id}
            // 出題済みは薄くする。当日「もう出した問題」を再出題しないため
            className={item.asked ? 'opacity-60' : undefined}
          >
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
            <td>{item.id}</td>
            <td>{item.textPreview}</td>
            <td>
              <Badge>{questionTypeLabel(item.type)}</Badge>
            </td>
            <td>
              <Badge>{difficultyLabel(item.difficulty)}</Badge>
            </td>
            <td>
              {item.id === currentQuestionId ? (
                <Badge>表示中</Badge>
              ) : (
                item.asked && <Badge>出題済み</Badge>
              )}
            </td>
            <td>{item.hasImage && <Badge>画像あり</Badge>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// シンプルなラベル
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface-soft px-3 py-1 text-admin-func-label whitespace-nowrap">
      {children}
    </span>
  )
}
