import { useState, useEffect, useMemo, useCallback } from "react";
import { posService, bookingService } from "../../../../services/pos.service";
import { productService } from "../../../../services/product.service";
import { invoiceService } from "../../../../services/invoice.service";
import {
  tournamentService,
  type TournamentItem,
  type BracketMatch,
} from "../../../../services/tournament.service";
import { getSocket } from "../../../../services/socket.service";

import type { PosTable, BookingRequest } from "../../../../types/pos";
import type { ClubInvoice } from "../../InvoicesManagementPage";
import type { FnbStockItem } from "../../../../types";
import type {
  DashboardFloorStats,
  CustomerStats,
  HourlyDataPoint,
  RevenueSplit,
} from "../types/dashboard.types";

/**
 * Hàm tiện ích: Tính toán thời gian chơi thực tế và tạm tính tiền giờ của một bàn.
 * - Trừ đi tổng thời gian tạm dừng (totalPausedMs) nếu phiên chơi từng bị pause.
 * - Hỗ trợ cộng dồn chi phí chơi trước đó nếu bàn được chuyển từ bàn khác (carriedCost).
 * - Trả về: tổng phút, tiền giờ tạm tính (làm tròn) và chuỗi định dạng HH:mm:ss.
 */
export const calculateTableDurationAndCost = (table: PosTable, currentTime: number) => {
  if (!table.currentSession) return { minutes: 0, cost: 0, formattedTime: "00:00:00" };
  const session = table.currentSession;
  const effectiveNow = session.isPaused && session.pausedAt ? session.pausedAt : currentTime;
  const totalElapsedMs = Math.max(
    0,
    effectiveNow - session.startedAt - (session.totalPausedMs || 0),
  );
  const totalMinutes = Math.max(1, Math.round(totalElapsedMs / 60000));

  const hours = Math.floor(totalElapsedMs / 3600000);
  const mins = Math.floor((totalElapsedMs % 3600000) / 60000);
  const secs = Math.floor((totalElapsedMs % 60000) / 1000);

  const formattedTime = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const carriedCost = Number((session as any).carriedCost || 0);
  const playingCost = Math.round((totalMinutes / 60) * table.pricePerHour) + carriedCost;

  return { minutes: totalMinutes, cost: playingCost, formattedTime };
};

/**
 * Custom Hook: useDashboardData
 * Chịu trách nhiệm toàn bộ logic nghiệp vụ cho màn hình Admin Dashboard:
 * 1. Gọi API nạp dữ liệu: Danh sách bàn, Đặt bàn, Tồn kho F&B, Hóa đơn hôm nay, Giải đấu.
 * 2. Lắng nghe WebSocket thời gian thực (đổi trạng thái bàn, điểm số giải đấu, order F&B).
 * 3. Đồng hồ ticker 1s để cập nhật thời gian trôi của các bàn đang chơi.
 * 4. Tính toán thống kê sàn (FloorStats), khách hàng (CustomerStats), biểu đồ giờ cao điểm (HourlyData) và tỷ lệ doanh thu (RevenueSplit).
 */
export function useDashboardData() {
  // ── 1. Khai báo State ──────────────────────────────────────────────────────
  const [tables, setTables] = useState<PosTable[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [fnbStock, setFnbStock] = useState<FnbStockItem[]>([]);
  const [todayInvoices, setTodayInvoices] = useState<ClubInvoice[]>([]);
  const [invoicesRevenue, setInvoicesRevenue] = useState<number>(0);
  const [invoicesTableFee, setInvoicesTableFee] = useState<number>(0);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [activeBracketMatch, setActiveBracketMatch] = useState<BracketMatch | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // ── 2. Hàm gọi API tải dữ liệu tổng hợp từ máy chủ ────────────────────────
  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Gọi song song 5 API qua Promise.allSettled để tránh một API lỗi làm sập toàn bộ dashboard
      const [tablesRes, bookingsRes, productsRes, invoicesRes, tournamentsRes] =
        await Promise.allSettled([
          posService.getTables(),
          bookingService.getAll(),
          productService.getAll(),
          invoiceService.getInvoices({ limit: 100 }),
          tournamentService.getTournaments({ limit: 5 }),
        ]);

      // Xử lý danh sách bàn
      if (tablesRes.status === "fulfilled" && Array.isArray(tablesRes.value)) {
        setTables(tablesRes.value);
      }

      // Xử lý danh sách đặt bàn
      if (bookingsRes.status === "fulfilled" && Array.isArray(bookingsRes.value)) {
        setBookings(bookingsRes.value);
      }

      // Xử lý danh mục sản phẩm F&B (lọc bỏ nguyên liệu kho thô)
      if (productsRes.status === "fulfilled" && Array.isArray(productsRes.value)) {
        const mappedProducts: FnbStockItem[] = productsRes.value
          .filter((p: any) => p.category !== "ingredient")
          .map((p: any) => ({
            id: String(p._id),
            code: p.sku || `MN-${String(p._id).slice(-4)}`,
            name: p.name,
            category: p.category || "drink",
            categoryName: p.category || "Đồ Uống",
            price: Number(p.salePrice) || 0,
            priceFormatted: `${Number(p.salePrice || 0).toLocaleString("vi-VN")}đ`,
            stockQuantity: Number(p.stock) || 0,
            minThreshold: Number(p.minStock) || 5,
            unit: p.unit || "Lon",
            image: p.imageUrl || "",
            isMadeToOrder: Boolean(p.isMadeToOrder),
          }));
        setFnbStock(mappedProducts);
      }

      // Xử lý hóa đơn đã thanh toán trong ngày hôm nay
      if (invoicesRes.status === "fulfilled" && invoicesRes.value) {
        const items = invoicesRes.value.items || [];
        const todayStr = new Date().toDateString();
        const paidToday = items.filter((inv: any) => {
          if (!inv.createdAt) return false;
          return new Date(inv.createdAt).toDateString() === todayStr && inv.status === "paid";
        });
        setTodayInvoices(paidToday);
        const todayPaid = paidToday.reduce((sum: number, inv: any) => sum + (inv.finalTotal || 0), 0);
        const todayTable = paidToday.reduce((sum: number, inv: any) => sum + (inv.tableFee || 0), 0);
        setInvoicesRevenue(todayPaid);
        setInvoicesTableFee(todayTable);
      }

      // Xử lý giải đấu đang diễn ra và lấy trận đấu trực tiếp gần nhất
      if (tournamentsRes.status === "fulfilled" && tournamentsRes.value?.items) {
        const tourItems = tournamentsRes.value.items;
        setTournaments(tourItems);

        const targetTour =
          tourItems.find((t) => t.status === "in_progress") ||
          tourItems.find((t) => t.status === "bracket_generated") ||
          tourItems.find((t) => t.status === "registration_open") ||
          tourItems.find((t) => t.status === "draft") ||
          tourItems[0] ||
          null;

        if (
          targetTour &&
          (targetTour.status === "in_progress" || targetTour.status === "bracket_generated")
        ) {
          try {
            const bracket = await tournamentService.getBracket(targetTour._id);
            const allMatches = (bracket.rounds || []).flatMap((r) => r.matches || []);
            const liveMatch =
              allMatches.find((m) => m.status === "in_progress") ||
              allMatches.find(
                (m) =>
                  m.status === "scheduled" &&
                  m.participants.filter((p) => Boolean(p.user?.name)).length >= 2,
              ) ||
              [...allMatches].reverse().find((m) => m.status === "completed") ||
              null;
            setActiveBracketMatch(liveMatch);
          } catch {
            setActiveBracketMatch(null);
          }
        } else {
          setActiveBracketMatch(null);
        }
      }
    } catch (err) {
      console.warn("Lỗi đồng bộ Dashboard từ API:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // ── 3. Effects: Lắng nghe Socket thời gian thực & Đồng hồ nhảy giây ────────
  useEffect(() => {
    void loadDashboardData();

    const socket = getSocket();
    const handleLiveUpdate = () => {
      void loadDashboardData(true);
    };

    // Đăng ký nhận thông báo thay đổi trạng thái bàn, giải đấu và đơn hàng F&B
    socket.on("table:status-changed", handleLiveUpdate);
    socket.on("table:status_changed", handleLiveUpdate);
    socket.on("tournament:score_updated", handleLiveUpdate);
    socket.on("tournament:match_completed", handleLiveUpdate);
    socket.on("fnb:order_updated", handleLiveUpdate);

    return () => {
      socket.off("table:status-changed", handleLiveUpdate);
      socket.off("table:status_changed", handleLiveUpdate);
      socket.off("tournament:score_updated", handleLiveUpdate);
      socket.off("tournament:match_completed", handleLiveUpdate);
      socket.off("fnb:order_updated", handleLiveUpdate);
    };
  }, [loadDashboardData]);

  // Cập nhật currentTime mỗi 1 giây để thời gian các bàn đang chơi nhảy liên tục
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── 4. Helpers tính toán chi tiết ─────────────────────────────────────────
  const calculatePlayingDetails = useCallback(
    (table: PosTable) => calculateTableDurationAndCost(table, currentTime),
    [currentTime],
  );

  /**
   * Phân loại order F&B thành đồ uống (drink) hoặc món ăn/snack để thống kê doanh thu riêng biệt
   */
  const classifyFnbOrder = useCallback(
    (rawCategory?: string, itemName?: string, itemId?: string): "drink" | "snack" => {
      const normalizedName = (itemName || "").trim().toLowerCase();
      const matchedProduct = fnbStock.find(
        (p) => (itemId && p.id === itemId) || p.name.trim().toLowerCase() === normalizedName,
      );
      const cat = String(rawCategory || matchedProduct?.category || "")
        .trim()
        .toLowerCase();

      if (
        [
          "snack",
          "food",
          "noodle",
          "fruit",
          "accessory",
          "equipment",
          "ăn vặt",
          "đồ ăn",
          "phụ kiện",
        ].includes(cat)
      ) {
        return "snack";
      }
      if (
        ["drink", "coffee", "tea", "juice", "beer", "water", "beverage", "đồ uống", "nước"].includes(
          cat,
        )
      ) {
        return "drink";
      }
      if (
        /mì|khô bò|khô gà|hướng dương|khoai|xúc xích|bánh|kẹo|bò viên|cơm|phở|trái cây|snack|ăn vặt|lơ|găng|đầu cơ/i.test(
          normalizedName,
        )
      ) {
        return "snack";
      }
      return "drink";
    },
    [fnbStock],
  );

  // ── 5. Derived State (useMemo): Thống kê ca làm việc, sàn, khách hàng, biểu đồ ──
  // Xác định ca làm việc theo giờ trong ngày
  const shiftInfo = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) {
      return { label: "Ca sáng", hours: "06:00 - 14:00" };
    } else if (hour >= 14 && hour < 22) {
      return { label: "Ca chiều", hours: "14:00 - 22:00" };
    } else {
      return { label: "Ca đêm", hours: "22:00 - 06:00" };
    }
  }, []);

  // Thống kê sàn bida: số bàn chơi/trống/bảo trì, tỷ lệ lấp đầy, tạm tính tiền giờ + F&B
  const floorStats: DashboardFloorStats = useMemo(() => {
    const total = tables.length;
    const playing = tables.filter((t) => t.status === "playing").length;
    const paused = tables.filter((t) => t.status === "paused").length;
    const booked = tables.filter((t) => t.status === "booked").length;
    const available = tables.filter((t) => t.status === "available" || !t.status).length;
    const maintenance = tables.filter((t) => t.status === "maintenance").length;

    let totalTempTableRevenue = 0;
    let totalTempDrinkRevenue = 0;
    let totalTempSnackRevenue = 0;

    tables.forEach((t) => {
      if (t.currentSession) {
        const { cost } = calculateTableDurationAndCost(t, currentTime);
        totalTempTableRevenue += cost;
        (t.currentSession.orders || []).forEach((order) => {
          if ((order as any).status === "cancelled") return;
          const qty = Math.max(
            0,
            Number(order.quantity || 1) - Number((order as any).cancelledQuantity || 0),
          );
          if (qty <= 0) return;
          const itemCost = (order.price || 0) * qty;
          if (
            classifyFnbOrder(
              order.category,
              order.name,
              String((order as any).productId || order.id || ""),
            ) === "snack"
          ) {
            totalTempSnackRevenue += itemCost;
          } else {
            totalTempDrinkRevenue += itemCost;
          }
        });
      }
    });

    const occupiedTables = playing + paused;
    const occupancyRate = total > 0 ? Math.round((occupiedTables / total) * 100) : 0;
    const totalTempRevenue = totalTempTableRevenue + totalTempDrinkRevenue + totalTempSnackRevenue;
    const paidRevenueToday = invoicesRevenue;
    const grandRevenueToday = paidRevenueToday + totalTempRevenue;

    return {
      total,
      playing,
      paused,
      booked,
      available,
      maintenance,
      totalTempRevenue,
      totalTempTableRevenue,
      totalTempDrinkRevenue,
      totalTempSnackRevenue,
      paidRevenueToday,
      grandRevenueToday,
      occupancyRate,
      occupiedTables,
    };
  }, [tables, invoicesRevenue, currentTime, classifyFnbOrder]);

  // Thống kê cơ cấu khách hàng hôm nay: Hội viên (VIP, Vàng, Bạc...) vs Khách vãng lai
  const customerStats: CustomerStats = useMemo(() => {
    let vip = 0;
    let member = 0;
    let regular = 0;
    const activeTables = tables.filter(
      (t) => (t.status === "playing" || t.status === "paused") && t.currentSession,
    );

    activeTables.forEach((t) => {
      const tier = (t.currentSession as any)?.tier || "regular";
      if (tier === "vip" || tier === "diamond") vip++;
      else if (tier === "member" || tier === "gold" || tier === "silver") member++;
      else regular++;
    });

    const total = activeTables.length;
    const members = vip + member;
    const guests = regular;
    const memberPercent = total > 0 ? Math.round((members / total) * 100) : 0;

    return { total, members, guests, memberPercent };
  }, [tables]);

  // Thống kê doanh thu theo từng mốc giờ (08h - 23h) phục vụ biểu đồ giờ cao điểm
  const hourlyData: HourlyDataPoint[] = useMemo(() => {
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    const currentHour = new Date().getHours();

    const rawPoints = hours.map((h) => {
      const label = `${h.toString().padStart(2, "0")}h`;
      const isPast = h < currentHour;
      const isNow = h === currentHour;

      if (isNow) {
        const estNow = Math.round(floorStats.totalTempTableRevenue / 1000);
        return { hour: label, revenue: estNow, isNow };
      }

      const paidInHour = todayInvoices
        .filter((inv) => {
          if (!inv.createdAt) return false;
          return new Date(inv.createdAt).getHours() === h;
        })
        .reduce((sum, inv) => sum + (inv.finalTotal || 0), 0);

      const valK = paidInHour > 0 ? Math.round(paidInHour / 1000) : isPast ? 0 : 0;
      return { hour: label, revenue: valK, isNow: false };
    });

    // Tính doanh thu cao nhất để làm mốc tỷ lệ % chiều cao cột biểu đồ
    const maxRev = Math.max(...rawPoints.map((p) => p.revenue), 100);

    return rawPoints.map((p) => {
      const height =
        p.revenue > 0 ? Math.min(100, Math.max(12, Math.round((p.revenue / maxRev) * 100))) : 8;
      const isPeak = p.revenue >= maxRev * 0.7 && p.revenue > 0;
      return { hour: p.hour, revenue: p.revenue, height, isPeak };
    });
  }, [todayInvoices, floorStats.totalTempTableRevenue]);

  // Phân bổ tỷ lệ doanh thu theo nguồn: Tiền giờ bàn, Nước uống, Đồ ăn vặt
  const revenueSplit: RevenueSplit = useMemo(() => {
    const totalTable = invoicesTableFee + floorStats.totalTempTableRevenue;
    const totalDrink = floorStats.totalTempDrinkRevenue;
    const totalSnack = floorStats.totalTempSnackRevenue;
    const totalAll = totalTable + totalDrink + totalSnack;

    if (totalAll === 0) {
      return {
        tablePercent: 100,
        drinkPercent: 0,
        snackPercent: 0,
        hasData: false,
      };
    }

    return {
      tablePercent: Math.round((totalTable / totalAll) * 100),
      drinkPercent: Math.round((totalDrink / totalAll) * 100),
      snackPercent: Math.max(
        0,
        100 - Math.round((totalTable / totalAll) * 100) - Math.round((totalDrink / totalAll) * 100),
      ),
      hasData: true,
    };
  }, [invoicesTableFee, floorStats]);

  // Danh sách các thực thể đã lọc sẵn để widget render ngay
  const activeTables = useMemo(() => {
    return tables.filter(
      (t) => (t.status === "playing" || t.status === "paused") && t.currentSession,
    );
  }, [tables]);

  const lowStockItems = useMemo(() => {
    return fnbStock.filter((item) => !item.isMadeToOrder && item.stockQuantity <= item.minThreshold);
  }, [fnbStock]);

  const activeTournament = useMemo(() => {
    return (
      tournaments.find((t) => t.status === "in_progress" || t.status === "bracket_generated") ||
      tournaments[0] ||
      null
    );
  }, [tournaments]);

  // ── 6. Trả về toàn bộ dữ liệu & hàm điều khiển cho AdminDashboard ──────────
  return {
    loading,
    currentTime,
    shiftInfo,
    floorStats,
    customerStats,
    hourlyData,
    revenueSplit,
    tables,
    activeTables,
    bookings,
    tournaments,
    activeTournament,
    activeBracketMatch,
    lowStockItems,
    invoicesRevenue,
    todayInvoices,
    loadDashboardData,
    calculatePlayingDetails,
  };
}
