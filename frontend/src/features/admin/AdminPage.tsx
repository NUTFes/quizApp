// 管理者用ページ
// このページでは、認証状態によるコンポーネントの切り替えのみを行う

import { useEffect, useState } from 'react'
import { getAdminToken } from '../../lib/config'

// 認証状態
type AuthStatus = 'ready' | 'needsLogin' | 'checking' | 'unreachable'

function AdminPage() {
  const [authStatus, setAuthStatus] = useState('checking')
  return (
    <div className="bg-canvas min-h-screen p-4">
      {/* 管理画面用トークンは接頭辞 admin-*/}
      <h1 className="text-admin-header text-brand">管理者画面</h1>
    </div>
  )
}

export default AdminPage
