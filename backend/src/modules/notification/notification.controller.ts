import { Request, Response } from "express";
import { NotificationService } from "./notification.service";

const notificationService = new NotificationService();

export const getAll = async (_req: Request, res: Response) => {
  try {
    const notifications = await notificationService.getAll();
    const unreadCount = await notificationService.getUnreadCount();
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
};

export const getUnreadCount = async (_req: Request, res: Response) => {
  try {
    const unreadCount = await notificationService.getUnreadCount();
    res.json({ success: true, data: { unreadCount } });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
};

export const markRead = async (req: Request, res: Response) => {
  try {
    const notification = await notificationService.markRead(req.params.id);
    res.json({ success: true, data: notification });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
};

export const markAllRead = async (_req: Request, res: Response) => {
  try {
    await notificationService.markAllRead();
    res.json({ success: true, message: "Đã đánh dấu tất cả đã đọc" });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
};

export const delete_ = async (req: Request, res: Response) => {
  try {
    await notificationService.delete(req.params.id);
    res.json({ success: true, message: "Đã xóa thông báo" });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
};

export const clearAll = async (_req: Request, res: Response) => {
  try {
    await notificationService.clearAll();
    res.json({ success: true, message: "Đã xóa tất cả thông báo" });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
};
