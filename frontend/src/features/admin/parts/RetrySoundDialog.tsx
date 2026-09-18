import { useEffect, useId, useRef } from 'react'

type Props = {
  onWithSound: () => void
  onWithoutSound: () => void
  onClose: () => void
}

// 同じ問題をやり直すときだけ使う、音の有無を選ぶダイアログ。
// 正答確認は事故を止める警告だが、こちらはどちらを選んでも安全な選択なので、
// 警告色・ボタンの大小・文言を ConfirmDialog と意図的に変えている。
export function RetrySoundDialogCard({ onWithSound, onWithoutSound, onClose }: Props) {
  const titleId = useId()
  const messageId = useId()
  const withoutSoundRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    withoutSoundRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
      className="w-full max-w-[520px] rounded-3xl border-4 border-amber-400 bg-amber-50 p-8 font-zen-kaku-gothic-new text-amber-950 shadow-xl"
    >
      <p className="text-sm font-bold tracking-wide text-amber-800">同じ問題をやり直します</p>
      <h2 id={titleId} className="mt-2 text-admin-header">
        出題の音を出しますか?
      </h2>
      <p id={messageId} className="mt-4 text-admin-func-label">
        どちらを選んでも、問題は最初から出題されます。
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4">
        <button
          type="button"
          ref={withoutSoundRef}
          onClick={onWithoutSound}
          className="rounded-xl border-2 border-amber-700 bg-white px-4 py-4 text-admin-func-label font-bold text-amber-900 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          音を出さない
        </button>
        <button
          type="button"
          onClick={onWithSound}
          className="rounded-xl bg-amber-600 px-4 py-4 text-admin-func-label font-bold text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        >
          音を出す
        </button>
      </div>
    </div>
  )
}

export function RetrySoundDialog(props: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="border-0 bg-transparent p-4 backdrop:bg-black/35"
      onCancel={(event) => {
        event.preventDefault()
        props.onClose()
      }}
    >
      <RetrySoundDialogCard {...props} />
    </dialog>
  )
}
