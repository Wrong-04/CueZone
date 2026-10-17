import { Router } from "express";
import mongoose from "mongoose";
import { SessionService } from "./session.service";
import { requirePosStaff } from "../../middlewares/pos.middleware";

const router = Router({ mergeParams: true });
const service = new SessionService();
router.use(requirePosStaff);
router.use((req, res, next) => {
  if (!mongoose.isValidObjectId((req.params as { id: string }).id)) {
    res.status(400).json({ success: false, message: "Mã bàn không hợp lệ" });
    return;
  }
  next();
});
router.post("/", async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await service.open((req.params as { id: string }).id, req.body) }); } catch (error) { next(error); }
});
router.post("/open", async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await service.open((req.params as { id: string }).id, req.body) }); } catch (error) { next(error); }
});
router.patch("/pause", async (req, res, next) => {
  try { res.json({ success: true, data: await service.pause((req.params as { id: string }).id, req.body) }); } catch (error) { next(error); }
});
router.post("/move", async (req, res, next) => {
  try { res.json({ success: true, data: await service.move((req.params as { id: string }).id, req.body) }); } catch (error) { next(error); }
});
router.post("/checkout", async (req, res, next) => {
  try { res.json({ success: true, data: await service.checkout((req.params as { id: string }).id, req.body) }); } catch (error) { next(error); }
});
router.post("/orders", async (req, res, next) => {
  try { res.json({ success: true, data: await service.updateOrders((req.params as { id: string }).id, req.body) }); } catch (error) { next(error); }
});
export default router;
