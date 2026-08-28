import type { MonitorState } from '../../../types'

// 早押し形式のモック。
//
// 早押しは選択肢を持たない(→ lib/assertStateContract.ts の EXPECTED_CHOICE_COUNTS)。
// そのため正解は answer.explanation に入る前提で組んである。
// textSegments は「表示済みセグメントだけ」が入る(→ API仕様書 §2.2.2 原則1)ので、
// 読み上げ途中の状態は配列を短くすることで再現する。

export const monitorQuestionHayaoshi: MonitorState = {
  phase: 'question',
  serverTime: '2026-09-13T13:05:10+09:00',
  timeLimitSec: 30,
  questionStartedAt: '2026-09-13T13:05:00+09:00',
  askedCount: 5,
  joinUrl: 'https://quiz.example.jp/play',
  question: {
    number: 21,
    type: 'hayaoshi',
    textSegments: ['長岡技術科学大学が', '開学したのは'],
    imageUrl: null,
    choices: [],
  },
  answer: null,
}

export const monitorAnswerHayaoshi: MonitorState = {
  phase: 'answer',
  serverTime: '2026-09-13T13:06:02+09:00',
  timeLimitSec: 30,
  questionStartedAt: '2026-09-13T13:05:00+09:00',
  askedCount: 5,
  joinUrl: 'https://quiz.example.jp/play',
  question: {
    number: 21,
    type: 'hayaoshi',
    textSegments: ['長岡技術科学大学が', '開学したのは', '西暦何年?'],
    imageUrl: null,
    choices: [],
  },
  answer: { correctChoiceId: null, explanation: '1976年' },
}
