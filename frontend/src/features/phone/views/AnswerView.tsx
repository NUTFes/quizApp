// 回答表示画面
import { ViewerState } from '../../../types'
import { AnswerText } from '../parts/AnswerText'
import { QuestionLayout } from '../parts/QuestionLayout'
import { LoadingView } from './LoadingView'

type props = { state: ViewerState }

export function AnswerView({ state }: props) {
  if (state.question === null) return <LoadingView />
  const explanation = state.answer?.explanation
  const answer = state.answer?.correctChoiceId
  const correctChoice = state.question.choices.find((choice) => choice.id === answer)

  return (
    <QuestionLayout
      state={state}
      status="answer"
      remainingTime={0}
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
