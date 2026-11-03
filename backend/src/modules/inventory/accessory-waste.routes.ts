import { Router, Request, Response, NextFunction } from "express";
import { AccessoryWasteService } from "./accessory-waste.service";
import { requireProductManager } from "../../middlewares/product-admin.middleware";
import { requireInventoryRead } from "../../middlewares/inventory-read.middleware";

const router = Router();
const wasteService = new AccessoryWasteService();

function getUser(req: Request) {
  return (req as any).user;
}

// GET /api/v1/inventory/waste/stats - Thống kê audit log & tỷ lệ hao hụt tài sản (SCRUM-914)
router.get("/stats", requireInventoryRead, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await wasteService.getWasteAuditStats();
    return res.json({
      success: true,
      message: "Lấy báo cáo hao hụt tài sản thành công.",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/inventory/waste - Danh sách phiếu xuất hủy phụ kiện
router.get("/", requireInventoryRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await wasteService.getWastes({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      product: typeof req.query.product === "string" ? req.query.product : undefined,
      fromDate: typeof req.query.fromDate === "string" ? req.query.fromDate : undefined,
      toDate: typeof req.query.toDate === "string" ? req.query.toDate : undefined,
    });

    return res.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/inventory/waste/:id - Chi tiết phiếu xuất hủy
router.get("/:id", requireInventoryRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const waste = await wasteService.getWasteById(req.params.id);
    return res.json({
      success: true,
      data: waste,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/inventory/waste - Ghi nhận xuất hủy phụ kiện (SCRUM-910, 911, 913)
router.post("/", requireProductManager, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = getUser(req);
    const userId = user?.userId || user?._id || user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    const waste = await wasteService.createWaste(req.body, String(userId));
    return res.status(201).json({
      success: true,
      message: "Ghi nhận xuất hủy phụ kiện thành công.",
      data: waste,
    });
  } catch (error: any) {
    const msg = error?.message || "Không thể thực hiện xuất hủy phụ kiện.";
    if (
      msg.includes("vượt quá tồn kho") ||
      msg.includes("phải là số nguyên") ||
      msg.includes("Bắt buộc phải nhập lý do") ||
      msg.includes("Mặt hàng này không phải là phụ kiện") ||
      msg.includes("không hợp lệ")
    ) {
      return res.status(400).json({
        success: false,
        message: msg,
      });
    }
    if (msg.includes("Không tìm thấy")) {
      return res.status(404).json({
        success: false,
        message: msg,
      });
    }
    next(error);
  }
});

export default router;

