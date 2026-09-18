export const REVIVAL_AUDIO_SRC = '/videos/revival.m4a'

const AUDIO_TARGET_PARAM = 'revivalAudio'
const MONITOR_TARGET = 'monitor'

// 当日の保険を管理者・モニタで同じ条件にする。
// 両方のURLへ ?revivalAudio=monitor を付けたときだけ、音の出どころをモニタへ移す。
export function playsRevivalAudioOnMonitor(search: string): boolean {
  return new URLSearchParams(search).get(AUDIO_TARGET_PARAM) === MONITOR_TARGET
}
