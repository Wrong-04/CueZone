import { Waitlist, WaitlistStatus } from "./waitlist.model";
import { emitWaitlistUpdated, emitNotification } from "../../utils/socketHolder";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";
import { User, UserRole } from "../user/user.model";

const notifications = new NotificationService();

export class WaitlistService {
  async getActiveList() {
    return Waitlist.find({ status: WaitlistStatus.WAITING }).sort({ createdAt: 1 });
  }

  async create(input: {
    customerName: string;
    phone: string;
    guests?: number;
    preferredType?: string;
    note?: string;
  }) {
    if (!input.customerName?.trim() || !input.phone?.trim()) {
      throw Object.assign(new Error("Vui lòng cung cấp họ tên và số điện thoại liên hệ"), {
        httpCode: 400,
      });
    }
    const joinedTime = new Date().toLocaleTimeString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
    });
    const entry = await Waitlist.create({
      customerName: input.customerName.trim(),
      phone: input.phone.trim(),
      guests: input.guests && input.guests > 0 ? Number(input.guests) : 2,
      preferredType: input.preferredType?.trim() || "Bàn Bida Lỗ (Pool)",
      note: input.note?.trim() || "Đăng ký từ Web Portal",
      joinedTime,
      status: WaitlistStatus.WAITING,
    });

    emitWaitlistUpdated(entry);

    // Phát thông báo tới toàn bộ nhân viên vận hành POS
    try {
      await notifications.createForRoles(
        {
          title: "Khách đăng ký hàng chờ bàn",
          content: `Khách ${entry.customerName} (${entry.phone}) đang chờ ${entry.preferredType} (${entry.guests} người).`,
          type: NotificationType.TABLE,
        },
        [UserRole.ADMIN, UserRole.STAFF, UserRole.CASHIER],
      );
    } catch (e) {
      console.error("Lỗi gửi thông báo waitlist:", e);
    }

    return entry;
  }

  async updateStatus(id: string, status: WaitlistStatus, assignedTableId?: string) {
    const entry = await Waitlist.findById(id);
    if (!entry) {
      throw Object.assign(new Error("Không tìm thấy thông tin lượt chờ"), { httpCode: 404 });
    }
    entry.status = status;
    if (assignedTableId) {
      entry.assignedTableId = assignedTableId as any;
    }
    await entry.save();
    emitWaitlistUpdated(entry);
    return entry;
  }

  async remove(id: string) {
    const entry = await Waitlist.findByIdAndDelete(id);
    if (!entry) {
      throw Object.assign(new Error("Không tìm thấy thông tin lượt chờ"), { httpCode: 404 });
    }
    emitWaitlistUpdated({ _id: id, deleted: true });
    return entry;
  }
}
