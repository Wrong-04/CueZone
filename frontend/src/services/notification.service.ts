import api from "./api";
import type { ApiResponse } from "../types";

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  content: string;
  type: "user" | "table" | "pricing" | "role" | "wallet" | "tournament" | "system";
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPage {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const notificationService = {
  async getAll(page = 1, limit = 20): Promise<NotificationPage> {
    const { data } = await api.get<ApiResponse<NotificationPage>>("/notifications", {
      params: { page, limit },
    });
    if (!data.success || !data.data) throw new Error(data.message || "Không thể tải thông báo");
    return data.data;
  },

  async createPersonal(input: {
    title: string;
    content: string;
    type?: Notification["type"];
  }): Promise<Notification> {
    const { data } = await api.post<ApiResponse<Notification>>("/notifications", input);
    if (!data.success || !data.data) throw new Error(data.message || "Không thể tạo thông báo");
    return data.data;
  },

  async markRead(id: string): Promise<void> {
    const { data } = await api.put(`/notifications/${id}/read`);
    if (!data.success) throw new Error(data.message);
  },

  async markAllRead(): Promise<void> {
    const { data } = await api.put("/notifications/read-all");
    if (!data.success) throw new Error(data.message);
  },

  async delete(id: string): Promise<void> {
    const { data } = await api.delete(`/notifications/${id}`);
    if (!data.success) throw new Error(data.message);
  },

  async clearAll(): Promise<void> {
    const { data } = await api.delete("/notifications");
    if (!data.success) throw new Error(data.message);
  },
};
