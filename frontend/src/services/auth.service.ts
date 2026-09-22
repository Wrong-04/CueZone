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

  getToken(): string | null {
    return localStorage.getItem("accessToken");
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem("accessToken");
  },
};
