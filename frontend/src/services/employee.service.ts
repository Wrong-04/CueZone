import api from "./api";
import type { User, ApiResponse } from "../types";

export const employeeService = {
  async getAll(filters?: { role?: string; isActive?: string; search?: string }): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters?.role) params.append("role", filters.role);
    if (filters?.isActive) params.append("isActive", filters.isActive);
    if (filters?.search) params.append("search", filters.search);
    const { data } = await api.get<ApiResponse<User[]>>(`/users?${params.toString()}`);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async getById(id: string): Promise<User> {
    const { data } = await api.get<ApiResponse<User>>(`/users/${id}`);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async create(userData: any): Promise<User> {
    const { data } = await api.post<ApiResponse<User>>("/users", userData);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async update(id: string, userData: any): Promise<User> {
    const { data } = await api.put<ApiResponse<User>>(`/users/${id}`, userData);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async toggleLock(id: string): Promise<User> {
    const { data } = await api.put<ApiResponse<User>>(`/users/${id}/toggle-lock`);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async toggleActive(id: string): Promise<User> {
    const { data } = await api.put<ApiResponse<User>>(`/users/${id}/toggle-active`);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async delete(id: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/users/${id}`);
    if (!data.success) throw new Error(data.message);
  },
};
