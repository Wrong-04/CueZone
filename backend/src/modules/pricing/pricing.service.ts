import { PricingTier, IPricingTier } from "./pricing.model";
import { CreatePricingTierDTO, UpdatePricingTierDTO } from "./dto/pricing.dto";

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
    return PricingTier.create({
      name: dto.name,
      dayType: dto.dayType,
      startTime: dto.startTime,
      endTime: dto.endTime,
      daysOfWeek: dto.daysOfWeek || [],
      prices,
    });
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
    return tier;
  }

  async delete(id: string): Promise<void> {
    const tier = await PricingTier.findById(id);
    if (!tier) throw new Error("Không tìm thấy khung giờ");
    await PricingTier.findByIdAndDelete(id);
  }

  async activate(id: string): Promise<IPricingTier> {
    await PricingTier.updateMany({}, { isCurrentlyActive: false });
    const tier = await PricingTier.findByIdAndUpdate(id, { isCurrentlyActive: true }, { new: true });
    if (!tier) throw new Error("Không tìm thấy khung giờ");
    return tier;
  }
}
