import type { ReactNode } from 'react'

// 画面プレビューの共通枠（開発時のみ）。
//
// 実寸で描いた画面を縮小して並べるための箱。デバイスに依存しないので、
// モニタ(1920x1080)でもスマホ(例: 390x844)でもそのまま使える。
// → スマホ用プレビューpage を作るときはこのまま import すること。

type PreviewFrameProps = {
  title: string
  note?: string
  width: number // 実寸(px)
  height: number // 実寸(px)
  scale: number
  children: ReactNode
}

export function PreviewFrame({ title, note, width, height, scale, children }: PreviewFrameProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-bold text-neutral-800">{title}</h2>
        <span className="text-xs text-neutral-500">
          {width}×{height}
          {note !== undefined && ` / ${note}`}
        </span>
      </div>
      <div
        className="preview-canvas overflow-hidden rounded-lg border border-neutral-300 bg-white"
        style={{ width: width * scale, height: height * scale }}
      >
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </section>
  )
}

// 画面のルート要素は h-dvh（＝ブラウザの高さ）で伸びるため、そのまま置くと
// 枠の高さと一致しない。プレビューの中でだけ「枠いっぱい」に読み替える。
// min-h / min-w はそのまま効かせる（溢れれば枠の overflow-hidden で切れる＝実際の挙動と同じ）。
export function PreviewStyles() {
  return <style>{`.preview-canvas > * > * { height: 100% !important; }`}</style>
}
