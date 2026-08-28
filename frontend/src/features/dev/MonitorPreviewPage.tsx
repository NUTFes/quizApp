import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { MonitorState } from '../../types'
import {
  monitorAnswerAri,
  monitorAnswerHayaoshi,
  monitorAnswerNashi,
  monitorQuestionArunashi,
  monitorQuestionFour,
  monitorQuestionHayaoshi,
  monitorQuestionTwo,
  monitorWaiting,
} from '../../lib/mock/monitor/index'
import { AnswerView } from '../monitor/views/AnswerView'
import { FinishedView } from '../monitor/views/FinishedView'
import { LoadingView } from '../monitor/views/LoadingView'
import { QuestionView } from '../monitor/views/QuestionView'
import { WaitingView } from '../monitor/views/WaitingView'
import { PreviewFrame, PreviewStyles } from './parts/PreviewFrame'

// モニタ画面の全パターン確認用ページ（開発時のみ / パス: /dev/monitor）
//
// 目的は「並べて見比べる」こと。バックエンドもDBも要らず、
// 4つの問題形式 × フェーズを一度に見られる。
// 実機（85インチ）の代わりにはならないが、崩れの発見はここで足りる。

const MONITOR_WIDTH = 1920
const MONITOR_HEIGHT = 1080

// 締切表示は phase ではなく「残り0秒になった question」なので、
// 開始から制限時間ぶん過ぎた serverTime を渡して再現する（→ 画面・要件.md §4 締切表示）。
const monitorQuestionClosed: MonitorState = {
  ...monitorQuestionFour,
  serverTime: '2026-09-13T13:05:40+09:00',
}

// 出題数に上限は無い（→ API仕様書 §1「総問題数は持たない」）ので、
// 問題番号が2桁になっても崩れないことを確認する。
const monitorQuestionTwoDigits: MonitorState = { ...monitorQuestionFour, askedCount: 10 }

const CASES = [
  { title: '待機', note: 'waiting', node: <WaitingView state={monitorWaiting} /> },
  { title: '出題中 / 4択', note: 'question', node: <QuestionView state={monitorQuestionFour} /> },
  { title: '出題中 / 2択', note: 'question', node: <QuestionView state={monitorQuestionTwo} /> },
  {
    title: '出題中 / あるなし',
    note: 'question',
    node: <QuestionView state={monitorQuestionArunashi} />,
  },
  {
    title: '出題中 / 早押し',
    note: 'question・読み上げ途中',
    node: <QuestionView state={monitorQuestionHayaoshi} />,
  },
  {
    title: '締切',
    note: 'question・残り0秒',
    node: <QuestionView state={monitorQuestionClosed} />,
  },
  { title: '正解発表 / 4択', note: 'answer', node: <AnswerView state={monitorAnswerAri} /> },
  {
    title: '正解発表 / あるなし',
    note: 'answer',
    node: <AnswerView state={monitorAnswerNashi} />,
  },
  {
    title: '正解発表 / 早押し',
    note: 'answer',
    node: <AnswerView state={monitorAnswerHayaoshi} />,
  },
  { title: '終了', note: 'finished', node: <FinishedView /> },
  { title: '読み込み中', note: 'state が null のとき', node: <LoadingView /> },
  {
    title: '問題番号が2桁',
    note: 'askedCount: 10',
    node: <QuestionView state={monitorQuestionTwoDigits} />,
  },
] as const

const SCALES = [0.25, 0.4, 0.5, 0.75] as const

function MonitorPreviewPage() {
  const [scale, setScale] = useState<number>(0.4)

  return (
    <div className="min-h-dvh bg-neutral-100 p-8 text-neutral-900">
      <PreviewStyles />
      <header className="mb-8 flex flex-wrap items-center gap-6">
        <h1 className="text-2xl font-bold">モニタ画面プレビュー</h1>
        <Link to="/dev" className="text-sm text-blue-700 underline">
          ← /dev
        </Link>
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
          実寸 {MONITOR_WIDTH}×{MONITOR_HEIGHT} を縮小表示。文字の実際の見え方は実機で確認すること。
        </p>
      </header>

      <div className="flex flex-wrap gap-10">
        {CASES.map((c) => (
          <PreviewFrame
            key={c.title}
            title={c.title}
            note={c.note}
            width={MONITOR_WIDTH}
            height={MONITOR_HEIGHT}
            scale={scale}
          >
            {c.node}
          </PreviewFrame>
        ))}
      </div>
    </div>
  )
}

export default MonitorPreviewPage
