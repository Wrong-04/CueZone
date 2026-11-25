// ============================================================================
// HẰNG SỐ & TIỆN ÍCH DÙNG CHUNG CHO HỆ THỐNG POS (POS CONSTANTS & SETTINGS)
// ============================================================================

// ============================================================================
// PHẦN 1: TÊN HIỂN THỊ KHU VỰC & LOẠI BÀN (AREA & TABLE TYPE LABELS)
// ============================================================================
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

// ============================================================================
// PHẦN 2: DANH MỤC LÝ DO HỦY MÓN F&B (CANCEL REASONS)
// ============================================================================
export const DEFAULT_CANCEL_REASONS = [
  "Khách đổi ý / Chưa dùng",
  "Khách đổi sang món khác",
  "Pha nhầm / Bưng nhầm bàn",
  "Món lỗi / Hỏng / Đổ vỡ",
  "Quán hết món / Thiếu đồ",
  "Quán ngừng kinh doanh món này",
  "Khác",
];


// ============================================================================
// PHẦN 3: CẤU HÌNH THÔNG TIN IN PHIẾU THANH TOÁN NHIỆT (RECEIPT PRINT SETTINGS)
// ============================================================================
export {
  getClubReceiptSettings,
  type ClubReceiptSettings,
} from "../../admin/invoices/types/invoice.types";
