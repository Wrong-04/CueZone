import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Invoice } from "./invoice.model";
import { Table, TableStatus } from "../table/table.model";
import { requirePermission } from "../../middlewares/auth.middleware";
import { Voucher, VoucherUsage } from "../voucher/voucher.model";
import { User } from "../user/user.model";
import { Product } from "../product/product.model";

const router = Router();
const invoicesRead = requirePermission("invoices", "read");

// ============================================================================
// PHẦN 1: HÀM TIỆN ÍCH ĐỊNH DẠNG DỮ LIỆU HÓA ĐƠN (FORMATTERS & HELPERS)
// ============================================================================

/**
 * Chuẩn hóa chuỗi dữ liệu (trim khoảng trắng)
 */
function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Rút gọn mã hóa đơn dài (UUID) thành mã hiển thị ngắn gọn (VD: HD-A1B2C3)
 */
function formatShortInvoiceCode(rawCode: string, id: string): string {
  if (!rawCode) return `HD-${id.slice(-6).toUpperCase()}`;
  if (rawCode.startsWith("HD-") && rawCode.length > 15) {
    const after = rawCode.slice(3).replace(/-/g, "");
    return `HD-${after.slice(0, 8).toUpperCase()}`;
  }
  return rawCode;
}

/**
 * Định dạng thời lượng chơi thân thiện (ngày, giờ, phút)
 */
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

// ============================================================================
// PHẦN 2: API TRA CỨU DANH SÁCH & THỐNG KÊ DOANH THU (GET /api/v1/invoices)
// ============================================================================
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

    const [allTables, allProducts] = await Promise.all([
      Table.find({}).select("name code type").lean(),
      Product.find({}).select("name category productType").lean(),
    ]);
    const tableMap = new Map<string, any>(allTables.map((t) => [String(t._id), t]));
    const productById = new Map<string, any>(allProducts.map((p: any) => [String(p._id), p]));
    const productByName = new Map<string, any>(
      allProducts.map((p: any) => [String(p.name || "").trim().toLowerCase(), p]),
    );

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
      const rawMemberRank = receipt.membershipTier || (inv.customer?.rank ?? "");
      const memberRank =
        !rawMemberRank || rawMemberRank === "Normal" || rawMemberRank === "Standard"
          ? "Phổ thông"
          : rawMemberRank;
      const discountPercent = receipt.discountPercent || inv.discount || 0;
      const voucherCode = receipt.voucherCode || "";
      const voucherDiscountAmount = receipt.voucherDiscountAmount || 0;
      const membershipDiscountAmount = receipt.membershipDiscountAmount || 0;
      const cashierName = receipt.cashierName || "Thu Ngân";

      const timeIn = receipt.sessionStart || new Date(inv.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const timeOut = receipt.sessionEnd || (inv.paidAt ? new Date(inv.paidAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : timeIn);
      const durationMinutes = receipt.durationMinutes || 0;

      const tableFee = receipt.playingCost ?? (inv.items?.filter((it: any) => it.type === "table_time")?.reduce((sum: number, it: any) => sum + (it.amount || 0), 0) ?? 0);
      const fnbFee = receipt.fnbTotal ?? (inv.items?.filter((it: any) => it.type !== "table_time")?.reduce((sum: number, it: any) => sum + (it.amount || 0), 0) ?? 0);
      const subtotal = receipt.subtotal || inv.subtotal || (tableFee + fnbFee);
      const discountAmount = receipt.discountAmount || (inv.discount ? Math.round(subtotal * (inv.discount / 100)) : 0);
      const finalTotal = receipt.finalAmount ?? inv.totalAmount ?? (subtotal - discountAmount);
      const paymentDetails = receipt.paymentDetails || {};
      const splitCashAmount = Number(paymentDetails.cashAmount);
      const splitTransferAmount = Number(paymentDetails.transferAmount);
      const hasValidSplitAmounts =
        Number.isFinite(splitCashAmount) &&
        Number.isFinite(splitTransferAmount) &&
        splitCashAmount >= 0 &&
        splitTransferAmount >= 0 &&
        splitCashAmount + splitTransferAmount === finalTotal;
      // ponytail: Hóa đơn kết hợp cũ thiếu phân bổ không thể tách doanh thu; cần backfill từ dữ liệu thanh toán gốc.

      const rawPaymentMethod = String(receipt.paymentMethod || receipt.paymentDetails?.method || inv.payment?.method || "cash").toLowerCase();
      let pMethod = "cash";
      if (rawPaymentMethod === "split" || rawPaymentMethod === "cash_qr") {
        pMethod = "split";
      } else if (
        rawPaymentMethod === "cash" ||
        rawPaymentMethod.includes("tiền mặt")
      ) {
        pMethod = "cash";
      } else {
        // Hệ thống chuẩn chỉ gồm Tiền mặt và Chuyển khoản (VietQR / Ngân hàng)
        // Mọi hình thức chuyển khoản, quét mã hoặc dữ liệu ví/thẻ cũ đều quy về VietQR / Ngân Hàng
        pMethod = "vietqr";
      }

      const methodMap: Record<string, string> = {
        cash: "Tiền mặt",
        vietqr: "VietQR / Ngân Hàng",
        split: "Tiền mặt + Chuyển khoản",
      };

      const rawCode = inv.invoiceNumber || receipt.invoiceCode || `HD-${String(inv._id).slice(-6).toUpperCase()}`;
      const invoiceCode = formatShortInvoiceCode(rawCode, String(inv._id));
      const durationText = formatDurationNice(receipt.durationFormatted, receipt.durationMinutes);

      // Build items array
      const items = (receipt.orders || inv.items || [])
        .filter((it: any) => it.status !== "cancelled")
        .map((it: any, idx: number) => {
          const itemName = it.name || it.description || "Dịch vụ";
          const refProd =
            (it.productId && productById.get(String(it.productId))) ||
            productByName.get(String(itemName).trim().toLowerCase());
          const resolvedCategory =
            it.type === "table_time" || it.category === "table_time"
              ? "table_time"
              : String(it.category || refProd?.category || "drink").toLowerCase();
          const effectiveQty = Math.max(
            0,
            Number(it.quantity || 1) - Number(it.cancelledQuantity || 0),
          );
          const unitPrice = Number(it.price || it.unitPrice || 0);
          return {
            id: it.id || String(idx),
            name: itemName,
            category: resolvedCategory,
            quantity: effectiveQty,
            unit: it.unit || "Phần",
            price: unitPrice,
            subtotal: Number(it.subtotal ?? it.amount ?? unitPrice * effectiveQty),
          };
        })
        .filter((it: any) => it.quantity > 0);

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
        voucherCode,
        voucherDiscountAmount,
        membershipDiscountAmount,
        finalTotal,
        paymentMethod: pMethod,
        paymentMethodText: methodMap[pMethod] || "Tiền Mặt",
        paymentDetails:
          pMethod === "split" && hasValidSplitAmounts
            ? { cashAmount: splitCashAmount, transferAmount: splitTransferAmount }
            : undefined,
        status: inv.status === "cancelled" ? "cancelled" : "paid",
        statusText: inv.status === "cancelled" ? "Đã Hủy" : "Đã Thanh Toán",
        cancelledAt: inv.cancelledAt,
        cancelledBy: inv.cancelledBy,
        cancelReason: inv.cancelReason,
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
      } else if (status === "split") {
        allCombined = allCombined.filter((inv) => inv.paymentMethod === "split");
      } else if (status === "wallet") {
        allCombined = allCombined.filter((inv) => ["cuezone_pay", "wallet", "member_balance"].includes(inv.paymentMethod));
      }
    }
    if (paymentMethod && paymentMethod !== "all") {
      if (paymentMethod === "cash") {
        allCombined = allCombined.filter((inv) => inv.paymentMethod === "cash");
      } else if (paymentMethod === "vietqr" || paymentMethod === "banking") {
        allCombined = allCombined.filter((inv) => inv.paymentMethod !== "cash");
      } else if (paymentMethod === "split") {
        allCombined = allCombined.filter((inv) => inv.paymentMethod === "split");
      }
    }

    // Calculate aggregated metrics from real invoices (Sabo Billiard standard)
    const paidList = mappedInvoices.filter((i) => i.status === "paid");
    const totalRevenue = paidList.reduce((acc, cur) => acc + cur.finalTotal, 0);
    const totalTableFee = paidList.reduce((acc, cur) => acc + cur.tableFee, 0);
    const totalFnbFee = paidList.reduce((acc, cur) => acc + cur.fnbFee, 0);
    const cashRevenue = paidList.reduce(
      (acc, cur) =>
        acc +
        (cur.paymentMethod === "split"
          ? cur.paymentDetails?.cashAmount || 0
          : cur.paymentMethod === "cash"
            ? cur.finalTotal
            : 0),
      0,
    );
    const bankRevenue = paidList.reduce(
      (acc, cur) =>
        acc +
        (cur.paymentMethod === "split"
          ? cur.paymentDetails?.transferAmount || 0
          : ["vietqr", "card"].includes(cur.paymentMethod)
            ? cur.finalTotal
            : 0),
      0,
    );
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
          cancelledCount: mappedInvoices.filter((i) => i.status === "cancelled").length,
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

// ============================================================================
// PHẦN 3: API XEM CHI TIẾT HÓA ĐƠN (GET /api/v1/invoices/:id)
// ============================================================================
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

    if (invoice.cancelledBy) {
      const canceller = await User.findById(invoice.cancelledBy).select("fullName name phone role").lean();
      if (canceller) {
        invoice.cancellerName = (canceller as any).fullName || (canceller as any).name || "Quản trị viên";
      }
    }

    return res.json({ success: true, data: invoice });
  } catch (error: any) {
    next(error);
  }
});

// ============================================================================
// PHẦN 4: API HỦY HÓA ĐƠN & HOÀN TÁC GIAO DỊCH (POST /api/v1/invoices/:id/cancel)
// Quy trình ACID Transaction:
// 1. Kiểm tra quyền hạn và lý do hủy hóa đơn
// 2. Chuyển trạng thái hóa đơn sang 'cancelled', ghi nhận người hủy và thời gian
// 3. Giải phóng lượt dùng voucher (nếu có áp dụng voucher)
// 4. Hoàn lại số lượng nguyên vật liệu vào kho (nếu có tùy chọn hoàn kho)
// ============================================================================
router.post("/:id/cancel", requirePermission("invoices", "manage"), async (req: Request, res: Response, next: NextFunction) => {
  let session: mongoose.ClientSession | null = null;
  let useSession = true;

  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Mã hóa đơn không hợp lệ" });
    }

    const reason = normalizeString(req.body?.reason);
    if (!reason) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập lý do hủy hóa đơn" });
    }

    const currentInvoice = await Invoice.findById(id);
    if (!currentInvoice) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn" });
    }

    if (currentInvoice.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Hóa đơn này đã được hủy trước đó" });
    }

    // 4. Giới hạn thời gian: Chỉ được hủy hóa đơn trong vòng 24 giờ kể từ khi thanh toán
    const invoiceCreatedAt = currentInvoice.createdAt ? new Date(currentInvoice.createdAt).getTime() : 0;
    const invoiceAgeHours = (Date.now() - invoiceCreatedAt) / (1000 * 60 * 60);
    if (invoiceAgeHours > 24) {
      return res.status(400).json({
        success: false,
        message: "Hóa đơn đã quá hạn 24 giờ kể từ khi thanh toán. Không thể hủy hóa đơn của ngày trước để đảm bảo sổ sách kế toán.",
      });
    }

    const restock = Boolean(req.body?.restock);
    const userId = (req as any).user?.userId;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      // Môi trường standalone Mongo không hỗ trợ transaction, fallback thực hiện không session
      useSession = false;
      if (session) {
        await session.endSession();
        session = null;
      }
    }

    const sessionOpts = useSession && session ? { session } : {};

    currentInvoice.status = "cancelled";
    currentInvoice.cancelledAt = new Date();
    currentInvoice.cancelReason = reason;
    currentInvoice.isRestocked = restock;
    if (userId && mongoose.isValidObjectId(userId)) {
      currentInvoice.cancelledBy = new mongoose.Types.ObjectId(userId);
    }
    await currentInvoice.save(sessionOpts);

    // 1. Hoàn lại số lượt voucher nếu hóa đơn có áp dụng voucher
    const voucherCode = currentInvoice.receipt?.voucherCode;
    const invoiceCode = currentInvoice.receipt?.invoiceCode;
    if (voucherCode) {
      await Voucher.updateOne(
        { code: voucherCode.toUpperCase(), usageCount: { $gt: 0 } },
        { $inc: { usageCount: -1 } },
        sessionOpts
      );
      if (invoiceCode) {
        await VoucherUsage.deleteOne({ code: voucherCode.toUpperCase(), invoiceCode }, sessionOpts);
      } else {
        await VoucherUsage.deleteOne({ code: voucherCode.toUpperCase(), sessionId: currentInvoice.sessionId }, sessionOpts);
      }
    }

    // 2. Hoàn lại tồn kho các mặt hàng F&B nếu người quản lý chọn hoàn kho (chỉ khi khách chưa khui/chưa dùng)
    if (restock && Array.isArray(currentInvoice.receipt?.items)) {
      for (const item of currentInvoice.receipt.items) {
        const itemQty = Number(item.quantity || 1) - Number(item.cancelledQuantity || 0);
        if (item.productId && mongoose.isValidObjectId(item.productId) && itemQty > 0) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { currentStock: itemQty } },
            sessionOpts
          );
        }
      }
    }

    if (useSession && session) {
      await session.commitTransaction();
    }

    return res.json({
      success: true,
      message: "Hủy hóa đơn thành công",
      data: {
        id: String(currentInvoice._id),
        status: currentInvoice.status,
        cancelledAt: currentInvoice.cancelledAt,
        cancelReason: currentInvoice.cancelReason,
      },
    });
  } catch (error: any) {
    if (useSession && session) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

// ============================================================================
// PHẦN 5: API TẠO HÓA ĐƠN BÁN LẺ F&B TẠI QUẦY (POST /api/v1/invoices/quick)
// Phục vụ khách vãng lai chỉ mua nước/đồ ăn mang về mà không sử dụng bàn bida
// ============================================================================
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
