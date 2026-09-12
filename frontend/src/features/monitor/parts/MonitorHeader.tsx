import type { MonitorState, QuestionType } from '../../../types'
import { MonitorQrCode } from './MonitorQrCode'

type MonitorHeaderProps = {
  questionType?: QuestionType
  state?: MonitorState
}

const TITLES: Record<QuestionType, string> = {
  four_choice: '45th 技大祭　4択クイズ',
  two_choice: '45th 技大祭　◯× クイズ',
  arunashi: '45th 技大祭　あるなしクイズ',
  hayaoshi: '45th 技大祭　早押しクイズ',
}

export function MonitorHeader({ questionType, state = undefined }: MonitorHeaderProps) {
  const title = questionType === undefined ? '45th 技大祭' : TITLES[questionType]

  return (
    <header className="flex h-34 shrink-0 items-center bg-canvas px-9 py-5 shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
      <div className="flex items-center gap-4.5">
        {/* 技大祭ロゴが完成したら、この要素を同じ76px角の画像へ置き換える */}
        <div className="size-19 rounded-2xl bg-brand shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]" />
        <h1 className="text-p-header text-brand">{title}</h1>
      </div>
      {state !== undefined && (
        <div className="ml-auto">
          <MonitorQrCode url={state.joinUrl} alt="スマホ画面へのアクセス用QRコード" size={100} />
        </div>
      )}
    </header>
  )
}
