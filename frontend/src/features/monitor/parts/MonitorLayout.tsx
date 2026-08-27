import type { ReactNode } from 'react'
import type { QuestionType } from '../../../types'
import { MonitorHeader } from './MonitorHeader'

type MonitorLayoutProps = {
  questionType?: QuestionType
  showHeaderQrCode?: boolean
  children: ReactNode
}

export function MonitorLayout({
  questionType,
  showHeaderQrCode = false,
  children,
}: MonitorLayoutProps) {
  return (
    <main className="flex h-dvh min-h-[1080px] min-w-[1920px] flex-col overflow-hidden bg-canvas font-zen-kaku-gothic-new text-brand">
      <MonitorHeader questionType={questionType} showQrCode={showHeaderQrCode} />
      {children}
    </main>
  )
}
