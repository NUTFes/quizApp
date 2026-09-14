import { useId } from 'react'
import { QuestionListItem } from '../../../types'
import { ACTION_LABEL, difficultyLabel, questionTypeLabel } from '../labels'

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
    <section className="flex w-full max-w-[440px] flex-col gap-4 rounded-3xl border border-border-soft bg-surface px-6 py-4 font-zen-kaku-gothic-new">
      <h2 className="text-admin-header text-brand">選択中の問題</h2>

      {selected === null ? (
        <p className="flex justify-center text-admin-func-label text-neutral-500">
          問題一覧から１問選んでください
        </p>
      ) : (
        <div className="text-admin-func-label">
          <p>
            ID {selected.id} / {questionTypeLabel(selected.type)} /{' '}
            {difficultyLabel(selected.difficulty)}
          </p>
          <p className="[overflow-wrap:anywhere]">{selected.textPreview}</p>
          {selected.id === currentQuestionId ? (
            <p className="text-sm text-red-700">
              出題中の問題を最初からやり直します(タイマーも戻ります)
            </p>
          ) : (
            selected.asked && <p className="text-sm text-red-700">出題済みの問題です</p>
          )}
        </div>
      )}

      {/* 入力フォームとボタンに、それぞれ1:1の領域を配って、その中で中央に置く */}
      <form
        className="grid grid-cols-2 items-center px-5 py-5"
        onSubmit={(e) => {
          e.preventDefault() //  何もせず送信したときの強制再リロードを防ぐ
          if (!canSubmit || selected === null) return // これ以降の行で、selected が nullでないことを保証して、TS の型チェックでのエラーを防ぐ
          onSubmit(selected.id, Number(timeLimitInput))
        }}
      >
        <div className="flex justify-center">
          <div className="relative flex w-40 justify-center pt-6 pb-8">
            {/* 入力欄の幅に左右されず、常に中央上に固定する */}
            <label htmlFor={inputId} className="absolute inset-x-0 top-0 text-center text-sm">
              制限時間(秒)
            </label>
            <input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={MIN_SEC}
              max={MAX_SEC}
              step={1}
              value={timeLimitInput}
              disabled={busy}
              aria-invalid={inputError !== null}
              aria-describedby={inputError === null ? undefined : errorId}
              onChange={(e) => onTimeLimitInputChange(e.target.value)}
              className={`w-24 rounded-lg border px-3 py-2 text-center ${inputError === null ? 'border-border-soft' : 'border-red-700'}`}
            />
            {/* absolute なので、エラー文の有無・行数でボタンの位置が動かない */}
            <p
              id={errorId}
              className="absolute inset-x-0 top-[calc(100%+4px)] text-center text-sm text-red-700"
            >
              {inputError}
            </p>
          </div>
        </div>
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-brand px-6 py-3 text-admin-func-label text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {ACTION_LABEL.showQuestion}
          </button>
        </div>
      </form>
    </section>
  )
}
