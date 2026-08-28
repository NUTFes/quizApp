import { useState } from 'react'
import type { QuestionListItem } from '../../../types'
import { difficultyLabel, questionTypeLabel } from '../labels'

type Props = {
  // 一覧で選んでいる問題。未選択なら null
  selected: QuestionListItem | null
  onSubmit: (id: number, timeLimitSec?: number) => void
  disabled: boolean
}

// 選んだ問題を出題するフォーム。制限時間は任意指定。
export function ShowQuestionForm({ selected, onSubmit, disabled }: Props) {
  const [timeLimitInput, setTimeLimitInput] = useState<string>('')

  const handleSubmit = () => {
    if (selected === null) return
    // 空欄のときは第2引数を省いて呼ぶ。0 を送るとサーバーに弾かれる(範囲は5〜120)
    const sec = timeLimitInput === '' ? undefined : Number(timeLimitInput)
    onSubmit(selected.id, sec)
  }

  return (
    <div>
      <p>
        選択中 :{' '}
        {selected === null
          ? '未選択(一覧から1問選んでください)'
          : `第${selected.number}問 / ${questionTypeLabel(selected.type)} / ${difficultyLabel(selected.difficulty)} / ${selected.textPreview}`}
      </p>
      <label>
        制限時間(秒・空欄なら30秒) :
        <input
          type="number"
          name="time-limit-sec"
          min={5}
          max={120}
          value={timeLimitInput}
          disabled={disabled}
          onChange={(e) => setTimeLimitInput(e.target.value)}
        />
      </label>
      {/* 一覧から選んで出す方式なので、二度押ししても同じ問題が出るだけで事故らない */}
      <button
        type="button"
        name="show-question"
        onClick={handleSubmit}
        disabled={disabled || selected === null}
      >
        {disabled ? '処理中...' : 'この問題を出す'}
      </button>
    </div>
  )
}
