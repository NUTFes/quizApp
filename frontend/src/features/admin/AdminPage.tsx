// 管理者用ページ
// このページでは、認証状態によるコンポーネントの切り替えのみを行う

import { useEffect, useState } from 'react'
import { getAdminToken } from '../../lib/config'
import { ApiError, verify } from '../../lib/api'
import { LoginView } from './LoginView'
import { OperationPanel } from './OperationPanel'

// 認証状態
type AuthStatus = 'ready' | 'needsLogin' | 'checking' | 'unreachable'

function AdminPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    getAdminToken() === '' ? 'needsLogin' : 'checking',
  ) // 初期値の設定の時点で、トークンがあるかどうかを確認する

  // 認証判定は起動時に一度だけ（依存配列には [] を指定）
  useEffect(() => {
    // 応答のラグによって、変な読み込みが起きるのを防ぐためのフラグ
    let cancelled = false
    if (getAdminToken() === '') {
      // もしトークンがないときは、何も通信せずログイン(トークン入力)へ
      return
    }
    // もしある場合は認証
    verify()
      .then(() => {
        if (!cancelled) setAuthStatus('ready')
      })
      .catch((e) => {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 401) {
          // エラーのタイプを判定し、
          // アクセスが出来ないエラーじゃない事と、 401 エラーであることを確認
          setAuthStatus('needsLogin')
          return
        }
        // 通信関係のエラーなどでアクセス自体が出来ない
        setAuthStatus('unreachable')
        return
      })
    return () => {
      cancelled = true
    }
  }, [])
  switch (authStatus) {
    case 'checking':
      return <p>トークンを確認中...</p>
    case 'unreachable':
      return <p>サーバーに接続できません</p>
    case 'needsLogin':
      return <LoginView />
    default:
      return <OperationPanel />
  }
}
export default AdminPage
