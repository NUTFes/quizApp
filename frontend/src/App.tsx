// 動作確認用の最小画面。箱が動けばこれが表示される。
// ページ分け(React Router)や装飾(Tailwind)は、動作確認できてから足す。
import { BrowserRouter, Routes, Route } from "react-router-dom"
import AdminPage from "./features/admin/AdminPage"
import MonitorPage from "./features/monitor/MonitorPage"
import PhonePage from "./features/phone/PhonePage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PhonePage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
