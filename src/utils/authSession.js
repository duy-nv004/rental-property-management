/**
 * Quản lý hàng đợi và trạng thái Refresh Token (Mutex Queue) cho Axios.
 * Đảm bảo khi nhiều API cùng nhận 401, chỉ có 1 request refresh duy nhất được gửi.
 */

export const isAuthEndpoint = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('/auth/login') || url.includes('/auth/refresh-token') || url.includes('/auth/register');
};

export const createRefreshQueue = () => {
    let refreshing = false;
    let queue = [];

    return {
        isRefreshing() {
            return refreshing;
        },
        startRefreshing() {
            refreshing = true;
        },
        enqueue(resolve, reject) {
            queue.push({ resolve, reject });
        },
        resolveAll(newToken) {
            refreshing = false;
            while (queue.length > 0) {
                const item = queue.shift();
                try {
                    item.resolve(newToken);
                } catch (e) {
                    // ignore individual resolver error
                }
            }
        },
        rejectAll(error) {
            refreshing = false;
            while (queue.length > 0) {
                const item = queue.shift();
                try {
                    item.reject(error);
                } catch (e) {
                    // ignore individual reject error
                }
            }
        },
        reset() {
            refreshing = false;
            queue = [];
        }
    };
};

/**
 * Thực hiện đăng xuất người dùng:
 * 1. Gọi API POST /auth/logout để thu hồi refresh token trên backend và xóa HttpOnly Cookie.
 * 2. Dọn sạch localStorage client.
 * 3. Chuyển hướng về trang /login.
 */
export const performLogout = async (apiClient, navigate) => {
    try {
        if (apiClient && typeof apiClient.post === 'function') {
            await apiClient.post('/auth/logout');
        }
    } catch (e) {
        // Bỏ qua lỗi kết nối máy chủ để người dùng vẫn đăng xuất client thành công
    } finally {
        ['accessToken', 'role', 'username', 'user'].forEach((k) => localStorage.removeItem(k));
        localStorage.clear();
        if (typeof navigate === 'function') {
            navigate('/login');
        } else if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
};
