import type { Choice, QuestionType } from '../../../types'
import maru from '../../../assets/maru.svg'
import batsu from '../../../assets/batsu.svg'

type Props = { choice: Choice; isCorrect?: boolean; type: QuestionType }

export function ChoiceCard({ choice, isCorrect = false, type }: Props) {
  const normalStyle =
    'w-full rounded-[18px] border border-border-soft bg-surface shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]'
  const correctStyle =
    'w-full rounded-[18px] border border-border-soft bg-info shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]'
  const choiceColorStyle: Record<string, string> = {
    A: 'bg-choice-a',
    B: 'bg-choice-b',
    C: 'bg-choice-c',
    D: 'bg-choice-d',
  }
  const choiceIdStyle = isCorrect
    ? 'bg-brand text-surface'
    : `${choiceColorStyle[choice.id] ?? 'bg-choice-a'} text-brand`
  const isTwo = type === 'four_choice' ? 'min-h-33' : 'min-h-69'

  if (type === 'arunashi') {
    return (
      <div className={`${isCorrect ? correctStyle : normalStyle} ${isTwo}`}>
        <p
          className={`mt-12 flex items-center justify-center px-10 pt-10 pb-16 text-arunashi-label ${choice.id === 'A' ? 'text-maru' : 'text-batsu'}`}
        >
          {choice.id === 'A' ? 'ある' : 'なし'}
        </p>
        <p className="p-4 pb-7.5 text-center text-choice-arunashi-example text-brand">
          {choice.text}
        </p>
      </div>
    )
  }

  if (type === 'two_choice') {
    // 選択肢画像が入稿されていればそれを出し、無ければ ○× の既定画像にフォールバックする
    return (
      <div className={`${isCorrect ? correctStyle : normalStyle} ${isTwo}`}>
        <p className="mt-12 flex items-center justify-center px-10 pt-10 pb-16">
          <img
            src={choice.imageUrl ?? (choice.id === 'A' ? maru : batsu)}
            alt={choice.imageUrl !== null ? choice.text : ''}
            className={`object-contain ${choice.imageUrl === null && choice.id === 'B' ? 'size-20' : 'size-19'}`}
          />
        </p>
      </div>
    )
  }

  return (
    <div className={`${isCorrect ? correctStyle : normalStyle} ${isTwo}`}>
      <p
        className={`m-3 flex h-9 w-9 items-center justify-center rounded-[10px] text-choice-id ${choiceIdStyle}`}
      >
        {choice.id}
      </p>
      <p className="p-3 text-left text-choice-body text-brand">{choice.text}</p>
    </div>
  )
}
