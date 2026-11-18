// ============================================================================
// ĐỊNH NGHĨA KIỂU DỮ LIỆU & HẰNG SỐ DÙNG CHUNG CHO ĐẶT BÀN (BOOKING TYPES & CONSTANTS)
// ============================================================================

export type BookingStatusFilter = "all" | "pending" | "approved" | "completed" | "cancelled" | "rejected";

export const BOOKING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ xác nhận", color: "gold" },
  approved: { label: "Đã giữ bàn", color: "green" },
  completed: { label: "Đã nhận bàn", color: "blue" },
  cancelled: { label: "Đã hủy", color: "default" },
  rejected: { label: "Đã từ chối", color: "volcano" },
};

export const REJECTION_QUICK_TEMPLATES = [
  "Trùng khung giờ thi đấu giải nội bộ CLB",
  "Bàn yêu cầu đang trong lịch bảo trì vải nỉ",
  "Quá tải giờ cao điểm, đã kín toàn bộ bàn",
  "Không liên lạc được với khách để xác nhận",
];

export function formatMoney(val?: number): string {
  return `${(val || 0).toLocaleString("vi-VN")}đ`;
}
