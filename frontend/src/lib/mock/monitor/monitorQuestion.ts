import type { MonitorState } from '../../../types'

export const monitorQuestionFour: MonitorState = {
  phase: 'question',
  serverTime: '2026-09-13T13:05:10+09:00',
  timeLimitSec: 30,
  questionStartedAt: '2026-09-13T13:05:00+09:00',
  askedCount: 3,
  joinUrl: 'https://quiz.example.jp/play',
  question: {
    number: 12,
    type: 'four_choice',
    textSegments: ['この問題文は', 'スラッシュ区切りで'],
    imageUrl: '/images/q5.png',
    choices: [
      { id: 'A', text: '選択肢A', imageUrl: null },
      { id: 'B', text: '選択肢B', imageUrl: null },
      { id: 'C', text: '選択肢C', imageUrl: '/images/q5-c.png' },
      { id: 'D', text: '選択肢D', imageUrl: null },
    ],
  },
  answer: null,
}

export const monitorQuestionTwo: MonitorState = {
  phase: 'question',
  serverTime: '2026-09-13T13:05:10+09:00',
  timeLimitSec: 30,
  questionStartedAt: '2026-09-13T13:05:00+09:00',
  askedCount: 3,
  joinUrl: 'https://quiz.example.jp/play',
  question: {
    number: 12,
    type: 'two_choice',
    textSegments: ['この問題文は', 'スラッシュ区切りで'],
    imageUrl: '/images/q5.png',
    choices: [
      { id: 'A', text: '選択肢A', imageUrl: null },
      { id: 'B', text: '選択肢B', imageUrl: null },
    ],
  },
  answer: null,
}

export const monitorQuestionArunashi: MonitorState = {
  phase: 'question',
  serverTime: '2026-09-13T13:05:10+09:00',
  timeLimitSec: 30,
  questionStartedAt: '2026-09-13T13:05:00+09:00',
  askedCount: 3,
  joinUrl: 'https://quiz.example.jp/play',
  question: {
    number: 13,
    type: 'arunashi',
    textSegments: ['「ある」と「ない」に分かれています。', 'では「くつ」はどちらでしょう?'],
    imageUrl: null,
    choices: [
      { id: 'A', text: 'ある:ほん/はな/パン', imageUrl: null },
      { id: 'B', text: 'ない:つくえ/いす/まど', imageUrl: null },
    ],
  },
  answer: null,
}
