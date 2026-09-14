import { useState, type Ref } from 'react'

type Props = {
  videoRef?: Ref<HTMLVideoElement>
  src: string
  isActive: boolean
  hasError: boolean
  onError?: () => void
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
}

// 敗者復活の告知動画。
// 親がフェーズをまたいでこの部品をマウントし続け、hidden だけを切り替えることで、
// 待機中に先読みした動画を捨てずにそのまま表示する。
export function RevivalVideoView({
  videoRef,
  src,
  isActive,
  hasError,
  onError,
  autoPlay,
  muted,
  loop,
}: Props) {
  const [isFirstFrameReady, setIsFirstFrameReady] = useState(false)
  const shouldShowVideo = isActive && isFirstFrameReady && !hasError

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        preload="auto"
        playsInline
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        hidden={!shouldShowVideo}
        onLoadedData={() => setIsFirstFrameReady(true)}
        onError={onError}
        className="h-dvh min-h-[1080px] w-screen min-w-[1920px] bg-black object-cover"
        aria-label="敗者復活のお知らせ"
      />
      {isActive && !shouldShowVideo && (
        <main className="flex h-dvh min-h-[1080px] min-w-[1920px] items-center justify-center overflow-hidden bg-brand font-zen-kaku-gothic-new text-surface">
          <p className="text-p-message-xxl">まもなく開始します</p>
        </main>
      )}
    </>
  )
}
