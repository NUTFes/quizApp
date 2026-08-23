import type { Choice } from '../../../types'

type Props = { choice: Choice; isCorrect?: boolean; type: string | null}

export function ChoiceCard({ choice, isCorrect = false, type }: Props) {
  const normalStyle = 'w-43.5 rounded-[18px] shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]'
  const correctStyle = ''
  const isRight = choice.id === 'B' || choice.id === 'D' ? 'ml-auto' : ''
  const isTwo = type === 'four_choice' ? 'h-33' : 'h-69'

  return (
    <div className={`${isCorrect ? correctStyle : normalStyle} ${isRight} ${isTwo}`}>
      <p className='flex justify-center items-center text-[14px] h-9 w-9 rounded-[10px] m-3 bg-amber-300'>{choice.id}</p>
      <p className='p-3 text-base text-left'>{choice.text}</p>
    </div>
  )
}
