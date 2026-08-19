import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminPage from './features/admin/AdminPage'
import MonitorPage from './features/monitor/MonitorPage'
import PhonePage from './features/phone/PhonePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PhonePage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/backstage-0248" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
