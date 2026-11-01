import { Router } from "express";
import { requireRole } from "../../middlewares/auth.middleware";
import { requirePosStaff } from "../../middlewares/pos.middleware";
import { UserRole } from "../user/user.model";
import { VoucherService } from "./voucher.service";

const router = Router();
const service = new VoucherService();
const requireVoucherAdmin = requireRole(UserRole.ADMIN);

router.get("/", requireVoucherAdmin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await service.list() });
  } catch (error) {
    next(error);
  }
});

router.post("/validate", requirePosStaff, async (req, res, next) => {
  try {
    const data = await service.validate(req.body?.code, req.body?.subtotal);
    res.json({ success: true, message: "Voucher hợp lệ", data });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/usage", requireVoucherAdmin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.getUsageHistory(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireVoucherAdmin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.getById(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireVoucherAdmin, async (req, res, next) => {
  try {
    const voucher = await service.create(req.body, (req as any).user.userId);
    res.status(201).json({ success: true, message: "Tạo voucher thành công", data: voucher });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireVoucherAdmin, async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: "Cập nhật voucher thành công",
      data: await service.update(req.params.id, req.body),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireVoucherAdmin, async (req, res, next) => {
  try {
    await service.remove(req.params.id);
    res.json({ success: true, message: "Xóa voucher thành công" });
  } catch (error) {
    next(error);
  }
});

export default router;
