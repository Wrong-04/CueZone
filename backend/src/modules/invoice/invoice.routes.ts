import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Invoice } from "./invoice.model";
import { Table, TableStatus } from "../table/table.model";
import { requirePermission } from "../../middlewares/auth.middleware";

const router = Router();
const invoicesRead = requirePermission("invoices", "read");

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatShortInvoiceCode(rawCode: string, id: string): string {
  if (!rawCode) return `HD-${id.slice(-6).toUpperCase()}`;
  if (rawCode.startsWith("HD-") && rawCode.length > 15) {
    const after = rawCode.slice(3).replace(/-/g, "");
    return `HD-${after.slice(0, 8).toUpperCase()}`;
  }
  return rawCode;
}

function formatDurationNice(rawDuration: string | undefined, durationMinutes?: number): string {
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
  if (rawDuration) {
    const match = rawDuration.match(/^(\d+):(\d+):(\d+)$/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const s = parseInt(match[3], 10);
      if (h >= 24) {
        const days = Math.floor(h / 24);
        const remH = h % 24;
        return `${days} ngày ${remH > 0 ? `${remH}h` : ""}`.trim();
      }
      if (h > 0) {
        return `${h} giờ ${m > 0 ? `${m} phút` : ""}`.trim();
      }
      if (m > 0) {
        return `${m} phút`;
      }
      return `${s} giây`;
    }
    return rawDuration;
  }
  return "0 phút";
}

// ── GET /api/v1/invoices ──────────────────────────────────────────────────────
router.get("/", invoicesRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = normalizeString(req.query.search);
    const status = normalizeString(req.query.status);
    const paymentMethod = normalizeString(req.query.paymentMethod);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const page = Math.max(1, Number(req.query.page) || 1);

    // 1. Fetch real invoices from MongoDB
    const query: any = {};
    if (status === "cancelled") {
      query.status = "cancelled";
    }

    const rawInvoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const allTables = await Table.find({}).select("name code type").lean();
    const tableMap = new Map<string, any>(allTables.map((t) => [String(t._id), t]));

    // Map into normalized frontend ClubInvoice objects
    const mappedInvoices = rawInvoices.map((inv: any) => {
      const receipt = inv.receipt || {};
      const refTable = inv.tableId ? tableMap.get(String(inv.tableId)) : null;
      const tableName =
        receipt.tableName ||
        refTable?.name ||
        (refTable?.code ? `Bàn ${refTable.code}` : "Bàn Bida");
      const tableCode = receipt.tableCode || refTable?.code || "TB";
      const customerName = receipt.customerName || "Khách Vãng Lai";
      const customerPhone = receipt.customerPhone || "";
      const memberRank = receipt.membershipTier || "Normal";
      const discountPercent = receipt.discountPercent || inv.discount || 0;
      const cashierName = receipt.cashierName || "Thu Ngân";

      const timeIn = receipt.sessionStart || new Date(inv.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const timeOut = receipt.sessionEnd || (inv.paidAt ? new Date(inv.paidAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : timeIn);
      const durationMinutes = receipt.durationMinutes || 0;

      const tableFee = receipt.playingCost ?? (inv.items?.filter((it: any) => it.type === "table_time")?.reduce((sum: number, it: any) => sum + (it.amount || 0), 0) ?? 0);
      const fnbFee = receipt.fnbTotal ?? (inv.items?.filter((it: any) => it.type !== "table_time")?.reduce((sum: number, it: any) => sum + (it.amount || 0), 0) ?? 0);
      const subtotal = receipt.subtotal || inv.subtotal || (tableFee + fnbFee);
      const discountAmount = receipt.discountAmount || (inv.discount ? Math.round(subtotal * (inv.discount / 100)) : 0);
      const finalTotal = receipt.finalAmount ?? inv.totalAmount ?? (subtotal - discountAmount);

      const rawPaymentMethod = String(receipt.paymentMethod || receipt.paymentDetails?.method || inv.payment?.method || "cash").toLowerCase();
      let pMethod = "cash";
      if (
        rawPaymentMethod.includes("vietqr") ||
        rawPaymentMethod.includes("vnpay") ||
        rawPaymentMethod.includes("qr") ||
        rawPaymentMethod.includes("bank") ||
        rawPaymentMethod.includes("card") ||
        rawPaymentMethod.includes("transfer")
      ) {
        pMethod = "vietqr";
      } else if (
        rawPaymentMethod.includes("wallet") ||
        rawPaymentMethod.includes("cuezone_pay") ||
        rawPaymentMethod.includes("member_balance") ||
        rawPaymentMethod.includes("ví")
      ) {
        pMethod = "wallet";
      } else {
        pMethod = "cash";
      }

      const methodMap: Record<string, string> = {
        cash: "Tiền Mặt",
        vietqr: "VietQR / Ngân Hàng",
        card: "Thẻ Ngân Hàng",
        cuezone_pay: "Ví CueZone Pay",
        wallet: "Ví Hội Viên",
        member_balance: "Ví Hội Viên",
        split: "Kết Hợp",
      };

      const rawCode = inv.invoiceNumber || receipt.invoiceCode || `HD-${String(inv._id).slice(-6).toUpperCase()}`;
      const invoiceCode = formatShortInvoiceCode(rawCode, String(inv._id));
      const durationText = formatDurationNice(receipt.durationFormatted, receipt.durationMinutes);

      // Build items array
      const items = (receipt.orders || inv.items || []).map((it: any, idx: number) => ({
        id: it.id || String(idx),
        name: it.name || it.description || "Dịch vụ",
        category: it.type === "table_time" ? "table_time" : "coffee",
        quantity: it.quantity || 1,
        unit: it.unit || "Phần",
        price: it.price || it.unitPrice || 0,
        subtotal: it.subtotal || it.amount || 0,
      }));

      const dateStr = new Date(inv.createdAt).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        id: String(inv._id),
        code: invoiceCode,
        rawCode,
        tableName,
        tableCode,
        customerName,
        customerPhone,
        memberRank,
        discountPercent,
        cashierName,
        timeIn,
        timeOut,
        durationText,
        durationMinutes,
        tableFee,
        fnbFee,
        subtotal,
        discountAmount,
        finalTotal,
        paymentMethod: pMethod,
        paymentMethodText: methodMap[pMethod] || "Tiền Mặt",
        status: inv.status === "cancelled" ? "cancelled" : "paid",
        statusText: inv.status === "cancelled" ? "Đã Hủy" : "Đã Thanh Toán",
        date: dateStr,
        createdAt: inv.createdAt,
        items,
        note: inv.payment?.note || receipt.note || "",
      };
    });

    // Chỉ hiển thị hóa đơn thực tế đã thanh toán/đã hủy từ DB (bàn đang chơi quản lý bên sơ đồ bàn POS)
    let allCombined = mappedInvoices;

    // Filter by search query
    if (search) {
      const q = search.toLowerCase();
      allCombined = allCombined.filter(
        (inv) =>
          inv.code.toLowerCase().includes(q) ||
          inv.rawCode?.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.customerPhone.toLowerCase().includes(q) ||
          inv.tableName.toLowerCase().includes(q),
      );
    }

    // Filter by status tab or payment method
    if (status && status !== "all") {
      if (status === "paid" || status === "cancelled") {
        allCombined = allCombined.filter((inv) => inv.status === status);
      } else if (status === "cash") {
        allCombined = allCombined.filter((inv) => inv.paymentMethod === "cash");
      } else if (status === "vietqr") {
        allCombined = allCombined.filter((inv) => ["vietqr", "card"].includes(inv.paymentMethod));
      } else if (status === "wallet") {
        allCombined = allCombined.filter((inv) => ["cuezone_pay", "wallet", "member_balance"].includes(inv.paymentMethod));
      }
    }
    if (paymentMethod && paymentMethod !== "all") {
      if (paymentMethod === "cash") {
        allCombined = allCombined.filter((inv) => inv.paymentMethod === "cash");
      } else if (paymentMethod === "vietqr") {
        allCombined = allCombined.filter((inv) => ["vietqr", "card"].includes(inv.paymentMethod));
      } else if (paymentMethod === "wallet") {
        allCombined = allCombined.filter((inv) => ["cuezone_pay", "wallet", "member_balance"].includes(inv.paymentMethod));
      }
    }

    // Calculate aggregated metrics from real invoices (Sabo Billiard standard)
    const paidList = mappedInvoices.filter((i) => i.status === "paid");
    const totalRevenue = paidList.reduce((acc, cur) => acc + cur.finalTotal, 0);
    const totalTableFee = paidList.reduce((acc, cur) => acc + cur.tableFee, 0);
    const totalFnbFee = paidList.reduce((acc, cur) => acc + cur.fnbFee, 0);
    const cashRevenue = paidList
      .filter((i) => i.paymentMethod === "cash")
      .reduce((acc, cur) => acc + cur.finalTotal, 0);
    const bankRevenue = paidList
      .filter((i) => ["vietqr", "card"].includes(i.paymentMethod))
      .reduce((acc, cur) => acc + cur.finalTotal, 0);
    const walletRevenue = paidList
      .filter((i) => ["cuezone_pay", "wallet", "member_balance"].includes(i.paymentMethod))
      .reduce((acc, cur) => acc + cur.finalTotal, 0);

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedItems = allCombined.slice(startIndex, startIndex + limit);

    return res.json({
      success: true,
      data: {
        items: paginatedItems,
        total: allCombined.length,
        metrics: {
          totalCount: allCombined.length,
          paidCount: paidList.length,
          totalRevenue,
          totalTableFee,
          totalFnbFee,
          cashRevenue,
          bankRevenue,
          walletRevenue,
          pendingCount: 0,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// ── GET /api/v1/invoices/:id ──────────────────────────────────────────────────
router.get("/:id", invoicesRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Mã hóa đơn không hợp lệ" });
    }

    const invoice: any = await Invoice.findById(id).lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn" });
    }

    if (invoice.tableId && !invoice.table) {
      const refTable = await Table.findById(invoice.tableId).select("name code type").lean();
      if (refTable) {
        invoice.table = refTable;
      }
    }

    return res.json({ success: true, data: invoice });
  } catch (error: any) {
    next(error);
  }
});

// ── POST /api/v1/invoices/quick (Tạo hóa đơn lẻ bán mang về / vãng lai) ────────
router.post("/quick", requirePermission("pos", "operate"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body || {};
    const customerName = normalizeString(body.customerName) || "Khách Vãng Lai";
    const customerPhone = normalizeString(body.customerPhone) || "";
    const items = Array.isArray(body.items) ? body.items : [];
    const paymentMethod = normalizeString(body.paymentMethod) || "cash";

    const subtotal = items.reduce(
      (sum: number, it: any) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
      0,
    );
    const discountAmount = Number(body.discountAmount) || 0;
    const finalAmount = Math.max(0, subtotal - discountAmount);

    const invoiceNumber = `HD-LE-${Date.now().toString().slice(-6)}`;
    const sessionId = `quick-${Date.now()}`;

    // Find a default table or create invoice with dummy table reference
    const firstTable = await Table.findOne().lean();
    if (!firstTable) {
      return res.status(400).json({ success: false, message: "Hệ thống chưa có bàn bida nào" });
    }

    const receipt = {
      tableName: "Quầy Thu Ngân (Mua Lẻ)",
      tableCode: "LE",
      customerName,
      customerPhone,
      sessionStart: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      sessionEnd: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      durationFormatted: "Mua lẻ mang về",
      durationMinutes: 0,
      pricePerHour: 0,
      playingCost: 0,
      carriedCost: 0,
      orders: items,
      fnbTotal: subtotal,
      subtotal,
      discountAmount,
      finalAmount,
      paymentStatus: "paid",
      paymentMethod,
      invoiceCode: invoiceNumber,
      checkoutTime: new Date().toISOString(),
      note: body.note || "Khách mua lẻ tại quầy",
    };

    const newInvoice = await Invoice.create({
      sessionId,
      tableId: firstTable._id,
      status: "paid",
      receipt,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo hóa đơn lẻ thành công",
      data: newInvoice,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
