import { QuestionType } from '../../../types'

type HeaderProps = {
  questionType: QuestionType
}

export function PhoneHeader({ questionType }: HeaderProps) {
  let questionTypeText
  switch (questionType) {
    case 'four_choice':
      questionTypeText = '4択'
      break
    case 'two_choice':
      questionTypeText = '〇×'
      break
    case 'arunashi':
      questionTypeText = 'あるなし'
      break
  }

  return (
    <header className="flex h-15 items-center bg-canvas shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
      <div className="h-full w-17 px-4 py-3">
        <img
          src=""
          alt="logo"
          className="flex h-full w-full justify-center rounded-[10px] bg-brand"
        />
      </div>
      <p className="flex justify-center py-2.5 text-header">45th Quiz</p>
      {questionTypeText != undefined && (
        <p className="ml-auto flex justify-center py-2.5 pr-4 text-header">{`${questionTypeText}クイズ`}</p>
      )}
    </header>
  )
}
