export { FNB_CATEGORY_LABELS, getFnbCategoryLabel } from "../../../utils/fnb";

export const AREA_LABELS: Record<string, string> = {
  standard: "Khu Phổ Thông",
  vip: "Khu VIP",
  match: "Khu Thi Đấu",
};

export const getAreaLabel = (areaKey?: string): string => {
  if (!areaKey) return "Phổ Thông";
  const key = areaKey.toLowerCase().trim();
  return AREA_LABELS[key] || areaKey;
};

export const TABLE_TYPE_LABELS: Record<string, string> = {
  pool: "Bida Lỗ (Pool)",
  carom: "Bida Phăng / Carom",
  snooker: "Bida Snooker",
};

export const getTypeLabel = (typeKey?: string): string => {
  if (!typeKey) return "Bàn";
  const key = typeKey.toLowerCase().trim();
  return TABLE_TYPE_LABELS[key] || typeKey;
};

export const DEFAULT_CANCEL_REASONS = [
  "Khách đổi ý / Chưa dùng",
  "Khách đổi sang món khác",
  "Pha nhầm / Bưng nhầm bàn",
  "Món lỗi / Hỏng / Đổ vỡ",
  "Quán hết món / Thiếu đồ",
  "Khác",
];

export const RANK_DISCOUNT_PERCENT: Record<string, number> = {
  Standard: 5,
  Silver: 5,
  Gold: 10,
  VIP: 10,
  VVIP: 15,
  Diamond: 15,
};

export const PACKAGED_CATEGORIES = new Set([
  "beer",
  "snack",
  "equipment",
  "accessory",
  "drink_canned",
]);

export interface ClubPaymentSettings {
  clubName: string;
  address: string;
  hotline: string;
  bankCode: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
}

export const getClubPaymentSettings = (): ClubPaymentSettings => {
  try {
    const saved = localStorage.getItem("cuezone_admin_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        clubName: parsed.clubName || "CUEZONE BILLIARDS LOUNGE",
        address: parsed.address || "123 Đường Số 7, P. Bình Trị Đông B, Q. Bình Tân, TP. HCM",
        hotline: parsed.hotline || "0908 888 999",
        bankCode: parsed.bankCode || "MB",
        bankName: parsed.bankName || "MB Bank (Ngân hàng TMCP Quân Đội)",
        bankAccountNo: parsed.bankAccountNo || "0908888999",
        bankAccountName: parsed.bankAccountName || "CLB BIDA CUEZONE",
      };
    }
  } catch {
    // fallback
  }
  return {
    clubName: "CUEZONE BILLIARDS LOUNGE",
    address: "123 Đường Số 7, P. Bình Trị Đông B, Q. Bình Tân, TP. HCM",
    hotline: "0908 888 999",
    bankCode: "MB",
    bankName: "MB Bank (Ngân hàng TMCP Quân Đội)",
    bankAccountNo: "0908888999",
    bankAccountName: "CLB BIDA CUEZONE",
  };
};
