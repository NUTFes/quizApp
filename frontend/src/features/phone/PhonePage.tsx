import { useViewerState } from '../../lib/useEventState'
import { WaitingView } from './views/WaitingView'
import { QuestionView } from './views/QuestionView'
import { FinishedView } from './views/FinishedView'
import { AnswerView } from './views/AnswerView'
import { LoadingView } from './views/LoadingView'

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
    default:
      return <LoadingView />
  }
}

export default PhonePage
