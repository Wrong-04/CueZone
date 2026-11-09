import { Router } from "express";
import { requirePosStaff } from "../../middlewares/pos.middleware";
import { WaitlistService } from "./waitlist.service";
import { WaitlistStatus } from "./waitlist.model";

const router = Router();
const service = new WaitlistService();

router.use(requirePosStaff);

router.get("/", async (_req, res, next) => {
  try {
    const list = await service.getActiveList();
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const entry = await service.create(req.body);
    res.status(201).json({
      success: true,
      message: "Đã thêm khách vào danh sách chờ bàn",
      data: entry,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status, assignedTableId } = req.body;
    if (!Object.values(WaitlistStatus).includes(status)) {
      res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
      return;
    }
    const entry = await service.updateStatus(req.params.id, status, assignedTableId);
    res.json({
      success: true,
      message: "Đã cập nhật trạng thái lượt chờ",
      data: entry,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const entry = await service.remove(req.params.id);
    res.json({
      success: true,
      message: "Đã xóa khỏi danh sách chờ",
      data: entry,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
