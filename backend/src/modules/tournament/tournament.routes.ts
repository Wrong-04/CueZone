import { Router, Request, Response, NextFunction } from "express";
import { TournamentService } from "./tournament.service";
import { requirePosStaff } from "../../middlewares/pos.middleware";
import { TournamentStatus } from "./tournament.model";

const router = Router();
const tournamentService = new TournamentService();

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

export default router;
