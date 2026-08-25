import { useViewerState } from '../../lib/useEventState'
import { WaitingView } from './WaitingView'
import { QuestionView } from './QuestionView'
import { FinishedView } from './FinishedView'
import { AnswerView } from './AnswerView'
import { LoadingView } from './LoadingView'

function PhonePage() {
  const state = useViewerState()

  if (state === null) return <LoadingView />

  switch (state.phase) {
    case 'waiting':
      return <WaitingView />
    case 'question':
      return <QuestionView state={state} />
    case 'answer':
      return <AnswerView state={state} />
    case 'finished':
      return <FinishedView />
  }
}

export default PhonePage
