import { Router, Request, Response, NextFunction } from "express";
import { InventoryReportService } from "./inventory-report.service";
import { requireInventoryRead } from "../../middlewares/inventory-read.middleware";

const router = Router();
const reportService = new InventoryReportService();

/**
 * SCRUM-984: BE: Xây dựng API lấy báo cáo Xuất – Nhập – Tồn theo khoảng thời gian
 * GET /inventory/report?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&category=...&search=...
 */
router.get("/", requireInventoryRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fromDate, toDate, category, search } = req.query;

    const data = await reportService.getReport({
      fromDate: fromDate as string | undefined,
      toDate: toDate as string | undefined,
      category: category as string | undefined,
      search: search as string | undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy báo cáo Xuất – Nhập – Tồn thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * SCRUM-986: BE: Tích hợp exceljs để xuất file .xlsx báo cáo Xuất – Nhập – Tồn
 * GET /inventory/report/export?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&category=...&search=...
 */
router.get("/export", requireInventoryRead, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fromDate, toDate, category, search } = req.query;
    const user = (req as any).user;
    const userName = user?.name || user?.email || "Quản trị viên";

    const buffer = await reportService.exportExcel(
      {
        fromDate: fromDate as string | undefined,
        toDate: toDate as string | undefined,
        category: category as string | undefined,
        search: search as string | undefined,
      },
      userName,
    );

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `BaoCao_XuatNhapTon_${timestamp}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );

    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
});

export default router;

