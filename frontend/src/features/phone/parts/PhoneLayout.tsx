import { ReactNode } from 'react'
import { QuestionType } from '../../../types'
import { PhoneHeader } from './PhoneHeader'
import { PhoneFooter } from './PhoneFooter'

type PhoneLayoutProps = {
  questionType?: QuestionType
  footMessage?: string
  children: ReactNode
}

export function PhoneLayout({ questionType, footMessage, children }: PhoneLayoutProps) {
  return (
    <main className="flex min-h-dvh flex-col bg-canvas pt-[env(safe-area-inset-top)] font-zen-kaku-gothic-new text-brand">
      <PhoneHeader questionType={questionType} />
      {children}
      <PhoneFooter footMessage={footMessage} />
    </main>
  )
}
