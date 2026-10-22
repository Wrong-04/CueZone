import { Router } from "express";
import tournamentRouter from "../../modules/tournament/tournament.routes";
import { TournamentService } from "../../modules/tournament/tournament.service";

const tournamentService = new TournamentService();

// Public routes cho giải đấu (danh sách giải đấu công khai)
export const tournamentPublicRoutes = Router();
tournamentPublicRoutes.get("/public/tournaments", async (req, res, next) => {
  try {
    const result = await tournamentService.getPublicTournaments(req.query);
    res.json({ success: true, message: "Lấy danh sách giải đấu thành công", data: result });
  } catch (error) {
    next(error);
  }
});

// Protected routes cho quản lý giải đấu (tạo giải, duyệt phí, sinh sơ đồ nhánh đấu)
export const tournamentProtectedRoutes = Router();
tournamentProtectedRoutes.use("/tournaments", tournamentRouter);
