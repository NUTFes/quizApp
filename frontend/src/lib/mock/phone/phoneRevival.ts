import type { ViewerState } from '../../../types'

export const phoneRevivalVideo: ViewerState = {
  phase: 'revival-video',
  serverTime: '2026-09-13T14:00:00+09:00',
  timeLimitSec: null,
  questionStartedAt: null,
  askedCount: 8,
  question: null,
  answer: null,
}

export const phoneRevivalEntry: ViewerState = {
  ...phoneRevivalVideo,
  phase: 'revival-entry',
  serverTime: '2026-09-13T14:03:00+09:00',
}
