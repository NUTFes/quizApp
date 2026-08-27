import { ReactNode } from 'react'
import { PhoneLayout } from './PhoneLayout'

type Props = {
  isHayaoshi?: boolean
  children?: ReactNode
}

export function LoadingBody({ isHayaoshi = false, children = 'しばらくお待ちください' }: Props) {
  return (
    <PhoneLayout questionType={isHayaoshi ? 'hayaoshi' : undefined}>
      <div className="w-full px-5 pt-7">
        <div className="flex justify-center rounded-[28px] bg-brand px-8 pt-8 shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <p className="flex items-center px-8 pt-4 text-left text-surface text-message-m">
            {children}
          </p>
        </div>
      </div>
    </PhoneLayout>
  )
}
