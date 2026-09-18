import chimeSrc from '../assets/sounds/chime.mp3'
import dedenSrc from '../assets/sounds/deden.mp3'
import drumrollSrc from '../assets/sounds/drumroll.mp3'
import tadaSrc from '../assets/sounds/tada.mp3'
import tickTockSrc from '../assets/sounds/tick-tock.wav'

const DEFAULT_VOLUME = 0.7

type SoundDefinition = {
  src: string
  loop: boolean
  volume?: number
}

// loop と volume は呼び出し側の都合ではなく、音源そのものの性質としてここで管理する。
// volume は素材ごとの音量差が大きい場合だけ追加し、通常は共通値を使う。
const SOUNDS = {
  deden: { src: dedenSrc, loop: false },
  tickTock: { src: tickTockSrc, loop: true },
  drumroll: { src: drumrollSrc, loop: true },
  tada: { src: tadaSrc, loop: false },
  chime: { src: chimeSrc, loop: false },
} as const satisfies Record<string, SoundDefinition>

export type SoundName = keyof typeof SOUNDS

// 名前ごとに別の Audio 要素を持つため、異なる音は同時に再生できる。
// モジュールを読み込んだ時点で全音源の読み込みを始め、操作時の遅延を減らす。
const audioByName = {} as Record<SoundName, HTMLAudioElement>

for (const name of Object.keys(SOUNDS) as SoundName[]) {
  const definition: SoundDefinition = SOUNDS[name]
  const audio = new Audio(definition.src)

  audio.preload = 'auto'
  audio.loop = definition.loop
  audio.volume = definition.volume ?? DEFAULT_VOLUME
  audio.load()
  audioByName[name] = audio
}

/** 音を頭から再生する。拒否されても進行を止めないよう、呼び出し側で必ず catch する。 */
export function play(name: SoundName): Promise<void> {
  const audio = audioByName[name]
  audio.currentTime = 0
  return audio.play()
}

/** 音を止め、次回は頭から再生できる状態に戻す。 */
export function stop(name: SoundName): void {
  const audio = audioByName[name]
  audio.pause()
  audio.currentTime = 0
}

/** 鳴り終わりを購読し、購読解除関数を返す。ループ音では自然終了しない。 */
export function onEnded(name: SoundName, callback: () => void): () => void {
  const audio = audioByName[name]
  const listener = () => callback()

  audio.addEventListener('ended', listener)
  return () => audio.removeEventListener('ended', listener)
}
