import mongoose, { ClientSession, Types } from "mongoose";
import { Voucher, VoucherDiscountType, VoucherUsage, IVoucher } from "./voucher.model";
import { phonePattern } from "../../utils/phone";

const httpError = (message: string, httpCode = 400, code?: string) =>
  Object.assign(new Error(message), { httpCode, code });

export interface VoucherInput {
  code?: unknown;
  description?: unknown;
  discountType?: unknown;
  discountValue?: unknown;
  maxDiscountAmount?: unknown;
  minOrderAmount?: unknown;
  startsAt?: unknown;
  expiresAt?: unknown;
  maxUses?: unknown;
  isActive?: unknown;
  targetAudience?: unknown;
}

function normalizedCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function validateInput(input: VoucherInput, partial = false) {
  const updates: Record<string, unknown> = {};
  const code = normalizedCode(input.code);
  if (!partial || input.code !== undefined) {
    if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) {
      throw httpError("Mã voucher phải gồm 3-32 ký tự chữ, số, gạch ngang hoặc gạch dưới");
    }
    updates.code = code;
  }

  if (!partial || input.description !== undefined) {
    if (input.description !== undefined && typeof input.description !== "string") {
      throw httpError("Mô tả voucher không hợp lệ");
    }
    updates.description = typeof input.description === "string" ? input.description.trim() : "";
  }

  if (!partial || input.discountType !== undefined) {
    if (!Object.values(VoucherDiscountType).includes(input.discountType as VoucherDiscountType)) {
      throw httpError("Loại giảm giá phải là phần trăm hoặc số tiền cố định");
    }
    updates.discountType = input.discountType;
  }

  if (!partial || input.discountValue !== undefined) {
    if (!Number.isSafeInteger(input.discountValue) || Number(input.discountValue) < 1) {
      throw httpError("Giá trị giảm giá phải là số nguyên dương");
    }
    updates.discountValue = Number(input.discountValue);
  }

  if (!partial || input.maxDiscountAmount !== undefined) {
    if (
      input.maxDiscountAmount !== undefined &&
      input.maxDiscountAmount !== null &&
      input.maxDiscountAmount !== "" &&
      (!Number.isSafeInteger(Number(input.maxDiscountAmount)) || Number(input.maxDiscountAmount) < 0)
    ) {
      throw httpError("Mức giảm tối đa phải là số nguyên không âm");
    }
    updates.maxDiscountAmount =
      input.maxDiscountAmount === null || input.maxDiscountAmount === "" || input.maxDiscountAmount === undefined
        ? undefined
        : Number(input.maxDiscountAmount);
  }

  if (!partial || input.minOrderAmount !== undefined) {
    if (
      input.minOrderAmount !== undefined &&
      (!Number.isSafeInteger(input.minOrderAmount) || Number(input.minOrderAmount) < 0)
    ) {
      throw httpError("Giá trị đơn tối thiểu phải là số nguyên không âm");
    }
    updates.minOrderAmount = Number(input.minOrderAmount ?? 0);
  }

  if (!partial || input.startsAt !== undefined) {
    const value = input.startsAt;
    const date = new Date(value as string);
    if (value === undefined || !Number.isFinite(date.getTime())) {
      throw httpError("Thời gian bắt đầu không hợp lệ");
    }
    updates.startsAt = date;
  }

  if (!partial || input.expiresAt !== undefined) {
    const value = input.expiresAt;
    if (value === null || value === "" || value === undefined) {
      updates.expiresAt = null;
    } else {
      const date = new Date(value as string);
      if (!Number.isFinite(date.getTime())) {
        throw httpError("Thời gian hết hạn không hợp lệ");
      }
      updates.expiresAt = date;
    }
  }

  if (!partial || input.maxUses !== undefined) {
    if (
      input.maxUses !== undefined &&
      input.maxUses !== null &&
      (!Number.isSafeInteger(input.maxUses) || Number(input.maxUses) < 1)
    ) {
      throw httpError("Số lượt sử dụng tối đa phải là số nguyên dương");
    }
    updates.maxUses = input.maxUses === null || input.maxUses === "" ? undefined : input.maxUses;
  }

  if (!partial || input.targetAudience !== undefined) {
    const validAudiences = ["all", "new_member", "vip"];
    const aud = input.targetAudience;
    if (aud !== undefined && aud !== null && aud !== "" && !validAudiences.includes(aud as string)) {
      throw httpError("Đối tượng áp dụng không hợp lệ");
    }
    updates.targetAudience = aud || "all";
  }

  if (input.isActive !== undefined) {
    if (typeof input.isActive !== "boolean") throw httpError("Trạng thái voucher không hợp lệ");
    updates.isActive = input.isActive;
  } else if (!partial) {
    updates.isActive = true;
  }

  const discountType = (updates.discountType as VoucherDiscountType | undefined);
  const discountValue = updates.discountValue as number | undefined;
  if (discountType === VoucherDiscountType.PERCENT && discountValue !== undefined && discountValue > 100) {
    throw httpError("Mức giảm theo phần trăm không được vượt quá 100%");
  }
  const startsAt = updates.startsAt as Date | undefined;
  const expiresAt = updates.expiresAt as Date | null | undefined;
  if (startsAt && expiresAt && startsAt >= expiresAt) {
    throw httpError("Thời gian bắt đầu phải trước thời gian hết hạn");
  }
  return updates;
}

function assertValidAt(voucher: IVoucher, subtotal: number, now = new Date()) {
  if (!voucher.isActive) throw httpError("Voucher đã bị ngừng hoạt động", 422, "VOUCHER_INACTIVE");
  if (voucher.startsAt > now) throw httpError("Voucher chưa đến thời gian sử dụng", 422, "VOUCHER_NOT_STARTED");
  if (voucher.expiresAt && voucher.expiresAt <= now) throw httpError("Voucher đã hết hạn", 422, "VOUCHER_EXPIRED");
  if (voucher.maxUses !== undefined && voucher.usageCount >= voucher.maxUses) {
    throw httpError("Voucher đã hết lượt sử dụng", 422, "VOUCHER_EXHAUSTED");
  }
  if (!Number.isSafeInteger(subtotal) || subtotal < 0) {
    throw httpError("Giá trị đơn hàng không hợp lệ");
  }
  if (subtotal < voucher.minOrderAmount) {
    throw httpError(
      `Đơn hàng phải đạt tối thiểu ${voucher.minOrderAmount.toLocaleString("vi-VN")}đ`,
      422,
      "VOUCHER_MIN_ORDER",
    );
  }
}

export function calculateVoucherDiscount(voucher: IVoucher, subtotal: number) {
  let rawDiscount =
    voucher.discountType === VoucherDiscountType.PERCENT
      ? Math.round((subtotal * voucher.discountValue) / 100)
      : voucher.discountValue;
  if (
    voucher.discountType === VoucherDiscountType.PERCENT &&
    voucher.maxDiscountAmount !== undefined &&
    voucher.maxDiscountAmount !== null &&
    voucher.maxDiscountAmount > 0
  ) {
    rawDiscount = Math.min(rawDiscount, voucher.maxDiscountAmount);
  }
  return Math.min(subtotal, rawDiscount);
}

export class VoucherService {
  async list() {
    return Voucher.find().sort({ createdAt: -1 }).lean();
  }

  async getById(id: string) {
    if (!mongoose.isValidObjectId(id)) throw httpError("Mã voucher không hợp lệ");
    const voucher = await Voucher.findById(id);
    if (!voucher) throw httpError("Không tìm thấy voucher", 404);
    return voucher;
  }

  async create(input: VoucherInput, createdBy: string) {
    if (!mongoose.isValidObjectId(createdBy)) throw httpError("Tài khoản quản lý không hợp lệ", 401);
    const updates = validateInput(input);
    const duplicate = await Voucher.exists({ code: updates.code });
    if (duplicate) throw httpError("Mã voucher đã tồn tại", 409, "VOUCHER_CODE_EXISTS");
    try {
      return await Voucher.create({ ...updates, createdBy: new Types.ObjectId(createdBy) });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw httpError("Mã voucher đã tồn tại", 409, "VOUCHER_CODE_EXISTS");
      }
      throw error;
    }
  }

  async update(id: string, input: VoucherInput, updatedBy?: string) {
    if (!mongoose.isValidObjectId(id)) throw httpError("Mã voucher không hợp lệ");
    const updates = validateInput(input, true);
    if (Object.keys(updates).length === 0) throw httpError("Không có thông tin voucher cần cập nhật");
    if (updates.code && (await Voucher.exists({ code: updates.code, _id: { $ne: id } }))) {
      throw httpError("Mã voucher đã tồn tại", 409, "VOUCHER_CODE_EXISTS");
    }
    const voucher = await Voucher.findById(id);
    if (!voucher) throw httpError("Không tìm thấy voucher", 404);
    if (voucher.usageCount > 0 && (updates.discountType || updates.discountValue)) {
      throw httpError("Không thể đổi loại hoặc giá trị giảm sau khi voucher đã được sử dụng", 409);
    }
    if (!voucher.createdBy && updatedBy && mongoose.isValidObjectId(updatedBy)) {
      voucher.createdBy = new Types.ObjectId(updatedBy);
    }
    Object.assign(voucher, updates);
    if (
      voucher.maxUses !== undefined &&
      voucher.maxUses < voucher.usageCount
    ) {
      throw httpError("Số lượt tối đa không được thấp hơn số lượt đã sử dụng", 409);
    }
    if (voucher.expiresAt && voucher.startsAt >= voucher.expiresAt) {
      throw httpError("Thời gian bắt đầu phải trước thời gian hết hạn");
    }
    if (
      voucher.discountType === VoucherDiscountType.PERCENT &&
      voucher.discountValue > 100
    ) {
      throw httpError("Mức giảm theo phần trăm không được vượt quá 100%");
    }
    try {
      await voucher.save();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw httpError("Mã voucher đã tồn tại", 409, "VOUCHER_CODE_EXISTS");
      }
      throw error;
    }
    return voucher;
  }

  async remove(id: string) {
    const voucher = await this.getById(id);
    if (voucher.usageCount > 0) {
      throw httpError("Voucher đã được sử dụng, hãy ngừng hoạt động thay vì xóa", 409);
    }
    await voucher.deleteOne();
  }

  async getUsageHistory(id: string) {
    if (!mongoose.isValidObjectId(id)) throw httpError("Mã voucher không hợp lệ");
    if (!(await Voucher.exists({ _id: id }))) throw httpError("Không tìm thấy voucher", 404);
    return VoucherUsage.find({ voucherId: id }).sort({ usedAt: -1 }).lean();
  }

  async validate(codeValue: unknown, subtotal: number, customerPhone?: string) {
    const code = normalizedCode(codeValue);
    if (!code) throw httpError("Vui lòng nhập mã voucher", 422, "VOUCHER_REQUIRED");
    const voucher = await Voucher.findOne({ code });
    if (!voucher) throw httpError("Không tìm thấy mã voucher", 404, "VOUCHER_NOT_FOUND");
    assertValidAt(voucher, subtotal);

    if (customerPhone && typeof customerPhone === "string" && customerPhone.trim()) {
      const pattern = phonePattern(customerPhone);
      if (pattern) {
        const alreadyUsed = await VoucherUsage.findOne({
          voucherId: voucher._id,
          customerPhone: { $regex: pattern },
        });
        if (alreadyUsed) {
          throw httpError(
            `Hội viên này đã sử dụng mã ${voucher.code} trước đó. Mỗi khách hàng chỉ được dùng 1 lần.`,
            422,
            "VOUCHER_ALREADY_USED",
          );
        }
      }
    }

    return {
      code: voucher.code,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscountAmount: voucher.maxDiscountAmount,
      minOrderAmount: voucher.minOrderAmount,
      discountAmount: calculateVoucherDiscount(voucher, subtotal),
    };
  }

  async redeem(
    codeValue: unknown,
    subtotal: number,
    data: {
      sessionId: string;
      invoiceCode: string;
      tableId: Types.ObjectId;
      customerName: string;
      customerPhone?: string;
      customerId?: Types.ObjectId;
    },
    session: ClientSession,
  ) {
    const code = normalizedCode(codeValue);
    if (!code) throw httpError("Mã voucher không hợp lệ", 422, "VOUCHER_REQUIRED");
    const voucher = await Voucher.findOne({ code }).session(session);
    if (!voucher) throw httpError("Không tìm thấy mã voucher", 404, "VOUCHER_NOT_FOUND");
    assertValidAt(voucher, subtotal);

    // Kiểm tra xem khách hàng này đã từng sử dụng mã này chưa (mỗi khách dùng 1 lần)
    if (data.customerPhone || data.customerId) {
      const condition: any[] = [];
      if (data.customerId) condition.push({ customerId: data.customerId });
      if (data.customerPhone) {
        const pattern = phonePattern(data.customerPhone);
        if (pattern) {
          condition.push({ customerPhone: { $regex: pattern } });
        } else {
          condition.push({ customerPhone: data.customerPhone });
        }
      }
      const existingUsage = await VoucherUsage.findOne({
        voucherId: voucher._id,
        $or: condition,
      }).session(session);

      if (existingUsage) {
        throw httpError(
          `Mỗi hội viên chỉ được sử dụng voucher ${voucher.code} một lần duy nhất`,
          422,
          "VOUCHER_ALREADY_USED",
        );
      }
    }

    const discountAmount = calculateVoucherDiscount(voucher, subtotal);
    const filter: Record<string, unknown> = {
      _id: voucher._id,
      isActive: true,
      startsAt: { $lte: new Date() },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    };
    if (voucher.maxUses !== undefined) filter.usageCount = { $lt: voucher.maxUses };
    const updated = await Voucher.findOneAndUpdate(
      filter,
      { $inc: { usageCount: 1 } },
      { new: true, session },
    );
    if (!updated) throw httpError("Voucher vừa hết lượt sử dụng hoặc đã hết hạn", 422, "VOUCHER_UNAVAILABLE");
    await VoucherUsage.create(
      [
        {
          voucherId: voucher._id,
          code: voucher.code,
          ...data,
          subtotal,
          discountAmount,
          usedAt: new Date(),
        },
      ],
      { session },
    );
    return { code: voucher.code, discountAmount };
  }
}
