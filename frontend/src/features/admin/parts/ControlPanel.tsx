import { useState } from 'react'
import type { AdminState } from '../../../types'
import { ConfirmDialog } from './ConfirmDialog'

// 確認を挟む操作。取り返しがつかない2つだけに付ける
type Confirming = 'show-answer' | 'reset-finished' | null

type Props = {
  state: AdminState
  busy: boolean
  onAdvanceText: () => void
  onShowAnswer: () => void
  onReset: (to: 'waiting' | 'finished') => void
}

// 進行の操作ボタン。
//
// 押せない操作はサーバーが 409 INVALID_PHASE で弾くが、当日は
// 「押したのに何も起きない」が一番混乱するので、押せないものは押せなくしておく。
export function ControlPanel({ state, busy, onAdvanceText, onShowAnswer, onReset }: Props) {
  const [confirming, setConfirming] = useState<Confirming>(null)
  const isQuestionPhase = state.phase === 'question'
  // 全部公開済みならこれ以上は進まない(サーバー側も上限で止める)
  const canAdvanceText = isQuestionPhase && state.revealedSegments < state.totalSegments

  return (
    <section>
      <h2>進行</h2>
      <button
        type="button"
        name="advance-text"
        onClick={onAdvanceText}
        disabled={busy || !canAdvanceText}
      >
        問題文を進める
      </button>
      <button
        type="button"
        name="show-answer"
        onClick={() => setConfirming('show-answer')}
        disabled={busy || !isQuestionPhase}
      >
        正答を表示
      </button>
      {/* 既定は waiting。finished は進行が終わる操作なので、並びを分けて誤爆を減らす */}
      <button
        type="button"
        name="reset-waiting"
        onClick={() => onReset('waiting')}
        disabled={busy || state.phase === 'waiting'}
      >
        待機画面に戻す
      </button>
      <button
        type="button"
        name="reset-finished"
        onClick={() => setConfirming('reset-finished')}
        disabled={busy || state.phase === 'finished'}
      >
        クイズを終了する
      </button>
      {busy && <span>処理中...</span>}
      {confirming === 'show-answer' && (
        <ConfirmDialog
          message="正答をモニタとスマホに表示します。よろしいですか?"
          confirmLabel="正答を表示する"
          onConfirm={() => {
            setConfirming(null)
            onShowAnswer()
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === 'reset-finished' && (
        <ConfirmDialog
          message="クイズを終了し、全端末を終了画面に切り替えます。よろしいですか?"
          confirmLabel="終了する"
          onConfirm={() => {
            setConfirming(null)
            onReset('finished')
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </section>
  )
}
