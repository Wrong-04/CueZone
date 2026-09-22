import api from "./api";
import type { ApiResponse } from "../types";

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "user" | "table" | "pricing" | "role" | "system";
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  async getAll(): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const { data } = await api.get<ApiResponse<{ notifications: Notification[]; unreadCount: number }>>("/notifications");
    if (!data.success) throw new Error(data.message);
    return data.data!;
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
