import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

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

    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/refresh-token");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("cuezone_user");

        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refreshToken },
          { timeout: 15000 },
        );

        const envelope = refreshResponse?.data;

        if (
          !envelope ||
          typeof envelope !== "object" ||
          envelope.success !== true ||
          !envelope.data?.accessToken
        ) {
          throw new Error("Refresh token không hợp lệ.");
        }

        const newAccessToken = envelope.data.accessToken;

        localStorage.setItem("accessToken", newAccessToken);

        if (envelope.data.refreshToken) {
          localStorage.setItem("refreshToken", envelope.data.refreshToken);
        }

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("cuezone_user");

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
