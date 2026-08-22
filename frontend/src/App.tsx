import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminPage from './features/admin/AdminPage'
import MonitorPage from './features/monitor/MonitorPage'
import PhonePage from './features/phone/PhonePage'
import TokenPreviewPage from './features/dev/TokenPreviewPage'

// デザイントークンの確認ページは開発時だけ出す。
// import.meta.env.DEV は本番ビルドで false に置き換えられるので、
// この分岐ごと消え、TokenPreviewPage も成果物に含まれない。
const isDev = import.meta.env.DEV

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PhonePage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/backstage-0248" element={<AdminPage />} />
        {isDev && <Route path="/dev" element={<TokenPreviewPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
