import batsu from '../../../assets/batsu.svg'
import maru from '../../../assets/maru.svg'
import type { Choice, QuestionType } from '../../../types'

type Props = { choice: Choice; isCorrect?: boolean; type: QuestionType }

export function ChoiceCard({ choice, isCorrect = false, type }: Props) {
  const cardStyle = `relative h-full w-full overflow-hidden rounded-[26px] border-2 border-border-soft shadow-[0_10px_28px_0_rgba(25,32,133,0.1)] ${
    isCorrect ? 'bg-info' : 'bg-surface'
  }`
  const choiceColorStyle: Record<string, string> = {
    A: 'bg-choice-a',
    B: 'bg-choice-b',
    C: 'bg-choice-c',
    D: 'bg-choice-d',
  }
  const choiceIdStyle = isCorrect
    ? 'bg-brand text-surface'
    : `${choiceColorStyle[choice.id] ?? 'bg-choice-a'} text-brand`

  if (type === 'arunashi') {
    const label = choice.id === 'A' ? 'ある' : 'なし'
    const example = choice.text.replace(/^(ある|なし)[:：]/, '').replace(/\//g, '、')

    return (
      <div className={`${cardStyle} flex flex-col items-center px-10`}>
        <CorrectBadge isVisible={isCorrect} />
        <p
          className={`mt-50 text-p-arunashi-label ${choice.id === 'A' ? 'text-maru' : 'text-batsu'}`}
        >
          {label}
        </p>
        <p className="mt-12 text-center text-p-choice-arunashi-example text-brand">{example}</p>
      </div>
    )
  }

  if (type === 'two_choice') {
    // 選択肢画像が入稿されていればそれを出し、無ければ ○× の既定画像にフォールバックする
    return (
      <div className={`${cardStyle} flex items-center justify-center px-10`}>
        <CorrectBadge isVisible={isCorrect} />
        <div className="flex flex-col items-center gap-12">
          <img
            src={choice.imageUrl ?? (choice.id === 'A' ? maru : batsu)}
            alt={choice.imageUrl !== null ? choice.text : choice.id === 'A' ? '○' : '×'}
            className="size-[200px] object-contain"
          />
          <p className="text-p-area-label">{choice.id === 'A' ? '左エリア' : '右エリア'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${cardStyle} flex items-center gap-10 px-10`}>
      <div className="flex h-full w-[120px] shrink-0 flex-col items-center">
        <div className="flex flex-1 items-center justify-center">
          <CorrectBadge isVisible={isCorrect} className="" />
        </div>
        <p
          className={`flex size-[120px] items-center justify-center rounded-[18px] text-p-choice-id shadow-[0_10px_14px_0_rgba(25,32,133,0.1)] ${choiceIdStyle}`}
        >
          {choice.id}
        </p>
        <div className="flex-1" />
      </div>
      <p className="min-w-0 flex-1 text-p-choice-body text-brand">{choice.text}</p>
    </div>
  )
}

type CorrectBadgeProps = {
  isVisible: boolean
  className?: string
}

function CorrectBadge({ isVisible, className = 'absolute top-6 left-10' }: CorrectBadgeProps) {
  // 前回(text-p-count-number相当)が大きすぎたため、0.7×0.7(30%を2段階)で縮小。
  // ぴったり合うトークンが無いため、フォントサイズだけ直書きの値にしている。
  return (
    <span
      className={`${className} flex h-14 w-26 items-center justify-center rounded-[17px] bg-live text-[27px] leading-none font-bold text-brand shadow-[0_6px_8px_0_rgba(25,32,133,0.08)] ${
        isVisible ? 'visible' : 'invisible'
      }`}
    >
      正解
    </span>
  )
}
