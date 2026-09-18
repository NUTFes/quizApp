import type { AdminState, MonitorState, ViewerState } from '../../types'

type PreviewTarget = 'monitor' | 'phone'

// 管理者には未公開の問題文や正答も届くため、そのままプレビューへ渡してはいけない。
// 公開画面へ実際に配信される ViewerState と同じ形まで削ってから、既存の表示部品へ渡す。
export function toViewerPreviewState(state: AdminState, target: PreviewTarget): ViewerState {
  // 不正な負数を slice に渡すと末尾から数えられ、未公開文が見えてしまうため0以上へ丸める。
  const revealedSegments = Math.max(0, state.revealedSegments)
  const question =
    state.question === null
      ? null
      : {
          number: state.question.number,
          type: state.question.type,
          textSegments:
            target === 'phone' && state.question.type === 'hayaoshi'
              ? []
              : state.question.textSegments.slice(0, revealedSegments),
          imageUrl: state.question.imageUrl,
          choices: state.question.choices,
        }

  return {
    phase: state.phase,
    serverTime: state.serverTime,
    timeLimitSec: state.timeLimitSec,
    questionStartedAt: state.questionStartedAt,
    askedCount: state.askedCount,
    question,
    answer:
      state.phase === 'answer' && state.question !== null
        ? {
            correctChoiceId: state.question.correctChoiceId,
            explanation: state.question.explanation,
          }
        : null,
  }
}

export function toMonitorPreviewState(state: AdminState, joinUrl: string): MonitorState {
  return { ...toViewerPreviewState(state, 'monitor'), joinUrl }
}
