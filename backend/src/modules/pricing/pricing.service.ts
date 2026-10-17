import { PricingTier, IPricingTier } from "./pricing.model";
import { CreatePricingTierDTO, UpdatePricingTierDTO } from "./dto/pricing.dto";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";

const notificationService = new NotificationService();

function toMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1] || "0", 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
    throw new Error(`Định dạng giờ không hợp lệ: "${timeStr}". Vui lòng dùng định dạng HH:mm.`);
  }
  if (hours === 24 && minutes > 0) {
    throw new Error(`Định dạng giờ không hợp lệ: "${timeStr}".`);
  }
  return hours * 60 + minutes;
}

function resolveDays(dayType?: string, daysOfWeek?: number[]): number[] {
  if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
    return daysOfWeek;
  }
  if (dayType === "weekday") return [1, 2, 3, 4, 5];
  if (dayType === "weekend") return [0, 6];
  return [0, 1, 2, 3, 4, 5, 6];
}

async function validatePricingTier(
  tierData: Partial<IPricingTier> & { standardPrice?: number; vipPrice?: number },
  excludeId?: string
): Promise<void> {
  const { startTime, endTime, dayType, daysOfWeek, prices, standardPrice, vipPrice, name } = tierData as any;

  if (startTime && endTime) {
    const startMins = toMinutes(startTime);
    const endMins = toMinutes(endTime);

    if (startMins >= endMins) {
      throw new Error(`Thời gian bắt đầu (${startTime}) phải trước thời gian kết thúc (${endTime}).`);
    }

    const targetDays = resolveDays(dayType, daysOfWeek);

    const existingTiers = await PricingTier.find(
      excludeId ? { _id: { $ne: excludeId }, isActive: true } : { isActive: true }
    );

    for (const existing of existingTiers) {
      const existingDays = resolveDays(existing.dayType, existing.daysOfWeek);
      const hasCommonDay = targetDays.some((d) => existingDays.includes(d));

      if (hasCommonDay) {
        const existStart = toMinutes(existing.startTime);
        const existEnd = toMinutes(existing.endTime);

        const isOverlap = Math.max(startMins, existStart) < Math.min(endMins, existEnd);
        if (isOverlap) {
          throw new Error(
            `Khung giờ "${name || "đang tạo"}" (${startTime} – ${endTime}) bị chồng lấn thời gian với khung giờ "${existing.name}" (${existing.startTime} – ${existing.endTime}) trong cùng ngày áp dụng.`
          );
        }
      }
    }
  }

  const std = prices?.standard !== undefined ? prices.standard : standardPrice;
  const vip = prices?.vip !== undefined ? prices.vip : vipPrice;
  if (std !== undefined && std < 0) {
    throw new Error("Giá bàn tiêu chuẩn (standard) không được âm.");
  }
  if (vip !== undefined && vip < 0) {
    throw new Error("Giá bàn VIP không được âm.");
  }
}

export class PricingTierService {
  async getAll(): Promise<IPricingTier[]> {
    return PricingTier.find().sort({ startTime: 1 });
  }

  async getById(id: string): Promise<IPricingTier> {
    const tier = await PricingTier.findById(id);
    if (!tier) throw new Error("Không tìm thấy khung giờ");
    return tier;
  }

  async create(dto: any): Promise<IPricingTier> {
    await validatePricingTier(dto);

    const prices = dto.prices || {
      standard: dto.standardPrice,
      vip: dto.vipPrice,
    };
    const tier = await PricingTier.create({
      name: dto.name,
      dayType: dto.dayType,
      startTime: dto.startTime,
      endTime: dto.endTime,
      daysOfWeek: dto.daysOfWeek || [],
      prices,
    });
    notificationService.create({
      title: "Thêm khung giờ giá mới",
      message: `Đã thêm khung giờ "${tier.name}" (${tier.startTime} – ${tier.endTime}).`,
      type: NotificationType.PRICING,
    }).catch(() => {});
    return tier;
  }

  async update(id: string, dto: any): Promise<IPricingTier> {
    const existing = await PricingTier.findById(id);
    if (!existing) throw new Error("Không tìm thấy khung giờ");

    const merged = {
      name: dto.name ?? existing.name,
      dayType: dto.dayType ?? existing.dayType,
      startTime: dto.startTime ?? existing.startTime,
      endTime: dto.endTime ?? existing.endTime,
      daysOfWeek: dto.daysOfWeek ?? existing.daysOfWeek,
      prices: {
        standard: dto.standardPrice ?? dto.prices?.standard ?? existing.prices.standard,
        vip: dto.vipPrice ?? dto.prices?.vip ?? existing.prices.vip,
      },
      isActive: dto.isActive ?? existing.isActive,
    };

    if (merged.isActive !== false) {
      await validatePricingTier(merged, id);
    }

    const updateData: any = { ...dto };
    if (dto.standardPrice !== undefined || dto.vipPrice !== undefined) {
      updateData.prices = {
        standard: dto.standardPrice ?? existing.prices.standard,
        vip: dto.vipPrice ?? existing.prices.vip,
      };
      delete updateData.standardPrice;
      delete updateData.vipPrice;
    }
    const tier = await PricingTier.findByIdAndUpdate(id, updateData, { new: true });
    if (!tier) throw new Error("Không tìm thấy khung giờ");
    notificationService.create({
      title: "Cập nhật khung giờ giá",
      message: `Đã cập nhật khung giờ "${tier.name}" (${tier.startTime} – ${tier.endTime}).`,
      type: NotificationType.PRICING,
    }).catch(() => {});
    return tier;
  }

  async delete(id: string): Promise<void> {
    const tier = await PricingTier.findById(id);
    if (!tier) throw new Error("Không tìm thấy khung giờ");
    await PricingTier.findByIdAndDelete(id);
    notificationService.create({
      title: "Xóa khung giờ giá",
      message: `Đã xóa khung giờ "${tier.name}" (${tier.startTime} – ${tier.endTime}).`,
      type: NotificationType.PRICING,
    }).catch(() => {});
  }

  async activate(id: string): Promise<IPricingTier> {
    await PricingTier.updateMany({}, { isCurrentlyActive: false });
    const tier = await PricingTier.findByIdAndUpdate(id, { isCurrentlyActive: true }, { new: true });
    if (!tier) throw new Error("Không tìm thấy khung giờ");
    notificationService.create({
      title: "Kích hoạt khung giờ giá",
      message: `Đang áp dụng khung giờ "${tier.name}" (${tier.startTime} – ${tier.endTime}).`,
      type: NotificationType.PRICING,
    }).catch(() => {});
    return tier;
  }
}
