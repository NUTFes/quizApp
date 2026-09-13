import { ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckingView, UnreachableView } from '../admin/AdminPage'
import { LoginForm } from '../admin/LoginView'
import { NETWORK_ERROR_MESSAGE, toMessage } from '../admin/errorMessages'
import { CurrentStatus } from '../admin/parts/CurrentStatus'
import {
  adminAnswerAri,
  adminFinished,
  adminQuestionFour,
  adminWaiting,
} from '../../lib/mock/admin/index'

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

// 「出題中の問題」パネル(#107)の取りうる状態。
//
// パネルは props だけで描ける部品なので、通信もトークンも無いこの場所で全状態を並べられる。
// 実物の画面で待機中や締切を見るには、その都度サーバーを操作しないといけない。
//
// 🔒 使っているのは lib/mock/admin の架空データ。本番の問題文・正答は絶対に置かない。
//    lib/mock/ は別イシューの担当領域なので、読むだけで編集しない
//    (この場所で必要な差分は、下のようにスプレッドで作る)。
const PANEL_CASES = [
  {
    title: '待機中',
    note: 'waiting・出している問題が無い。バッジも出さない',
    node: <CurrentStatus state={adminWaiting} status={null} />,
  },
  {
    title: '出題中 / 回答受付中',
    note: 'question・締切前。3区切りのうち1つがまだ未公開',
    node: <CurrentStatus state={adminQuestionFour} status="accepting" />,
  },
  {
    title: '出題中 / 回答締切',
    note: 'question・残り0秒。phase は question のまま動かない',
    node: <CurrentStatus state={adminQuestionFour} status="closed" />,
  },
  {
    title: '出題中 / 制限時間なし',
    note: 'timeLimitSec が null。「なし」と出て、締切にはならない',
    node: (
      <CurrentStatus
        state={{ ...adminQuestionFour, timeLimitSec: null, questionStartedAt: null }}
        status="accepting"
      />
    ),
  },
  {
    title: '出題中 / まだ1区切りも公開していない',
    note: 'revealedSegments が 0。全部に（未公開）が付く',
    node: (
      <CurrentStatus state={{ ...adminQuestionFour, revealedSegments: 0 }} status="accepting" />
    ),
  },
  {
    title: '正解発表',
    note: 'answer・全区切りが公開済み',
    node: <CurrentStatus state={adminAnswerAri} status="answer" />,
  },
  {
    title: '終了',
    note: 'finished・「第0問」と出ていないことを確認する',
    node: <CurrentStatus state={adminFinished} status={null} />,
  },
] as const

const QUESTION_LIST_CASES = [
  {
    title: '通常 + 出題済み混在',
    note: '3件・うち1件が asked: true',
    node: (
      <QuestionList
        items={DEV_QUESTION_LIST}
        selectedId={null}
        onSelect={() => {}}
        currentQuestionId={null}
      />
    ),
  },
  {
    title: '0件',
    note: '問題データがまだ投入されていない状態。画面が壊れないことの確認',
    node: (
      <QuestionList items={[]} selectedId={null} onSelect={() => {}} currentQuestionId={null} />
    ),
  },
  {
    title: '選択中',
    note: '1件を選んでいる状態。ラジオの見た目確認',
    node: (
      <QuestionList
        items={DEV_QUESTION_LIST}
        selectedId={1}
        onSelect={() => {}}
        currentQuestionId={null}
      />
    ),
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

      <h2 className="mb-4 text-xl font-bold">画面全体</h2>
      <div className="flex flex-col gap-10">
        {CASES.map((c) => (
          <PreviewCase key={c.title} title={c.title} note={c.note} width={width.width} fill>
            {c.node}
          </PreviewCase>
        ))}
      </div>

      <h2 className="mt-14 mb-2 text-xl font-bold">パネル単体</h2>
      <p className="mb-4 text-sm text-neutral-600">
        通信していない。props で状態を渡して描いているだけなので、取りうる状態をそのまま並べられる。
      </p>
      <div className="flex flex-col gap-10">
        {PANEL_CASES.map((c) => (
          <PreviewCase key={c.title} title={c.title} note={c.note} width={width.width}>
            {c.node}
          </PreviewCase>
        ))}
      </div>
    </div>
  )
}

// 1件分の枠。
//
// fill を付けたときだけ、画面まるごとの高さ(HEIGHT)に合わせる。
// パネル単体は中身の高さのまま置く。720px の枠に入れると余白だらけになり、
// Figma と見比べるときに縦の間隔を誤解する。
function PreviewCase({
  title,
  note,
  width,
  fill = false,
  children,
}: {
  title: string
  note: string
  width: number
  fill?: boolean
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-3">
        <h3 className="text-lg font-bold text-neutral-800">{title}</h3>
        <span className="text-xs text-neutral-500">
          {width}px{fill && ` × ${HEIGHT}`} / {note}
        </span>
      </div>
      <div className="max-w-full overflow-x-auto">
        <div
          className={`overflow-hidden rounded-lg border border-neutral-300 bg-white ${
            fill ? 'admin-preview-canvas' : 'p-6'
          }`}
          style={fill ? { width, height: HEIGHT } : { width }}
        >
          {children}
        </div>
      </div>
    </section>
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
