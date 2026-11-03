import api from "./api";

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

export const inventoryReportService = {
  /**
   * Lấy dữ liệu báo cáo Xuất - Nhập - Tồn
   */
  async getReport(filter: InventoryReportFilter): Promise<InventoryReportResponse> {
    const params: Record<string, string> = {};
    if (filter.fromDate) params.fromDate = filter.fromDate;
    if (filter.toDate) params.toDate = filter.toDate;
    if (filter.category && filter.category !== "all") params.category = filter.category;
    if (filter.search?.trim()) params.search = filter.search.trim();

    const res = await api.get<{ success: boolean; data: InventoryReportResponse }>(
      "/inventory/report",
      { params },
    );
    return res.data.data;
  },

  /**
   * Tải về file Excel .xlsx từ Backend (sử dụng exceljs)
   */
  async exportExcel(filter: InventoryReportFilter): Promise<void> {
    const params: Record<string, string> = {};
    if (filter.fromDate) params.fromDate = filter.fromDate;
    if (filter.toDate) params.toDate = filter.toDate;
    if (filter.category && filter.category !== "all") params.category = filter.category;
    if (filter.search?.trim()) params.search = filter.search.trim();

    const response = await api.get("/inventory/report/export", {
      params,
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    link.setAttribute("download", `BaoCao_XuatNhapTon_${dateStr}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

