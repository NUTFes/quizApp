import type { AdminState } from '../../../types'

export const adminAnswerAri: AdminState = {
  phase: 'answer',
  serverTime: '2026-09-13T13:05:40+09:00',
  timeLimitSec: 30,
  questionStartedAt: '2026-09-13T13:05:00+09:00',
  revealedSegments: 2,
  totalSegments: 3,
  askedCount: 3,
  question: {
    id: 5,
    number: 12,
    type: 'four_choice',
    difficulty: 'hard',
    textSegments: ['この問題文は', 'スラッシュ区切りで', '少しずつ表示される'],
    imageUrl: '/images/q5.png',
    choices: [
      { id: 'A', text: '選択肢A', imageUrl: null },
      { id: 'B', text: '選択肢B', imageUrl: null },
      { id: 'C', text: '選択肢C', imageUrl: '/images/q5-c.png' },
      { id: 'D', text: '選択肢D', imageUrl: null },
    ],
    correctChoiceId: 'B',
    explanation: 'うしろに「屋」をつけると、お店の名前になります(本屋・花屋・パン屋・靴屋)。',
    asked: true,
  },
}

export const adminAnswerNashi: AdminState = {
  phase: 'answer',
  serverTime: '2026-09-13T13:05:40+09:00',
  timeLimitSec: 30,
  questionStartedAt: '2026-09-13T13:05:00+09:00',
  revealedSegments: 2,
  totalSegments: 2,
  askedCount: 3,
  question: {
    id: 4,
    number: 13,
    type: 'arunashi',
    difficulty: 'hard',
    textSegments: ['「ある」と「ない」に分かれています。', 'では「くつ」はどちらでしょう?'],
    imageUrl: null,
    choices: [
      { id: 'A', text: 'ある:ほん/はな/パン', imageUrl: null },
      { id: 'B', text: 'ない:つくえ/いす/まど', imageUrl: null },
    ],
    correctChoiceId: 'A',
    explanation: null,
    asked: true,
  },
}
