import { REVIVAL_URL } from '../../lib/config'
import { useViewerState } from '../../lib/useEventState'
import { WaitingView } from './views/WaitingView'
import { QuestionView } from './views/QuestionView'
import { FinishedView } from './views/FinishedView'
import { AnswerView } from './views/AnswerView'
import { LoadingView } from './views/LoadingView'
import { RevivalEntryView } from './views/RevivalEntryView'
import { RevivalVideoView } from './views/RevivalVideoView'

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
    case 'revival-video':
      return <RevivalVideoView />
    case 'revival-entry':
      return <RevivalEntryView revivalUrl={REVIVAL_URL} />
    case 'finished':
      return <FinishedView />
    default:
      return <LoadingView />
  }
}

export default PhonePage
