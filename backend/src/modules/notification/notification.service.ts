import mongoose from "mongoose";
import { User, UserRole } from "../user/user.model";
import { emitNotification } from "../../utils/socketHolder";
import { Notification, INotification, NotificationType } from "./notification.model";

export interface NotificationInput {
  title: string;
  content?: string;
  message?: string;
  type?: NotificationType;
}

export interface NotificationPage {
  notifications: INotification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const notificationContent = (data: NotificationInput) => {
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const content =
    typeof data.content === "string"
      ? data.content.trim()
      : typeof data.message === "string"
        ? data.message.trim()
        : "";

  if (!title || title.length > 120 || !content || content.length > 1000) {
    throw new Error("Tiêu đề hoặc nội dung thông báo không hợp lệ");
  }

  return { title, content, type: data.type || NotificationType.SYSTEM };
};

const notifyClients = () => {
  try {
    emitNotification("notification:new");
  } catch {}
};

export class NotificationService {
  async getForUser(userId: string, page = 1, limit = 20): Promise<NotificationPage> {
    if (!mongoose.isValidObjectId(userId)) throw new Error("Người dùng không hợp lệ");

    const filter = { userId };
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, isRead: false });
  }

  async markRead(userId: string, id: string): Promise<INotification | null> {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(id)) return null;
    return Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true } },
      { new: true, runValidators: true },
    );
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } },
    );
    return result.modifiedCount;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(id)) return false;
    const result = await Notification.deleteOne({ _id: id, userId });
    return result.deletedCount === 1;
  }

  async clearAll(userId: string): Promise<number> {
    const result = await Notification.deleteMany({ userId });
    return result.deletedCount ?? 0;
  }

  async createForUser(userId: string, data: NotificationInput): Promise<INotification> {
    if (!mongoose.isValidObjectId(userId)) throw new Error("Người dùng không hợp lệ");
    const user = await User.exists({ _id: userId, isActive: true, isLocked: false });
    if (!user) throw new Error("Người dùng không còn hoạt động");

    const notification = await Notification.create({
      userId,
      ...notificationContent(data),
    });
    notifyClients();
    return notification;
  }

  async create(data: NotificationInput): Promise<INotification[]> {
    const content = notificationContent(data);
    const recipients = await User.find({
      role: { $in: [UserRole.ADMIN, UserRole.STAFF] },
      isActive: true,
      isLocked: false,
    })
      .select("_id")
      .lean();

    if (recipients.length === 0) return [];

    const notifications = await Notification.insertMany(
      recipients.map((user) => ({ userId: user._id, ...content })),
    );
    notifyClients();
    return notifications;
  }
}
