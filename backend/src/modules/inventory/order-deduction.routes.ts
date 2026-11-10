import { Router, Request, Response, NextFunction } from "express";
import { orderDeductionService } from "./order-deduction.service";
import { requireInventoryRead } from "../../middlewares/inventory-read.middleware";
import { requirePermission } from "../../middlewares/auth.middleware";
import { orderEvents } from "../../utils/orderEvents";

const router = Router();

function getUserId(req: Request) {
  const user = (req as any).user;
  return user?.userId || user?._id || user?.id;
}

// POST /api/v1/inventory/order-deductions/confirm - Trừ tồn kho theo đơn bán hàng (Idempotent theo orderId)
router.post("/confirm", requirePermission("pos", "operate"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const payload = {
      ...req.body,
      deductedBy: userId ? String(userId) : undefined,
    };

    const result = await orderDeductionService.deductStockForOrder(payload);

    return res.status(result.alreadyProcessed ? 200 : 201).json({
      success: true,
      message: result.message,
      alreadyProcessed: result.alreadyProcessed,
      data: result.deduction,
    });
  } catch (error: any) {
    const msg = error?.message || "Không thể thực hiện trừ tồn kho theo đơn bán hàng.";
    if (
      msg.includes("không đủ tồn kho") ||
      msg.includes("Mã đơn bán hàng") ||
      msg.includes("phải có ít nhất một mặt hàng") ||
      msg.includes("không hợp lệ")
    ) {
      return res.status(400).json({
        success: false,
        message: msg,
      });
    }
    if (msg.includes("Không tìm thấy hàng hóa")) {
      return res.status(404).json({
        success: false,
        message: msg,
      });
    }
    next(error);
  }
});

// POST /api/v1/inventory/order-deductions/event - Trigger qua Event Hook (SCRUM-980)
router.post("/event", requirePermission("pos", "operate"), async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const payload = {
    ...req.body,
    deductedBy: userId ? String(userId) : undefined,
  };

  // Emit event bất đồng bộ
  orderEvents.emit("order:confirmed", payload);

  return res.json({
    success: true,
    message: `Đã phát sự kiện order:confirmed cho đơn hàng #${payload.orderId}`,
  });
});

// GET /api/v1/inventory/order-deductions - Danh sách bản ghi trừ kho theo đơn bán hàng
router.get("/", requireInventoryRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await orderDeductionService.getOrderDeductions({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      orderId: typeof req.query.orderId === "string" ? req.query.orderId : undefined,
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

// GET /api/v1/inventory/order-deductions/:orderId - Chi tiết trừ kho theo orderId
router.get("/:orderId", requireInventoryRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await orderDeductionService.getDeductionByOrderId(req.params.orderId);
    return res.json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    if (error?.message?.includes("Không tìm thấy")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
});

export default router;

