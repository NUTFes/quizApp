import React, { useId, useState } from 'react'
import { clearAdminToken, setAdminToken } from '../../lib/config'
import { ApiError, verify } from '../../lib/api'
import { NETWORK_ERROR_MESSAGE, toMessage } from './errorMessages'

function LoginHeader() {
  return (
    <header className="flex h-19.5 shrink-0 items-center justify-between overflow-hidden bg-canvas px-4 py-4 shadow-[0_10px_28px_0_rgba(25,32,133,0.1)] sm:px-9">
      <div className="flex min-w-0 items-center">
        {/* 技大祭ロゴが完成したら、この要素を同じ46px角の画像へ置き換える */}
        <div className="size-11.5 shrink-0 rounded-2xl bg-brand shadow-[0_10px_28px_0_rgba(25,32,133,0.1)]" />
        <p className="ml-4.5 truncate text-admin-header text-brand">45th 技大祭 QUIZ CONTROL</p>
      </div>
      <p className="ml-4 shrink-0 px-5 py-3 text-notes text-brand">ログイン</p>
    </header>
  )
}

type LoginFormProps = {
  token: string
  busy: boolean
  error: string | null
  onTokenChange: (token: string) => void
  onSubmit: (e: React.FormEvent) => void
}

// 見た目だけを持つ部品。通信も localStorage も触らない。
// こうしておくと /dev/admin から「送信中」「エラー」をそのまま並べられる
// (→ 実装手順書 #106 §6 パネルは props で状態を受け取る純粋な表示部品にする)。
export function LoginForm({ token, busy, error, onTokenChange, onSubmit }: LoginFormProps) {
  // 同じページに複数並べても label と input の対応が壊れないようにする
  const inputId = useId()
  const errorId = useId()

  return (
    <div className="flex min-h-dvh flex-col bg-canvas font-zen-kaku-gothic-new text-brand">
      <LoginHeader />
      <main className="flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-8">
        <form
          className="flex w-full max-w-195 flex-col gap-12 rounded-3xl border border-[#d1dbf0] bg-surface px-6 py-8 shadow-[0_8px_24px_0_rgba(25,32,133,0.1)] sm:gap-23 sm:px-13.5 sm:py-13"
          onSubmit={onSubmit}
        >
          <div className="flex items-center gap-6">
            {/* 技大祭ロゴが完成したら、この要素を同じ54px角の画像へ置き換える */}
            <div className="size-13.5 shrink-0 rounded-2.5 bg-[#09135c]" />
            <h1 className="text-2xl text-[#09135c] sm:text-admin-header-alt">管理者ログイン</h1>
          </div>

          <div>
            <label className="block pb-2 text-notes text-[#09135c]" htmlFor={inputId}>
              パスワード
            </label>
            <input
              id={inputId}
              className="w-full rounded-xl border border-[#d1dbf0] bg-surface px-5 py-4.5 text-pw-offset text-[#09135c] outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-wait disabled:bg-canvas"
              name="tokenForm"
              type="password"
              value={token}
              disabled={busy}
              autoComplete="current-password"
              aria-describedby={error == null ? undefined : errorId}
              aria-invalid={error != null}
              onChange={(e) => onTokenChange(e.target.value)}
            />
            <div className="min-h-5.75 pl-2 pt-1" aria-live="polite">
              {error != null && (
                <p id={errorId} className="text-sm font-bold text-red-700">
                  {error}
                </p>
              )}
            </div>
          </div>

          <button
            className="w-full rounded-xl bg-[#09135c] py-3.25 text-login-button text-white transition hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={busy}
          >
            {busy ? '認証中...' : 'ログイン'}
          </button>
        </form>
      </main>
    </div>
  )
}

// ログイン（トークン入力）ページ。状態と通信はこちらが持つ。
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
    } catch (err) {
      clearAdminToken()
      if (err instanceof ApiError) {
        setError(toMessage(err.code))
      } else {
        // 通信関係のエラーなどでアクセス自体が出来ない
        setError(NETWORK_ERROR_MESSAGE)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <LoginForm
      token={token}
      busy={busy}
      error={error}
      onTokenChange={setToken}
      onSubmit={handleSubmit}
    />
  )
}
