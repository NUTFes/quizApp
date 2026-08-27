// 回答表示画面
import { ViewerState } from '../../../types'
import { AnswerText } from '../parts/AnswerText'
import { QuestionLayout } from '../parts/QuestionLayout'

type props = { state: ViewerState | null }

export function AnswerView({ state }: props) {
  if (state === null) return null
  if (state.question === null) return null
  const explanation = state.answer?.explanation
  const answer = state.answer?.correctChoiceId
  const correctChoice = state.question.choices.find((choice) => choice.id === answer)

  return (
    <QuestionLayout
      state={state}
      statusStyle={'bg-live'}
      statusText={'正解発表'}
      footMessage="次の問題までその場でお待ちください"
    >
      <AnswerText
        correctText={correctChoice?.text ?? null}
        explanation={explanation ?? null}
        correctId={answer ?? null}
      />
    </QuestionLayout>
  )
}
