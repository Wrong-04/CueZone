import { Router, Request, Response, NextFunction } from "express";
import { RevenueReportService } from "./revenue-report.service";
import { TablePerformanceService } from "./table-performance.service";

const router = Router();
const revenueService = new RevenueReportService();
const tablePerfService = new TablePerformanceService();

/**
 * SCRUM-992: BE: Thiết kế API báo cáo doanh thu tổng hợp theo khoảng thời gian
 * GET /reports/revenue?period=day|week|month|year|custom&fromDate=...&toDate=...
 */
router.get("/revenue", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (user && user.role !== "admin" && user.role !== "staff" && user.role !== "cashier") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem báo cáo doanh thu",
      });
    }

    const { period, fromDate, toDate } = req.query;

    const data = await revenueService.getRevenueReport({
      period: period as any,
      fromDate: fromDate as string | undefined,
      toDate: toDate as string | undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy báo cáo doanh thu thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * SCRUM-1022: BE: Thiết kế API báo cáo tỷ lệ khai thác bàn và hiệu suất theo loại bàn
 * GET /reports/table-performance?period=...&fromDate=...&toDate=...&type=...
 */
router.get("/table-performance", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (user && user.role !== "admin" && user.role !== "staff" && user.role !== "cashier") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem báo cáo hiệu suất bàn",
      });
    }

    const { period, fromDate, toDate, type } = req.query;

    const data = await tablePerfService.getTablePerformanceReport({
      period: period as any,
      fromDate: fromDate as string | undefined,
      toDate: toDate as string | undefined,
      type: type as string | undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy báo cáo hiệu suất và tỷ lệ khai thác bàn thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * SCRUM-1023: BE: Xây dựng API lấy top bàn hoạt động nhiều nhất
 * GET /reports/top-tables?period=...&limit=...
 */
router.get("/top-tables", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (user && user.role !== "admin" && user.role !== "staff" && user.role !== "cashier") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập",
      });
    }

    const { period, fromDate, toDate, type } = req.query;
    const limit = Number(req.query.limit) || 10;

    const fullReport = await tablePerfService.getTablePerformanceReport({
      period: period as any,
      fromDate: fromDate as string | undefined,
      toDate: toDate as string | undefined,
      type: type as string | undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách top bàn hoạt động nhiều nhất thành công",
      data: fullReport.topTables.slice(0, limit),
    });
  } catch (error) {
    next(error);
  }
});

export default router;

