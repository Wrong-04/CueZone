import { PricingTier, IPricingTier } from "./pricing.model";
import { CreatePricingTierDTO, UpdatePricingTierDTO } from "./dto/pricing.dto";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";

const notificationService = new NotificationService();

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
    const updateData: any = { ...dto };
    if (dto.standardPrice !== undefined || dto.vipPrice !== undefined) {
      updateData.prices = {
        standard: dto.standardPrice,
        vip: dto.vipPrice,
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
