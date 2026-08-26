import React, { useState } from 'react'
import { setAdminToken } from '../../lib/config'
import { verify } from '../../lib/api'

// ログイン（トークン入力）ページ
export function LoginView() {
  const [token, setToken] = useState<string>('')
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminToken(token)
    verify()
  }
  return (
    <div>
      <h1>ログインページ</h1>
      <form onSubmit={handleSubmit}>
        トークン（ADMIN_TOKEN）:
        <input name="tokenForm" value={token} onChange={(e) => setToken(e.target.value)} />
        <button type="submit">ログイン</button>
      </form>
    </div>
  )
}
