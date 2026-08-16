import type { Phase } from './phase'
import type { Question } from './question'

export type AdminState = {
  phase: Phase
  serverTime: string
  timeLimitSec: number | null
  questionStartedAt: string | null
  revealedSegments: number
  totalSegments: number
  askedCount: number
  question: Question | null
}
