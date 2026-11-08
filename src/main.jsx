import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import App from './App.jsx'
import theme from './theme'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Đăng ký Service Worker cho Progressive Web App (PWA)
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Có phiên bản cập nhật mới.');
  },
  onOfflineReady() {
    console.log('[PWA] Ứng dụng đã sẵn sàng chạy ngoại tuyến (offline).');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={theme} locale={viVN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
