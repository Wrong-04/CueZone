import { Router } from "express";
import { requireRole } from "../../middlewares/auth.middleware";
import { requirePosStaff } from "../../middlewares/pos.middleware";
import { UserRole } from "../user/user.model";
import { CustomerOrderService } from "./customer-order.service";
import { SessionService } from "../session/session.service";

const router = Router();
const service = new CustomerOrderService();
const sessionService = new SessionService();

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

router.post("/", requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const order = await service.create((req as any).user.userId, req.body);
    res.status(201).json({ success: true, message: "Đã gửi order tới quầy", data: order });
  } catch (error) {
    next(error);
  }
});

router.get("/queue", requirePosStaff, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await service.getQueue() });
  } catch (error) {
    next(error);
  }
});

router.get("/payment-requests", requirePosStaff, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await sessionService.getCustomerPaymentRequests() });
  } catch (error) {
    next(error);
  }
});

router.patch("/payment-requests/:tableId", requirePosStaff, async (req, res, next) => {
  try {
    if (typeof req.body?.approved !== "boolean") {
      res.status(400).json({ success: false, message: "Trạng thái xử lý thanh toán không hợp lệ" });
      return;
    }
    const data = await sessionService.resolveCustomerPaymentRequest(
      req.params.tableId,
      req.body?.sessionId,
      req.body.approved,
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

router.patch("/:id/status", requirePosStaff, async (req, res, next) => {
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

router.get("/:id", requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const order = await service.getForCustomer(req.params.id, (req as any).user.userId);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

export default router;
