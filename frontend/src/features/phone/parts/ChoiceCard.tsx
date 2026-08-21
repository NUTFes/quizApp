import type { Choice } from '../../../types'

type Props = { choice: Choice; isCorrect?: boolean }

export function ChoiceCard({ choice, isCorrect = false }: Props) {
  return (
    <div className={isCorrect ? '（正答のスタイル）' : '（通常のスタイル）'}>{choice.text}</div>
  )
}
