import { Phase } from './phase'
import { ViewerQuestion } from './viewerQuesition'

export type ViewerState = {
  phase: Phase
  serverTime: string
  timeLimitSec: number | null
  questionStartedAt: string | null
  askedCount: number
  question: ViewerQuestion | null
  answer: {
    correctChoiceId: string
    explanation: string | null
  } | null
}
