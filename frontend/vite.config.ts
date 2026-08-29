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
      // 問題の画像。backend の r.Static("/images", "./static/images") へ転送する。
      // 本番の nginx にも同じ中継がある(frontend/nginx.conf)。これが無いと
      // 開発でだけ画像が出ず、本番との差で原因を見失う。
      '/images': {
        target: 'http://backend:3000',
        changeOrigin: true,
      },
    },
  },
})
