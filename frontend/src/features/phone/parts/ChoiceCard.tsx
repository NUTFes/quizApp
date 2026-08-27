import type { Choice } from '../../../types'

type Props = { choice: Choice; isCorrect?: boolean; type: string | null }

export function ChoiceCard({ choice, isCorrect = false, type }: Props) {
  const normalStyle = 'w-full rounded-[18px] shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]'
  const correctStyle =
    'w-full rounded-[18px] shadow-[0_6px_16px_0_rgba(25,32,133,0.08)] bg-blue-200'
  const isRight = choice.id === 'B' || choice.id === 'D' ? 'ml-auto' : ''
  const isTwo = type === 'four_choice' ? 'h-33' : 'h-69'

  if (type === 'arunashi') {
    return (
      <div className={`${isCorrect ? correctStyle : normalStyle} ${isRight} ${isTwo}`}>
        <p
          className={`mt-12 flex items-center justify-center px-10 pt-10 pb-16 text-[40px] ${choice.id === 'A' ? 'text-red-600' : 'text-blue-500'}`}
        >
          {choice.id === 'A' ? 'ある' : 'なし'}
        </p>
        <p className="p-4 pb-7.5 text-center text-xs">{choice.text}</p>
      </div>
    )
  }

  return (
    <div className={`${isCorrect ? correctStyle : normalStyle} ${isRight} ${isTwo}`}>
      <p className="m-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-amber-300 text-[14px]">
        {choice.id}
      </p>
      <p className="p-3 text-left text-base">{choice.text}</p>
    </div>
  )
}
