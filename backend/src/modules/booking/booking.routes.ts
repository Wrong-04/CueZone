import { Router } from "express";
import { BookingService } from "./booking.service";
import { requirePosStaff } from "../../middlewares/pos.middleware";

const router = Router();
const service = new BookingService();
router.use(requirePosStaff);
router.get("/", async (_req, res, next) => {
  try { res.json({ success: true, data: await service.getAll() }); } catch (error) { next(error); }
});
router.post("/", async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await service.create(req.body) }); } catch (error) { next(error); }
});
router.patch("/:id", async (req, res, next) => {
  try { res.json({ success: true, data: await service.update(req.params.id, req.body) }); } catch (error) { next(error); }
});
export default router;
