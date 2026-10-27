import api from "./api";
import type { User, AuthResponse, ApiResponse } from "../types";

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/login", { email, password });
      if (!data.success) throw new Error(data.message || "Đăng nhập thất bại");
      if (!data.data) throw new Error("Không nhận được dữ liệu xác thực từ máy chủ");
      return data.data;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || "Đăng nhập thất bại";
      throw new Error(message);
    }
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

  async forgotPassword(email: string): Promise<string> {
    const { data } = await api.post<ApiResponse>("/auth/forgot-password", { email });
    if (!data.success) throw new Error(data.message || "Yêu cầu gửi mã thất bại");
    return data.message || "Mã OTP đã được gửi đến email của bạn";
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<string> {
    const { data } = await api.post<ApiResponse>("/auth/reset-password", {
      email,
      code,
      newPassword,
    });
    if (!data.success) throw new Error(data.message || "Đặt lại mật khẩu thất bại");
    return data.message || "Đặt lại mật khẩu thành công";
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<string> {
    const { data } = await api.post<ApiResponse>("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    if (!data.success) throw new Error(data.message || "Đổi mật khẩu thất bại");
    return data.message || "Đổi mật khẩu thành công";
  },

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("cuezone_user");
  },

  getToken(): string | null {
    return localStorage.getItem("accessToken");
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem("accessToken");
  },
};
