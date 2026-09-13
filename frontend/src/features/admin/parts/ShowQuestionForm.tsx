import { QuestionListItem } from '../../../types'

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
