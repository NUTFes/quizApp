import { useId } from 'react'
import { QuestionListItem } from '../../../types'
import { ACTION_LABEL } from '../labels'

const MIN_SEC = 5
const MAX_SEC = 120

type Props = {
  selected: QuestionListItem | null // 未選択は null
  currentQuestionId: number | null // 今出している問題のid 今何も出してないなら null
  timeLimitInput: string // 入力欄の文字列
  busy: boolean
  onTimeLimitInputChange: (value: string) => void
  onSubmit: (questionId: number, timeLimitSec: number) => void
}

// 入力欄の文字列を検査 何もなければ null
export function checkTimeLimit(input: string): string | null {
  if (input.trim() === '') return `秒数を入れてください(${MIN_SEC} ~ ${MAX_SEC})`
  const sec = Number(input)
  if (!Number.isInteger(sec)) return '秒数は整数で入れてください'
  if (sec < MIN_SEC || sec > MAX_SEC) return `${MIN_SEC} ~ ${MAX_SEC} 秒の範囲で入れてください`
  return null
}

// 選んだ問題の出題
export function ShowQuestionForm({
  selected,
  currentQuestionId,
  timeLimitInput,
  busy,
  onTimeLimitInputChange,
  onSubmit,
}: Props) {
  const inputId = useId()
  const errorId = useId()
  const inputError = checkTimeLimit(timeLimitInput)
  const canSubmit = !busy && selected !== null && inputError === null

  return (
    <section>
      <h2>選択中の問題</h2>
      <p>問題一覧から１問選んでください</p>
      <form
        onSubmit={(e) => {
          e.preventDefault() //  何もせず送信したときの強制再リロードを防ぐ
          if (!canSubmit || selected === null) return // これ以降の行で、selected が nullでないことを見持して、TS の型チェックでのエラーを防ぐ
          onSubmit(selected.id, Number(timeLimitInput))
        }}
      >
        <div>
          <p>制限時間(秒)</p>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={MIN_SEC}
            max={MAX_SEC}
            step={1}
            value={timeLimitInput}
            disabled={busy}
            onChange={(e) => onTimeLimitInputChange(e.target.value)}
          />
        </div>
        <button type="submit" disabled={!canSubmit}>
          {ACTION_LABEL.showQuestion}
        </button>
      </form>
    </section>
  )
}
