import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminPage from './features/admin/AdminPage'
import MonitorPage from './features/monitor/MonitorPage'
import PhonePage from './features/phone/PhonePage'

// 開発用ページ(/dev 以下)は開発時だけ出す。
// import.meta.env.DEV は本番ビルドで false に置き換えられるので、この分岐ごと消える。
//
// ⚠️ ただし普通の import では、それだけでは中身が成果物から消えない。
// モジュールの一番上でJSXを組み立てている箇所(配列の中で <Foo .../> を作るなど)は、
// Rollupから見ると「呼び出しに副作用があるかもしれない」ので、
// コンポーネント自体が使われていなくても削除できずファイルに残ってしまう。
// 開発用ページはlazy(動的 import)にしてチャンクを分ける。さらに import 自体を
// DEV分岐の中へ置き、本番ビルドでは開発用チャンクも生成されないようにする。
const DevIndexPage = import.meta.env.DEV ? lazy(() => import('./features/dev/DevIndexPage')) : null
const TokenPreviewPage = import.meta.env.DEV
  ? lazy(() => import('./features/dev/TokenPreviewPage'))
  : null
const PhonePreviewPage = import.meta.env.DEV
  ? lazy(() => import('./features/dev/PhonePreviewPage'))
  : null
const MonitorPreviewPage = import.meta.env.DEV
  ? lazy(() => import('./features/dev/MonitorPreviewPage'))
  : null
const AdminPreviewPage = import.meta.env.DEV
  ? lazy(() => import('./features/dev/AdminPreviewPage'))
  : null
const SoundPreviewPage = import.meta.env.DEV
  ? lazy(() => import('./features/dev/SoundPreviewPage'))
  : null

const isDev = import.meta.env.DEV

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PhonePage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/backstage-0248" element={<AdminPage />} />
        {isDev &&
          DevIndexPage !== null &&
          TokenPreviewPage !== null &&
          PhonePreviewPage !== null &&
          MonitorPreviewPage !== null &&
          AdminPreviewPage !== null &&
          SoundPreviewPage !== null && (
            <>
              <Route
                path="/dev"
                element={
                  <Suspense fallback={null}>
                    <DevIndexPage />
                  </Suspense>
                }
              />
              <Route
                path="/dev/tokens"
                element={
                  <Suspense fallback={null}>
                    <TokenPreviewPage />
                  </Suspense>
                }
              />
              <Route
                path="/dev/phone"
                element={
                  <Suspense fallback={null}>
                    <PhonePreviewPage />
                  </Suspense>
                }
              />
              <Route
                path="/dev/monitor"
                element={
                  <Suspense fallback={null}>
                    <MonitorPreviewPage />
                  </Suspense>
                }
              />
              <Route
                path="/dev/admin"
                element={
                  <Suspense fallback={null}>
                    <AdminPreviewPage />
                  </Suspense>
                }
              />
              <Route
                path="/dev/sounds"
                element={
                  <Suspense fallback={null}>
                    <SoundPreviewPage />
                  </Suspense>
                }
              />
            </>
          )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
