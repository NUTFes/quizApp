import type { Phase } from './phase'
import type { ViewerQuestion } from './viewerQuestion'

export type ViewerState = {
  phase: Phase
  serverTime: string
  timeLimitSec: number | null
  questionStartedAt: string | null
  askedCount: number
  question: ViewerQuestion | null
  answer: {
    correctChoiceId: string | null
    explanation: string | null
  } | null
}
