// ============================================================================
// ĐỊNH NGHĨA KIỂU DỮ LIỆU & HÀM TIỆN ÍCH DÙNG CHUNG CHO HÓA ĐƠN (INVOICE TYPES)
// ============================================================================

export interface ClubInvoiceItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  price: number;
  subtotal: number;
}

export type InvoiceItemOrder = ClubInvoiceItem;

export interface ClubInvoice {
  id: string;
  code: string;
  tableName: string;
  tableType: string;
  customerName: string;
  customerPhone?: string;
  memberRank?: string;
  discountPercent: number;
  cashierName: string;
  timeIn: string;
  timeOut: string;
  durationMinutes: number;
  durationText: string;
  date: string;
  createdAt?: string;
  items: ClubInvoiceItem[];
  tableFee: number;
  fnbFee: number;
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  paymentMethod: "cash" | "vietqr" | "banking" | "split" | string;
  paymentMethodText: string;
  status: "paid" | "cancelled";
  cancelReason?: string;
  cancelledAt?: string;
  cancellerName?: string;
  voucherCode?: string;
  voucherDiscountAmount?: number;
  membershipDiscountAmount?: number;
}

export interface ClubReceiptSettings {
  clubName: string;
  address: string;
  hotline: string;
  bankCode?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  wifiSSID?: string;
  wifiPassword?: string;
  printVietQROnBill?: boolean;
  printClubLogoOnBill?: boolean;
}

export type DatePresetKey = "all" | "today" | "yesterday" | "this_week" | "this_month" | "custom";
export type SortByOption = "newest" | "oldest" | "amount_desc" | "amount_asc" | "duration_desc";

export const CANCEL_REASONS_QUICK = [
  "Nhập nhầm hình thức thanh toán",
  "Thu ngân tính nhầm tiền giờ / món",
  "Khách khiếu nại dịch vụ / đổi ý",
  "Chốt nhầm sang bàn bida khác",
  "Quên áp dụng voucher / hạng thẻ",
  "Khách quẹt thẻ / chuyển khoản lỗi",
];

export function getClubReceiptSettings(): ClubReceiptSettings {
  try {
    const raw = localStorage.getItem("cuezone_club_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        clubName: parsed.clubName || "CLB BIDA CUEZONE",
        address: parsed.address || "123 Đường Bida, Phường 1, TP. Hồ Chí Minh",
        hotline: parsed.hotline || "0901 234 567",
        bankCode: parsed.bankCode || "MB",
        bankName: parsed.bankName || "MBBank",
        bankAccountNo: parsed.bankAccountNo || "0901234567",
        bankAccountName: parsed.bankAccountName || "CLB BIDA CUEZONE",
        wifiSSID: parsed.wifiSSID || "CueZone_5G_VIP",
        wifiPassword: parsed.wifiPassword || "cuezone8888",
        printVietQROnBill: parsed.printVietQROnBill !== false,
        printClubLogoOnBill: parsed.printClubLogoOnBill !== false,
      };
    }
  } catch {
    // ignore json parse error
  }
  return {
    clubName: "CLB BIDA CUEZONE",
    address: "123 Đường Bida, Phường 1, TP. Hồ Chí Minh",
    hotline: "0901 234 567",
    bankCode: "MB",
    bankName: "MBBank",
    bankAccountNo: "0901234567",
    bankAccountName: "CLB BIDA CUEZONE",
    wifiSSID: "CueZone_5G_VIP",
    wifiPassword: "cuezone8888",
    printVietQROnBill: true,
    printClubLogoOnBill: true,
  };
}

export function formatShortInvoiceCode(rawCode: string, id: string): string {
  if (!rawCode) return `HD-${id.slice(-6).toUpperCase()}`;
  if (rawCode.startsWith("HD-") && rawCode.length > 15) {
    const after = rawCode.slice(3).replace(/-/g, "");
    return `HD-${after.slice(0, 8).toUpperCase()}`;
  }
  return rawCode;
}

export function formatDurationNice(rawDuration: string | undefined, durationMinutes?: number): string {
  if (!rawDuration && !durationMinutes) return "0 phút";
  if (durationMinutes && durationMinutes > 0) {
    const hours = Math.floor(durationMinutes / 60);
    const mins = Math.round(durationMinutes % 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days} ngày ${remHours > 0 ? `${remHours}h` : ""}`.trim();
    }
    if (hours > 0) {
      return `${hours} giờ ${mins > 0 ? `${mins} phút` : ""}`.trim();
    }
    return `${mins} phút`;
  }
  return rawDuration || "0 phút";
}

export function isInvoiceCancellable(invoice?: ClubInvoice | null): boolean {
  if (!invoice || invoice.status === "cancelled") return false;
  return true;
}

export function formatMoney(val?: number): string {
  return `${(val || 0).toLocaleString("vi-VN")}đ`;
}
