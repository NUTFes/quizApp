import { ReactNode } from 'react'
import { PhoneLayout } from './PhoneLayout'

type Props = {
  children?: ReactNode
}

export function LoadingBody({ children = 'しばらくお待ちください' }: Props) {
  return (
    <PhoneLayout>
      <div className="w-full px-5 pt-7">
        <div className="flex h-full justify-center space-y-7 rounded-[28px] bg-brand px-8 pt-8 shadow-[0_6px_16px_0_rgba(25,32,133,0.08)]">
          <p className="flex items-center px-8 py-4 text-left text-surface text-message-m">
            {children}
          </p>
        </div>
      </div>
    </PhoneLayout>
  )
}
