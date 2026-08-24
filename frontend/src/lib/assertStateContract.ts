import type { AdminState, MonitorState, ViewerState } from '../types'

type EventState = AdminState | MonitorState | ViewerState

const VALID_PHASES = ['waiting', 'question', 'answer', 'finished'] as const
const VALID_QUESTION_TYPES = ['four_choice', 'two_choice', 'arunashi', 'hayaoshi'] as const

const EXPECTED_CHOICE_COUNTS: Record<string, number> = {
  four_choice: 4,
  two_choice: 2,
  arunashi: 2,
  hayaoshi: 0,
}

/**
 * サーバーから受け取った EventState が仕様どおりか検証し、
 * 契約違反があれば console.warn を出力する。
 * （アプリをクラッシュさせないため例外は投げず、警告のみ行う）
 */
export function assertStateContract(
  state: EventState | null | undefined,
  view?: 'phone' | 'monitor' | 'admin',
): void {
  if (!state) return

  const errors: string[] = []
  // types/ を変更せず、存在しないプロパティへ安全にアクセスするためのオブジェクト化
  const rawState = state as Record<string, unknown>

  // -------------------------------------------------------------
  // 1. 共通チェック
  // -------------------------------------------------------------

  const isTimeLimitNull = state.timeLimitSec === null || state.timeLimitSec === undefined
  const isStartedAtNull = state.questionStartedAt === null || state.questionStartedAt === undefined
  if (isTimeLimitNull !== isStartedAtNull) {
    errors.push(
      `timeLimitSec (${state.timeLimitSec}) and questionStartedAt (${state.questionStartedAt}) must both be null or both have values.`,
    )
  }

  if (!VALID_PHASES.includes(state.phase as (typeof VALID_PHASES)[number])) {
    errors.push(`Unknown phase: "${state.phase}"`)
  }

  if (
    typeof state.askedCount !== 'number' ||
    state.askedCount < 0 ||
    !Number.isInteger(state.askedCount)
  ) {
    errors.push(`askedCount must be a non-negative integer. (got: ${state.askedCount})`)
  }

  if (!isTimeLimitNull && typeof state.timeLimitSec === 'number') {
    if (state.timeLimitSec < 5 || state.timeLimitSec > 120) {
      errors.push(`timeLimitSec must be between 5 and 120. (got: ${state.timeLimitSec})`)
    }
  }

  // -------------------------------------------------------------
  // 2. phase との整合
  // -------------------------------------------------------------

  if (state.phase === 'waiting' || state.phase === 'finished') {
    if (state.question !== null && state.question !== undefined) {
      errors.push(`question must be null when phase is "${state.phase}".`)
    }
    if (!isTimeLimitNull || !isStartedAtNull) {
      errors.push(`questionStartedAt and timeLimitSec must be null when phase is "${state.phase}".`)
    }
  }

  if (state.phase === 'question' || state.phase === 'answer') {
    if (state.question === null || state.question === undefined) {
      errors.push(`question must not be null when phase is "${state.phase}".`)
    }
  }

  if (state.phase === 'question') {
    if (rawState.answer !== null && rawState.answer !== undefined) {
      errors.push(`CRITICAL: answer must be null during "question" phase (data leak risk).`)
    }
  }

  if (state.phase === 'answer') {
    if (rawState.answer === null || rawState.answer === undefined) {
      errors.push(`answer must not be null when phase is "answer".`)
    }
  }

  // -------------------------------------------------------------
  // 3. question の中身
  // -------------------------------------------------------------

  if (state.question) {
    const q = state.question

    if (!VALID_QUESTION_TYPES.includes(q.type as (typeof VALID_QUESTION_TYPES)[number])) {
      errors.push(`Unknown question type: "${q.type}"`)
    } else {
      const expectedChoices = EXPECTED_CHOICE_COUNTS[q.type]
      const actualChoices = Array.isArray(q.choices) ? q.choices.length : -1
      if (actualChoices !== expectedChoices) {
        errors.push(
          `choices length for type "${q.type}" must be ${expectedChoices}. (got: ${actualChoices})`,
        )
      }
    }

    if (!Array.isArray(q.textSegments)) {
      errors.push(`textSegments must be an array.`)
    } else {
      if (q.type === 'hayaoshi' && view === 'phone' && q.textSegments.length > 0) {
        errors.push(`CRITICAL: textSegments must be empty for hayaoshi question on phone view.`)
      }
    }
  }

  // -------------------------------------------------------------
  // 4. 画面ごと
  // -------------------------------------------------------------

  if (
    view === 'monitor' &&
    (typeof rawState.joinUrl !== 'string' || (rawState.joinUrl as string).trim() === '')
  ) {
    errors.push(`joinUrl should not be empty on monitor view.`)
  }

  if (
    view === 'admin' &&
    typeof rawState.revealedSegments === 'number' &&
    typeof rawState.totalSegments === 'number'
  ) {
    if ((rawState.revealedSegments as number) > (rawState.totalSegments as number)) {
      errors.push(
        `revealedSegments (${rawState.revealedSegments}) cannot exceed totalSegments (${rawState.totalSegments}).`,
      )
    }
  }

  // -------------------------------------------------------------
  // 出力
  // --
  // -----------------------------------------------------------

  if (errors.length > 0) {
    console.warn(
      `[StateContractViolation] Detected ${errors.length} contract violation(s):\n` +
        errors.map((e) => `  - ${e}`).join('\n'),
      state,
    )
  }
}
