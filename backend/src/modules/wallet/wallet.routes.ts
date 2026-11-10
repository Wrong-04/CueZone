import { Router, Request, Response, NextFunction } from "express";
import { User, UserRole } from "../user/user.model";
import { WalletService, type VnpayParameters } from "./wallet.service";
import { requirePermission } from "../../middlewares/auth.middleware";

const router = Router();
const walletService = new WalletService();

async function requireWalletUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById((req as any).user?.userId);
    if (!user || !user.isActive || user.isLocked) {
      return res.status(401).json({ success: false, message: "Phiên đăng nhập không còn hợp lệ" });
    }
    if (user.role !== UserRole.CUSTOMER) {
      return res
        .status(403)
        .json({ success: false, message: "Chức năng ví chỉ dành cho hội viên" });
    }
    next();
  } catch (error) {
    next(error);
  }
}

const requireWalletOperator = requirePermission("wallet", "operate");

router.get("/", requireWalletUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wallet = await walletService.getForUser((req as any).user.userId);
    res.json({ success: true, message: "Lấy thông tin ví thành công", data: wallet });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/topups/vnpay",
  requireWalletUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await walletService.createVnpayTopup(
        (req as any).user.userId,
        req.body.amount,
        req.ip ?? req.socket.remoteAddress,
      );
      res.status(201).json({
        success: true,
        message: "Đã tạo giao dịch nạp ví",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/topups/vnpay/return",
  requireWalletUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parameters = Object.entries(req.body ?? {}).reduce<VnpayParameters>(
        (result, [key, value]) => {
          if (typeof value === "string") result[key] = value;
          return result;
        },
        {},
      );
      const payment = await walletService.confirmVnpayReturn(
        (req as any).user.userId,
        parameters,
      );
      res.json({
        success: true,
        message: "Đã xác nhận kết quả thanh toán VNPay",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/topups/vnpay/:referenceCode",
  requireWalletUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await walletService.getVnpayTopupStatus(
        (req as any).user.userId,
        req.params.referenceCode,
      );
      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/topups",
  requireWalletUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wallet = await walletService.requestTopup((req as any).user.userId, req.body.amount);
      res
        .status(201)
        .json({ success: true, message: "Đã tạo yêu cầu nạp ví, đang chờ đối soát", data: wallet });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/topups/pending",
  requireWalletOperator,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await walletService.getPendingTopups();
      res.json({ success: true, message: "Lấy yêu cầu nạp đang chờ thành công", data: items });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/topups/:transactionId",
  requireWalletOperator,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      if (status !== "success" && status !== "failed") {
        return res
          .status(400)
          .json({ success: false, message: "Trạng thái đối soát không hợp lệ" });
      }
      const result = await walletService.reviewTopup(
        req.params.transactionId,
        (req as any).user.userId,
        status,
      );
      res.json({
        success: true,
        message: status === "success" ? "Đã cộng tiền vào ví" : "Đã từ chối yêu cầu nạp",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
