import { useId } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

type Props = {
  file: File | null
  busy: boolean
  disabled: boolean
  confirming: boolean
  error: string | null
  videoUrl: string | null
  onFileChange: (file: File | null) => void
  onSubmit: () => void
  onConfirm: () => void
  onCancel: () => void
}

// 敗者復活動画の投入パネル。通信やトークン参照はせず、propsだけで描画する。
export function RevivalVideoPanel({
  file,
  busy,
  disabled,
  confirming,
  error,
  videoUrl,
  onFileChange,
  onSubmit,
  onConfirm,
  onCancel,
}: Props) {
  const inputId = useId()
  const locked = disabled || confirming

  return (
    <section className="w-full max-w-[440px] rounded-3xl border border-border-soft bg-surface px-6 py-4 font-zen-kaku-gothic-new">
      <header className="flex items-center justify-between">
        <h2 className="text-admin-header text-brand">敗者復活動画の投入</h2>
        {busy && <p className="text-admin-func-label text-brand">送信中…</p>}
      </header>
      <p className="mt-2 text-admin-func-label">
        MP4動画を選び、敗者復活で流す動画を差し替えます(500MBまで)。
      </p>

      <label htmlFor={inputId} className="mt-4 block text-admin-func-label">
        動画ファイル
      </label>
      <input
        id={inputId}
        type="file"
        accept="video/mp4,.mp4"
        disabled={locked}
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        className="mt-2 block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white disabled:cursor-not-allowed disabled:opacity-40"
      />

      {file !== null && (
        <p className="mt-3 break-all text-sm">
          選択中: {file.name} ({formatBytes(file.size)})
        </p>
      )}

      {error !== null && <p className="mt-4 text-sm text-red-700">失敗: {error}</p>}

      {videoUrl !== null ? (
        <p className="mt-4 text-admin-func-label">
          現在アップロードされている動画:{' '}
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="break-all text-blue-700 underline"
          >
            {videoUrl}
          </a>
        </p>
      ) : (
        <p className="mt-4 text-admin-func-label">
          現在アップロードされている動画はまだありません。
        </p>
      )}

      <button
        type="button"
        disabled={locked || file === null}
        onClick={onSubmit}
        className="mt-4 rounded-xl bg-brand px-6 py-3 text-admin-func-label text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? '送信中…' : '動画を送信する'}
      </button>

      {confirming && file !== null && (
        <ConfirmDialog
          title="敗者復活動画を送信しますか?"
          message={`${file.name} を revival.mp4 として保存します。現在の動画がある場合は上書きされます。`}
          confirmLabel="上書きして送信する"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </section>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
