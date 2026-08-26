import React, { useState } from 'react'
import { clearAdminToken, setAdminToken } from '../../lib/config'
import { verify } from '../../lib/api'

// ログイン（トークン入力）ページ
export function LoginView({ onSuccess }: { onSuccess: () => void }) {
  const [token, setToken] = useState<string>('')
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminToken(token)
    try {
      await verify()
      onSuccess()
    } catch {
      clearAdminToken()
      console.log('トークンが違います')
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
          onChange={(e) => setToken(e.target.value)}
        />
        <button type="submit">ログイン</button>
      </form>
    </div>
  )
}
