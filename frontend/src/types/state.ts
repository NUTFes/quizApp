import { Phase } from "./phase"
import { Question } from "./question"

export type State = {
  phase: Phase,
  serverTime: string,
  timeLimitSec: number,
  questionStartedAt: string | null,
  revealedSegments: number,
  totalSegments: number,
  askedCount: number,
  question: Question | null
}