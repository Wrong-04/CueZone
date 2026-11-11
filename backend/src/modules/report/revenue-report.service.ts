import mongoose from "mongoose";
import { Invoice } from "../invoice/invoice.model";

export interface RevenueKPIs {
  totalRevenue: number; // Tổng thực thu
  tableRevenue: number; // Tiền giờ bàn
  fnbRevenue: number; // Doanh thu F&B
  discountAmount: number; // Tiền giảm giá voucher
  invoiceCount: number; // Tổng số hóa đơn
  averageBillValue: number; // Trung bình mỗi đơn
}

export interface RevenueTimelinePoint {
  key: string;
  label: string;
  tableRevenue: number;
  fnbRevenue: number;
  discountAmount: number;
  totalRevenue: number;
  invoiceCount: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TopProductRevenue {
  name: string;
  quantity: number;
  revenue: number;
}

export interface RevenueReportData {
  period: {
    type: "day" | "week" | "month" | "year" | "custom";
    fromDate: string;
    toDate: string;
  };
  kpis: RevenueKPIs;
  timeline: RevenueTimelinePoint[];
  paymentMethods: PaymentMethodBreakdown[];
  topProducts: TopProductRevenue[];
}

export interface RevenueReportQuery {
  period?: "day" | "week" | "month" | "year" | "custom";
  fromDate?: string;
  toDate?: string;
}

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

export class RevenueReportService {
  /**
   * SCRUM-992, SCRUM-994, SCRUM-995:
   * Aggregation query tối ưu tổng hợp doanh thu từ các hóa đơn đã thanh toán
   */
  async getRevenueReport(query: RevenueReportQuery): Promise<RevenueReportData> {
    const periodType = query.period || "week";
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    if (periodType === "day") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (periodType === "week") {
      // 7 ngày gần nhất (tính từ 6 ngày trước đến hết hôm nay)
      startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (periodType === "month") {
      // 30 ngày gần nhất
      startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (periodType === "year") {
      // Từ đầu năm
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else {
      // Custom date range chuẩn hóa múi giờ Việt Nam
      startDate = parseVietnamDate(query.fromDate, false);
      endDate = parseVietnamDate(query.toDate, true);
    }

    const matchStage = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
      status: { $ne: "cancelled" },
    };

    // Aggregation 1: Tổng hợp KPIs và Payment Methods
    const kpiAggregation = await Invoice.aggregate([
      { $match: matchStage },
      {
        $project: {
          tableRevenue: { $ifNull: ["$receipt.playingCost", 0] },
          fnbRevenue: { $ifNull: ["$receipt.fnbTotal", 0] },
          discountAmount: { $ifNull: ["$receipt.discountAmount", 0] },
          finalAmount: { $ifNull: ["$receipt.finalAmount", 0] },
          paymentMethod: { $ifNull: ["$receipt.paymentMethod", "cash"] },
          orders: { $ifNull: ["$receipt.orders", []] },
          createdAt: 1,
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$finalAmount" },
                tableRevenue: { $sum: "$tableRevenue" },
                fnbRevenue: { $sum: "$fnbRevenue" },
                discountAmount: { $sum: "$discountAmount" },
                invoiceCount: { $sum: 1 },
              },
            },
          ],
          byPaymentMethod: [
            {
              $group: {
                _id: "$paymentMethod",
                amount: { $sum: "$finalAmount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { amount: -1 } },
          ],
          allOrders: [
            { $unwind: "$orders" },
            {
              $group: {
                _id: "$orders.name",
                quantity: { $sum: "$orders.quantity" },
                revenue: {
                  $sum: { $multiply: ["$orders.price", "$orders.quantity"] },
                },
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);

    const summaryResult = kpiAggregation[0]?.summary[0] || {
      totalRevenue: 0,
      tableRevenue: 0,
      fnbRevenue: 0,
      discountAmount: 0,
      invoiceCount: 0,
    };

    const kpis: RevenueKPIs = {
      totalRevenue: summaryResult.totalRevenue || 0,
      tableRevenue: summaryResult.tableRevenue || 0,
      fnbRevenue: summaryResult.fnbRevenue || 0,
      discountAmount: summaryResult.discountAmount || 0,
      invoiceCount: summaryResult.invoiceCount || 0,
      averageBillValue:
        summaryResult.invoiceCount > 0
          ? Math.round(summaryResult.totalRevenue / summaryResult.invoiceCount)
          : 0,
    };

    // Parse Payment Methods: Đảm bảo Tiền mặt, Chuyển khoản, Ví hội viên luôn đầy đủ
    const paymentLabelMap: Record<string, string> = {
      cash: "Tiền mặt",
      transfer: "Chuyển khoản",
      banking: "Chuyển khoản",
      bank: "Chuyển khoản",
      vietqr: "Chuyển khoản VietQR",
      member_balance: "Ví hội viên",
      wallet: "Ví hội viên",
      cuezone_pay: "Ví hội viên",
      momo: "MoMo",
      vnpay: "VNPay",
      card: "Thẻ ngân hàng",
    };

    const channelMap: Record<string, { label: string; amount: number; count: number }> = {
      cash: { label: "Tiền mặt", amount: 0, count: 0 },
      transfer: { label: "Chuyển khoản", amount: 0, count: 0 },
      member_balance: { label: "Ví hội viên", amount: 0, count: 0 },
    };

    const normalizeMethodKey = (method: string): string => {
      const m = String(method || "cash").toLowerCase();
      if (m === "cash") return "cash";
      if (
        m.includes("vietqr") ||
        m.includes("transfer") ||
        m.includes("bank") ||
        m.includes("card") ||
        m.includes("vnpay") ||
        m.includes("momo")
      ) {
        return "transfer";
      }
      if (
        m.includes("member_balance") ||
        m.includes("wallet") ||
        m.includes("cuezone_pay") ||
        m.includes("ví")
      ) {
        return "member_balance";
      }
      return m;
    };

    (kpiAggregation[0]?.byPaymentMethod || []).forEach((pm: any) => {
      const key = normalizeMethodKey(pm._id);
      if (!channelMap[key]) {
        channelMap[key] = {
          label: paymentLabelMap[pm._id] || pm._id || "Khác",
          amount: 0,
          count: 0,
        };
      }
      channelMap[key].amount += pm.amount || 0;
      channelMap[key].count += pm.count || 0;
    });

    const paymentMethods: PaymentMethodBreakdown[] = Object.entries(channelMap).map(
      ([method, data]) => ({
        method,
        label: data.label,
        amount: data.amount,
        count: data.count,
        percentage:
          kpis.totalRevenue > 0 ? Number(((data.amount / kpis.totalRevenue) * 100).toFixed(1)) : 0,
      }),
    );

    // Parse Top Products
    const topProducts: TopProductRevenue[] = (kpiAggregation[0]?.allOrders || []).map((o: any) => ({
      name: o._id || "Sản phẩm",
      quantity: o.quantity || 0,
      revenue: o.revenue || 0,
    }));

    // Aggregation 2: Timeline Breakdown
    const timeline = await this.buildTimeline(periodType, startDate, endDate, matchStage);

    return {
      period: {
        type: periodType,
        fromDate: startDate.toISOString(),
        toDate: endDate.toISOString(),
      },
      kpis,
      timeline,
      paymentMethods,
      topProducts,
    };
  }

  private async buildTimeline(
    periodType: string,
    startDate: Date,
    endDate: Date,
    matchStage: any,
  ): Promise<RevenueTimelinePoint[]> {
    if (periodType === "day") {
      // Group theo giờ trong ngày (0..23)
      const hourlyAgg = await Invoice.aggregate([
        { $match: matchStage },
        {
          $project: {
            hour: { $hour: { date: "$createdAt", timezone: "+07:00" } },
            tableRevenue: { $ifNull: ["$receipt.playingCost", 0] },
            fnbRevenue: { $ifNull: ["$receipt.fnbTotal", 0] },
            discountAmount: { $ifNull: ["$receipt.discountAmount", 0] },
            finalAmount: { $ifNull: ["$receipt.finalAmount", 0] },
          },
        },
        {
          $group: {
            _id: "$hour",
            tableRevenue: { $sum: "$tableRevenue" },
            fnbRevenue: { $sum: "$fnbRevenue" },
            discountAmount: { $sum: "$discountAmount" },
            totalRevenue: { $sum: "$finalAmount" },
            invoiceCount: { $sum: 1 },
          },
        },
      ]);

      const hourMap = new Map<number, any>();
      hourlyAgg.forEach((h) => hourMap.set(h._id, h));

      const points: RevenueTimelinePoint[] = [];
      for (let h = 8; h <= 23; h++) {
        // Các giờ hoạt động chính 8h - 23h
        const item = hourMap.get(h);
        points.push({
          key: `${h}:00`,
          label: `${h}:00`,
          tableRevenue: item?.tableRevenue || 0,
          fnbRevenue: item?.fnbRevenue || 0,
          discountAmount: item?.discountAmount || 0,
          totalRevenue: item?.totalRevenue || 0,
          invoiceCount: item?.invoiceCount || 0,
        });
      }
      return points;
    }

    // Mặc định hoặc week / month: Group theo ngày (YYYY-MM-DD)
    const dailyAgg = await Invoice.aggregate([
      { $match: matchStage },
      {
        $project: {
          dateStr: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+07:00" },
          },
          tableRevenue: { $ifNull: ["$receipt.playingCost", 0] },
          fnbRevenue: { $ifNull: ["$receipt.fnbTotal", 0] },
          discountAmount: { $ifNull: ["$receipt.discountAmount", 0] },
          finalAmount: { $ifNull: ["$receipt.finalAmount", 0] },
        },
      },
      {
        $group: {
          _id: "$dateStr",
          tableRevenue: { $sum: "$tableRevenue" },
          fnbRevenue: { $sum: "$fnbRevenue" },
          discountAmount: { $sum: "$discountAmount" },
          totalRevenue: { $sum: "$finalAmount" },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dayMap = new Map<string, any>();
    dailyAgg.forEach((d) => dayMap.set(d._id, d));

    // Duyệt qua từng ngày trong khoảng startDate -> endDate
    const points: RevenueTimelinePoint[] = [];
    const cur = new Date(startDate);
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    while (cur <= endDate) {
      const year = cur.getFullYear();
      const month = String(cur.getMonth() + 1).padStart(2, "0");
      const day = String(cur.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;
      const dayOfWeek = dayNames[cur.getDay()];
      const label = `${dayOfWeek} ${day}/${month}`;

      const matched = dayMap.get(dateKey);
      points.push({
        key: dateKey,
        label,
        tableRevenue: matched?.tableRevenue || 0,
        fnbRevenue: matched?.fnbRevenue || 0,
        discountAmount: matched?.discountAmount || 0,
        totalRevenue: matched?.totalRevenue || 0,
        invoiceCount: matched?.invoiceCount || 0,
      });

      cur.setDate(cur.getDate() + 1);
    }

    return points;
  }
}

