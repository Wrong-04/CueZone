import { Router, Request, Response, NextFunction } from "express";
import { User, UserRole } from "../user/user.model";
import { WalletService } from "./wallet.service";

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

async function requireWalletOperator(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById((req as any).user?.userId);
    if (!user || !user.isActive || user.isLocked) {
      return res.status(401).json({ success: false, message: "Phiên đăng nhập không còn hợp lệ" });
    }
    if (![UserRole.ADMIN, UserRole.STAFF, UserRole.CASHIER].includes(user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Bạn không có quyền đối soát giao dịch ví" });
    }
    next();
  } catch (error) {
    next(error);
  }
}

router.get("/", requireWalletUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wallet = await walletService.getForUser((req as any).user.userId);
    res.json({ success: true, message: "Lấy thông tin ví thành công", data: wallet });
  } catch (error) {
    next(error);
  }
});

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
