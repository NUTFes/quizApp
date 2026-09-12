import type { ReactNode } from 'react'
import { MonitorLayout } from './MonitorLayout'

type Props = {
  children?: ReactNode
}

export function NoticeBody({ children = 'しばらくお待ちください' }: Props) {
  return (
    <MonitorLayout>
      <div className="flex min-h-0 flex-1 px-12 py-9">
        <div className="flex w-full items-center justify-center rounded-[80px] bg-brand shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]">
          <p className="text-p-message-xxl text-surface">{children}</p>
        </div>
      </div>
    </MonitorLayout>
  )
}
