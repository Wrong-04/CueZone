import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  TrophyOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ArrowUpOutlined,
  RightOutlined,
  AlertOutlined,
  AppstoreOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { Card, Button, Tag, Typography } from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";
import { posService, bookingService } from "../../services/pos.service";
import { productService } from "../../services/product.service";
import { invoiceService } from "../../services/invoice.service";
import { tournamentService, type TournamentItem } from "../../services/tournament.service";
import type { PosTable, BookingRequest } from "../../types/pos";
import type { ClubInvoice } from "./InvoicesManagementPage";
import type { FnbStockItem } from "../../mock/posData";

const { Title, Text } = Typography;

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Live tables from database
  const [tables, setTables] = useState<PosTable[]>([]);
  // Live bookings from database
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  // Live F&B stock from database
  const [fnbStock, setFnbStock] = useState<FnbStockItem[]>([]);
  // Invoices data and metrics from database
  const [todayInvoices, setTodayInvoices] = useState<ClubInvoice[]>([]);
  const [invoicesRevenue, setInvoicesRevenue] = useState<number>(0);
  const [invoicesTableFee, setInvoicesTableFee] = useState<number>(0);
  const [invoicesFnbFee, setInvoicesFnbFee] = useState<number>(0);
  // Tournaments data from database
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const [tablesRes, bookingsRes, productsRes, invoicesRes, tournamentsRes] =
        await Promise.allSettled([
          posService.getTables(),
          bookingService.getAll(),
          productService.getAll(),
          invoiceService.getInvoices({ limit: 50 }),
          tournamentService.getTournaments({ limit: 5 }),
        ]);

      if (tablesRes.status === "fulfilled" && Array.isArray(tablesRes.value)) {
        setTables(tablesRes.value);
      }
      if (bookingsRes.status === "fulfilled" && Array.isArray(bookingsRes.value)) {
        setBookings(bookingsRes.value);
      }
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
            image: p.imageUrl || "/fnb/fnb-salt-coffee.jpg",
            isMadeToOrder: Boolean(p.isMadeToOrder),
          }));
        setFnbStock(mappedProducts);
      }
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
        const todayFnb = paidToday.reduce((sum: number, inv: any) => sum + (inv.fnbFee || 0), 0);
        setInvoicesRevenue(todayPaid);
        setInvoicesTableFee(todayTable);
        setInvoicesFnbFee(todayFnb);
      }
      if (tournamentsRes.status === "fulfilled" && tournamentsRes.value?.items) {
        setTournaments(tournamentsRes.value.items);
      }
    } catch (err) {
      console.warn("Lỗi đồng bộ Dashboard từ API:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  // Dynamic Shift calculation based on current hour
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

  // Clock ticker for live session durations
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper: Live duration and bill calculation
  const calculatePlayingDetails = (table: PosTable) => {
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
    const playingCost = Math.round((totalMinutes / 60) * table.pricePerHour);

    return { minutes: totalMinutes, cost: playingCost, formattedTime };
  };

  // Floor stats
  const floorStats = useMemo(() => {
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
        const { cost } = calculatePlayingDetails(t);
        totalTempTableRevenue += cost;
        (t.currentSession.orders || []).forEach((order) => {
          const itemCost = (order.price || 0) * (order.quantity || 1);
          if (order.category === "drink" || order.category === "coffee") {
            totalTempDrinkRevenue += itemCost;
          } else {
            totalTempSnackRevenue += itemCost;
          }
        });
      }
    });

    const totalTempRevenue = totalTempTableRevenue + totalTempDrinkRevenue + totalTempSnackRevenue;
    const paidRevenueToday = invoicesRevenue;
    const grandRevenueToday = totalTempRevenue + paidRevenueToday;

    const usableTables = total > 0 ? Math.max(1, total - maintenance) : 0;
    const occupiedTables = playing + paused + booked;
    const occupancyRate =
      total > 0 && usableTables > 0
        ? Math.min(100, Math.round((occupiedTables / usableTables) * 100))
        : 0;

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
  }, [tables, currentTime, invoicesRevenue]);

  // Low stock alert items (exclude made to order items)
  const lowStockItems = useMemo(() => {
    return fnbStock.filter((item) => !item.isMadeToOrder && item.stockQuantity <= item.minThreshold);
  }, [fnbStock]);

  // Customer statistics dynamically derived without arbitrary constants
  const customerStats = useMemo(() => {
    const activeSessions = tables.filter((t) => t.currentSession);
    const memberSessions = activeSessions.filter((t) => t.currentSession?.isMember).length;

    // Invoices completed today by club members
    const invoiceMembers = todayInvoices.filter(
      (inv) => inv.memberRank && inv.memberRank !== "Normal",
    ).length;
    const invoiceGuests = todayInvoices.length - invoiceMembers;

    // Total unique verified customers and guests today
    const totalMembers = memberSessions + invoiceMembers;
    const totalGuests = (activeSessions.length - memberSessions) + invoiceGuests + bookings.length;
    const totalCustomers = totalMembers + totalGuests;
    const memberPercent =
      totalCustomers > 0 ? Math.round((totalMembers / totalCustomers) * 100) : 0;

    return {
      total: totalCustomers,
      members: totalMembers,
      guests: totalGuests,
      memberPercent,
    };
  }, [tables, bookings, todayInvoices]);

  // Active playing/paused/booked tables for the live cockpit
  const activeTables = useMemo(() => {
    return tables.filter(
      (t) => t.status === "playing" || t.status === "paused" || t.status === "booked",
    );
  }, [tables]);

  // Pending bookings count
  const pendingBookingsCount = useMemo(() => {
    return bookings.filter((b) => b.status === "pending").length;
  }, [bookings]);

  // Dynamic revenue category split
  const revenueSplit = useMemo(() => {
    const totalTable = floorStats.totalTempTableRevenue + invoicesTableFee;
    const totalDrink = floorStats.totalTempDrinkRevenue + Math.round(invoicesFnbFee * 0.7);
    const totalSnack = floorStats.totalTempSnackRevenue + Math.round(invoicesFnbFee * 0.3);
    const grand = totalTable + totalDrink + totalSnack;

    if (grand === 0) {
      return { tablePercent: 0, drinkPercent: 0, snackPercent: 0, hasData: false };
    }

    const tablePercent = Math.round((totalTable / grand) * 100);
    const drinkPercent = Math.round((totalDrink / grand) * 100);
    const snackPercent = Math.max(0, 100 - tablePercent - drinkPercent);

    return { tablePercent, drinkPercent, snackPercent, hasData: true };
  }, [floorStats, invoicesTableFee, invoicesFnbFee]);

  // Hourly peak revenue data dynamically aggregated from invoices and live sessions
  const hourlyData = useMemo(() => {
    const slots = [
      { hour: "09:00", startH: 8, endH: 10, revenue: 0 },
      { hour: "11:00", startH: 10, endH: 12, revenue: 0 },
      { hour: "13:00", startH: 12, endH: 14, revenue: 0 },
      { hour: "15:00", startH: 14, endH: 16, revenue: 0 },
      { hour: "17:00", startH: 16, endH: 18, revenue: 0 },
      { hour: "19:00", startH: 18, endH: 20, revenue: 0 },
      { hour: "21:00", startH: 20, endH: 22, revenue: 0 },
      { hour: "23:00", startH: 22, endH: 24, revenue: 0 },
    ];

    todayInvoices.forEach((inv) => {
      if (!inv.createdAt) return;
      const invHour = new Date(inv.createdAt).getHours();
      const slot =
        slots.find((s) => invHour >= s.startH && invHour < s.endH) || slots[slots.length - 1];
      slot.revenue += inv.finalTotal || 0;
    });

    const currentHour = new Date().getHours();
    const currentSlot =
      slots.find((s) => currentHour >= s.startH && currentHour < s.endH) || slots[slots.length - 1];
    currentSlot.revenue += floorStats.totalTempRevenue;

    const maxRev = Math.max(...slots.map((s) => s.revenue), 1);
    return slots.map((s) => ({
      hour: s.hour,
      revenue: s.revenue,
      height: s.revenue > 0 ? Math.max(12, Math.round((s.revenue / maxRev) * 100)) : 8,
      isPeak: s.revenue === maxRev && s.revenue > 0,
    }));
  }, [todayInvoices, floorStats.totalTempRevenue]);

  // Active tournament item
  const activeTournament = useMemo(() => {
    return (
      tournaments.find((t) => t.status === "in_progress") ||
      tournaments.find((t) => t.status === "registration_open") ||
      tournaments.find((t) => t.status === "draft") ||
      tournaments[0] ||
      null
    );
  }, [tournaments]);

  return (
    <div className="space-y-6">
      {/* ── 1. EXECUTIVE WELCOME & QUICK ACTION BAR ─────────────────────────── */}
      <Card
        styles={{ body: { padding: 0 } }}
        className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden"
      >
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Title
                level={3}
                className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight"
              >
                Xin chào, {user?.name ? user.name.replace(/\s*\([^)]*\)/g, "").trim() : "Quản Trị Viên"}
              </Title>
              <Tag
                color="green"
                className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold !m-0"
              >
                {user?.role === "admin" ? "CHỦ QUÁN • QUẢN LÝ" : "NHÂN VIÊN VẬN HÀNH"}
              </Tag>
            </div>
            <Text className="!text-xs !text-slate-500 block">
              Trung tâm giám sát điều hành toàn diện, kiểm soát doanh thu thời gian thực và quản trị
              sàn bida
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Shift & Date badge dynamically calculated */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
              <ClockCircleOutlined className="text-emerald-600" />
              <span>{shiftInfo.label} ({shiftInfo.hours})</span>
            </div>

            {/* Manual Sync live data */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                void loadDashboardData();
              }}
              disabled={loading}
              className="!h-9 !rounded-xl !border-slate-300 !text-slate-600 hover:!border-emerald-600 font-medium !text-xs whitespace-nowrap"
            >
              {loading ? "Đang tải..." : "Làm mới"}
            </Button>

            {/* Quick Actions */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/pos")}
              leftIcon={<ThunderboltOutlined />}
              className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white shadow-2xs whitespace-nowrap"
            >
              Mở Sơ Đồ Bàn (POS)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/pos")}
              leftIcon={<CalendarOutlined />}
              className="!h-9 !rounded-xl !border-slate-300 !text-slate-700 hover:!border-emerald-600 font-medium !text-xs whitespace-nowrap"
            >
              Lịch Đặt Bàn {bookings.length > 0 && `(${bookings.length})`}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── 2. HIGH-DENSITY EXECUTIVE KPI CARDS ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          styles={{ body: { padding: 0 } }}
          className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white hover:shadow-sm transition-all"
        >
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Doanh Thu Hôm Nay
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shadow-2xs">
                <DollarOutlined className="text-lg" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {floorStats.grandRevenueToday.toLocaleString("vi-VN")}đ
              </span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 whitespace-nowrap">
                <ArrowUpOutlined /> Thời gian thực
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Tạm tính sàn:{" "}
                <strong className="text-emerald-700 font-mono">
                  {floorStats.totalTempRevenue.toLocaleString("vi-VN")}đ
                </strong>
              </span>
              <span>
                Đã thu:{" "}
                <strong className="text-slate-800 font-mono">
                  {floorStats.paidRevenueToday.toLocaleString("vi-VN")}đ
                </strong>
              </span>
            </div>
          </div>
        </Card>

        <Card
          styles={{ body: { padding: 0 } }}
          className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white hover:shadow-sm transition-all"
        >
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Công Suất Hoạt Động
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-2xs">
                <AppstoreOutlined className="text-lg" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {floorStats.occupancyRate}%
              </span>
              <span className="text-xs font-semibold text-slate-500">
                ({floorStats.occupiedTables}/{floorStats.total} bàn đang phục vụ)
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {floorStats.playing} chơi
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {floorStats.paused} dừng
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {floorStats.booked} đặt
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                {floorStats.available} trống
              </span>
            </div>
          </div>
        </Card>

        <Card
          styles={{ body: { padding: 0 } }}
          className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white hover:shadow-sm transition-all"
        >
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Khách Hàng Hôm Nay
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200/60 shadow-2xs">
                <TeamOutlined className="text-lg" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {customerStats.total} Cơ Thủ
              </span>
              <Tag color="gold" className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold">
                {customerStats.members} Hội Viên
              </Tag>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Hội viên CLB: <strong className="text-slate-800">{customerStats.members} ({customerStats.memberPercent}%)</strong>
              </span>
              <span>
                Khách vãng lai: <strong className="text-slate-800">{customerStats.guests}</strong>
              </span>
            </div>
          </div>
        </Card>

        <Card
          styles={{ body: { padding: 0 } }}
          className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white hover:shadow-sm transition-all"
        >
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Cảnh Báo Vận Hành
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-2xs">
                <AlertOutlined className="text-lg" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-700 font-mono tracking-tight">
                {lowStockItems.length + pendingBookingsCount} Việc
              </span>
              <Tag
                color={pendingBookingsCount > 0 ? "orange" : "default"}
                className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold"
              >
                CẦN XỬ LÝ
              </Tag>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{pendingBookingsCount} Lịch hẹn chờ duyệt</span>
              <span className="text-amber-700 font-medium">
                {lowStockItems.length} Món sắp hết kho
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── 3. CORE OPERATIONAL SECTION (7 COLS / 5 COLS) ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <Card
            styles={{ body: { padding: 0 } }}
            className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ThunderboltOutlined className="text-base" />
                </div>
                <div>
                  <Title
                    level={4}
                    className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight"
                  >
                    Bàn Đang Hoạt Động (Live Floor)
                  </Title>
                  <Text className="!text-xs !text-slate-500 block">
                    {activeTables.length} bàn đang phục vụ ({floorStats.playing} đang chơi, {floorStats.paused} tạm dừng, {floorStats.booked} đặt trước)
                  </Text>
                </div>
              </div>

              <Button
                variant="link"
                size="sm"
                onClick={() => navigate("/pos")}
                rightIcon={<RightOutlined />}
                className="!text-xs !font-bold !text-emerald-700 hover:!text-emerald-800 !p-0"
              >
                Vào Sơ Đồ Bàn POS
              </Button>
            </div>

            {/* List of active tables */}
            <div className="divide-y divide-slate-100">
              {activeTables.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Hiện không có bàn nào đang hoạt động
                </div>
              ) : (
                activeTables.map((table) => {
                const { cost, formattedTime } = calculatePlayingDetails(table);
                const fnbTotal =
                  table.currentSession?.orders.reduce(
                    (acc, cur) => acc + cur.price * cur.quantity,
                    0,
                  ) || 0;
                const totalBill = cost + fnbTotal;
                const isPlaying = table.status === "playing";
                const isPaused = table.status === "paused";
                const isBooked = table.status === "booked";

                return (
                  <div
                    key={table.id}
                    onClick={() => navigate("/pos")}
                    className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 font-mono leading-none">
                          {table.code.split("-")[0]}
                        </span>
                        <span className="text-xs font-black text-slate-800 font-mono leading-none mt-0.5">
                          {table.code.split("-")[1] || table.code}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {table.name}
                          </span>
                          <span className="text-xs text-slate-400 hidden sm:inline">
                            • {table.typeName}
                          </span>
                          {isPlaying && (
                            <Tag
                              color="green"
                              className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold"
                            >
                              ĐANG CHƠI
                            </Tag>
                          )}
                          {isPaused && (
                            <Tag
                              color="orange"
                              className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold"
                            >
                              TẠM DỪNG
                            </Tag>
                          )}
                          {isBooked && (
                            <Tag
                              color="blue"
                              className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold"
                            >
                              ĐÃ ĐẶT
                            </Tag>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          {isPlaying || isPaused ? (
                            <>
                              <UserOutlined className="text-slate-400 text-xs" />
                              <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                                {table.currentSession?.customerName || "Khách lẻ"}
                              </span>
                              {table.currentSession?.isMember && (
                                <Tag
                                  color="gold"
                                  className="!text-[9px] !px-1 !py-0 !border-0 !m-0 !font-bold"
                                >
                                  VIP
                                </Tag>
                              )}
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-slate-600">
                                Từ {table.currentSession?.sessionStart || "--:--"}
                              </span>
                            </>
                          ) : (
                            <span>
                              Hẹn khách: <strong>{table.bookedInfo?.customerName || "Khách đặt trước"}</strong>{" "}
                              {table.bookedInfo?.time ? `(${table.bookedInfo.time})` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 text-right">
                      {isPlaying || isPaused ? (
                        <div>
                          <div className="flex items-center justify-end gap-1.5">
                            <ClockCircleOutlined
                              className={isPaused ? "text-amber-500" : "text-emerald-600"}
                            />
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {formattedTime}
                            </span>
                          </div>
                          <span className="text-xs font-black text-emerald-700 font-mono block">
                            {totalBill.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-blue-700 font-medium">
                          {table.bookedInfo?.deposit
                            ? `Đã cọc ${table.bookedInfo.deposit.toLocaleString("vi-VN")}đ`
                            : "Giữ chỗ đặt trước"}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="!h-8 !px-2.5 !rounded-lg !text-xs !border-slate-300 hover:!border-emerald-600 hidden sm:inline-flex"
                      >
                        Vào Bàn
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Còn <strong>{floorStats.available} bàn trống</strong> sẵn sàng phục vụ khách
              </span>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate("/pos")}
                className="!text-xs !font-bold !text-emerald-700 hover:!text-emerald-800 !p-0"
              >
                Mở Bàn Mới Ngay
              </Button>
            </div>
          </Card>

          <Card
            styles={{ body: { padding: 0 } }}
            className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CalendarOutlined className="text-base" />
                </div>
                <div>
                  <Title
                    level={4}
                    className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight"
                  >
                    Lịch Đặt Bàn Trong Ngày
                  </Title>
                  <Text className="!text-xs !text-slate-500 block">
                    {bookings.length} lịch đặt trực tuyến qua website khách hàng
                  </Text>
                </div>
              </div>

              <Button
                variant="link"
                size="sm"
                onClick={() => navigate("/booking")}
                rightIcon={<RightOutlined />}
                className="!text-xs !font-bold !text-blue-700 hover:!text-blue-800 !p-0"
              >
                Quản Lý Đặt Bàn
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {bookings.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Chưa có lịch đặt bàn nào hôm nay
                </div>
              ) : (
                bookings.slice(0, 4).map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {b.customerName}
                        </span>
                        <span className="text-xs font-mono text-slate-500">({b.phone})</span>
                        {b.status === "approved" ? (
                          <Tag
                            color="green"
                            className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold"
                          >
                            ĐÃ DUYỆT
                          </Tag>
                        ) : b.status === "pending" ? (
                          <Tag
                            color="orange"
                            className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold"
                          >
                            CHỜ DUYỆT
                          </Tag>
                        ) : (
                          <Tag
                            color="error"
                            className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold"
                          >
                            TỪ CHỐI
                          </Tag>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Bàn yêu cầu: <strong className="text-slate-800">{b.tableName}</strong> •{" "}
                        {b.duration} giờ chơi
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-blue-900 font-mono">
                        {b.time} ({b.date})
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        Tạm tính: {b.estimatedCost.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card
            styles={{ body: { padding: 0 } }}
            className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <RiseOutlined className="text-base" />
                </div>
                <div>
                  <Title
                    level={4}
                    className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight"
                  >
                    Khung Giờ Vàng (Peak Hours)
                  </Title>
                  <Text className="!text-xs !text-slate-500 block">
                    Phân bố mật độ doanh thu theo các mốc giờ trong ngày
                  </Text>
                </div>
              </div>
              <Tag color="gold" className="!rounded-full !px-2 !py-0.5 !text-[10px] !font-bold">
                19h - 22h PEAK
              </Tag>
            </div>

            <div className="p-4 sm:p-5">
              {/* Bar Chart Visual */}
              <div className="h-44 flex items-stretch justify-between gap-2 pt-6 pb-2 border-b border-slate-200">
                {hourlyData.map((d, idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-full flex flex-col justify-end items-center gap-1 group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded font-mono pointer-events-none whitespace-nowrap z-10 shadow-xs">
                      {(d.revenue / 1000).toLocaleString()}k
                    </div>

                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        style={{ height: `${d.height}%` }}
                        className={`w-full max-w-[24px] min-h-[8px] rounded-t-md transition-all duration-300 ${
                          d.isPeak
                            ? "bg-emerald-500 group-hover:bg-emerald-600 shadow-xs ring-1 ring-emerald-400"
                            : "bg-slate-200 group-hover:bg-slate-300"
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {d.hour.split(":")[0]}h
                    </span>
                  </div>
                ))}
              </div>

              {/* Revenue category split */}
              <div className="pt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Tiền Giờ Bàn</span>
                  <strong className="text-slate-900 font-bold font-mono">
                    {revenueSplit.hasData ? `${revenueSplit.tablePercent}%` : "0%"}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <span className="text-[11px] text-emerald-800 block">Đồ Uống & Cafe</span>
                  <strong className="text-emerald-700 font-bold font-mono">
                    {revenueSplit.hasData ? `${revenueSplit.drinkPercent}%` : "0%"}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                  <span className="text-[11px] text-amber-800 block">Ăn Vặt & Snack</span>
                  <strong className="text-amber-800 font-bold font-mono">
                    {revenueSplit.hasData ? `${revenueSplit.snackPercent}%` : "0%"}
                  </strong>
                </div>
              </div>
            </div>
          </Card>

          <Card
            styles={{ body: { padding: 0 } }}
            className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrophyOutlined className="text-base" />
                </div>
                <div>
                  <Title
                    level={4}
                    className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight"
                  >
                    {activeTournament?.name || "Giải Đấu & Trọng Tài Bank Pool"}
                  </Title>
                  <Text className="!text-xs !text-slate-500 block">
                    {activeTournament?.assignedTables && activeTournament.assignedTables.length > 0
                      ? `Bàn thi đấu: ${activeTournament.assignedTables.join(", ")}`
                      : "Trận thi đấu chính thức tại bàn MTCH-01 (Khu Thi Đấu)"}
                  </Text>
                </div>
              </div>

              <Tag
                color={
                  activeTournament?.status === "in_progress"
                    ? "green"
                    : activeTournament?.status === "registration_open"
                      ? "blue"
                      : "orange"
                }
                className="!text-[10px] !px-2 !py-0.5 !font-bold"
              >
                {activeTournament?.status === "in_progress"
                  ? "LIVE VAR"
                  : activeTournament?.status === "registration_open"
                    ? "ĐANG ĐĂNG KÝ"
                    : "SẮP KHỞI TRANH"}
              </Tag>
            </div>

            <div className="p-4 space-y-3">
              {/* Tournament Match / Overview Strip */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                  <span className="truncate max-w-[200px]">
                    {activeTournament?.name || "GIẢI CUEZONE BANK POOL CHAMPIONSHIP"}
                  </span>
                  <span className="text-emerald-700 font-mono">
                    RACE TO {activeTournament?.raceToScore || 4}
                  </span>
                </div>

                {activeTournament?.players && activeTournament.players.length >= 2 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                        {activeTournament.players[0].name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block truncate max-w-[110px]">
                          {activeTournament.players[0].name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Hạt giống #{activeTournament.players[0].seed || 1}
                        </span>
                      </div>
                    </div>

                    <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 font-mono font-black text-lg text-slate-900 shadow-2xs">
                      VS
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block truncate max-w-[110px]">
                          {activeTournament.players[1].name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Hạt giống #{activeTournament.players[1].seed || 2}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                        {activeTournament.players[1].name.charAt(0)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">Quy mô giải:</span>
                      <strong className="text-slate-900 font-mono">
                        {activeTournament?.players?.length || 0}/{activeTournament?.maxPlayers || 16} cơ thủ
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Lệ phí tham gia:</span>
                      <strong className="text-emerald-700 font-mono">
                        {activeTournament?.registrationFee
                          ? `${Number(activeTournament.registrationFee).toLocaleString("vi-VN")}đ`
                          : "Miễn phí"}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Hình thức: <strong>{activeTournament?.format || "Single Elimination"}</strong>
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate("/tournaments")}
                    className="!text-xs !font-bold !text-emerald-700 hover:!text-emerald-800 !p-0"
                  >
                    Xem Giải Đấu & Lịch Trình &rarr;
                  </Button>
                </div>
              </div>

              {/* Low stock warning */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <AlertOutlined className="text-amber-600 text-sm" />
                  <div>
                    <span className="font-bold text-amber-950 block">
                      Kho Hàng F&B: {lowStockItems.length > 0 ? `${lowStockItems.length} Món Cần Bổ Sung` : "Kho Hàng Đầy Đủ"}
                    </span>
                    <span className="text-amber-800 text-[11px]">
                      {lowStockItems.length > 0
                        ? lowStockItems.slice(0, 3).map((item) => `${item.name} (còn ${item.stockQuantity})`).join(", ")
                        : "Tất cả đồ uống và phụ kiện đều đảm bảo định mức an toàn"}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/fnb")}
                  className="!text-xs !h-7 !rounded-lg !border-amber-300 !bg-white !text-amber-900 hover:!bg-amber-100"
                >
                  {lowStockItems.length > 0 ? "Nhập Kho" : "Kiểm Kho"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
