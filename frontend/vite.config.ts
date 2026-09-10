import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 開発サーバーの設定。Docker越しでもブラウザから見えるようにする。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // 箱(コンテナ)の外=あなたのブラウザから見えるようにする
    port: 5173, // docker-compose.yml で開けた窓(5173:5173)と合わせる

    // /apiをbackendコンテナへ転送。ブラウザから見た通信相手が5173だけになり
    // 別オリジンにならない=CORSが発生しない(本番のnginxと同じ構造)
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
      },
    },
  },
})
