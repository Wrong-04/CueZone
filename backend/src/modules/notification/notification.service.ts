import { Notification, INotification, NotificationType } from "./notification.model";
import { emitNotification } from "../../utils/socketHolder";

export class NotificationService {
  async getAll(limit = 50): Promise<INotification[]> {
    return Notification.find().sort({ createdAt: -1 }).limit(limit);
  }

  async getUnreadCount(): Promise<number> {
    return Notification.countDocuments({ isRead: false });
  }

  async markRead(id: string): Promise<INotification> {
    const n = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!n) throw new Error("Không tìm thấy thông báo");
    return n;
  }

  async markAllRead(): Promise<void> {
    await Notification.updateMany({ isRead: false }, { isRead: true });
  }

  async delete(id: string): Promise<void> {
    await Notification.findByIdAndDelete(id);
  }

  async clearAll(): Promise<void> {
    await Notification.deleteMany({});
  }

  async create(data: { title: string; message: string; type?: NotificationType }): Promise<INotification> {
    const notification = await Notification.create({
      title: data.title,
      message: data.message,
      type: data.type || NotificationType.SYSTEM,
    });

    try {
      const unreadCount = await this.getUnreadCount();
      emitNotification("notification:new", {
        notification,
        unreadCount,
      });
    } catch {
      // ignore emit errors
    }

    return notification;
  }
}
