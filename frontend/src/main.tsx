import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// index.html の <div id="root"> を見つけて、そこに App を描き込む。
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
