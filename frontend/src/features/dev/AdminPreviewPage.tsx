import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckingView, UnreachableView } from '../admin/AdminPage'
import { LoginForm } from '../admin/LoginView'
import { NETWORK_ERROR_MESSAGE, toMessage } from '../admin/errorMessages'

// 管理者画面の全パターン確認用ページ（開発時のみ / パス: /dev/admin）
//
// ログイン画面は「入れたら消える」画面なので、実物で全状態を見るには
// わざとサーバーを落としたり誤ったトークンを打ったりする必要がある。
// ここに並べておけば、レビュワーが Figma と見比べるだけで済む。
//
// 🔒 開発用の値でも、実際に通るトークンはこのファイルに書かないこと。
//    このリポジトリは公開されている。

// スマホ用の PreviewFrame は端末サイズの枠なので使わない。
// 管理者画面はデスクトップ幅で、枠に押し込めると本来の折り返しが見えなくなる。
const WIDTHS = [
  { label: '1440px', width: 1440, note: 'ノートPC・標準' },
  { label: '1024px', width: 1024, note: 'タブレット横・小さいPC' },
  { label: '768px', width: 768, note: 'sm: の切り替わり付近' },
  { label: '390px', width: 390, note: '当日スマホから操作する場合' },
] as const

const HEIGHT = 720

// 伏せ字の見え方を確認するためのダミー。実在のトークンではない。
const DUMMY_INPUT = 'abcdefghijkl'

const noop = () => {}
const preventSubmit = (e: React.FormEvent) => e.preventDefault()

const CASES = [
  {
    title: '初期（未入力）',
    note: 'needsLogin',
    node: (
      <LoginForm token="" busy={false} error={null} onTokenChange={noop} onSubmit={preventSubmit} />
    ),
  },
  {
    title: '入力済み',
    note: 'needsLogin・伏せ字の見え方',
    node: (
      <LoginForm
        token={DUMMY_INPUT}
        busy={false}
        error={null}
        onTokenChange={noop}
        onSubmit={preventSubmit}
      />
    ),
  },
  {
    title: '送信中',
    note: 'busy・入力欄とボタンが無効',
    node: (
      <LoginForm
        token={DUMMY_INPUT}
        busy={true}
        error={null}
        onTokenChange={noop}
        onSubmit={preventSubmit}
      />
    ),
  },
  {
    title: 'エラー / トークンが違う',
    note: '401 UNAUTHORIZED',
    node: (
      <LoginForm
        token=""
        busy={false}
        error={toMessage('UNAUTHORIZED')}
        onTokenChange={noop}
        onSubmit={preventSubmit}
      />
    ),
  },
  {
    title: 'エラー / サーバーに繋がらない',
    note: '通信自体ができない。401 と取り違えないこと',
    node: (
      <LoginForm
        token=""
        busy={false}
        error={NETWORK_ERROR_MESSAGE}
        onTokenChange={noop}
        onSubmit={preventSubmit}
      />
    ),
  },
  {
    title: 'エラー / 想定外の code',
    note: '知らない code でも画面が壊れないことの確認',
    node: (
      <LoginForm
        token=""
        busy={false}
        error={toMessage('SOMETHING_NEW')}
        onTokenChange={noop}
        onSubmit={preventSubmit}
      />
    ),
  },
  {
    title: 'トークン確認中',
    note: 'checking・保存済みトークンを verify している間',
    node: <CheckingView />,
  },
  {
    title: 'サーバーに接続できない',
    note: 'unreachable・起動時の verify が通信に失敗',
    node: <UnreachableView />,
  },
] as const

function AdminPreviewPage() {
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(WIDTHS[0])

  return (
    <div className="min-h-dvh bg-neutral-100 p-8 text-neutral-900">
      <AdminPreviewStyles />
      <header className="mb-8 flex flex-wrap items-center gap-6">
        <h1 className="text-2xl font-bold">管理者画面プレビュー</h1>
        <Link to="/dev" className="text-sm text-blue-700 underline">
          ← /dev
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">画面幅</span>
          {WIDTHS.map((w) => (
            <button
              key={w.label}
              type="button"
              onClick={() => setWidth(w)}
              title={w.note}
              className={`rounded border px-3 py-1 text-sm ${
                w.label === width.label
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-400 bg-white'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-neutral-600">
          実寸のまま並べている（縮小していない）。枠より広い幅を選ぶと、各枠が横スクロールする。
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {CASES.map((c) => (
          <section key={c.title} className="flex flex-col gap-2">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-bold text-neutral-800">{c.title}</h2>
              <span className="text-xs text-neutral-500">
                {width.width}×{HEIGHT} / {c.note}
              </span>
            </div>
            <div className="max-w-full overflow-x-auto">
              <div
                className="admin-preview-canvas overflow-hidden rounded-lg border border-neutral-300 bg-white"
                style={{ width: width.width, height: HEIGHT }}
              >
                {c.node}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

// 画面のルート要素は min-h-dvh（＝ブラウザの高さ）で伸びるため、そのまま置くと
// 枠の高さと一致しない。プレビューの中でだけ「枠いっぱい」に読み替える。
function AdminPreviewStyles() {
  return (
    <style>{`.admin-preview-canvas > * { height: 100% !important; min-height: 0 !important; }`}</style>
  )
}

export default AdminPreviewPage
