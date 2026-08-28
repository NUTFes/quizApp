import { useMonitorState } from '../../lib/useEventState'
import { WaitingView } from './views/WaitingView'
import { QuestionView } from './views/QuestionView'
import { FinishedView } from './views/FinishedView'
import { AnswerView } from './views/AnswerView'
import { LoadingView } from './views/LoadingView'

function MonitorPage() {
  const state = useMonitorState()

  if (state === null) return <LoadingView />

  switch (state.phase) {
    case 'waiting':
      return <WaitingView state={state} />
    case 'question':
      return <QuestionView state={state} />
    case 'answer':
      return <AnswerView state={state} />
    case 'finished':
      return <FinishedView state={state} />
    default:
      return <LoadingView />
  }
}

export default MonitorPage
