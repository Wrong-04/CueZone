// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU: ROUTER PHIÊN CHƠI POS (/api/v1/tables/:id/session)
// Yêu cầu quyền: `pos.operate` (Admin / Nhân viên thu ngân vận hành quầy)
// Luồng đi: posService (Frontend) -> session.routes.ts -> SessionService -> MongoDB & Socket.IO
// ============================================================================
import { Router } from "express";
import mongoose from "mongoose";
import { SessionService } from "./session.service";
import { requirePermission } from "../../middlewares/auth.middleware";

const router = Router({ mergeParams: true });
const service = new SessionService();

// Bảo vệ toàn bộ endpoint thao tác phiên chơi bằng quyền vận hành POS
router.use(requirePermission("pos", "operate"));

// Kiểm tra định dạng ObjectId của tham số :id bàn trước khi xử lý nghiệp vụ
router.use((req, res, next) => {
  if (!mongoose.isValidObjectId((req.params as { id: string }).id)) {
    res.status(400).json({ success: false, message: "Mã bàn không hợp lệ" });
    return;
  }
  next();
});

// Mở phiên chơi mới trên bàn (POST /api/v1/tables/:id/session)
router.post("/", async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await service.open((req.params as { id: string }).id, req.body),
    });
  } catch (error) {
    next(error);
  }
});

// Alias mở phiên chơi tương thích với các client gọi /session/open
router.post("/open", async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await service.open((req.params as { id: string }).id, req.body),
    });
  } catch (error) {
    next(error);
  }
});

// Tạm dừng hoặc tiếp tục đồng hồ tính giờ chơi của bàn
router.patch("/pause", async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.pause((req.params as { id: string }).id, req.body),
    });
  } catch (error) {
    next(error);
  }
});

// Lấy danh sách bàn đích hợp lệ phục vụ chuyển bàn hoặc gộp bàn
router.get("/move-targets", async (req, res, next) => {
  try {
    const action = req.query.action === "merge" ? "merge" : "transfer";
    res.json({
      success: true,
      data: await service.getEligibleMoveTargets((req.params as { id: string }).id, action),
    });
  } catch (error) {
    next(error);
  }
});

// Thực hiện chuyển phiên sang bàn trống hoặc gộp hóa đơn vào bàn khác
router.post("/move", async (req, res, next) => {
  try {
    const user = (req as any).user;
    res.json({
      success: true,
      data: await service.move((req.params as { id: string }).id, req.body, user),
    });
  } catch (error) {
    next(error);
  }
});

// Chốt thanh toán, áp voucher/chiết khấu, tạo Invoice và giải phóng bàn
router.post("/checkout", async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.checkout((req.params as { id: string }).id, req.body),
    });
  } catch (error) {
    next(error);
  }
});

// Hủy một phần/toàn bộ món F&B trong phiên và hoàn tồn kho (nếu chưa chế biến)
router.post("/orders/cancel", async (req, res, next) => {
  try {
    const user = (req as any).user;
    res.json({
      success: true,
      data: await service.cancelOrderItem((req.params as { id: string }).id, req.body, user),
    });
  } catch (error) {
    next(error);
  }
});

// Gọi thêm hoặc cập nhật danh sách món F&B trên bàn đang chơi (lưu currentSession.orders & phát Socket)
router.post("/orders", async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.updateOrders((req.params as { id: string }).id, req.body),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
