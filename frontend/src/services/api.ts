import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Dọn toàn bộ session local khi 401 không thể phục hồi
 * (refresh thất bại, refresh trả success:false hoặc không có refresh token).
 * Xóa cả cuezone_user và báo AuthContext qua event để setUser(null),
 * tránh user vẫn "đăng nhập lỏng" sau khi redirect về /login.
 */
const endSession = () => {
  const hadSession = Boolean(
    localStorage.getItem("accessToken") || localStorage.getItem("refreshToken")
  );
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("cuezone_user");
  if (!hadSession) return;
  window.dispatchEvent(new Event("auth:session-expired"));
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
          if (data.success) {
            localStorage.setItem("accessToken", data.data.accessToken);
            localStorage.setItem("refreshToken", data.data.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
            return api(originalRequest);
          }
          // Refresh token bị backend từ chối (success:false) → hết phiên
          endSession();
        } catch {
          endSession();
        }
      } else {
        // 401 mà không có refresh token → không thể phục hồi phiên
        endSession();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
