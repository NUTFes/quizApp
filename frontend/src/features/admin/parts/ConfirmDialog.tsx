import { useEffect, useId, useRef } from "react"

type Props = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// 操作を実行するか確認するダイアログの箱
export function ConfirmDialogCard({title, message, confirmLabel, onConfirm, onCancel}:  Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const messageId = useId()

  // ダイアログが開いた直後は、連打で実行できないように、「やめる」を選択状態にする
  useEffect (() => {
    cancelRef.current?.focus({ preventScroll: true})
  }, [])
  return ()
}