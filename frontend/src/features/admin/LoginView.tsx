import React, { useState } from 'react'
import { clearAdminToken, setAdminToken } from '../../lib/config'
import { ApiError, verify } from '../../lib/api'

// ログイン（トークン入力）ページ
export function LoginView({ onSuccess }: { onSuccess: () => void }) {
  const [token, setToken] = useState<string>('')
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setAdminToken(token.trim())
    try {
      await verify()
      onSuccess()
    } catch {
      clearAdminToken()
      if (e instanceof ApiError && e.status === 401) {
        // エラーのタイプを判定し、
        // アクセスが出来ないエラーじゃない事と、 401 エラーであることを確認
        setError('トークンが違います')
      } else {
        // 通信関係のエラーなどでアクセス自体が出来ない
        setError('サーバーに接続できませんでした')
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <h1>ログインページ</h1>
      <form onSubmit={handleSubmit}>
        トークン（ADMIN_TOKEN）:
        <input
          name="tokenForm"
          type="password"
          value={token}
          disabled={busy}
          onChange={(e) => setToken(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          {busy ? '認証中...' : 'ログイン'}
        </button>
      </form>
      {error != null && <p>{error}</p> /* error があるときはエラーを表示、なければ何も出ない */}
    </div>
  )
}
