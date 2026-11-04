import axios from 'axios';
import { message } from 'antd';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- REQUEST INTERCEPTOR: Chạy trước khi gửi request lên server ---
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- RESPONSE INTERCEPTOR: Chạy sau khi nhận kết quả từ server ---
axiosInstance.interceptors.response.use(
  (response) => {
    // Trả về thẳng dữ liệu bên trong để khi gọi API không cần .data nữa
    return response.data;
  },
  (error) => {
    const status = error.response?.status;

    // Token hết hạn / không hợp lệ / tài khoản bị khóa: xóa phiên và đưa về trang đăng nhập.
    // Trước đây chỉ console.error nên người dùng bị kẹt ở màn hình trắng.
    const data = error.response?.data;
    const locked = status === 403 && (data?.code === 'ACCOUNT_LOCKED'
      || (typeof data?.message === 'string' && data.message.startsWith('Tài khoản của bạn đã bị khóa')));
    if (status === 401 || locked) {
      if (locked) message.error(data.message || 'Tài khoản của bạn đã bị khóa.');
      ['accessToken', 'role', 'username', 'user'].forEach((k) => localStorage.removeItem(k));
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (error.response) {
      switch (status) {
        case 404:
          console.error("Không tìm thấy tài nguyên (API lỗi)!");
          break;
        case 500:
          console.error("Lỗi server hệ thống!");
          break;
        default:
          console.error("Đã xảy ra lỗi không xác định!");
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
