import type { QuestionListItem } from '../../../types'
import { difficultyLabel, questionTypeLabel } from '../labels'

type Props = {
  items: QuestionListItem[]
  // 今この画面で選んでいる問題(まだ出題はしていない)
  selectedId: number | null
  onSelect: (id: number) => void
  // 今モニタに出ている問題。選択中とは別物なので分けて受け取る
  currentQuestionId: number | null
  disabled: boolean
}

// 問題一覧。ここから1問選び、ShowQuestionForm で出題する。
//
// 「次へ」ではなく「この問題を出す」と指定する方式なので、
// 二度押ししても同じ問題が出るだけで事故らない(→ 画面・要件.md §6)。
export function QuestionList({ items, selectedId, onSelect, currentQuestionId, disabled }: Props) {
  if (items.length === 0) {
    return <p>問題がまだ投入されていません。</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th></th>
          <th>番号</th>
          <th>形式</th>
          <th>難易度</th>
          <th>問題文</th>
          <th>画像</th>
          <th>状態</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            // 出題済みは薄くする。当日「もう出した問題」を潰しながら進めるため
            className={item.asked ? 'opacity-60' : undefined}
          >
            <td>
              <label>
                <input
                  type="radio"
                  name="question"
                  value={item.id}
                  checked={selectedId === item.id}
                  disabled={disabled}
                  onChange={() => onSelect(item.id)}
                />
                選ぶ
              </label>
            </td>
            <td>{item.number}</td>
            <td>{questionTypeLabel(item.type)}</td>
            <td>{difficultyLabel(item.difficulty)}</td>
            <td>{item.textPreview}</td>
            <td>{item.hasImage ? 'あり' : ''}</td>
            <td>
              {/* 今出ている問題は、出題済みより先に表示する(裏方が探すのはまずこれ) */}
              {item.id === currentQuestionId ? '表示中' : item.asked ? '出題済み' : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
