import axios from 'axios';

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
    // Lấy token từ localStorage (hoặc nơi bạn lưu trữ)
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
    // Xử lý lỗi tập trung
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error("Phiên đăng nhập hết hạn!");
          // Có thể redirect về trang login ở đây
          break;
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