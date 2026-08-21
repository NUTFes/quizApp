import { useViewerState } from '../../lib/useEventState'

function PhonePage() {
  const state = useViewerState()
  return <pre>{JSON.stringify(state, null, 2)}</pre>
}

export default PhonePage