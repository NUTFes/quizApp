import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ViewerState } from '../../types'
import {
  phoneAnswerAri,
  phoneAnswerNashi,
  phoneQuestionArunashi,
  phoneQuestionFour,
  phoneQuestionTwo,
} from '../../lib/mock/phone/index'
import { AnswerView } from '../phone/views/AnswerView'
import { FinishedView } from '../phone/views/FinishedView'
import { LoadingView } from '../phone/views/LoadingView'
import { QuestionView } from '../phone/views/QuestionView'
import { WaitingView } from '../phone/views/WaitingView'
import { PreviewFrame, PreviewStyles } from './parts/PreviewFrame'

// スマホ画面の全パターン確認用ページ（開発時のみ / パス: /dev/phone）
//
// 目的は「並べて見比べる」こと。バックエンドもDBも要らず、
// 4つの問題形式 × フェーズを一度に見られる。
// 実機の代わりにはならないが、崩れの発見はここで足りる。

// 端末幅は Figma で決めていないため、実機で多い3つを用意した。
// 375 は最小級。ここで溢れなければ他は溢れない。
const DEVICES = [
  { label: '390×844', width: 390, height: 844, note: 'iPhone 14/15' },
  { label: '375×667', width: 375, height: 667, note: 'iPhone SE・最小級' },
  { label: '430×932', width: 430, height: 932, note: 'iPhone Pro Max' },
] as const

// 早押しはスマホでは「画面まるごと専用表示」になる（→ 画面・要件.md §6）。
// モニタ側の早押しモックは #19 のブランチにあり、こちらにはまだ無いので
// このページの中だけで組み立てる。マージ後は mock/phone へ移してよい。
const phoneQuestionHayaoshi: ViewerState = {
  phase: 'question',
  serverTime: '2026-09-13T13:05:10+09:00',
  timeLimitSec: 30,
  questionStartedAt: '2026-09-13T13:05:00+09:00',
  askedCount: 4,
  question: {
    number: 14,
    type: 'hayaoshi',
    textSegments: ['この問題は', '早押しです'],
    imageUrl: null,
    choices: [],
  },
  answer: null,
}

// 締切表示は phase ではなく「残り0秒になった question」なので、
// 開始から制限時間ぶん過ぎた serverTime を渡して再現する（→ 画面・要件.md §4 締切表示）。
const phoneQuestionClosed: ViewerState = {
  ...phoneQuestionFour,
  serverTime: '2026-09-13T13:05:40+09:00',
}

// 出題数に上限は無い（→ API仕様書 §1「総問題数は持たない」）ので、
// 問題番号が2桁になっても崩れないことを確認する。
const phoneQuestionTwoDigits: ViewerState = { ...phoneQuestionFour, askedCount: 10 }

const CASES = [
  { title: '待機', note: 'waiting', node: <WaitingView /> },
  { title: '出題中 / 4択', note: 'question', node: <QuestionView state={phoneQuestionFour} /> },
  { title: '出題中 / 2択', note: 'question', node: <QuestionView state={phoneQuestionTwo} /> },
  {
    title: '出題中 / あるなし',
    note: 'question',
    node: <QuestionView state={phoneQuestionArunashi} />,
  },
  {
    title: '出題中 / 早押し',
    note: 'question・画面まるごと専用表示',
    node: <QuestionView state={phoneQuestionHayaoshi} />,
  },
  {
    title: '締切',
    note: 'question・残り0秒',
    node: <QuestionView state={phoneQuestionClosed} />,
  },
  { title: '正解発表 / 4択', note: 'answer', node: <AnswerView state={phoneAnswerAri} /> },
  {
    title: '正解発表 / あるなし',
    note: 'answer',
    node: <AnswerView state={phoneAnswerNashi} />,
  },
  { title: '終了', note: 'finished', node: <FinishedView /> },
  { title: '読み込み中', note: 'state が null のとき', node: <LoadingView /> },
  {
    title: '問題番号が2桁',
    note: 'askedCount: 10',
    node: <QuestionView state={phoneQuestionTwoDigits} />,
  },
] as const

const SCALES = [0.5, 0.75, 1] as const

function PhonePreviewPage() {
  const [scale, setScale] = useState<number>(0.75)
  const [device, setDevice] = useState<(typeof DEVICES)[number]>(DEVICES[0])

  return (
    <div className="min-h-dvh bg-neutral-100 p-8 text-neutral-900">
      <PreviewStyles />
      <PhonePreviewStyles />
      <header className="mb-8 flex flex-wrap items-center gap-6">
        <h1 className="text-2xl font-bold">スマホ画面プレビュー</h1>
        <Link to="/dev" className="text-sm text-blue-700 underline">
          ← /dev
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">端末</span>
          {DEVICES.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => setDevice(d)}
              title={d.note}
              className={`rounded border px-3 py-1 text-sm ${
                d.label === device.label
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-400 bg-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">表示倍率</span>
          {SCALES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScale(s)}
              className={`rounded border px-3 py-1 text-sm ${
                s === scale
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-400 bg-white'
              }`}
            >
              {s * 100}%
            </button>
          ))}
        </div>
        <p className="text-sm text-neutral-600">
          実寸 {device.width}×{device.height}（{device.note}）を縮小表示。
          残り時間は実時間で進むので、20秒ほどで「出題中」は全部「締切」になる。戻すにはリロード。
        </p>
      </header>

      <div className="flex flex-wrap gap-10">
        {CASES.map((c) => (
          <PreviewFrame
            key={c.title}
            title={c.title}
            note={c.note}
            width={device.width}
            height={device.height}
            scale={scale}
          >
            {c.node}
          </PreviewFrame>
        ))}
      </div>
    </div>
  )
}

// PhoneLayout の <main> は min-h-dvh（＝ブラウザの表示領域の高さ）で伸びる。
// スマホの実寸(844px 等)はブラウザの表示領域より低いことが多く、そのままだと
// min-height が PreviewStyles の height:100% に打ち勝って <main> が枠より高くなり、
// mt-auto で最下部に置いたフッターが枠の外へ出てしまう。
// プレビューの中でだけ min-height を無効化して「枠の高さ ＝ 画面の高さ」にする。
function PhonePreviewStyles() {
  return <style>{`.preview-canvas > * > * { min-height: 0 !important; }`}</style>
}

export default PhonePreviewPage
