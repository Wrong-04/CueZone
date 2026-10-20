import mongoose from "mongoose";
import { Request, Response } from "express";
import { NotificationType } from "./notification.model";
import { NotificationService } from "./notification.service";

const notificationService = new NotificationService();

const currentUserId = (req: Request): string | null => {
  const userId = (req as any).user?.userId;
  return typeof userId === "string" && mongoose.isValidObjectId(userId) ? userId : null;
};

const unauthorized = (res: Response) =>
  res.status(401).json({ success: false, message: "Phiên đăng nhập không hợp lệ" });

const serverError = (res: Response) =>
  res.status(500).json({ success: false, message: "Không thể xử lý thông báo lúc này" });

const positiveInteger = (value: unknown, fallback: number, max?: number): number | null => {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (max !== undefined && parsed > max)) return null;
  return parsed;
};

export const getAll = async (req: Request, res: Response) => {
  const userId = currentUserId(req);
  if (!userId) return unauthorized(res);

  const page = positiveInteger(req.query.page, 1);
  const limit = positiveInteger(req.query.limit, 20, 100);
  if (page === null || limit === null) {
    return res.status(400).json({
      success: false,
      message: "Trang phải lớn hơn 0 và giới hạn mỗi trang từ 1 đến 100",
    });
  }

  try {
    const data = await notificationService.getForUser(userId, page, limit);
    return res.json({ success: true, data });
  } catch {
    return serverError(res);
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  const userId = currentUserId(req);
  if (!userId) return unauthorized(res);

  try {
    const unreadCount = await notificationService.getUnreadCount(userId);
    return res.json({ success: true, data: { unreadCount } });
  } catch {
    return serverError(res);
  }
};

export const create = async (req: Request, res: Response) => {
  const userId = currentUserId(req);
  if (!userId) return unauthorized(res);

  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  const type = req.body?.type;
  if (
    !title || title.length > 120 || !content || content.length > 1000 ||
    (type !== undefined && !Object.values(NotificationType).includes(type))
  ) {
    return res.status(400).json({
      success: false,
      message: "Tiêu đề tối đa 120 ký tự, nội dung tối đa 1000 ký tự và loại thông báo phải hợp lệ",
    });
  }

  try {
    const notification = await notificationService.createForUser(userId, {
      title,
      content,
      type,
    });
    return res.status(201).json({
      success: true,
      message: "Tạo thông báo thành công",
      data: notification,
    });
  } catch (error: any) {
    if (error.message === "Người dùng không còn hoạt động") return unauthorized(res);
    return serverError(res);
  }
};

export const markRead = async (req: Request, res: Response) => {
  const userId = currentUserId(req);
  if (!userId) return unauthorized(res);

  try {
    const notification = await notificationService.markRead(userId, req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông báo" });
    }
    return res.json({ success: true, data: notification });
  } catch {
    return serverError(res);
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  const userId = currentUserId(req);
  if (!userId) return unauthorized(res);

  try {
    const modifiedCount = await notificationService.markAllRead(userId);
    return res.json({
      success: true,
      message: "Đã đánh dấu tất cả thông báo là đã đọc",
      data: { modifiedCount },
    });
  } catch {
    return serverError(res);
  }
};

export const delete_ = async (req: Request, res: Response) => {
  const userId = currentUserId(req);
  if (!userId) return unauthorized(res);

  try {
    const deleted = await notificationService.delete(userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông báo" });
    }
    return res.json({ success: true, message: "Đã xóa thông báo" });
  } catch {
    return serverError(res);
  }
};

export const clearAll = async (req: Request, res: Response) => {
  const userId = currentUserId(req);
  if (!userId) return unauthorized(res);

  try {
    const deletedCount = await notificationService.clearAll(userId);
    return res.json({
      success: true,
      message: "Đã xóa thông báo của bạn",
      data: { deletedCount },
    });
  } catch {
    return serverError(res);
  }
};
