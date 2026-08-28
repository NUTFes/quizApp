/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string // 未設定可。空なら相対パス(→ lib/config.ts)
  readonly VITE_USE_MOCK: string
  readonly VITE_SURVEY_URL: string
}
