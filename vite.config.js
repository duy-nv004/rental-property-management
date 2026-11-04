import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Lắng nghe mọi địa chỉ để máy khác trong mạng truy cập qua IP của máy này
    host: true,
    port: 5173,
    // Chuyển tiếp API sang backend: trình duyệt chỉ gọi một địa chỉ, không vướng CORS
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
