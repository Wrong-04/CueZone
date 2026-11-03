import mongoose from "mongoose";
import { Table, TableType, LEGACY_TABLE_TYPE_MAP } from "../table/table.model";
import { Invoice } from "../invoice/invoice.model";

export interface TablePerformanceItem {
  tableId: string;
  tableName: string;
  tableCode: string;
  type: string;
  typeName: string;
  totalPlayMinutes: number;
  totalPlayHours: number;
  utilizationRate: number; // Tỷ lệ khai thác %
  tableRevenue: number;
  fnbRevenue: number;
  totalRevenue: number;
  sessionCount: number;
  rank: number;
}

export interface TableTypePerformance {
  type: string;
  typeName: string;
  tableCount: number;
  totalPlayHours: number;
  utilizationRate: number;
  tableRevenue: number;
  fnbRevenue: number;
  totalRevenue: number;
  averageHoursPerTable: number;
}

export interface HourlyFillRate {
  hour: number;
  label: string;
  occupancyPercent: number;
  sessionCount: number;
}

export interface TablePerformanceReportData {
  period: {
    type: string;
    fromDate: string;
    toDate: string;
    daysCount: number;
  };
  summary: {
    totalTables: number;
    totalPlayHours: number;
    averageUtilizationRate: number;
    totalRevenue: number;
    peakHour: string;
  };
  typeComparison: TableTypePerformance[];
  hourlyFillRates: HourlyFillRate[];
  topTables: TablePerformanceItem[];
}

export interface TablePerformanceFilter {
  period?: "day" | "week" | "month" | "year" | "custom";
  fromDate?: string;
  toDate?: string;
  type?: string;
}

export class TablePerformanceService {
  /**
   * Chuẩn hóa loại bàn về 3 nhóm chính: pool, carom, snooker (SCRUM-1019)
   */
  private normalizeTableType(rawType: string): "pool" | "carom" | "snooker" {
    if (!rawType) return "pool";
    const lower = rawType.toLowerCase().trim();
    if (lower === "pool" || lower === "standard" || lower === "standard_9ft" || lower === "nine_ball") {
      return "pool";
    }
    if (lower === "carom" || lower === "vip" || lower === "libre" || lower === "three_cushion" || lower === "vip_bank_pool") {
      return "carom";
    }
    if (lower === "snooker" || lower === "match" || lower === "match_ksteel") {
      return "snooker";
    }
    return LEGACY_TABLE_TYPE_MAP[lower] || "pool";
  }

  private getTableTypeName(type: string): string {
    const map: Record<string, string> = {
      pool: "Bida Lỗ (Pool)",
      carom: "Bida Phăng / 3 Băng (Carom)",
      snooker: "Bida Thi Đấu (Snooker / Match)",
    };
    return map[type] || type;
  }

  /**
   * SCRUM-1021 & SCRUM-1022: Tính toán tỷ lệ khai thác và hiệu suất bàn
   */
  async getTablePerformanceReport(filter: TablePerformanceFilter): Promise<TablePerformanceReportData> {
    const now = new Date();
    const periodType = filter.period || "week";

    let startDate: Date;
    let endDate: Date;

    if (periodType === "day") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (periodType === "week") {
      startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (periodType === "month") {
      startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (periodType === "year") {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else {
      startDate = filter.fromDate ? new Date(filter.fromDate) : new Date(now.getTime() - 6 * 86400000);
      if (filter.fromDate && !filter.fromDate.includes("T")) startDate.setHours(0, 0, 0, 0);

      endDate = filter.toDate ? new Date(filter.toDate) : new Date();
      if (filter.toDate && !filter.toDate.includes("T")) endDate.setHours(23, 59, 59, 999);
    }

    const diffDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    // Giờ mở cửa chuẩn của CLB: 16 tiếng / ngày (từ 08:00 đến 24:00 = 960 phút/bàn/ngày)
    const operatingMinutesPerTable = diffDays * 16 * 60;

    // 1. Lấy tất cả bàn trong hệ thống
    const tables = await Table.find({}).lean();
    const tableMap = new Map<string, any>();
    tables.forEach((t) => tableMap.set(t._id.toString(), t));

    // 2. Query hóa đơn trong khoảng thời gian [startDate, endDate]
    const invoices = await Invoice.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    // 3. Gom dữ liệu theo từng bàn
    const tableStatsMap = new Map<
      string,
      {
        playMinutes: number;
        tableRevenue: number;
        fnbRevenue: number;
        totalRevenue: number;
        sessionCount: number;
      }
    >();

    // Phân tích theo khung giờ trong ngày (08:00 -> 23:00)
    const hourlyCounts = new Array(24).fill(0);
    const hourlyMinutes = new Array(24).fill(0);

    for (const inv of invoices) {
      const tId = inv.tableId ? inv.tableId.toString() : "";
      const duration = Number(inv.receipt?.durationMinutes) || 0;
      const pCost = Number(inv.receipt?.playingCost) || 0;
      const fTotal = Number(inv.receipt?.fnbTotal) || 0;
      const fAmount = Number(inv.receipt?.finalAmount) || (pCost + fTotal);

      if (tId) {
        const cur = tableStatsMap.get(tId) || {
          playMinutes: 0,
          tableRevenue: 0,
          fnbRevenue: 0,
          totalRevenue: 0,
          sessionCount: 0,
        };
        cur.playMinutes += duration;
        cur.tableRevenue += pCost;
        cur.fnbRevenue += fTotal;
        cur.totalRevenue += fAmount;
        cur.sessionCount += 1;
        tableStatsMap.set(tId, cur);
      }

      // Khung giờ
      const hour = new Date(inv.createdAt).getHours();
      if (hour >= 0 && hour < 24) {
        hourlyCounts[hour] += 1;
        hourlyMinutes[hour] += duration;
      }
    }

    // 4. Lập danh sách từng bàn và xếp hạng (SCRUM-1023)
    const tableItems: TablePerformanceItem[] = tables.map((t) => {
      const tId = t._id.toString();
      const st = tableStatsMap.get(tId) || {
        playMinutes: 0,
        tableRevenue: 0,
        fnbRevenue: 0,
        totalRevenue: 0,
        sessionCount: 0,
      };

      const normType = this.normalizeTableType(t.type);
      const utilRate = operatingMinutesPerTable > 0
        ? Math.min(100, Number(((st.playMinutes / operatingMinutesPerTable) * 100).toFixed(1)))
        : 0;

      return {
        tableId: tId,
        tableName: t.name || `Bàn ${t.code || ""}`,
        tableCode: t.code || (t as any).tableCode || "",
        type: normType,
        typeName: this.getTableTypeName(normType),
        totalPlayMinutes: st.playMinutes,
        totalPlayHours: Number((st.playMinutes / 60).toFixed(1)),
        utilizationRate: utilRate,
        tableRevenue: st.tableRevenue,
        fnbRevenue: st.fnbRevenue,
        totalRevenue: st.totalRevenue,
        sessionCount: st.sessionCount,
        rank: 0,
      };
    });

    // Sắp xếp theo số giờ chơi / doanh thu giảm dần để đánh rank
    tableItems.sort((a, b) => b.totalPlayMinutes - a.totalPlayMinutes || b.totalRevenue - a.totalRevenue);
    tableItems.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    // Filter theo loại bàn nếu có
    const filteredTopTables = filter.type && filter.type !== "all"
      ? tableItems.filter((t) => t.type === filter.type)
      : tableItems;

    // 5. So sánh hiệu suất giữa 3 loại bàn (SCRUM-1019)
    const typeGroupMap: Record<string, { tables: typeof tableItems }> = {
      pool: { tables: [] },
      carom: { tables: [] },
      snooker: { tables: [] },
    };

    tableItems.forEach((t) => {
      if (typeGroupMap[t.type]) {
        typeGroupMap[t.type].tables.push(t);
      }
    });

    const typeComparison: TableTypePerformance[] = Object.entries(typeGroupMap).map(([typeKey, val]) => {
      const count = val.tables.length;
      const typePlayMins = val.tables.reduce((sum, item) => sum + item.totalPlayMinutes, 0);
      const typeTableRev = val.tables.reduce((sum, item) => sum + item.tableRevenue, 0);
      const typeFnbRev = val.tables.reduce((sum, item) => sum + item.fnbRevenue, 0);
      const typeTotRev = val.tables.reduce((sum, item) => sum + item.totalRevenue, 0);

      const capacityMinutes = count * operatingMinutesPerTable;
      const utilRate = capacityMinutes > 0
        ? Math.min(100, Number(((typePlayMins / capacityMinutes) * 100).toFixed(1)))
        : 0;

      return {
        type: typeKey,
        typeName: this.getTableTypeName(typeKey),
        tableCount: count,
        totalPlayHours: Number((typePlayMins / 60).toFixed(1)),
        utilizationRate: utilRate,
        tableRevenue: typeTableRev,
        fnbRevenue: typeFnbRev,
        totalRevenue: typeTotRev,
        averageHoursPerTable: count > 0 ? Number((typePlayMins / 60 / count).toFixed(1)) : 0,
      };
    });

    // 6. Biểu đồ tỷ lệ lấp đầy theo khung giờ (SCRUM-1024)
    const hourlyFillRates: HourlyFillRate[] = [];
    let maxHour = 20;
    let maxCount = 0;

    for (let h = 8; h <= 23; h++) {
      const count = hourlyCounts[h];
      if (count > maxCount) {
        maxCount = count;
        maxHour = h;
      }

      // Giả định công suất tối đa giờ h = tổng số bàn * số ngày
      const maxSlots = Math.max(1, tables.length * diffDays);
      const pct = Math.min(100, Math.round((count / maxSlots) * 100));

      hourlyFillRates.push({
        hour: h,
        label: `${h}:00`,
        occupancyPercent: pct,
        sessionCount: count,
      });
    }

    // 7. Tổng hợp chung
    const totalPlayMinsAll = tableItems.reduce((acc, t) => acc + t.totalPlayMinutes, 0);
    const totalRevenueAll = tableItems.reduce((acc, t) => acc + t.totalRevenue, 0);
    const totalCapacityAll = tables.length * operatingMinutesPerTable;
    const avgUtil = totalCapacityAll > 0
      ? Math.min(100, Number(((totalPlayMinsAll / totalCapacityAll) * 100).toFixed(1)))
      : 0;

    return {
      period: {
        type: periodType,
        fromDate: startDate.toISOString(),
        toDate: endDate.toISOString(),
        daysCount: diffDays,
      },
      summary: {
        totalTables: tables.length,
        totalPlayHours: Number((totalPlayMinsAll / 60).toFixed(1)),
        averageUtilizationRate: avgUtil,
        totalRevenue: totalRevenueAll,
        peakHour: `${maxHour}:00 - ${maxHour + 1}:00`,
      },
      typeComparison,
      hourlyFillRates,
      topTables: filteredTopTables,
    };
  }
}
