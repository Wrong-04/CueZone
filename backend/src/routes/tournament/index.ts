import { Router } from "express";
import tournamentRouter from "../../modules/tournament/tournament.routes";
import { TournamentService } from "../../modules/tournament/tournament.service";

const tournamentService = new TournamentService();

export const tournamentPublicRoutes = Router();
tournamentPublicRoutes.get("/public/tournaments", async (req, res, next) => {
  try {
    const result = await tournamentService.getPublicTournaments(req.query);
    res.json({ success: true, message: "Lấy danh sách giải đấu thành công", data: result });
  } catch (error) {
    next(error);
  }
});

export const tournamentProtectedRoutes = Router();
tournamentProtectedRoutes.use("/tournaments", tournamentRouter);
