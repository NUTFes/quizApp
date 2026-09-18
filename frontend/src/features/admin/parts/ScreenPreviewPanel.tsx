import type { ReactNode } from 'react'
import { REVIVAL_URL } from '../../../lib/config'
import type { AdminState, MonitorState, ViewerState } from '../../../types'
import { AnswerView as MonitorAnswerView } from '../../monitor/views/AnswerView'
import { FinishedView as MonitorFinishedView } from '../../monitor/views/FinishedView'
import { QuestionView as MonitorQuestionView } from '../../monitor/views/QuestionView'
import { RevivalEntryView as MonitorRevivalEntryView } from '../../monitor/views/RevivalEntryView'
import { RevivalVideoView as MonitorRevivalVideoView } from '../../monitor/views/RevivalVideoView'
import { WaitingView as MonitorWaitingView } from '../../monitor/views/WaitingView'
import { AnswerView as PhoneAnswerView } from '../../phone/views/AnswerView'
import { FinishedView as PhoneFinishedView } from '../../phone/views/FinishedView'
import { QuestionView as PhoneQuestionView } from '../../phone/views/QuestionView'
import { RevivalEntryView as PhoneRevivalEntryView } from '../../phone/views/RevivalEntryView'
import { RevivalVideoView as PhoneRevivalVideoView } from '../../phone/views/RevivalVideoView'
import { WaitingView as PhoneWaitingView } from '../../phone/views/WaitingView'
import { toMonitorPreviewState, toViewerPreviewState } from '../toPreviewState'

const MONITOR_WIDTH = 1920
const MONITOR_HEIGHT = 1080
const MONITOR_SCALE = 0.28
const PHONE_WIDTH = 390
const PHONE_HEIGHT = 844
const PHONE_SCALE = 0.35
const REVIVAL_VIDEO_SRC = '/videos/revival.mp4'

type Props = {
  state: AdminState
  joinUrl: string
}

// モニタ・スマホ本体の View を縮小して並べる純粋な表示部品。
// AdminState は秘密情報を含むため、公開用の型まで削ってから View へ渡す。
export function ScreenPreviewPanel({ state, joinUrl }: Props) {
  const monitorState = toMonitorPreviewState(state, joinUrl)
  const phoneState = toViewerPreviewState(state, 'phone')

  return (
    <section className="rounded-[20px] border border-border-soft bg-surface p-5 shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
      <PreviewStyles />
      <h2 className="mb-4 text-admin-func-label-l text-brand">画面プレビュー</h2>
      <div className="flex flex-wrap items-start gap-5 overflow-x-auto">
        <PreviewViewport
          label="会場モニタ"
          width={MONITOR_WIDTH}
          height={MONITOR_HEIGHT}
          scale={MONITOR_SCALE}
        >
          {renderMonitor(monitorState)}
        </PreviewViewport>
        <PreviewViewport
          label="スマートフォン"
          width={PHONE_WIDTH}
          height={PHONE_HEIGHT}
          scale={PHONE_SCALE}
          phone
        >
          {renderPhone(phoneState)}
        </PreviewViewport>
      </div>
    </section>
  )
}

function renderMonitor(state: MonitorState) {
  switch (state.phase) {
    case 'waiting':
      return <MonitorWaitingView state={state} />
    case 'question':
      return <MonitorQuestionView state={state} />
    case 'answer':
      return <MonitorAnswerView state={state} />
    case 'revival-video':
      return (
        <MonitorRevivalVideoView
          src={REVIVAL_VIDEO_SRC}
          isActive
          hasError={false}
          autoPlay
          muted
          loop
        />
      )
    case 'revival-entry':
      return <MonitorRevivalEntryView revivalUrl={REVIVAL_URL} />
    case 'finished':
      return <MonitorFinishedView />
  }
}

function renderPhone(state: ViewerState) {
  switch (state.phase) {
    case 'waiting':
      return <PhoneWaitingView />
    case 'question':
      return <PhoneQuestionView state={state} />
    case 'answer':
      return <PhoneAnswerView state={state} />
    case 'revival-video':
      return <PhoneRevivalVideoView />
    case 'revival-entry':
      return <PhoneRevivalEntryView revivalUrl={REVIVAL_URL} />
    case 'finished':
      return <PhoneFinishedView />
  }
}

function PreviewViewport({
  label,
  width,
  height,
  scale,
  phone = false,
  children,
}: {
  label: string
  width: number
  height: number
  scale: number
  phone?: boolean
  children: ReactNode
}) {
  return (
    <div className="shrink-0">
      <p className="mb-2 text-sm font-bold text-neutral-600">{label}</p>
      <div
        className={`admin-screen-preview-canvas overflow-hidden rounded-lg border border-neutral-300 bg-white ${
          phone ? 'admin-screen-preview-canvas--phone' : ''
        }`}
        style={{ width: width * scale, height: height * scale }}
      >
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// 本体の h-dvh / min-h-dvh を、プレビュー枠の実寸へ読み替える。
function PreviewStyles() {
  return (
    <style>{`
      .admin-screen-preview-canvas > div > * { height: 100% !important; }
      .admin-screen-preview-canvas--phone > div > * { min-height: 0 !important; }
    `}</style>
  )
}
