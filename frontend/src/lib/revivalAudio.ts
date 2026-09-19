// 音声だけの別ファイルは作らず、投入済みの revival.mp4 を <audio> で音声トラックだけ再生する。
// 音声専用ファイルの手動抽出・配置(CTでの作業)を無くすため。
export const REVIVAL_AUDIO_SRC = '/videos/revival.mp4'

const AUDIO_TARGET_PARAM = 'revivalAudio'
const MONITOR_TARGET = 'monitor'

// 当日の保険を管理者・モニタで同じ条件にする。
// 両方のURLへ ?revivalAudio=monitor を付けたときだけ、音の出どころをモニタへ移す。
export function playsRevivalAudioOnMonitor(search: string): boolean {
  return new URLSearchParams(search).get(AUDIO_TARGET_PARAM) === MONITOR_TARGET
}
