import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import userRouter from "../modules/user/user.routes";
import roleRouter from "../modules/role/role.routes";
import tableRouter from "../modules/table/table.routes";
import pricingRouter from "../modules/pricing/pricing.routes";
import notificationRouter from "../modules/notification/notification.routes";
import bookingRouter from "../modules/booking/booking.routes";
import sessionRouter from "../modules/session/session.routes";
import tournamentRouter from "../modules/tournament/tournament.routes";
import { getPublicTables } from "../modules/table/table.controller";
import { BookingService } from "../modules/booking/booking.service";

const bookingService = new BookingService();

// Public routes (no auth middleware)
export const publicRouter = Router();
publicRouter.use("/auth", authRouter);
publicRouter.get("/public/tables", getPublicTables);
publicRouter.get("/tables/public", getPublicTables);
publicRouter.post("/public/bookings", async (req, res, next) => {
  try {
    const booking = await bookingService.create(req.body);
    res.status(201).json({ success: true, message: "Đặt bàn thành công", data: booking });
  } catch (error) {
    next(error);
  }
});

// Protected routes (auth middleware applied in app.ts)
export const protectedRouter = Router();
protectedRouter.use("/users", userRouter);
protectedRouter.use("/roles", roleRouter);
protectedRouter.use("/tables/:id/session", sessionRouter);
protectedRouter.use("/tables", tableRouter);
protectedRouter.use("/bookings", bookingRouter);
protectedRouter.use("/pricing", pricingRouter);
protectedRouter.use("/notifications", notificationRouter);
protectedRouter.use("/tournaments", tournamentRouter);
// ponytail: auth profile is on publicRouter but needs auth — kept on authRouter at /auth/profile
