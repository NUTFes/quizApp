// 会場(モニタ・スマホ)に出ている状態を、裏方の手元にも同じ言葉で見せるバッジ。
//
// 文言と色は features/monitor/parts/StatusPanel.tsx から書き写している。
// features 間の import は禁止(手順書 §3)なので表を持つが、**中身は変えない**。
// 会場と手元で言葉が違うと、口頭で状態を確認できなくなる。
export type AdminStatus = 'accepting' | 'closed' | 'answer'

const STATUS = {
  accepting: { label: '回答受付中', color: 'bg-accepting-answer' },
  closed: { label: '回答締切', color: 'bg-closed-answer' },
  answer: { label: '正解発表', color: 'bg-live' },
} as const satisfies Record<AdminStatus, { label: string; color: string }>

export function StatusBadge({ status }: { status: AdminStatus }) {
  // 文字サイズは管理者画面用のトークンを使う。
  // モニタ側の text-p-status-answer は 85インチ用の 36px で、手元の操作盤には大きすぎる
  return (
    <p className={`rounded-full px-6 py-2 text-admin-func-label ${STATUS[status].color}`}>
      {STATUS[status].label}
    </p>
  )
}
