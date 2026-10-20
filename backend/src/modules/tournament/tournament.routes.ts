import { Router, Request, Response, NextFunction } from "express";
import { TournamentService } from "./tournament.service";
import { requirePosStaff } from "../../middlewares/pos.middleware";
import { TournamentStatus } from "./tournament.model";
import { User, UserRole } from "../user/user.model";

const router = Router();
const tournamentService = new TournamentService();

async function requireTournamentOperator(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById((req as any).user?.userId);
    if (!user || !user.isActive || user.isLocked) {
      return res.status(401).json({ success: false, message: "Phiên đăng nhập không còn hợp lệ" });
    }
    if (![UserRole.ADMIN, UserRole.STAFF, UserRole.CASHIER].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền đối soát lệ phí giải đấu" });
    }
    next();
  } catch (error) {
    next(error);
  }
}

router.get("/pending-fees", requireTournamentOperator, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await tournamentService.getPendingFees();
    res.json({ success: true, message: "Lấy danh sách lệ phí chờ xác nhận thành công", data: items });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/players/:userId/fee", requireTournamentOperator, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await tournamentService.confirmPlayerFee(
      req.params.id,
      req.params.userId,
      (req as any).user?.userId
    );
    res.json({ success: true, message: "Đã ghi nhận lệ phí tại quầy", data: tournament });
  } catch (err) {
    next(err);
  }
});

// Lấy danh sách giải đấu (cho phép cả staff xem)
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await tournamentService.getTournaments(req.query);
    res.json({
      success: true,
      message: "Lấy danh sách giải đấu thành công",
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// Lấy chi tiết giải đấu
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await tournamentService.getTournamentById(req.params.id);
    res.json({
      success: true,
      message: "Lấy thông tin giải đấu thành công",
      data: tournament,
    });
  } catch (err) {
    next(err);
  }
});

// Hội viên ghi danh giải đấu và chọn thanh toán qua ví hoặc tại quầy
router.post("/:id/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await tournamentService.registerPlayer(
      req.params.id,
      (req as any).user?.userId,
      req.body.paymentMethod
    );
    res.status(201).json({ success: true, message: "Ghi danh giải đấu thành công", data: tournament });
  } catch (err) {
    next(err);
  }
});

// Tạo giải đấu mới (Cần quyền Admin/Staff)
router.post(
  "/",
  requirePosStaff,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const tournament = await tournamentService.createTournament(
        req.body,
        userId
      );
      res.status(201).json({
        success: true,
        message: "Tạo giải đấu thành công ở trạng thái Bản nháp",
        data: tournament,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Cập nhật giải đấu (Cần quyền Admin/Staff)
router.put(
  "/:id",
  requirePosStaff,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await tournamentService.updateTournament(
        req.params.id,
        req.body
      );
      res.json({
        success: true,
        message: "Cập nhật giải đấu thành công",
        data: tournament,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Chuyển đổi trạng thái giải đấu (Ví dụ DRAFT -> REGISTRATION_OPEN)
router.patch(
  "/:id/status",
  requirePosStaff,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      if (!status || !Object.values(TournamentStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái giải đấu không hợp lệ",
        });
      }

      const tournament = await tournamentService.changeStatus(
        req.params.id,
        status as TournamentStatus
      );

      res.json({
        success: true,
        message: `Chuyển trạng thái giải đấu sang "${status}" thành công`,
        data: tournament,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Xóa giải đấu DRAFT (Cần quyền Admin/Staff)
router.delete(
  "/:id",
  requirePosStaff,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await tournamentService.deleteTournament(req.params.id);
      res.json({
        success: true,
        message: "Xóa giải đấu bản nháp thành công",
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
