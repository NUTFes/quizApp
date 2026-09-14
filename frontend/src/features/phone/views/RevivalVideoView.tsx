import { NoticeBody } from '../parts/NoticeBody'

// 敗者復活の動画再生中は、スマホでは会場モニターへ誘導する
export function RevivalVideoView() {
  return <NoticeBody isHayaoshi>会場モニターをご覧ください</NoticeBody>
}
