export type AdminStatus = 'accepting' | 'closed' | 'answer'

const STATUS = {
  accepting: { label: '回答受付中', color: 'bg-accepting-answer' },
  closed: { label: '回答締切', color: 'bg-closed-answer' },
  answer: { label: '正解発表', color: 'bg-live' },
} as const satisfies Record<AdminStatus, { label: string; color: string }>

export function StatusBadge({ status }: { status: AdminStatus }) {
  return <p className="text-p-status-answer">{STATUS[status].label}</p>
}
