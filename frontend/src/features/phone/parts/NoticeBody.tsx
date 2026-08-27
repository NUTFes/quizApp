import { ReactNode } from 'react'
import { PhoneLayout } from './PhoneLayout'

type Props = {
  isHayaoshi?: boolean
  children?: ReactNode
}

export function NoticeBody({ isHayaoshi = false, children = 'しばらくお待ちください' }: Props) {
  return (
    <PhoneLayout questionType={isHayaoshi ? 'hayaoshi' : undefined}>
      <div className="flex w-full flex-col grow px-5 pt-7">
        <div className="flex grow items-center justify-center rounded-[28px] bg-brand shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <p className="px-8 py-4 text-left text-surface text-message-m">{children}</p>
        </div>
      </div>
    </PhoneLayout>
  )
}
