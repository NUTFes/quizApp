import { useState } from 'react'
import { AdminState } from '../../../types'
import { RemainingTime } from './RemainingTime'
import { ACTION_LABEL } from '../labels'
import { ConfirmDialog } from './ConfirmDialog'

type Props = {
  state: AdminState
  remainingSec: number | null
  busy: boolean
  onAdvanceText: () => void
  onShowAnswer: () => void
  onReset: (to: 'waiting' | 'finished') => void
}

export function ControlPanel({
  state,
  remainingSec,
  busy,
  onAdvanceText,
  onShowAnswer,
  onReset,
}: Props) {
  const [confirmingAnswer, setConfirmingAnswer] = useState(false)
  const isQuestion = state.phase === 'question'
  // ダイアログの開いてるときにフェーズが変わったらこれは閉じる
  const dialogOpen = confirmingAnswer && isQuestion
  // ロック操作をして、排他的制御する
  const locked = busy || dialogOpen

  const canAdvance = isQuestion && state.revealedSegments < state.totalSegments

  return (
    <section className="w-full max-w-[440px] rounded-3xl border border-border-soft bg-surface px-6 py-4 font-zen-kaku-gothic-new">
      <header className="flex items-center justify-between">
        <h2 className="text-admin-header text-brand">操作パネル</h2>
        {busy && <p className="text-admin-func-label text-brand">送信中…</p>}
      </header>

      <RemainingTime phase={state.phase} remainingSec={remainingSec} />

      {/* 進行の2つ。当日いちばん押すので上に置く */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <ControlButton
          label={ACTION_LABEL.advanceText}
          disabled={locked || !canAdvance}
          onClick={onAdvanceText}
        />
        <ControlButton
          label={ACTION_LABEL.showAnswer}
          disabled={locked || !isQuestion}
          onClick={() => setConfirmingAnswer(true)}
        />
      </div>

      {/* 画面を切り替える2つ。進行ボタンと離して置き、見た目でも別グループにする。
          待機と終了は「会場に何が映るか」が違うので、行き先を文言で書く */}
      <div className="mt-6 border-t border-border-soft pt-4">
        <p className="text-sm">会場の画面を切り替える(出題済みの記録は消えます)</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <ControlButton
            label={ACTION_LABEL.resetWaiting}
            sub="まもなく始まります + 参加QR"
            disabled={locked || state.phase === 'waiting'}
            onClick={() => onReset('waiting')}
          />
          <ControlButton
            label={ACTION_LABEL.resetFinished}
            sub="終了メッセージ + アンケートQR"
            disabled={locked || state.phase === 'finished'}
            onClick={() => onReset('finished')}
          />
        </div>
      </div>

      {dialogOpen && (
        <ConfirmDialog
          title="正答を表示しますか?"
          message="モニタと参加者のスマホに、正答が表示されます。表示すると取り消せません。"
          confirmLabel="正答を表示する"
          onConfirm={() => {
            setConfirmingAnswer(false)
            onShowAnswer()
          }}
          onCancel={() => setConfirmingAnswer(false)}
        />
      )}
    </section>
  )
}

// 一つ一つのボタンをコンポーネント化
function ControlButton({
  label,
  sub,
  disabled,
  onClick,
}: {
  label: string
  sub?: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-brand px-4 py-3 text-admin-func-label text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
      {sub !== undefined && <span className="block text-xs font-normal">{sub}</span>}
    </button>
  )
}
