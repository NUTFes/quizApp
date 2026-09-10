// APIが返す英語の値を、裏方が読む日本語に直すための対応表。
//
// サーバーは difficulty も type も英語のまま返す仕様(→ API仕様書 §4.1)なので、
// 日本語にするのはフロントの仕事。当日は焦って画面を見るので、
// 一覧にも状況表示にも英語を出さない。
import type { Difficulty, Phase, QuestionType } from '../../types'

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '簡単',
  normal: '普通',
  hard: '難しい',
}

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  four_choice: '4択',
  two_choice: '2択',
  arunashi: 'あるなし',
  hayaoshi: '早押し',
}

const PHASE_LABEL: Record<Phase, string> = {
  waiting: '待機中',
  question: '出題中',
  answer: '正答発表',
  finished: '終了',
}

// 知らない値が来ても画面を壊さず、受け取った値をそのまま出す。
// サーバーに問題形式が増えたときに、管理者画面だけ真っ白になるのを防ぐため。
export const difficultyLabel = (value: Difficulty): string => DIFFICULTY_LABEL[value] ?? value
export const questionTypeLabel = (value: QuestionType): string =>
  QUESTION_TYPE_LABEL[value] ?? value
export const phaseLabel = (value: Phase): string => PHASE_LABEL[value] ?? value
