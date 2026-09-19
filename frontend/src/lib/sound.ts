import chimeSrc from '../assets/sounds/chime.mp3'
import dedenSrc from '../assets/sounds/deden.mp3'
import drumrollSrc from '../assets/sounds/drumroll.mp3'
import tadaSrc from '../assets/sounds/tada.mp3'
import tickTockSrc from '../assets/sounds/tick-tock.mp3'
import { REVIVAL_AUDIO_SRC } from './revivalAudio'

const DEFAULT_VOLUME = 0.7

type SoundDefinition = {
  src: string
  loop: boolean
  volume?: number
  reloadOnPlay?: boolean
}

// loop と volume は呼び出し側の都合ではなく、音源そのものの性質としてここで管理する。
// volume は素材ごとの音量差が大きい場合だけ追加し、通常は共通値を使う。
const SOUNDS = {
  deden: { src: dedenSrc, loop: false },
  tickTock: { src: tickTockSrc, loop: true },
  drumroll: { src: drumrollSrc, loop: true },
  tada: { src: tadaSrc, loop: false },
  chime: { src: chimeSrc, loop: false },
  // 管理者画面を開いた後に配置・更新されるため、起動時には読まず、再生のたびに読み直す。
  revival: { src: REVIVAL_AUDIO_SRC, loop: false, reloadOnPlay: true },
} as const satisfies Record<string, SoundDefinition>

export type SoundName = keyof typeof SOUNDS

// drumroll だけ<audio>要素を使わずWeb Audio APIで再生するため(後述)、ここでは除く。
type AudioElementSoundName = Exclude<SoundName, 'drumroll'>

// 名前ごとに別の Audio 要素を持つため、異なる音は同時に再生できる。
// 固定音源はモジュールを読み込んだ時点で先読みし、操作時の遅延を減らす。
// 運用中に配置・更新される音源は、この時点では読み込まない。
const audioByName = {} as Record<AudioElementSoundName, HTMLAudioElement>

for (const name of Object.keys(SOUNDS) as SoundName[]) {
  if (name === 'drumroll') continue
  const definition: SoundDefinition = SOUNDS[name]
  const audio = new Audio()

  audio.preload = definition.reloadOnPlay ? 'none' : 'auto'
  audio.loop = definition.loop
  audio.volume = definition.volume ?? DEFAULT_VOLUME
  if (!definition.reloadOnPlay) {
    audio.src = definition.src
    audio.load()
  }
  audioByName[name] = audio
}

// drumroll だけは Web Audio API でギャップレスループ再生する。
// MP3はエンコーダのパディング(無音の埋め)を持つため、<audio loop>で再生すると
// ループの継ぎ目に必ず一瞬の隙間ができる。AudioBufferSourceNode.loop は
// デコード済みPCMのサンプル境界でループするため、この隙間が出ない。
// 他の音(deden/tickTock/tada/chime/revival)は1回きりの再生か、継ぎ目の
// 精度が問題にならない用途なので、素朴な<audio>のままにする。
type WebAudioAPIWindow = typeof window & { webkitAudioContext?: typeof AudioContext }

// SOUNDS.drumroll への直接アクセスだとリテラル型が絞られvolumeが無い扱いになるため、
// SoundDefinition型で受けておく。
const drumrollDefinition: SoundDefinition = SOUNDS.drumroll

let drumrollContext: AudioContext | null = null
let drumrollGain: GainNode | null = null
let drumrollBuffer: AudioBuffer | null = null
let drumrollBufferPromise: Promise<AudioBuffer> | null = null
let drumrollSource: AudioBufferSourceNode | null = null

function getDrumrollContext(): AudioContext {
  if (drumrollContext === null) {
    const Ctor = window.AudioContext ?? (window as WebAudioAPIWindow).webkitAudioContext
    drumrollContext = new Ctor()
  }
  return drumrollContext
}

// 音量は<audio>版と揃えるため、宛先の手前にGainNodeを1つだけ挟んで固定する。
function getDrumrollGain(): GainNode {
  if (drumrollGain === null) {
    const context = getDrumrollContext()
    drumrollGain = context.createGain()
    drumrollGain.gain.value = drumrollDefinition.volume ?? DEFAULT_VOLUME
    drumrollGain.connect(context.destination)
  }
  return drumrollGain
}

function loadDrumrollBuffer(): Promise<AudioBuffer> {
  if (drumrollBuffer !== null) return Promise.resolve(drumrollBuffer)
  if (drumrollBufferPromise !== null) return drumrollBufferPromise

  const context = getDrumrollContext()
  drumrollBufferPromise = fetch(drumrollDefinition.src)
    .then((response) => response.arrayBuffer())
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => {
      drumrollBuffer = buffer
      return buffer
    })
    .catch((err) => {
      // 先読みに失敗しても、次回の再生時にもう一度取得し直せるようにする。
      drumrollBufferPromise = null
      throw err
    })
  return drumrollBufferPromise
}

// モジュール読み込み時に先読みしておき、初回再生時の遅延を減らす。失敗は再生時に再試行する。
void loadDrumrollBuffer().catch(() => {})

function stopDrumrollSource(): void {
  if (drumrollSource === null) return
  try {
    drumrollSource.stop()
  } catch {
    // 既に止まっている場合など
  }
  drumrollSource.disconnect()
  drumrollSource = null
}

async function playDrumroll(): Promise<void> {
  // resume() はユーザー操作の呼び出し直後(awaitより前)に呼ぶことで、
  // ブラウザの自動再生制限下でもアンロックされた扱いにする。
  const context = getDrumrollContext()
  const resumeAttempt = context.state === 'suspended' ? context.resume() : Promise.resolve()

  const buffer = await loadDrumrollBuffer()
  await resumeAttempt

  stopDrumrollSource()
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.connect(getDrumrollGain())
  source.start()
  drumrollSource = source
}

/** 音を頭から再生する。拒否されても進行を止めないよう、呼び出し側で必ず catch する。 */
export function play(name: SoundName): Promise<void> {
  if (name === 'drumroll') return playDrumroll()

  const audio = audioByName[name]
  const definition: SoundDefinition = SOUNDS[name]

  if (definition.reloadOnPlay) {
    // 固定URLのファイルが管理者画面を開いた後に配置・更新されても、404や旧版の
    // キャッシュを再利用しないよう、再生時ごとに一意なURLで読み直す。
    const separator = definition.src.includes('?') ? '&' : '?'
    audio.src = `${definition.src}${separator}cacheBust=${Date.now()}`
    audio.load()
  }

  audio.currentTime = 0
  return audio.play()
}

/** 音を止め、次回は頭から再生できる状態に戻す。 */
export function stop(name: SoundName): void {
  if (name === 'drumroll') {
    stopDrumrollSource()
    return
  }

  const audio = audioByName[name]
  audio.pause()
  audio.currentTime = 0
}

/** 鳴り終わりを購読し、購読解除関数を返す。ループ音では自然終了しない。 */
export function onEnded(name: SoundName, callback: () => void): () => void {
  if (name === 'drumroll') {
    // drumrollはループ音であり、Web Audio API版でも自然終了しない(他ループ音と同じ扱い)。
    return () => {}
  }

  const audio = audioByName[name]
  const listener = () => callback()

  audio.addEventListener('ended', listener)
  return () => audio.removeEventListener('ended', listener)
}
