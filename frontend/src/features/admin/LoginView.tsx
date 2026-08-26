import { useEffect, useState } from 'react'
import { setAdminToken } from '../../lib/config'
import { verify } from '../../lib/api'

// ログイン（トークン入力）ページ
export function LoginView() {
  const [token, setToken] = useState<string>('')
  useEffect(() => {
    setAdminToken(token)
    verify()
  }, [token])
  return (
    <div>
      <h1>ログインページ</h1>
      <label>
        トークン（ADMIN_TOKEN）:
        <input name="tokenForm" value={token} onChange={(e) => setToken(e.target.value)} />
      </label>
    </div>
  )
}
