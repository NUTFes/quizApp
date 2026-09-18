import { useEffect, useId, useRef, useState } from 'react'
import { ApiError, getImages, uploadImage } from '../../../lib/api'
import type { ImageInfo } from '../../../types'
import { NETWORK_ERROR_MESSAGE, toImageMessage } from '../errorMessages'
import { ConfirmDialog } from './ConfirmDialog'

type Props = {
  existingImages: ImageInfo[] | null
  existingImagesError: string | null
  onAuthExpired: () => void
}

type UploadOutcome =
  | { status: 'uploading' }
  | { status: 'success'; imageUrl: string }
  | { status: 'failure'; message: string }

const imageFileName = (imageUrl: string) =>
  imageUrl.startsWith('/images/') ? imageUrl.slice('/images/'.length) : imageUrl

const formatUpdatedAt = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('ja-JP')
}

export function ImagePanel({ existingImages, existingImagesError, onAuthExpired }: Props) {
  const inputId = useId()
  const [files, setFiles] = useState<File[]>([])
  const [names, setNames] = useState<string[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [outcomes, setOutcomes] = useState<(UploadOutcome | null)[]>([])
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [duplicateNames, setDuplicateNames] = useState<string[]>([])
  const [panelError, setPanelError] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const inFlight = useRef(false)

  // object URL は選択中だけ保持する。ファイル選択の変更時とアンマウント時に必ず解放する。
  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url))
  }, [previewUrls])

  const pendingIndexes = files.flatMap((_, index) =>
    outcomes[index]?.status === 'success' ? [] : [index],
  )
  const successCount = outcomes.filter((outcome) => outcome?.status === 'success').length
  const failureCount = outcomes.filter((outcome) => outcome?.status === 'failure').length
  const hasResult = successCount > 0 || failureCount > 0
  const locked = busy || confirming

  const uploadPending = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setPanelError(null)

    const indexes = files.flatMap((_, index) =>
      outcomes[index]?.status === 'success' ? [] : [index],
    )
    const nextOutcomes = [...outcomes]

    try {
      for (const index of indexes) {
        nextOutcomes[index] = { status: 'uploading' }
        setOutcomes([...nextOutcomes])

        try {
          const result = await uploadImage(files[index], names[index])
          nextOutcomes[index] = { status: 'success', imageUrl: result.imageUrl }
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            onAuthExpired()
            return
          }
          nextOutcomes[index] = {
            status: 'failure',
            message: err instanceof ApiError ? toImageMessage(err) : NETWORK_ERROR_MESSAGE,
          }
        }
        setOutcomes([...nextOutcomes])
      }
    } finally {
      setOutcomes([...nextOutcomes])
      inFlight.current = false
      setBusy(false)
    }
  }

  const checkDuplicatesAndUpload = async () => {
    if (inFlight.current || pendingIndexes.length === 0) return
    inFlight.current = true
    setBusy(true)
    setPanelError(null)
    setCopiedUrl(null)

    try {
      const { images } = await getImages()
      const existingNames = new Set(images.map(({ imageUrl }) => imageFileName(imageUrl)))
      const pendingNames = pendingIndexes.map((index) => names[index])
      const nameCounts = pendingNames.reduce(
        (counts, name) => counts.set(name, (counts.get(name) ?? 0) + 1),
        new Map<string, number>(),
      )
      const duplicates = [...new Set(pendingNames)].filter(
        (name) => existingNames.has(name) || (nameCounts.get(name) ?? 0) >= 2,
      )

      if (duplicates.length > 0) {
        setDuplicateNames(duplicates)
        setConfirming(true)
        return
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired()
        return
      }
      setPanelError(
        `画像一覧の確認に失敗しました: ${err instanceof ApiError ? toImageMessage(err) : NETWORK_ERROR_MESSAGE}`,
      )
      return
    } finally {
      inFlight.current = false
      setBusy(false)
    }

    await uploadPending()
  }

  const copyImageUrl = async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl)
      setCopiedUrl(imageUrl)
      setPanelError(null)
    } catch {
      setPanelError('画像URLをコピーできませんでした。文字列を選択してコピーしてください。')
    }
  }

  return (
    <section className="w-full max-w-[440px] rounded-3xl border border-border-soft bg-surface px-6 py-4 font-zen-kaku-gothic-new">
      <header className="flex items-center justify-between">
        <h2 className="text-admin-header text-brand">画像の投入</h2>
        {busy && <p className="text-admin-func-label text-brand">送信中…</p>}
      </header>
      <p className="mt-2 text-admin-func-label">
        PNG・JPEG画像を選び、スプレッドシートに記入する名前で保存します。
      </p>

      <div className="mt-4">
        <h3 className="text-admin-func-label font-bold">投入済みの画像</h3>
        {existingImagesError !== null ? (
          <p className="mt-2 text-sm text-red-700">
            画像一覧の取得に失敗しました: {existingImagesError}
          </p>
        ) : existingImages === null ? (
          <p className="mt-2 text-sm">確認中…</p>
        ) : existingImages.length === 0 ? (
          <p className="mt-2 text-sm">投入済みの画像はまだありません。</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[390px] text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft">
                  <th className="px-2 py-2">ファイル名</th>
                  <th className="px-2 py-2">サイズ</th>
                  <th className="px-2 py-2">更新日時</th>
                </tr>
              </thead>
              <tbody>
                {existingImages.map((image) => (
                  <tr key={image.imageUrl} className="border-b border-border-soft align-top">
                    <td className="px-2 py-3 break-all">{imageFileName(image.imageUrl)}</td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      {image.size.toLocaleString('ja-JP')} バイト
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      {formatUpdatedAt(image.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <label htmlFor={inputId} className="mt-4 block text-admin-func-label">
        画像ファイル
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        accept="image/png,image/jpeg"
        disabled={locked}
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? [])
          setFiles(selected)
          setNames(selected.map((file) => file.name))
          setPreviewUrls(selected.map((file) => URL.createObjectURL(file)))
          setOutcomes(selected.map(() => null))
          setPanelError(null)
          setCopiedUrl(null)
          setDuplicateNames([])
        }}
        className="mt-2 block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white disabled:cursor-not-allowed disabled:opacity-40"
      />

      {files.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 text-admin-func-label font-bold">今回の投入結果</h3>
          <table className="w-full min-w-[390px] text-left text-sm">
            <thead>
              <tr className="border-b border-border-soft">
                <th className="px-2 py-2">プレビュー</th>
                <th className="px-2 py-2">保存するファイル名</th>
                <th className="px-2 py-2">結果</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, index) => {
                const outcome = outcomes[index]
                return (
                  <tr
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="border-b border-border-soft align-top"
                  >
                    <td className="px-2 py-3">
                      {previewUrls[index] !== undefined && (
                        <img
                          src={previewUrls[index]}
                          alt={`${names[index]}のプレビュー`}
                          className="size-16 rounded-lg object-contain"
                        />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="text"
                        aria-label={`${file.name}の保存ファイル名`}
                        value={names[index] ?? ''}
                        disabled={locked || outcome?.status === 'success'}
                        onChange={(event) => {
                          const nextNames = [...names]
                          nextNames[index] = event.target.value
                          setNames(nextNames)
                        }}
                        className="w-44 rounded-lg border border-border-soft px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </td>
                    <td className="px-2 py-3">
                      {outcome?.status === 'uploading' && <p>送信中…</p>}
                      {outcome?.status === 'failure' && (
                        <p className="w-52 text-red-700">失敗: {outcome.message}</p>
                      )}
                      {outcome?.status === 'success' && (
                        <div className="w-52">
                          <p className="break-all text-brand">{outcome.imageUrl}</p>
                          <button
                            type="button"
                            onClick={() => void copyImageUrl(outcome.imageUrl)}
                            className="mt-2 rounded-xl border border-brand px-3 py-1 text-brand"
                          >
                            {copiedUrl === outcome.imageUrl ? 'コピーしました' : 'コピー'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasResult && (
        <p className="mt-4 text-admin-func-label">
          成功 {successCount}件 / 失敗 {failureCount}件
        </p>
      )}
      {panelError !== null && <p className="mt-4 text-sm text-red-700">{panelError}</p>}

      <button
        type="button"
        disabled={locked || pendingIndexes.length === 0}
        onClick={() => void checkDuplicatesAndUpload()}
        className="mt-4 rounded-xl bg-brand px-6 py-3 text-admin-func-label text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? '送信中…' : failureCount > 0 ? '失敗した画像を再送する' : '画像を送信する'}
      </button>

      {confirming && (
        <ConfirmDialog
          title="同名の画像を上書きしますか?"
          message={`次の画像名は重複しています: ${duplicateNames.join(', ')}。送信すると上書きします。`}
          confirmLabel="上書きして送信する"
          onConfirm={() => {
            setConfirming(false)
            void uploadPending()
          }}
          onCancel={() => {
            setConfirming(false)
            setDuplicateNames([])
          }}
        />
      )}
    </section>
  )
}
