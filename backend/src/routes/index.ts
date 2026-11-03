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
import walletRouter from "../modules/wallet/wallet.routes";
import voucherRouter from "../modules/voucher/voucher.routes";
import customerOrderRouter from "../modules/customer-order/customer-order.routes";
import memberCenterRouter from "../modules/member/member-center.routes";
import { TournamentService } from "../modules/tournament/tournament.service";
import { getPublicTables } from "../modules/table/table.controller";
import { BookingService } from "../modules/booking/booking.service";
import { optionalAuthMiddleware, requireRole } from "../middlewares/auth.middleware";
import { UserRole } from "../modules/user/user.model";
import { WalletService, type VnpayParameters } from "../modules/wallet/wallet.service";

import productRouter, { productManagementRouter } from "../modules/product/product.routes";

import { BANK_POOL_RULES_DATA } from "../modules/rule/bankPoolRules.data";

const bookingService = new BookingService();
const walletService = new WalletService();
const tournamentService = new TournamentService();

// Public routes (no auth middleware)
export const publicRouter = Router();
publicRouter.use("/auth", authRouter);
publicRouter.use("/products", productRouter);
publicRouter.get("/public/tables", getPublicTables);
publicRouter.get("/tables/public", getPublicTables);
publicRouter.get("/public/vnpay/ipn", async (req, res) => {
  const parameters = Object.entries(req.query).reduce<VnpayParameters>((result, [key, value]) => {
    result[key] = typeof value === "string" ? value : "";
    return result;
  }, {});
  try {
    res.json(await walletService.handleVnpayIpn(parameters));
  } catch (error) {
    console.error("Lỗi xử lý IPN VNPay:", error);
    res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
});
publicRouter.get("/public/booking-availability", async (req, res, next) => {
  try {
    const tables = await bookingService.getAvailableTables({
      date: String(req.query.date || ""),
      time: String(req.query.time || ""),
      duration: Number(req.query.duration),
      type: req.query.type ? String(req.query.type) : undefined,
    });
    res.json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
});
publicRouter.get("/public/bank-pool-rules", (req, res) => {
  res.json({
    success: true,
    message: "Lấy quy định và thể thức thi đấu Bank Pool thành công",
    data: BANK_POOL_RULES_DATA,
  });
});
publicRouter.get("/public/tournaments", async (req, res, next) => {
  try {
    const result = await tournamentService.getPublicTournaments(req.query);
    res.json({ success: true, message: "Lấy danh sách giải đấu thành công", data: result });
  } catch (error) {
    next(error);
  }
});
publicRouter.post(
  "/public/bookings",
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const booking = await bookingService.create(
        req.body,
        (req as any).user?.userId,
        "approved",
      );
      res
        .status(201)
        .json({ success: true, message: "Đặt bàn đã được xác nhận tự động", data: booking });
    } catch (error) {
      next(error);
    }
  },
);

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
protectedRouter.use("/wallet", walletRouter);
protectedRouter.use("/vouchers", voucherRouter);
protectedRouter.use("/customer", memberCenterRouter);
protectedRouter.use("/customer/fnb-orders", customerOrderRouter);
protectedRouter.use("/products", productManagementRouter);
// ponytail: auth profile is on publicRouter but needs auth — kept on authRouter at /auth/profile
