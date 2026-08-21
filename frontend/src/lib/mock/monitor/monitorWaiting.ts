import type { MonitorState } from '../../../types'

export const monitorWaiting: MonitorState = {
  phase: 'waiting',
  serverTime: '2026-09-13T12:50:00+09:00',
  timeLimitSec: null,
  questionStartedAt: null,
  askedCount: 0,
  joinUrl: 'https://quiz.example.jp/play',
  question: null,
  answer: null,
}
