// ============================================================================
// 1. IMPORTS & TYPES
// ============================================================================
import {
  type ClubInvoice,
  formatShortInvoiceCode,
  formatDurationNice,
} from "../types/invoice.types";

/**
 * Tiện ích chuyển đổi dữ liệu hóa đơn thô từ Backend sang ClubInvoice chuẩn hiển thị
 */
export function mapRawInvoice(inv: any): ClubInvoice {
  const id = inv._id || inv.id || "";
  const code = formatShortInvoiceCode(inv.code || inv.invoiceCode || "", id);

  return {
    id,
    code,
    tableName: inv.tableName || "Bàn",
    tableType: inv.tableType || "pool",
    customerName: inv.customerName || "Khách vãng lai",
    customerPhone: inv.customerPhone || "",
    memberRank: inv.memberRank || "Phổ thông",
    discountPercent: inv.discountPercent || 0,
    voucherCode: inv.voucherCode || "",
    voucherDiscountAmount: inv.voucherDiscountAmount || 0,
    membershipDiscountAmount: inv.membershipDiscountAmount || 0,
    cashierName: inv.cashierName || "Thu ngân",
    timeIn: inv.timeIn || "00:00",
    timeOut: inv.timeOut || "00:00",
    durationMinutes: inv.durationMinutes || 0,
    durationText: formatDurationNice(inv.durationText, inv.durationMinutes),
    date: inv.date || (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("vi-VN") : "Hôm nay"),
    items: Array.isArray(inv.items)
      ? inv.items.map((it: any, idx: number) => ({
          id: it._id || it.id || String(idx),
          name: it.name || "Dịch vụ",
          quantity: it.quantity || 1,
          unit: it.unit || "phần",
          price: it.price || 0,
          subtotal: it.subtotal || (it.price || 0) * (it.quantity || 1),
          category: it.category,
        }))
      : [],
    tableFee: inv.tableFee || 0,
    fnbFee: inv.fnbFee || 0,
    subtotal: inv.subtotal || (inv.tableFee || 0) + (inv.fnbFee || 0),
    discountAmount: inv.discountAmount || 0,
    finalTotal: inv.finalTotal || 0,
    paymentMethod: (() => {
      const raw = String(inv.paymentMethod || "").toLowerCase();
      if (raw === "cash" || raw.includes("tiền mặt")) return "cash";
      if (raw === "split" || raw.includes("split")) return "split";
      return "vietqr";
    })(),
    paymentMethodText: (() => {
      const raw = String(inv.paymentMethodText || inv.paymentMethod || "").toLowerCase();
      if (raw === "cash" || raw.includes("tiền mặt")) return "Tiền mặt";
      if (raw === "split" || raw.includes("split")) return "Tiền mặt + Chuyển khoản";
      return "VietQR / Ngân Hàng";
    })(),
    status: inv.status === "cancelled" ? "cancelled" : "paid",
    cancelReason: inv.cancelReason || "",
    cancelledAt: inv.cancelledAt || "",
    cancellerName: inv.cancellerName || "",
  };
}
