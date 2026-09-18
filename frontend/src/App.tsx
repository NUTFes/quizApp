import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminPage from './features/admin/AdminPage'
import MonitorPage from './features/monitor/MonitorPage'
import PhonePage from './features/phone/PhonePage'
import DevIndexPage from './features/dev/DevIndexPage'
import PhonePreviewPage from './features/dev/PhonePreviewPage'
import MonitorPreviewPage from './features/dev/MonitorPreviewPage'
import TokenPreviewPage from './features/dev/TokenPreviewPage'

// 開発用ページ(/dev 以下)は開発時だけ出す。
// import.meta.env.DEV は本番ビルドで false に置き換えられるので、この分岐ごと消える。
//
// ⚠️ ただし普通の import では、それだけでは中身が成果物から消えない。
// モジュールの一番上でJSXを組み立てている箇所(配列の中で <Foo .../> を作るなど)は、
// Rollupから見ると「呼び出しに副作用があるかもしれない」ので、
// コンポーネント自体が使われていなくても削除できずファイルに残ってしまう。
// AdminPreviewPage はこの形(CONTROL_CASES 等)で書かれているため、
// lazy(動的 import)にしてチャンクを分ける。さらに import 自体をDEV分岐の中へ置き、
// 本番ビルドでは開発用チャンクも生成されないようにする。
const AdminPreviewPage = import.meta.env.DEV
  ? lazy(() => import('./features/dev/AdminPreviewPage'))
  : null

const isDev = import.meta.env.DEV

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PhonePage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/backstage-0248" element={<AdminPage />} />
        {isDev && <Route path="/dev" element={<DevIndexPage />} />}
        {isDev && <Route path="/dev/tokens" element={<TokenPreviewPage />} />}
        {isDev && <Route path="/dev/phone" element={<PhonePreviewPage />} />}
        {isDev && <Route path="/dev/monitor" element={<MonitorPreviewPage />} />}
        {isDev && AdminPreviewPage !== null && (
          <Route
            path="/dev/admin"
            element={
              <Suspense fallback={null}>
                <AdminPreviewPage />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
