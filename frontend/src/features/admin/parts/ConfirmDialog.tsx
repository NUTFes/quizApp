import { useEffect, useRef } from 'react'

type Props = {
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// 取り返しのつかない操作の前に挟む確認。
//
// 付けるのは「正答を表示」と「クイズを終了する」だけ。全部のボタンに付けると
// 裏方が読まずに押すようになり、確認の意味が消える(→ 実装手順書 §6)。
export function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // 開いた直後は「やめる」に焦点を置く。連打の勢いで実行に当たらないようにするため
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div role="dialog" aria-modal="true" aria-label={message}>
      <p>{message}</p>
      {/* 「やめる」を先に置く。焦って押すときに手前へ手が伸びるため */}
      <button type="button" ref={cancelRef} onClick={onCancel}>
        やめる
      </button>
      <button type="button" onClick={onConfirm}>
        {confirmLabel}
      </button>
    </div>
  )
}
