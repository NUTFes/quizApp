import { AdminState } from '../../../types'

type Props = {
  state: AdminState
  remaining: number | null
  busy: boolean
  onAdvanceText: () => void
  onShownAnswer: () => void
  onReset: (to: 'waiting' | 'finished') => void
}
