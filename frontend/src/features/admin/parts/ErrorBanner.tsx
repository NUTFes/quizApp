import { ActionLabel } from '../labels'

export type OperationFailure = {
  // ボタン操作で失敗したとき、どのボタンが失敗したかの形式
  action: ActionLabel
  message: string
  occurredAt: Date
}

type Props = {
  failure: OperationFailure | null
  onDismiss: () => void
}

// ボタン操作（進行操作）失敗時の表示を行う
export function ErrorBanner({ failure, onDismiss }: Props) {
  // あらかじめ、エラー出力をする枠をおいておく
  if (failure == null) return <div className="min-h-16" />

  const time = failure.occurredAt.toLocaleTimeString('ja-JP', { hour12: false })

  return (
    <div
      role="alert"
      className="flex min-h-16 items-start justify-between gap-4 rounded-2xl border-2 border-red-700 bg-red-50 px-5 py-3 font-zen-kaku-gothic-new text-red-900"
    >
      <div>
        <p className="text-admin-func-label">
          「{failure.action}」に失敗しました
          <span className="ml-3 text-sm font-normal">{time}</span>
        </p>
        <p className="text-sm font-bold">{failure.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg border border-red-700 px-3 py-1 text-sm"
      >
        閉じる
      </button>
    </div>
  )
}
