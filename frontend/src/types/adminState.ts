import { Phase } from "./phase"
import { Question } from "./question"

export type AdminState = {
  phase: Phase,
  serverTime: string,
  timeLimitSec: number | null,
  questionStartedAt: string | null,
  revealedSegments: number,
  totalSegments: number,
  askedCount: number,
  question: Question | null
}