import type { Voucher } from "../../../../services/voucher.service";

// ============================================================================
// ĐỊNH NGHĨA KIỂU DỮ LIỆU & HÀM TIỆN ÍCH DÙNG CHUNG CHO VOUCHER (TYPES & HELPERS)
// ============================================================================

export type VoucherForm = {
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: string;
  maxDiscountAmount: string;
  targetAudience: "all" | "new_member" | "vip";
  minOrderAmount: string;
  startsAt: string;
  expiresAt: string;
  isUnlimitedExpiry: boolean;
  maxUses: string;
};

export function localDateTime(date: Date): string {
  if (isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function emptyForm(): VoucherForm {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    code: "",
    description: "",
    discountType: "percent",
    discountValue: "",
    maxDiscountAmount: "",
    targetAudience: "all",
    minOrderAmount: "0",
    startsAt: localDateTime(start),
    expiresAt: localDateTime(end),
    isUnlimitedExpiry: false,
    maxUses: "",
  };
}

export function toForm(voucher: Voucher): VoucherForm {
  const start =
    voucher.startsAt && !isNaN(new Date(voucher.startsAt).getTime())
      ? new Date(voucher.startsAt)
      : new Date();

  const hasValidExpiry = Boolean(
    voucher.expiresAt && !isNaN(new Date(voucher.expiresAt).getTime())
  );
  const isSameInstant =
    hasValidExpiry &&
    voucher.expiresAt &&
    voucher.startsAt &&
    new Date(voucher.expiresAt).getTime() === new Date(voucher.startsAt).getTime();
  const isUnlimited = !hasValidExpiry || isSameInstant;

  const end =
    hasValidExpiry && !isUnlimited
      ? new Date(voucher.expiresAt!)
      : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    code: voucher.code,
    description: voucher.description || "",
    discountType: voucher.discountType,
    discountValue: String(voucher.discountValue),
    maxDiscountAmount:
      voucher.maxDiscountAmount !== undefined && voucher.maxDiscountAmount !== null
        ? String(voucher.maxDiscountAmount)
        : "",
    targetAudience: voucher.targetAudience || "all",
    minOrderAmount: String(voucher.minOrderAmount ?? 0),
    startsAt: localDateTime(start),
    expiresAt: isUnlimited ? "" : localDateTime(end),
    isUnlimitedExpiry: isUnlimited,
    maxUses: voucher.maxUses === undefined || voucher.maxUses === null ? "" : String(voucher.maxUses),
  };
}

export function formatMoney(value?: number | null): string {
  if (value === undefined || value === null) return "0đ";
  return `${value.toLocaleString("vi-VN")}đ`;
}

export function safeFormatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return "Vô thời hạn";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Vô thời hạn";
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getVoucherStatus(voucher: Voucher): {
  key: "active" | "inactive" | "expired" | "out_of_quota" | "upcoming";
  label: string;
  color: "green" | "gold" | "red" | "default";
} {
  if (!voucher.isActive) {
    return { key: "inactive", label: "Tạm dừng", color: "default" };
  }
  const now = new Date();
  const startsAt = voucher.startsAt ? new Date(voucher.startsAt) : null;
  const expiresAt = voucher.expiresAt ? new Date(voucher.expiresAt) : null;

  if (startsAt && !isNaN(startsAt.getTime()) && now < startsAt) {
    return { key: "upcoming", label: "Sắp bắt đầu", color: "gold" };
  }
  if (expiresAt && !isNaN(expiresAt.getTime()) && now > expiresAt) {
    return { key: "expired", label: "Đã hết hạn", color: "red" };
  }
  if (voucher.maxUses !== undefined && voucher.maxUses !== null && voucher.usageCount >= voucher.maxUses) {
    return { key: "out_of_quota", label: "Đã hết lượt", color: "red" };
  }
  return { key: "active", label: "Đang hoạt động", color: "green" };
}
