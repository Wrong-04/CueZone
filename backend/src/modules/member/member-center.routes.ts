import { Router } from "express";
import { requireRole } from "../../middlewares/auth.middleware";
import { UserRole } from "../user/user.model";
import { MemberCenterService } from "./member-center.service";

const router = Router();
const service = new MemberCenterService();
router.use(requireRole(UserRole.CUSTOMER));

router.get("/membership", async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.getMembership(String((req as any).user.userId)),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/play-history", async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    if (!Number.isSafeInteger(page) || page < 1) {
      res.status(400).json({ success: false, message: "Trang lịch sử không hợp lệ" });
      return;
    }
    res.json({
      success: true,
      data: await service.getPlayHistory(String((req as any).user.userId), page),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
