import api from "./api";
import type { User, AuthResponse, ApiResponse } from "../types";

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/login", { email, password });
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async register(name: string, email: string, password: string, phone?: string): Promise<AuthResponse> {
    const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/register", { name, email, password, phone });
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async sendVerificationCode(name: string, email: string, password: string, phone?: string): Promise<void> {
    const { data } = await api.post<ApiResponse>("/auth/register/request", {
      name,
      email,
      password,
      phone,
    });
    if (!data.success) throw new Error(data.message);
  },

  async verifyAndRegister(email: string, code: string): Promise<AuthResponse> {
    const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/register/verify", {
      email,
      code,
    });
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async getProfile(): Promise<User> {
    const { data } = await api.get<ApiResponse<User>>("/auth/profile");
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },

  /** Quên mật khẩu — gửi OTP đặt lại mật khẩu về email. */
  async forgotPassword(email: string): Promise<void> {
    const { data } = await api.post<ApiResponse>("/auth/forgot-password", { email });
    if (!data.success) throw new Error(data.message);
  },

  /** Quên mật khẩu — xác thực OTP và đặt mật khẩu mới. */
  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const { data } = await api.post<ApiResponse>("/auth/reset-password", {
      email,
      code,
      newPassword,
    });
    if (!data.success) throw new Error(data.message);
  },

  /** Đổi mật khẩu (đã đăng nhập) — xác thực mật khẩu hiện tại rồi gửi OTP. */
  async requestChangePassword(currentPassword: string, newPassword: string): Promise<void> {
    const { data } = await api.post<ApiResponse>("/auth/change-password/request", {
      currentPassword,
      newPassword,
    });
    if (!data.success) throw new Error(data.message);
  },

  /** Đổi mật khẩu (đã đăng nhập) — xác thực OTP rồi lưu mật khẩu mới. */
  async verifyChangePassword(code: string, newPassword: string): Promise<void> {
    const { data } = await api.post<ApiResponse>("/auth/change-password/verify", {
      code,
      newPassword,
    });
    if (!data.success) throw new Error(data.message);
  },

  getToken(): string | null {
    return localStorage.getItem("accessToken");
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem("accessToken");
  },
};
