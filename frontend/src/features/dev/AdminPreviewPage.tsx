import { ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckingView, UnreachableView } from '../admin/AdminPage'
import { LoginForm } from '../admin/LoginView'
import { NETWORK_ERROR_MESSAGE, toMessage } from '../admin/errorMessages'
import { ACTION_LABEL } from '../admin/labels'
import { ConfirmDialogCard } from '../admin/parts/ConfirmDialog'
import { ControlPanel } from '../admin/parts/ControlPanel'
import { CurrentStatus } from '../admin/parts/CurrentStatus'
import { ErrorBanner } from '../admin/parts/ErrorBanner'
import { RemainingTime } from '../admin/parts/RemainingTime'
import { ShowQuestionForm } from '../admin/parts/ShowQuestionForm'
import type { QuestionListItem } from '../../types'
import {
  adminAnswerAri,
  adminFinished,
  adminQuestionFour,
  adminQuestionTwo,
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

// 「選択中の問題」に渡す架空の1件。
// 🔒 架空の問題文だけを書く。本番の問題文・正答は絶対に書かない。
// 問題一覧のプレビューデータは #109 の __devPreviewData.ts が担当なので、ここでは1件だけ持つ
const PREVIEW_SELECTED: QuestionListItem = {
  id: 5,
  number: 12,
  type: 'four_choice',
  difficulty: 'hard',
  textPreview: 'この問題文は スラッシュ区切りで 少しずつ表示される',
  hasImage: true,
  asked: false,
}

// エラー表示の時刻。実行した時刻にするとスクショのたびに変わるので固定する
const PREVIEW_FAILED_AT = new Date('2026-09-13T13:05:12+09:00')

// ボタンを押しても何もしない。CONTROL_CASES より上に書く(const は宣言より前で使えない)
const noopHandlers = { onAdvanceText: noop, onShowAnswer: noop, onReset: noop }

// 「進行操作(#108)」のパネル群の取りうる状態。
//
// #107 の PANEL_CASES と同じく、通信もトークンも無いこの場所で全状態を並べられる。
// ボタンを押しても noop なので、実際に何が起こるかは §9 のシナリオで確認する。
const CONTROL_CASES = [
  {
    title: '操作パネル / 待機中',
    note: 'waiting・進行の2つと「待機画面を表示」が押せない',
    node: <ControlPanel state={adminWaiting} remainingSec={null} busy={false} {...noopHandlers} />,
  },
  {
    title: '操作パネル / 出題中・残りあり',
    note: 'question・未公開の区切りがあるので「次を表示」が押せる',
    node: (
      <ControlPanel state={adminQuestionTwo} remainingSec={30} busy={false} {...noopHandlers} />
    ),
  },
  {
    title: '操作パネル / 出題中・全区切り公開済み',
    note: 'question・revealedSegments === totalSegments なので「次を表示」が押せない',
    node: (
      <ControlPanel
        state={{ ...adminQuestionTwo, revealedSegments: 3 }}
        remainingSec={15}
        busy={false}
        {...noopHandlers}
      />
    ),
  },
  {
    title: '操作パネル / 締切',
    note: 'question・残り0秒。phase は動かず、「正答を表示」は押せるまま',
    node: <ControlPanel state={adminQuestionTwo} remainingSec={0} busy={false} {...noopHandlers} />,
  },
  {
    title: '操作パネル / 正解発表',
    note: 'answer・進行の2つが両方押せない',
    node: (
      <ControlPanel state={adminAnswerAri} remainingSec={null} busy={false} {...noopHandlers} />
    ),
  },
  {
    title: '操作パネル / 終了',
    note: 'finished・「待機画面を表示」だけが押せる',
    node: <ControlPanel state={adminFinished} remainingSec={null} busy={false} {...noopHandlers} />,
  },
  {
    title: '操作パネル / 送信中',
    note: 'busy・4つ全部が押せない',
    node: <ControlPanel state={adminQuestionTwo} remainingSec={21} busy={true} {...noopHandlers} />,
  },
  {
    title: '残り時間 / 残りあり',
    note: '30秒。まだ余裕がある表示',
    node: <RemainingTime phase="question" remainingSec={30} />,
  },
  {
    title: '残り時間 / 残りわずか',
    note: '5秒。#108 の範囲では色などは変えていない',
    node: <RemainingTime phase="question" remainingSec={5} />,
  },
  {
    title: '残り時間 / 締切',
    note: '0秒。「締切」の表示に切り替わる',
    node: <RemainingTime phase="question" remainingSec={0} />,
  },
  {
    title: '残り時間 / 制限時間なし',
    note: 'remainingSec が null。「制限なし」と出て、締切にはならない',
    node: <RemainingTime phase="question" remainingSec={null} />,
  },
  {
    title: '残り時間 / question 以外',
    note: 'phase が question でないときは常に --:--',
    node: <RemainingTime phase="waiting" remainingSec={null} />,
  },
  {
    title: '選択中の問題 / 未選択',
    note: '問題一覧(#109)でまだ何も選んでいない',
    node: (
      <ShowQuestionForm
        selected={null}
        currentQuestionId={null}
        timeLimitInput="30"
        busy={false}
        onTimeLimitInputChange={noop}
        onSubmit={noop}
      />
    ),
  },
  {
    title: '選択中の問題 / 選択中',
    note: '選んだ問題の概要が出る。まだ出題していない',
    node: (
      <ShowQuestionForm
        selected={PREVIEW_SELECTED}
        currentQuestionId={null}
        timeLimitInput="30"
        busy={false}
        onTimeLimitInputChange={noop}
        onSubmit={noop}
      />
    ),
  },
  {
    title: '選択中の問題 / 出題中の問題と同じ',
    note: '出題中の問題を選び直すと、やり直しの注意が出る',
    node: (
      <ShowQuestionForm
        selected={PREVIEW_SELECTED}
        currentQuestionId={PREVIEW_SELECTED.id}
        timeLimitInput="30"
        busy={false}
        onTimeLimitInputChange={noop}
        onSubmit={noop}
      />
    ),
  },
  {
    title: '選択中の問題 / 出題済み',
    note: '出題済み(asked)だが、選び直して出し直せる',
    node: (
      <ShowQuestionForm
        selected={{ ...PREVIEW_SELECTED, asked: true }}
        currentQuestionId={null}
        timeLimitInput="30"
        busy={false}
        onTimeLimitInputChange={noop}
        onSubmit={noop}
      />
    ),
  },
  {
    title: '選択中の問題 / 秒数が範囲外',
    note: '5未満。エラー文が出てボタンが押せない',
    node: (
      <ShowQuestionForm
        selected={PREVIEW_SELECTED}
        currentQuestionId={null}
        timeLimitInput="3"
        busy={false}
        onTimeLimitInputChange={noop}
        onSubmit={noop}
      />
    ),
  },
  {
    title: '選択中の問題 / 秒数が小数',
    note: '整数でない。エラー文が出てボタンが押せない',
    node: (
      <ShowQuestionForm
        selected={PREVIEW_SELECTED}
        currentQuestionId={null}
        timeLimitInput="30.5"
        busy={false}
        onTimeLimitInputChange={noop}
        onSubmit={noop}
      />
    ),
  },
  {
    title: '選択中の問題 / 空欄',
    note: '空欄。「秒数を入れてください」が出る',
    node: (
      <ShowQuestionForm
        selected={PREVIEW_SELECTED}
        currentQuestionId={null}
        timeLimitInput=""
        busy={false}
        onTimeLimitInputChange={noop}
        onSubmit={noop}
      />
    ),
  },
  {
    title: '選択中の問題 / 送信中',
    note: 'busy・入力欄とボタンが両方無効',
    node: (
      <ShowQuestionForm
        selected={PREVIEW_SELECTED}
        currentQuestionId={null}
        timeLimitInput="30"
        busy={true}
        onTimeLimitInputChange={noop}
        onSubmit={noop}
      />
    ),
  },
  {
    title: '確認ポップアップ / 開いた状態',
    note: '「やめる」が大きく先にある。「はい」ではなく動作が書いてある',
    node: (
      <ConfirmDialogCard
        title="正答を表示しますか?"
        message="モニタと参加者のスマホに、正答が表示されます。表示すると取り消せません。"
        confirmLabel="正答を表示する"
        onConfirm={noop}
        onCancel={noop}
      />
    ),
  },
  {
    title: 'エラー / 出ていない',
    note: 'failure が null。高さだけ確保して、他のパネルが上下に動かないようにする',
    node: <ErrorBanner failure={null} onDismiss={noop} />,
  },
  {
    title: 'エラー / いまの phase では押せない',
    note: '409 INVALID_PHASE・どの操作が失敗したかが見出しに出る',
    node: (
      <ErrorBanner
        failure={{
          action: ACTION_LABEL.showAnswer,
          message: toMessage('INVALID_PHASE'),
          occurredAt: PREVIEW_FAILED_AT,
        }}
        onDismiss={noop}
      />
    ),
  },
  {
    title: 'エラー / 通信失敗',
    note: '通信自体ができない。401 と取り違えないこと',
    node: (
      <ErrorBanner
        failure={{
          action: ACTION_LABEL.advanceText,
          message: NETWORK_ERROR_MESSAGE,
          occurredAt: PREVIEW_FAILED_AT,
        }}
        onDismiss={noop}
      />
    ),
  },
  {
    title: 'エラー / 想定外の code',
    note: '知らない code でも画面が壊れないことの確認',
    node: (
      <ErrorBanner
        failure={{
          action: ACTION_LABEL.resetWaiting,
          message: toMessage('SOMETHING_NEW'),
          occurredAt: PREVIEW_FAILED_AT,
        }}
        onDismiss={noop}
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

      <h2 className="mt-14 mb-2 text-xl font-bold">進行操作(#108)</h2>
      <p className="mb-4 text-sm text-neutral-600">
        ボタンを押しても通信しない。確認ポップアップは開いた状態をそのまま置いている。
      </p>
      <div className="flex flex-col gap-10">
        {CONTROL_CASES.map((c) => (
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
