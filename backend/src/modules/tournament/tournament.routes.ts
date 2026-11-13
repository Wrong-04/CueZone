import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { TournamentService } from "./tournament.service";
import { requirePermission } from "../../middlewares/auth.middleware";
import { TournamentStatus, Tournament } from "./tournament.model";
import { uploadReceiptImage } from "../../config/cloudinary.config";
import { TournamentPaymentService } from "./tournament-payment.service";
import { TournamentBracketService } from "./bracket.service";
import { sepayConfig } from "./sepay";

const router = Router();
const tournamentService = new TournamentService();
const bracketService = new TournamentBracketService();

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      callback(new Error("Chỉ chấp nhận ảnh chụp biên lai định dạng JPG, PNG hoặc WEBP"));
      return;
    }
    callback(null, true);
  },
}).single("receipt");

const payments = new TournamentPaymentService();
router.get("/bank-info", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { key, ...bank } = sepayConfig();
    res.json({ success: true, data: bank });
  } catch (error) { next(error); }
});
router.get("/:id/payment", async (req, res, next) => {
  try { res.json({ success: true, data: await payments.status(req.params.id, (req as any).user.userId) }); }
  catch (error) { next(error); }
});

router.post("/upload-receipt", (req: Request, res: Response, next: NextFunction) => {
  receiptUpload(req, res, async (err) => {
    if (err) {
      const isTooLarge = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
      return res.status(isTooLarge ? 413 : 400).json({
        success: false,
        message: isTooLarge ? "Ảnh biên lai không được vượt quá 5 MB" : err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn ảnh biên lai chuyển khoản" });
    }

    try {
      const result = await uploadReceiptImage(req.file.buffer);
      res.json({
        success: true,
        message: "Tải ảnh biên lai thành công",
        data: {
          url: result.secure_url || result.url,
          publicId: result.public_id,
        },
      });
    } catch (uploadErr: any) {
      res.status(502).json({
        success: false,
        message: uploadErr?.message || "Không thể tải ảnh biên lai lên máy chủ lưu trữ",
      });
    }
  });
});

router.get("/:id/my-status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
    }
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: "Không tìm thấy giải đấu" });
    }
    const player = tournament.players.find((p: any) => String(p.user) === String(userId));
    res.json({
      success: true,
      data: {
        isRegistered: Boolean(player),
        registrationStatus: player?.registrationStatus || null,
        feePaid: Boolean(player?.feePaid),
        paymentMethod: player?.paymentMethod || null,
        paymentReceiptUrl: player?.paymentReceiptUrl || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

const requireTournamentOperator = requirePermission("tournaments", "manage");

router.get("/:id/payments", requireTournamentOperator, async (req, res, next) => {
  try { res.json({ success: true, data: await payments.snapshot(req.params.id) }); }
  catch (error) { next(error); }
});
router.post("/:id/payments/acknowledge", requireTournamentOperator, async (req, res, next) => {
  try { res.json({ success: true, data: await payments.acknowledge(req.params.id, req.body.revision, req.body.reconciled, (req as any).user.userId) }); }
  catch (error) { next(error); }
});
router.post("/:id/payments/finalize", requireTournamentOperator, async (req, res, next) => {
  try { res.json({ success: true, data: await payments.finalize(req.params.id, req.body.revision, req.body.reconciled) }); }
  catch (error) { next(error); }
});

router.get(
  "/pending-fees",
  requireTournamentOperator,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await tournamentService.getPendingFees();
      res.json({
        success: true,
        message: "Lấy danh sách lệ phí chờ xác nhận thành công",
        data: items,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/:id/players/:userId/fee",
  requireTournamentOperator,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await tournamentService.confirmPlayerFee(
        req.params.id,
        req.params.userId,
        (req as any).user?.userId,
      );
      res.json({ success: true, message: "Đã ghi nhận lệ phí tại quầy", data: tournament });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/my-history", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập để xem lịch sử giải đấu" });
    }
    const history = await tournamentService.getMyTournamentHistory(userId);
    res.json({
      success: true,
      message: "Lấy lịch sử tham gia giải đấu thành công",
      data: history,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/leaderboard", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await tournamentService.getLeaderboard(Number(req.query.limit) || 50);
    res.json({ success: true, message: "Lấy bảng xếp hạng thành công", data });
  } catch (err) {
    next(err);
  }
});

router.get("/", requireTournamentOperator, async (req: Request, res: Response, next: NextFunction) => {
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

router.get("/:id", requireTournamentOperator, async (req: Request, res: Response, next: NextFunction) => {
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

router.post("/:id/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await tournamentService.registerPlayer(
      req.params.id,
      (req as any).user?.userId,
      req.body.paymentMethod,
    );
    res
      .status(201)
      .json({ success: true, message: "Ghi danh giải đấu thành công", data: tournament });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/players/counter",
  requireTournamentOperator,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerId, paymentMethod, note } = req.body;
      const staffId = (req as any).user?.userId;
      if (!customerId) {
        return res
          .status(400)
          .json({ success: false, message: "Vui lòng chọn hội viên đăng ký" });
      }
      const result = await tournamentService.registerPlayerAtCounter(
        req.params.id,
        customerId,
        paymentMethod || "cash",
        staffId,
        note,
      );
      res.status(201).json({
        success: true,
        message: "Ghi danh cơ thủ tại quầy thành công",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post("/", requireTournamentOperator, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const tournament = await tournamentService.createTournament(req.body, userId);
    res.status(201).json({
      success: true,
      message: "Tạo giải đấu thành công ở trạng thái Bản nháp",
      data: tournament,
    });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireTournamentOperator, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await tournamentService.updateTournament(req.params.id, req.body);
    res.json({
      success: true,
      message: "Cập nhật giải đấu thành công",
      data: tournament,
    });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/:id/status",
  requireTournamentOperator,
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
        status as TournamentStatus,
      );

      res.json({
        success: true,
        message: `Chuyển trạng thái giải đấu sang "${status}" thành công`,
        data: tournament,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/:id/bracket", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bracket = await bracketService.getBracketStructure(req.params.id);
    res.json({
      success: true,
      message: "Lấy cây nhánh đấu thành công",
      data: bracket,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/bracket/generate",
  requireTournamentOperator,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bracket = await bracketService.generateSingleEliminationBracket(req.params.id);
      res.status(201).json({
        success: true,
        message: "Sinh cây nhánh đấu trực tiếp thành công",
        data: bracket,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/matches/:matchId/score",
  requireTournamentOperator,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(matchId)) {
        return res.status(400).json({
          success: false,
          message: "Mã trận đấu không hợp lệ",
        });
      }

      const { score1, score2, tableId, status, winnerRegistrationId } = req.body;
      if (score1 !== undefined && (!Number.isInteger(Number(score1)) || Number(score1) < 0)) {
        return res.status(400).json({
          success: false,
          message: "Điểm số 1 phải là số nguyên không âm",
        });
      }
      if (score2 !== undefined && (!Number.isInteger(Number(score2)) || Number(score2) < 0)) {
        return res.status(400).json({
          success: false,
          message: "Điểm số 2 phải là số nguyên không âm",
        });
      }
      if (status !== undefined && !["in_progress", "completed", "walkover"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái trận đấu không hợp lệ",
        });
      }
      if (tableId && !mongoose.Types.ObjectId.isValid(tableId)) {
        return res.status(400).json({
          success: false,
          message: "Mã bàn thi đấu không hợp lệ",
        });
      }
      if (winnerRegistrationId && !mongoose.Types.ObjectId.isValid(winnerRegistrationId)) {
        return res.status(400).json({
          success: false,
          message: "Mã người thắng không hợp lệ",
        });
      }

      const match = await bracketService.updateMatchScore(matchId, {
        score1: score1 !== undefined ? Number(score1) : undefined,
        score2: score2 !== undefined ? Number(score2) : undefined,
        tableId: tableId || undefined,
        status,
        winnerRegistrationId,
      });

      res.json({
        success: true,
        message: "Cập nhật kết quả trận đấu thành công",
        data: match,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.delete("/:id", requireTournamentOperator, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await tournamentService.deleteTournament(req.params.id);
    res.json({
      success: true,
      message: "Xóa giải đấu bản nháp thành công",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
