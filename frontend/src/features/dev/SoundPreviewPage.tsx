import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onEnded, play, stop, type SoundName } from '../../lib/sound'

const SOUND_ITEMS: ReadonlyArray<{
  name: SoundName
  label: string
  behavior: string
}> = [
  { name: 'deden', label: 'デデン', behavior: '1回再生' },
  { name: 'tickTock', label: 'チックタック', behavior: 'ループ再生' },
  { name: 'drumroll', label: 'ドラムロール', behavior: 'ループ再生' },
  { name: 'tada', label: 'タダーン', behavior: '1回再生' },
  { name: 'chime', label: 'チャイム', behavior: '1回再生' },
]

function SoundPreviewPage() {
  const [statuses, setStatuses] = useState<Partial<Record<SoundName, string>>>({})

  useEffect(() => {
    const unsubscribe = SOUND_ITEMS.map(({ name }) =>
      onEnded(name, () => {
        setStatuses((current) => ({ ...current, [name]: '再生終了（onEndedを確認）' }))
      }),
    )

    return () => unsubscribe.forEach((removeListener) => removeListener())
  }, [])

  function handlePlay(name: SoundName) {
    setStatuses((current) => ({ ...current, [name]: '再生中' }))
    void play(name).catch(() => {
      // 自動再生制限などで拒否されても、確認画面とイベント進行は止めない。
      setStatuses((current) => ({
        ...current,
        [name]: '再生できませんでした（処理は継続）',
      }))
    })
  }

  function handleStop(name: SoundName) {
    stop(name)
    setStatuses((current) => ({ ...current, [name]: '停止（先頭へ戻しました）' }))
  }

  return (
    <main className="min-h-dvh bg-neutral-100 p-8 text-neutral-900">
      <Link to="/dev" className="text-sm text-blue-700 underline">
        ← /dev
      </Link>
      <h1 className="mt-4 text-2xl font-bold">効果音の動作確認</h1>
      <p className="mt-2 text-sm text-neutral-600">
        現在は全て約1秒の無音プレースホルダです。状態表示で再生・終了を確認できます。
        ループ音は「停止」を押すまで再生を続けます。
      </p>
      <p className="mt-1 text-sm text-neutral-600">
        「再生」を続けて押すと、そのたびに音源の先頭から鳴り直します。
      </p>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {SOUND_ITEMS.map(({ name, label, behavior }) => (
          <li key={name} className="rounded-lg bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-bold">{label}</h2>
              <span className="text-xs text-neutral-500">{behavior}</span>
            </div>
            <p className="mt-1 font-mono text-xs text-neutral-500">{name}</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="rounded bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                onClick={() => handlePlay(name)}
              >
                再生
              </button>
              <button
                type="button"
                className="rounded border border-neutral-400 bg-white px-4 py-2 text-sm font-bold hover:bg-neutral-100"
                onClick={() => handleStop(name)}
              >
                停止
              </button>
            </div>
            <p className="mt-3 min-h-5 text-sm" aria-live="polite">
              {statuses[name] ?? '未再生'}
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default SoundPreviewPage
