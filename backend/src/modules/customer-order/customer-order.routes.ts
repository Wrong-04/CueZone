// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU: ROUTER ORDER F&B & THANH TOÁN TẠI BÀN (/api/v1/customer/fnb-orders)
// - Nhóm Khách hàng (CUSTOMER): xem bàn đang chơi, gửi order, tạm tính & gọi thanh toán
// - Nhóm Nhân viên POS (fnb_orders.manage): duyệt order QR & xác nhận thanh toán tại bàn
// ============================================================================
import { Router } from "express";
import { requirePermission, requireRole } from "../../middlewares/auth.middleware";
import { UserRole } from "../user/user.model";
import { CustomerOrderService } from "./customer-order.service";
import { SessionService } from "../session/session.service";

const router = Router();
const service = new CustomerOrderService();
const sessionService = new SessionService();
const fnbOrdersManage = requirePermission("fnb_orders", "manage");

// ── 1. ROUTE DÀNH CHO KHÁCH HÀNG ĐANG CHƠI TẠI BÀN (role CUSTOMER) ──────────────────────

// Lấy danh sách bàn và phiên chơi hiện tại mà khách hàng có quyền gọi món
router.get("/active-tables", requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.getActiveTables((req as any).user.userId),
    });
  } catch (error) {
    next(error);
  }
});

// Khách hàng gửi đơn gọi món F&B mới từ điện thoại (bắn thông báo + Socket cho quầy POS)
router.post("/", requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const order = await service.create((req as any).user.userId, req.body);
    res.status(201).json({ success: true, message: "Đã gửi order tới quầy", data: order });
  } catch (error) {
    next(error);
  }
});

// ── 2. ROUTE DÀNH CHO NHÂN VIÊN POS (quyền fnb_orders.manage) ───────────────────────────

// Lấy hàng đợi đơn gọi món trực tuyến trong 24h hiển thị ở CustomerOrderDrawer
router.get("/queue", fnbOrdersManage, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await service.getQueue() });
  } catch (error) {
    next(error);
  }
});

// Lấy danh sách bàn có khách đang yêu cầu thanh toán tại CustomerPaymentRequests
router.get("/payment-requests", fnbOrdersManage, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await sessionService.getCustomerPaymentRequests() });
  } catch (error) {
    next(error);
  }
});

// Thu ngân xác nhận thu tiền (chốt checkout) hoặc từ chối yêu cầu thanh toán của khách
router.patch("/payment-requests/:tableId", fnbOrdersManage, async (req, res, next) => {
  try {
    if (typeof req.body?.approved !== "boolean") {
      res.status(400).json({ success: false, message: "Trạng thái xử lý thanh toán không hợp lệ" });
      return;
    }
    const data = await sessionService.resolveCustomerPaymentRequest(
      req.params.tableId,
      req.body?.sessionId,
      req.body.approved,
      req.body,
    );
    res.json({
      success: true,
      message: data.status === "paid" ? "Đã xác nhận thanh toán" : "Đã từ chối yêu cầu thanh toán",
      data,
    });
  } catch (error) {
    next(error);
  }
});

// ── 3. ROUTE TẠM TÍNH, YÊU CẦU THANH TOÁN & THEO DÕI ĐƠN CỦA KHÁCH ──────────────────────

// Khách hàng xem trước hóa đơn tạm tính (tiền giờ, F&B, ưu đãi hội viên, voucher)
router.post("/:tableId/checkout-preview", requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const data = await sessionService.previewCustomerCheckout(
      (req as any).user.userId,
      req.params.tableId,
      req.body?.sessionId,
      req.body?.voucherCode,
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Khách hàng bấm "Gọi thanh toán" để chuyển phiên sang trạng thái pending_payment chờ thu ngân
router.post("/:tableId/checkout", requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const data = await sessionService.requestCustomerCheckout(
      (req as any).user.userId,
      req.params.tableId,
      req.body,
    );
    res.json({
      success: true,
      message: data.status === "paid" ? "Thanh toán thành công" : "Đã gửi yêu cầu, vui lòng chờ nhân viên",
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Nhân viên POS cập nhật tiến độ order F&B (duyệt pha chế -> trừ kho & gắn vào bill bàn, sẵn sàng, phục vụ, từ chối)
router.patch("/:id/status", fnbOrdersManage, async (req, res, next) => {
  try {
    const order = await service.updateStatus(
      req.params.id,
      req.body?.status,
      req.body?.rejectedReason,
    );
    res.json({ success: true, message: "Đã cập nhật trạng thái order", data: order });
  } catch (error) {
    next(error);
  }
});

// Khách hàng tra cứu chi tiết một order F&B của chính mình
router.get("/:id", requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const order = await service.getForCustomer(req.params.id, (req as any).user.userId);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

export default router;
