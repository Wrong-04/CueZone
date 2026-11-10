import { Router } from "express";
import { BookingService } from "./booking.service";
import { requirePermission, requireRole } from "../../middlewares/auth.middleware";
import { UserRole } from "../user/user.model";

const router = Router();
const service = new BookingService();
router.get("/mine", requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.getCustomerBookings(String((req as any).user.userId)),
    });
  } catch (error) {
    next(error);
  }
});
router.post("/:id/cancel", requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.cancelCustomerBooking(
        String((req as any).user.userId),
        req.params.id,
        req.body.reason,
      ),
    });
  } catch (error) {
    next(error);
  }
});
router.post("/:id/qr", requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.issueQrToken(String((req as any).user.userId), req.params.id),
    });
  } catch (error) {
    next(error);
  }
});
router.use(requirePermission("bookings", "manage"));
router.post("/qr/resolve", async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.resolveQrToken(req.body?.qrToken) });
  } catch (error) {
    next(error);
  }
});
router.get("/", async (_req, res, next) => {
  try {
    res.json({ success: true, data: await service.getAll() });
  } catch (error) {
    next(error);
  }
});
router.post("/", async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await service.create(req.body) });
  } catch (error) {
    next(error);
  }
});
router.patch("/:id", async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.update(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});
export default router;
