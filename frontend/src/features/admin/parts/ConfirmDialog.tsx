import { useEffect, useId, useRef } from 'react'

type Props = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// 操作を実行するか確認するダイアログの箱
export function ConfirmDialogCard({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const messageId = useId()

  // ダイアログが開いた直後は、連打で実行できないように、「やめる」を選択状態にする
  useEffect(() => {
    cancelRef.current?.focus({ preventScroll: true })
  }, [])
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
      className="w-full max-w-[480px] rounded-3xl bg-surface p-8 font-zen-kaku-gothic-new text-black shadow-xl"
    >
      <h2 id={titleId} className="text-admin-header text-brand">
        {title}
      </h2>
      <p id={messageId} className="mt-4 text-admin-func-label">
        {message}
      </p>
      {/* 「やめる」を先・大きく。焦って押すときに手前へ手が伸びるため */}
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button
          type="button"
          ref={cancelRef}
          onClick={onCancel}
          className="min-w-40 flex-1 rounded-xl bg-brand px-6 py-4 text-admin-func-label-l text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          やめる
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-xl border-2 border-red-700 px-4 py-2 text-admin-func-label text-red-700"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

// ポップアップの範囲外は押せなくする。
//
// <div> の幕ではなく、ブラウザ標準の <dialog> + showModal() を使う。
// これだけで「開いている間はTabが背面に抜けない(フォーカストラップ)」
// 「背面はクリックできない」をブラウザが保証してくれる。自前で実装すると
// フォーカス可能な要素を自分で探して回す処理が要り、かえって複雑になる。
export function ConfirmDialog(props: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    dialog.showModal()
    // アンマウント時(=正答を表示 or やめる、で閉じたとき)の後始末。
    // 既に閉じている場合の close() は何もしないので、呼んでも問題ない
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="border-0 bg-transparent p-4 backdrop:bg-black/50"
      // Escキー(ブラウザ標準の「閉じる」操作)を、キャンセル操作に合わせる
      onCancel={(e) => {
        e.preventDefault() // 標準の close() だと state と食い違うので、onCancel 経由に統一する
        props.onCancel()
      }}
    >
      <ConfirmDialogCard {...props} />
    </dialog>
  )
}
