import { Router } from "express";
import { requireRole } from "../../middlewares/auth.middleware";
import { requirePosStaff } from "../../middlewares/pos.middleware";
import { UserRole } from "../user/user.model";
import { CustomerOrderService } from "./customer-order.service";

const router = Router();
const service = new CustomerOrderService();

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
