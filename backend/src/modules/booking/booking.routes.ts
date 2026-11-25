// =========================================================================================
// ROUTER ĐẶT BÀN (/api/v1/bookings)
// - Nhóm 1: API dành cho Khách hàng (tài khoản đăng nhập role CUSTOMER)
// - Nhóm 2: API dành cho Quản trị & Lễ tân (quyền bookings.manage)
// =========================================================================================
import { Router } from "express";
import { BookingService } from "./booking.service";
import { requirePermission, requireRole } from "../../middlewares/auth.middleware";
import { UserRole } from "../user/user.model";

const router = Router();
const service = new BookingService();

// ── 1. CÁC ROUTE DÀNH CHO KHÁCH HÀNG (Yêu cầu đăng nhập role CUSTOMER) ───────────────────

// Lấy danh sách lịch đặt bàn của chính khách hàng đang đăng nhập
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

// Khách hàng tự hủy lịch đặt bàn trước thời hạn quy định
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

// Cấp mã QR Check-in cho khách hàng mang tới quầy lễ tân quét khi nhận bàn
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

// ── 2. CÁC ROUTE QUẢN LÝ LỊCH ĐẶT BÀN (Yêu cầu quyền bookings.manage) ────────────────────
router.use(requirePermission("bookings", "manage"));

// Lễ tân quét / giải mã QR Check-in của khách để đối chiếu thông tin nhận bàn
router.post("/qr/resolve", async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.resolveQrToken(req.body?.qrToken) });
  } catch (error) {
    next(error);
  }
});

// Lấy toàn bộ danh sách đặt bàn phục vụ màn hình quản trị / điều phối
router.get("/", async (_req, res, next) => {
  try {
    res.json({ success: true, data: await service.getAll() });
  } catch (error) {
    next(error);
  }
});

// Lễ tân/Quản trị tạo lịch đặt bàn trực tiếp tại quầy (không qua luồng cọc công khai)
router.post("/", async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await service.create(req.body) });
  } catch (error) {
    next(error);
  }
});

// Cập nhật trạng thái hoặc thông tin đơn đặt bàn (duyệt, hủy, ghi chú...)
router.patch("/:id", async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.update(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

export default router;
