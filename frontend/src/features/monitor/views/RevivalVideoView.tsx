import type { Ref } from 'react'

type Props = {
  videoRef?: Ref<HTMLVideoElement>
  src: string
  isActive: boolean
  hasError: boolean
  onError?: () => void
}

// 敗者復活の告知動画。
// 親がフェーズをまたいでこの部品をマウントし続け、hidden だけを切り替えることで、
// 待機中に先読みした動画を捨てずにそのまま表示する。
export function RevivalVideoView({ videoRef, src, isActive, hasError, onError }: Props) {
  return (
    <>
      <video
        ref={videoRef}
        src={src}
        preload="auto"
        playsInline
        hidden={!isActive || hasError}
        onError={onError}
        className="h-dvh min-h-[1080px] w-screen min-w-[1920px] bg-black object-cover"
        aria-label="敗者復活のお知らせ"
      />
      {isActive && hasError && (
        <main className="flex h-dvh min-h-[1080px] min-w-[1920px] items-center justify-center overflow-hidden bg-brand font-zen-kaku-gothic-new text-surface">
          <p className="text-p-message-xxl">まもなく開始します</p>
        </main>
      )}
    </>
  )
}
