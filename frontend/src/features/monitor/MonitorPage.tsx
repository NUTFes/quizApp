import { useEffect, useRef, useState } from 'react'
import { useMonitorState } from '../../lib/useEventState'
import type { MonitorState } from '../../types'
import { REVIVAL_URL } from '../../lib/config'
import { WaitingView } from './views/WaitingView'
import { QuestionView } from './views/QuestionView'
import { FinishedView } from './views/FinishedView'
import { AnswerView } from './views/AnswerView'
import { LoadingView } from './views/LoadingView'
import { RevivalVideoView } from './views/RevivalVideoView'
import { RevivalEntryView } from './views/RevivalEntryView'

const REVIVAL_VIDEO_SRC = '/videos/revival.mp4'

function renderCurrentView(state: MonitorState | null) {
  if (state === null) return <LoadingView />

  switch (state.phase) {
    case 'waiting':
      return <WaitingView state={state} />
    case 'question':
      return <QuestionView state={state} />
    case 'answer':
      return <AnswerView state={state} />
    case 'revival-video':
      // 動画は先読みを保つため、この switch の外で常時マウントしている。
      return null
    case 'revival-entry':
      return <RevivalEntryView revivalUrl={REVIVAL_URL} />
    case 'finished':
      return <FinishedView />
    default:
      return <LoadingView />
  }
}

function MonitorPage() {
  const state = useMonitorState()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasVideoError, setHasVideoError] = useState(false)
  const isRevivalVideo = state?.phase === 'revival-video'

  useEffect(() => {
    const video = videoRef.current
    if (!isRevivalVideo || hasVideoError || video === null) return

    let cancelled = false

    const play = async () => {
      video.muted = false
      try {
        await video.play()
      } catch {
        if (cancelled) return

        // 音つきの自動再生がブラウザに拒否されても、映像だけは必ず流す。
        video.muted = true
        try {
          await video.play()
        } catch {
          if (!cancelled) setHasVideoError(true)
        }
      }
    }

    void play()

    return () => {
      cancelled = true
      video.pause()
    }
  }, [hasVideoError, isRevivalVideo])

  return (
    <>
      {renderCurrentView(state)}
      <RevivalVideoView
        videoRef={videoRef}
        src={REVIVAL_VIDEO_SRC}
        isActive={isRevivalVideo}
        hasError={hasVideoError}
        onError={() => setHasVideoError(true)}
      />
    </>
  )
}

export default MonitorPage
