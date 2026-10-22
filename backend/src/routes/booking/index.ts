import { Router } from "express";
import bookingRouter from "../../modules/booking/booking.routes";
import { BookingService } from "../../modules/booking/booking.service";
import { optionalAuthMiddleware } from "../../middlewares/auth.middleware";

const bookingService = new BookingService();

// Public routes cho đặt bàn (khách vãng lai hoặc hội viên)
export const bookingPublicRoutes = Router();
bookingPublicRoutes.post("/public/bookings", optionalAuthMiddleware, async (req, res, next) => {
  try {
    const booking = await bookingService.create(req.body, (req as any).user?.userId);
    res.status(201).json({ success: true, message: "Đặt bàn thành công", data: booking });
  } catch (error) {
    next(error);
  }
});

// Protected routes cho quản lý đặt bàn (nhân viên, thu ngân, admin)
export const bookingProtectedRoutes = Router();
bookingProtectedRoutes.use("/bookings", bookingRouter);
