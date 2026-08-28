import { Link } from 'react-router-dom'

// 開発用ページの入口（開発時のみ / パス: /dev）
//
// 画面プレビューを増やすときは PAGES に1行足す。
// モニタ画面用（#19）は features/dev/MonitorPreviewPage.tsx が
// parts/PreviewFrame をそのまま使って /dev/monitor に生やしている。

const PAGES = [
  { to: '/dev/tokens', title: 'デザイントークン', note: '@theme の色・書体が当たるかの確認' },
  { to: '/dev/phone', title: 'スマホ画面プレビュー', note: '4形式 × フェーズを並べて確認' },
] as const

function DevIndexPage() {
  return (
    <div className="min-h-dvh bg-neutral-100 p-8 text-neutral-900">
      <h1 className="mb-2 text-2xl font-bold">開発用ページ</h1>
      <p className="mb-8 text-sm text-neutral-600">
        本番ビルドには含まれない（App.tsx の import.meta.env.DEV で分岐ごと消える）。
      </p>
      <ul className="flex flex-col gap-3">
        {PAGES.map((page) => (
          <li key={page.to}>
            <Link to={page.to} className="text-lg text-blue-700 underline">
              {page.title}
            </Link>
            <span className="ml-3 text-sm text-neutral-600">{page.note}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default DevIndexPage
