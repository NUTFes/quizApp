import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminPage from './features/admin/AdminPage'
import MonitorPage from './features/monitor/MonitorPage'
import PhonePage from './features/phone/PhonePage'
import DevIndexPage from './features/dev/DevIndexPage'
import PhonePreviewPage from './features/dev/PhonePreviewPage'
import MonitorPreviewPage from './features/dev/MonitorPreviewPage'
import TokenPreviewPage from './features/dev/TokenPreviewPage'

// 開発用ページ(/dev 以下)は開発時だけ出す。
// import.meta.env.DEV は本番ビルドで false に置き換えられるので、
// この分岐ごと消え、プレビュー用のコンポーネントも成果物に含まれない。
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
