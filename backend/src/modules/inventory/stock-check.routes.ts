import { Router, Request, Response, NextFunction } from "express";
import { StockCheckService } from "./stock-check.service";
import { requireInventoryRead } from "../../middlewares/inventory-read.middleware";
import { requireProductManager } from "../../middlewares/product-admin.middleware";

const router = Router();
const stockCheckService = new StockCheckService();

function getUserId(req: Request): string {
  const user = (req as any).user;
  return user?.userId || user?._id || user?.id || "";
}

/**
 * GET /inventory/stock-checks - Danh sách các đợt kiểm kê
 */
router.get("/", requireInventoryRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, search, fromDate, toDate } = req.query;

    const data = await stockCheckService.getStockChecks({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      status: status as string | undefined,
      search: search as string | undefined,
      fromDate: fromDate as string | undefined,
      toDate: toDate as string | undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách đợt kiểm kê thành công",
      data: data.items,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        pages: data.pages,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /inventory/stock-checks/:id - Chi tiết một đợt kiểm kê
 */
router.get("/:id", requireInventoryRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stockCheck = await stockCheckService.getStockCheckById(req.params.id);
    if (!stockCheck) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đợt kiểm kê.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết đợt kiểm kê thành công",
      data: stockCheck,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * SCRUM-1065: BE: Xây dựng API tạo đợt kiểm kê kèm snapshot tồn kho hiện tại (Hỗ trợ cả Staff & Admin)
 * POST /inventory/stock-checks
 */
router.post("/", requireInventoryRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Bạn chưa đăng nhập" });
    }

    const { title, category, note } = req.body;
    const stockCheck = await stockCheckService.createStockCheck(
      { title, category, note },
      userId,
    );

    return res.status(201).json({
      success: true,
      message: "Tạo đợt kiểm kê hàng hóa thành công.",
      data: stockCheck,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Không thể tạo đợt kiểm kê.",
    });
  }
});

/**
 * SCRUM-1064: BE: Xây dựng API nhập số lượng kiểm đếm và nộp phiếu kiểm kê ở trạng thái SUBMITTED (Staff & Admin)
 * PUT /inventory/stock-checks/:id/counts
 */
router.put("/:id/counts", requireInventoryRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Bạn chưa đăng nhập" });
    }

    const { counts, submit } = req.body;
    if (!Array.isArray(counts)) {
      return res.status(400).json({
        success: false,
        message: "Danh sách số lượng kiểm đếm không hợp lệ.",
      });
    }

    const updated = await stockCheckService.updateCounts(
      req.params.id,
      counts,
      userId,
      Boolean(submit),
    );

    return res.status(200).json({
      success: true,
      message: submit
        ? "Đã nộp phiếu kiểm kê thành công, chờ quản lý duyệt cân bằng."
        : "Đã lưu số lượng kiểm đếm thành công.",
      data: updated,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Không thể cập nhật số lượng kiểm đếm.",
    });
  }
});

/**
 * SCRUM-1068: BE: Xây dựng luồng duyệt cân bằng kho và cập nhật tồn kho trong transaction atomic
 * POST /inventory/stock-checks/:id/approve
 */
router.post("/:id/approve", requireProductManager, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Bạn chưa đăng nhập" });
    }

    const completed = await stockCheckService.approveStockCheck(req.params.id, userId);

    return res.status(200).json({
      success: true,
      message: "Phê duyệt và cân bằng tồn kho thành công.",
      data: completed,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Không thể phê duyệt cân bằng tồn kho.",
    });
  }
});

/**
 * POST /inventory/stock-checks/:id/cancel - Hủy đợt kiểm kê
 */
router.post("/:id/cancel", requireProductManager, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { reason } = req.body;

    const cancelled = await stockCheckService.cancelStockCheck(req.params.id, userId, reason);

    return res.status(200).json({
      success: true,
      message: "Hủy đợt kiểm kê thành công.",
      data: cancelled,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Không thể hủy đợt kiểm kê.",
    });
  }
});

export default router;

