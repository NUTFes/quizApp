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
    <table className="border-separate border-spacing-y-2">
      <thead>
        <tr>
          <th className="px-3 py-2 text-left">選ぶ（出題）</th>
          <th className="px-3 py-2 text-left">ID</th>
          <th className="px-3 py-2 text-left">問題文</th>
          <th className="px-3 py-2 text-left">形式</th>
          <th className="px-3 py-2 text-left">難易度</th>
          <th className="px-3 py-2 text-left">出題済み</th>
          <th className="px-3 py-2 text-left">画像あり</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            // 出題済みは薄くする。当日「もう出した問題」を再出題しないため
            className={item.asked ? 'opacity-60' : undefined}
          >
            <td className="px-3 py-2">
              <label className="flex cursor-pointer items-center justify-center">
                <input
                  type="radio"
                  name="question"
                  value={item.id}
                  checked={selectedId === item.id}
                  onChange={() => onSelect(item.id)}
                  className="h-5 w-5 accent-brand"
                />
              </label>
            </td>
            <td className="px-3 py-2">{item.id}</td>
            <td className="px-3 py-2">{item.textPreview}</td>
            <td className="px-3 py-2">
              <Badge>{questionTypeLabel(item.type)}</Badge>
            </td>
            <td className="px-3 py-2">
              <Badge>{difficultyLabel(item.difficulty)}</Badge>
            </td>
            <td className="px-3 py-2">
              {item.id === currentQuestionId ? (
                <Badge>表示中</Badge>
              ) : (
                item.asked && <Badge>出題済み</Badge>
              )}
            </td>
            <td className="px-3 py-2">{item.hasImage && <Badge>画像あり</Badge>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// シンプルなラベル
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-border-soft px-3 py-1 text-admin-func-label whitespace-nowrap">
      {children}
    </span>
  )
}
