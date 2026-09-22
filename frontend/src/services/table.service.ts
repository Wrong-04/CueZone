import api from "./api";
import type { BilliardTable, PricingTier, ApiResponse } from "../types";

export const tableService = {
  async getAll(filters?: { type?: string; status?: string; area?: string }): Promise<BilliardTable[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append("type", filters.type);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.area) params.append("area", filters.area);
    const { data } = await api.get<ApiResponse<BilliardTable[]>>(`/tables?${params.toString()}`);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async getById(id: string): Promise<BilliardTable> {
    const { data } = await api.get<ApiResponse<BilliardTable>>(`/tables/${id}`);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async create(tableData: any): Promise<BilliardTable> {
    const { data } = await api.post<ApiResponse<BilliardTable>>("/tables", tableData);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async update(id: string, tableData: any): Promise<BilliardTable> {
    const { data } = await api.put<ApiResponse<BilliardTable>>(`/tables/${id}`, tableData);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async updateStatus(id: string, status: string): Promise<BilliardTable> {
    const { data } = await api.put<ApiResponse<BilliardTable>>(`/tables/${id}/status`, { status });
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async delete(id: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/tables/${id}`);
    if (!data.success) throw new Error(data.message);
  },
};

export const pricingService = {
  async getAll(): Promise<PricingTier[]> {
    const { data } = await api.get<ApiResponse<PricingTier[]>>("/pricing");
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async getById(id: string): Promise<PricingTier> {
    const { data } = await api.get<ApiResponse<PricingTier>>(`/pricing/${id}`);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async create(tierData: any): Promise<PricingTier> {
    const { data } = await api.post<ApiResponse<PricingTier>>("/pricing", tierData);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async update(id: string, tierData: any): Promise<PricingTier> {
    const { data } = await api.put<ApiResponse<PricingTier>>(`/pricing/${id}`, tierData);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async activate(id: string): Promise<PricingTier> {
    const { data } = await api.put<ApiResponse<PricingTier>>(`/pricing/${id}/activate`);
    if (!data.success) throw new Error(data.message);
    return data.data!;
  },

  async delete(id: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/pricing/${id}`);
    if (!data.success) throw new Error(data.message);
  },
};
