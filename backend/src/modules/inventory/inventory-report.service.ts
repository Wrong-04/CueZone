import ExcelJS from "exceljs";
import mongoose from "mongoose";
import { Product } from "../product/product.model";
import InventoryTransaction from "../product/inventory.model";
import Category from "../product/category.model";

function parseVietnamDate(dateStr?: string, isEnd = false): Date {
  if (!dateStr) {
    const d = new Date();
    if (isEnd) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
    return d;
  }

  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T${isEnd ? "23:59:59.999" : "00:00:00.000"}+07:00`);
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export interface InventoryReportItem {
  productId: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  openingStock: number;
  inStock: number;
  outStock: number;
  wasteStock: number;
  closingStock: number;
  closingValue: number;
}

export interface InventoryReportSummary {
  totalProducts: number;
  totalOpeningStock: number;
  totalInStock: number;
  totalOutStock: number;
  totalWasteStock: number;
  totalClosingStock: number;
  totalClosingValue: number;
}

export interface InventoryReportResponse {
  period: {
    fromDate: string;
    toDate: string;
  };
  summary: InventoryReportSummary;
  items: InventoryReportItem[];
}

export interface InventoryReportFilter {
  fromDate?: string;
  toDate?: string;
  category?: string;
  search?: string;
}

export class InventoryReportService {
  /**
   * Tính toán báo cáo Xuất - Nhập - Tồn theo khoảng thời gian bằng MongoDB Aggregation Pipeline
   */
  async getReport(filter: InventoryReportFilter): Promise<InventoryReportResponse> {
    // Chuẩn hóa múi giờ Việt Nam (UTC+7)
    const startDate = parseVietnamDate(filter.fromDate, false);
    const endDate = parseVietnamDate(filter.toDate, true);

    // Match filter cho Product (Ẩn các món chế biến tại quán không quản lý tồn kho)
    const productMatch: Record<string, any> = {
      isActive: { $ne: false },
      isMadeToOrder: { $ne: true },
      isTheMakeToOrder: { $ne: true },
      isthemaketoorder: { $ne: true },
    };
    if (filter.category && filter.category !== "all") {
      const catMap: Record<string, string[]> = {
        accessory: ["accessory", "equipment"],
        equipment: ["accessory", "equipment"],
        drink: ["drink", "beverage"],
        beverage: ["drink", "beverage"],
        food: ["food", "snack"],
        snack: ["snack", "food"],
        ingredient: ["ingredient", "ingredients"],
        ingredients: ["ingredient", "ingredients"],
        table_supplies: ["table_supplies", "accessory"],
        maintenance: ["maintenance", "accessory"],
      };
      const allowed = catMap[filter.category] || [filter.category];

      try {
        const matchingCats = await Category.find({
          $or: [
            { code: { $in: allowed } },
            { name: { $in: allowed } },
          ],
        }).select("_id").lean();

        const catIds = matchingCats.map((c) => c._id);
        const catIdStrings = catIds.map((id) => id.toString());
        productMatch.$or = [
          { category: { $in: [...allowed, ...catIds, ...catIdStrings] } },
        ];
      } catch {
        productMatch.category = allowed.length === 1 ? allowed[0] : { $in: allowed };
      }
    }
    if (filter.search && filter.search.trim()) {
      const searchRegex = new RegExp(filter.search.trim(), "i");
      const searchOr = [{ name: searchRegex }, { sku: searchRegex }];
      if (productMatch.$or) {
        productMatch.$and = [{ $or: productMatch.$or }, { $or: searchOr }];
        delete productMatch.$or;
      } else {
        productMatch.$or = searchOr;
      }
    }

    // Pipeline tính toán cân đối kho theo từng sản phẩm
    const pipeline: any[] = [
      { $match: productMatch },
      {
        $lookup: {
          from: "inventory_transactions",
          let: { prodId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$product", "$$prodId"] },
                    { $gte: ["$createdAt", startDate] },
                  ],
                },
              },
            },
          ],
          as: "txAfterStart",
        },
      },
      {
        $addFields: {
          // Các giao dịch phát sinh trong khoảng [startDate, endDate]
          inPeriod: {
            $reduce: {
              input: "$txAfterStart",
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $and: [
                      { $lte: ["$$this.createdAt", endDate] },
                      { $eq: ["$$this.type", "in"] },
                    ],
                  },
                  { $add: ["$$value", "$$this.quantity"] },
                  "$$value",
                ],
              },
            },
          },
          outPeriod: {
            $reduce: {
              input: "$txAfterStart",
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $and: [
                      { $lte: ["$$this.createdAt", endDate] },
                      { $eq: ["$$this.type", "out"] },
                    ],
                  },
                  { $add: ["$$value", "$$this.quantity"] },
                  "$$value",
                ],
              },
            },
          },
          wastePeriod: {
            $reduce: {
              input: "$txAfterStart",
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $and: [
                      { $lte: ["$$this.createdAt", endDate] },
                      { $eq: ["$$this.type", "waste"] },
                    ],
                  },
                  { $add: ["$$value", "$$this.quantity"] },
                  "$$value",
                ],
              },
            },
          },
          adjIncPeriod: {
            $reduce: {
              input: "$txAfterStart",
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $and: [
                      { $lte: ["$$this.createdAt", endDate] },
                      { $eq: ["$$this.type", "adjustment"] },
                      { $gt: ["$$this.newStock", "$$this.previousStock"] },
                    ],
                  },
                  { $add: ["$$value", { $subtract: ["$$this.newStock", "$$this.previousStock"] }] },
                  "$$value",
                ],
              },
            },
          },
          adjDecPeriod: {
            $reduce: {
              input: "$txAfterStart",
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $and: [
                      { $lte: ["$$this.createdAt", endDate] },
                      { $eq: ["$$this.type", "adjustment"] },
                      { $lt: ["$$this.newStock", "$$this.previousStock"] },
                    ],
                  },
                  { $add: ["$$value", { $subtract: ["$$this.previousStock", "$$this.newStock"] }] },
                  "$$value",
                ],
              },
            },
          },

          // Tổng biến động từ startDate đến hiện tại (để suy ngược ra Tồn đầu kỳ)
          inAfterStart: {
            $reduce: {
              input: "$txAfterStart",
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.type", "in"] },
                  { $add: ["$$value", "$$this.quantity"] },
                  "$$value",
                ],
              },
            },
          },
          outAfterStart: {
            $reduce: {
              input: "$txAfterStart",
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.type", "out"] },
                  { $add: ["$$value", "$$this.quantity"] },
                  "$$value",
                ],
              },
            },
          },
          wasteAfterStart: {
            $reduce: {
              input: "$txAfterStart",
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.type", "waste"] },
                  { $add: ["$$value", "$$this.quantity"] },
                  "$$value",
                ],
              },
            },
          },
          adjIncAfterStart: {
            $reduce: {
              input: "$txAfterStart",
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$$this.type", "adjustment"] },
                      { $gt: ["$$this.newStock", "$$this.previousStock"] },
                    ],
                  },
                  { $add: ["$$value", { $subtract: ["$$this.newStock", "$$this.previousStock"] }] },
                  "$$value",
                ],
              },
            },
          },
          adjDecAfterStart: {
            $reduce: {
              input: "$txAfterStart",
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$$this.type", "adjustment"] },
                      { $lt: ["$$this.newStock", "$$this.previousStock"] },
                    ],
                  },
                  { $add: ["$$value", { $subtract: ["$$this.previousStock", "$$this.newStock"] }] },
                  "$$value",
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          // Tồn đầu kỳ = Tồn hiện tại - [(Nhập + Tăng kiểm kê) - (Xuất + Hủy + Giảm kiểm kê)]
          openingStock: {
            $max: [
              0,
              {
                $subtract: [
                  { $ifNull: ["$stock", 0] },
                  {
                    $subtract: [
                      { $add: ["$inAfterStart", "$adjIncAfterStart"] },
                      { $add: ["$outAfterStart", "$wasteAfterStart", "$adjDecAfterStart"] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          // Tồn cuối kỳ = Tồn đầu kỳ + Nhập trong kỳ + Tăng kiểm kê - Xuất bán/chuyển - Xuất hủy/hao mòn - Giảm kiểm kê
          closingStock: {
            $max: [
              0,
              {
                $subtract: [
                  { $add: ["$openingStock", "$inPeriod", "$adjIncPeriod"] },
                  { $add: ["$outPeriod", "$wastePeriod", "$adjDecPeriod"] },
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          closingValue: {
            $multiply: ["$closingStock", { $ifNull: ["$costPrice", 0] }],
          },
        },
      },
      // SCRUM-988: Sắp xếp theo SKU tăng dần
      {
        $sort: { sku: 1 },
      },
      {
        $project: {
          _id: 1,
          sku: 1,
          name: 1,
          category: 1,
          unit: 1,
          costPrice: { $ifNull: ["$costPrice", 0] },
          salePrice: { $ifNull: ["$salePrice", 0] },
          openingStock: 1,
          inStock: "$inPeriod",
          outStock: "$outPeriod",
          wasteStock: "$wastePeriod",
          closingStock: 1,
          closingValue: 1,
        },
      },
    ];

    const rawItems = await Product.aggregate(pipeline);

    const items: InventoryReportItem[] = rawItems.map((item) => ({
      productId: item._id.toString(),
      sku: item.sku || "",
      name: item.name || "",
      category: item.category || "",
      unit: item.unit || "",
      costPrice: Number(item.costPrice) || 0,
      salePrice: Number(item.salePrice) || 0,
      openingStock: Number(item.openingStock) || 0,
      inStock: Number(item.inStock) || 0,
      outStock: Number(item.outStock) || 0,
      wasteStock: Number(item.wasteStock) || 0,
      closingStock: Number(item.closingStock) || 0,
      closingValue: Number(item.closingValue) || 0,
    }));

    const summary: InventoryReportSummary = items.reduce(
      (acc, item) => {
        acc.totalProducts += 1;
        acc.totalOpeningStock += item.openingStock;
        acc.totalInStock += item.inStock;
        acc.totalOutStock += item.outStock;
        acc.totalWasteStock += item.wasteStock;
        acc.totalClosingStock += item.closingStock;
        acc.totalClosingValue += item.closingValue;
        return acc;
      },
      {
        totalProducts: 0,
        totalOpeningStock: 0,
        totalInStock: 0,
        totalOutStock: 0,
        totalWasteStock: 0,
        totalClosingStock: 0,
        totalClosingValue: 0,
      },
    );

    return {
      period: {
        fromDate: startDate.toISOString(),
        toDate: endDate.toISOString(),
      },
      summary,
      items,
    };
  }

  /**
   * SCRUM-986: Tích hợp exceljs để xuất file .xlsx báo cáo Xuất – Nhập – Tồn
   */
  async exportExcel(filter: InventoryReportFilter, exportBy: string = "Thủ kho"): Promise<ExcelJS.Buffer> {
    const reportData = await this.getReport(filter);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CueZone Billiard Club";
    workbook.lastModifiedBy = exportBy;
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("BaoCao_XuatNhapTon", {
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    // Formatting date string
    const fromStr = new Date(reportData.period.fromDate).toLocaleDateString("vi-VN");
    const toStr = new Date(reportData.period.toDate).toLocaleDateString("vi-VN");
    const exportTimeStr = new Date().toLocaleString("vi-VN");

    // Title Row 1: Brand
    const rowBrand = worksheet.addRow(["CÂU LẠC BỘ BIDA CUEZONE"]);
    rowBrand.font = { name: "Arial", size: 12, bold: true, color: { argb: "047857" } };

    // Title Row 2: Header
    const rowTitle = worksheet.addRow(["BÁO CÁO TỔNG HỢP XUẤT - NHẬP - TỒN KHO"]);
    rowTitle.font = { name: "Arial", size: 16, bold: true, color: { argb: "111827" } };

    // Subtitle Row 3: Period
    const rowPeriod = worksheet.addRow([`Khoảng thời gian: Từ ngày ${fromStr} đến ngày ${toStr}`]);
    rowPeriod.font = { name: "Arial", size: 10, italic: true, color: { argb: "4B5563" } };

    // Subtitle Row 4: Export metadata
    const rowMeta = worksheet.addRow([`Ngày lập: ${exportTimeStr}  |  Người lập: ${exportBy}`]);
    rowMeta.font = { name: "Arial", size: 9, italic: true, color: { argb: "6B7280" } };

    // Empty space
    worksheet.addRow([]);

    // Table Header Row 6
    const headerCols = [
      "STT",
      "Mã SKU",
      "Tên hàng hóa",
      "Ngành hàng",
      "ĐVT",
      "Tồn đầu kỳ",
      "Nhập kho",
      "Xuất bán",
      "Xuất hao mòn / hủy",
      "Tồn cuối kỳ",
      "Đơn giá vốn (đ)",
      "Giá trị tồn cuối (đ)",
    ];

    const headerRow = worksheet.addRow(headerCols);
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "059669" }, // Emerald 600
      };
      cell.font = {
        name: "Arial",
        size: 10,
        bold: true,
        color: { argb: "FFFFFF" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "047857" } },
        left: { style: "thin", color: { argb: "047857" } },
        bottom: { style: "medium", color: { argb: "047857" } },
        right: { style: "thin", color: { argb: "047857" } },
      };
    });

    // Populate Items
    reportData.items.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1,
        item.sku,
        item.name,
        this.getCategoryLabel(item.category),
        item.unit,
        item.openingStock,
        item.inStock,
        item.outStock,
        item.wasteStock,
        item.closingStock,
        item.costPrice,
        item.closingValue,
      ]);

      row.height = 20;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Arial", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "E5E7EB" } },
          left: { style: "thin", color: { argb: "E5E7EB" } },
          bottom: { style: "thin", color: { argb: "E5E7EB" } },
          right: { style: "thin", color: { argb: "E5E7EB" } },
        };

        // Alignments & Number formats
        if (colNumber === 1) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colNumber === 2 || colNumber === 5) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colNumber === 3 || colNumber === 4) {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        } else if (colNumber >= 6 && colNumber <= 10) {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = "#,##0";
        } else if (colNumber >= 11) {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = '#,##0 "₫"';
        }
      });

      // Alternating row background for readability
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F9FAFB" },
          };
        });
      }
    });

    // Total Summary Row
    const totalRow = worksheet.addRow([
      "TỔNG CỘNG",
      "",
      `${reportData.summary.totalProducts} mặt hàng`,
      "",
      "",
      reportData.summary.totalOpeningStock,
      reportData.summary.totalInStock,
      reportData.summary.totalOutStock,
      reportData.summary.totalWasteStock,
      reportData.summary.totalClosingStock,
      "",
      reportData.summary.totalClosingValue,
    ]);

    totalRow.height = 26;
    totalRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "E6F4EA" }, // Light green
      };
      cell.font = {
        name: "Arial",
        size: 10,
        bold: true,
        color: { argb: "065F46" },
      };
      cell.border = {
        top: { style: "medium", color: { argb: "059669" } },
        left: { style: "thin", color: { argb: "D1D5DB" } },
        bottom: { style: "double", color: { argb: "059669" } },
        right: { style: "thin", color: { argb: "D1D5DB" } },
      };

      if (colNumber === 1) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber >= 6 && colNumber <= 10) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = "#,##0";
      } else if (colNumber === 12) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = '#,##0 "₫"';
      }
    });

    // Set Column Widths
    worksheet.columns = [
      { width: 8 },  // STT
      { width: 14 }, // SKU
      { width: 28 }, // Tên
      { width: 16 }, // Ngành hàng
      { width: 10 }, // ĐVT
      { width: 14 }, // Tồn đầu
      { width: 14 }, // Nhập kho
      { width: 14 }, // Xuất bán
      { width: 20 }, // Xuất hủy
      { width: 14 }, // Tồn cuối
      { width: 18 }, // Đơn giá vốn
      { width: 22 }, // Giá trị tồn cuối
    ];

    return await workbook.xlsx.writeBuffer();
  }

  private getCategoryLabel(category: string): string {
    const map: Record<string, string> = {
      accessory: "Phụ kiện bida",
      equipment: "Cơ & Phụ kiện",
      table_supplies: "Vật tư bàn bida",
      drink: "Đồ uống",
      beverage: "Đồ uống lưu kho",
      food: "Thức ăn",
      snack: "Đồ ăn nhẹ",
      ingredient: "Nguyên liệu",
      ingredients: "Nguyên liệu pha chế",
      maintenance: "Bảo dưỡng & Vệ sinh",
    };
    return map[category] || category || "Khác";
  }
}
