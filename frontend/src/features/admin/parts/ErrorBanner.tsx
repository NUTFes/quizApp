import { ActionLabel } from '../labels'

export type OperationFailure = {
  // ボタン操作で失敗したとき、どのボタンが失敗したかの形式
  action: ActionLabel
  message: string
  occurreAt: Date
}

type Props = {
  failure: OperationFailure | null
  onDismiss: () => void
}


// ボタン操作（進行操作）失敗時の表示を行う
export function ErrorBanner({ failure, onDismiss}: Props) {
    // あらかじめ、エラー出力をする枠をおいておく
    if (failure == null) return <div className="min-h-16" />

    const time = failure.occurreAt.toLocaleTimeString('ja-JP', { hour12: false })

    return()
}