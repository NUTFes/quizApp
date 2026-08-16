import type { AdminState } from '../../../types'

export const adminWaiting: AdminState = {
  phase: 'waiting',
  serverTime: '2026-09-13T12:50:00+09:00',
  timeLimitSec: null,
  questionStartedAt: null,
  revealedSegments: 0,
  totalSegments: 0,
  askedCount: 0,
  question: null,
}