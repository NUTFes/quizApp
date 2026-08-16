import type { MonitorState } from '../../../types'

export const monitorAnswerAri: MonitorState = {
  phase: 'answer',
  serverTime: '2026-09-13T13:06:02+09:00',
  timeLimitSec: 30,
  questionStartedAt: '2026-09-13T13:05:00+09:00',
  askedCount: 3,
  joinUrl: 'https://quiz.example.jp/play',
  question: {
    number: 12,
    type: 'four_choice',
    textSegments: ['この問題文は', 'スラッシュ区切りで', '少しずつ表示される'],
    imageUrl: '/images/q5.png',
    choices: [
      { id: 'A', text: '選択肢A', imageUrl: null },
      { id: 'B', text: '選択肢B', imageUrl: null },
      { id: 'C', text: '選択肢C', imageUrl: '/images/q5-c.png' },
      { id: 'D', text: '選択肢D', imageUrl: null },
    ],
  },
  answer: { correctChoiceId: 'B', explanation: '解説文。無い問題では null' },
}

export const monitorAnswerNashi: MonitorState = {
  phase: 'answer',
  serverTime: '2026-09-13T13:06:02+09:00',
  timeLimitSec: 30,
  questionStartedAt: '2026-09-13T13:05:00+09:00',
  askedCount: 3,
  joinUrl: 'https://quiz.example.jp/play',
  question: {
    number: 12,
    type: 'four_choice',
    textSegments: ['この問題文は', 'スラッシュ区切りで', '少しずつ表示される'],
    imageUrl: '/images/q5.png',
    choices: [
      { id: 'A', text: '選択肢A', imageUrl: null },
      { id: 'B', text: '選択肢B', imageUrl: null },
      { id: 'C', text: '選択肢C', imageUrl: '/images/q5-c.png' },
      { id: 'D', text: '選択肢D', imageUrl: null },
    ],
  },
  answer: { correctChoiceId: 'B', explanation: null },
}