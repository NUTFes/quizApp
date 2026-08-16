import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 開発サーバーの設定。Docker越しでもブラウザから見えるようにする。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // 箱(コンテナ)の外=あなたのブラウザから見えるようにする
    port: 5173, // docker-compose.yml で開けた窓(5173:5173)と合わせる
  },
})
