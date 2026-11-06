import axios from 'axios';
import { message } from 'antd';
import { isAuthEndpoint, createRefreshQueue } from './authSession';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const axiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true, // Cho phép trình duyệt tự động gửi và nhận HttpOnly Cookie (refreshToken)
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshQueue = createRefreshQueue();

// --- REQUEST INTERCEPTOR: Gửi kèm Access Token ---
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

// --- RESPONSE INTERCEPTOR: Xử lý 401 Silent Refresh & Phiên Đơn Thiết Bị ---
axiosInstance.interceptors.response.use(
  (response) => {
    // Trả về thẳng data để các component không cần .data nữa
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const data = error.response?.data;

    // 1. Trường hợp tài khoản bị Quản trị viên khóa (403 ACCOUNT_LOCKED)
    const locked = status === 403 && (
      data?.code === 'ACCOUNT_LOCKED' ||
      (typeof data?.message === 'string' && data.message.startsWith('Tài khoản của bạn đã bị khóa'))
    );
    if (locked) {
      message.error(data.message || 'Tài khoản của bạn đã bị khóa bởi quản trị viên.');
      ['accessToken', 'role', 'username', 'user'].forEach((k) => localStorage.removeItem(k));
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // 2. Trường hợp token hết hạn (401 Unauthorized) và không phải request đăng nhập/refresh
    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      originalRequest._retry = true;

      // Nếu đang có một tiến trình refresh token chạy ngầm, xếp request này vào hàng đợi
      if (refreshQueue.isRefreshing()) {
        return new Promise((resolve, reject) => {
          refreshQueue.enqueue(resolve, reject);
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Đánh dấu bắt đầu tiến trình Refresh Token duy nhất
      refreshQueue.startRefreshing();

      try {
        // Dùng axios cơ bản (không qua axiosInstance) để tránh trigger đệ quy interceptor
        const refreshRes = await axios.post(
          `${baseURL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshRes.data?.accessToken || refreshRes.data?.token;
        if (!newAccessToken) {
          throw new Error('Không nhận được Access Token mới từ server');
        }

        // Lưu Access Token mới vào LocalStorage
        localStorage.setItem('accessToken', newAccessToken);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

        // Giải phóng toàn bộ các request đang chờ trong queue
        refreshQueue.resolveAll(newAccessToken);

        // Chạy lại request ban đầu với token mới
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        // Refresh thất bại (Refresh Token hết hạn hoặc tài khoản bị đăng nhập từ thiết bị khác)
        refreshQueue.rejectAll(refreshErr);

        const errMsg = refreshErr.response?.data?.message || '';
        const isKickedOut = errMsg.includes('thiết bị khác');

        if (isKickedOut) {
          sessionStorage.setItem('auth_flash_message', 'Tài khoản của bạn đã được đăng nhập từ một thiết bị khác. Vui lòng đăng nhập lại.');
        } else if (window.location.pathname !== '/login') {
          sessionStorage.setItem('auth_flash_message', 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
        }

        ['accessToken', 'role', 'username', 'user'].forEach((k) => localStorage.removeItem(k));
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }

    // Các lỗi 401 trên chính endpoint /auth hoặc retry lần 2 thất bại
    if (status === 401) {
      const errMsg = data?.message || '';
      if (errMsg.includes('thiết bị khác')) {
        sessionStorage.setItem('auth_flash_message', 'Tài khoản của bạn đã được đăng nhập từ một thiết bị khác. Vui lòng đăng nhập lại.');
      } else if (window.location.pathname !== '/login') {
        sessionStorage.setItem('auth_flash_message', 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      }
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
