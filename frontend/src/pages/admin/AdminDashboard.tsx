import React, { useState, useEffect, useMemo } from "react";
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
import {
  Card,
  Button,
  Tag,
  Typography,
} from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  INITIAL_POS_TABLES,
  INITIAL_BOOKING_REQUESTS,
  INITIAL_FNB_STOCK,
  type PosTable,
  type BookingRequest,
  type FnbStockItem,
} from "../../mock/posData";

const { Title, Text } = Typography;

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load real-time tables from localStorage or initial mock
  const [tables] = useState<PosTable[]>(() => {
    const saved = localStorage.getItem("cuezone_pos_tables");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_POS_TABLES;
  });

  // Load bookings from localStorage or initial mock
  const [bookings] = useState<BookingRequest[]>(() => {
    const saved = localStorage.getItem("cuezone_bookings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_BOOKING_REQUESTS;
  });

  // Load F&B stock
  const [fnbStock] = useState<FnbStockItem[]>(() => {
    const saved = localStorage.getItem("cuezone_fnb_stock");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_FNB_STOCK;
  });

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
    const totalElapsedMs = Math.max(0, effectiveNow - session.startedAt - (session.totalPausedMs || 0));
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
    const available = tables.filter((t) => t.status === "available").length;
    const maintenance = tables.filter((t) => t.status === "maintenance").length;

    let totalTempRevenue = 0;
    tables.forEach((t) => {
      if (t.currentSession) {
        const { cost } = calculatePlayingDetails(t);
        const fnbCost = t.currentSession.orders.reduce((acc, cur) => acc + cur.price * cur.quantity, 0);
        totalTempRevenue += cost + fnbCost;
      }
    });

    // Simulated historical paid revenue today
    const paidRevenueToday = 3173333;
    const grandRevenueToday = totalTempRevenue + paidRevenueToday;

    // Occupancy percentage (playing + paused + booked / usable tables)
    const usableTables = Math.max(1, total - maintenance);
    const occupiedTables = playing + paused + booked;
    const occupancyRate = Math.min(100, Math.round((occupiedTables / usableTables) * 100));

    return {
      total,
      playing,
      paused,
      booked,
      available,
      maintenance,
      totalTempRevenue,
      paidRevenueToday,
      grandRevenueToday,
      occupancyRate,
    };
  }, [tables, currentTime]);

  // Low stock alert items
  const lowStockItems = useMemo(() => {
    return fnbStock.filter((item) => item.stockQuantity <= item.minThreshold);
  }, [fnbStock]);

  // Active playing/paused tables for the live cockpit
  const activeTables = useMemo(() => {
    return tables.filter((t) => t.status === "playing" || t.status === "paused" || t.status === "booked");
  }, [tables]);

  // Pending bookings count
  const pendingBookingsCount = useMemo(() => {
    return bookings.filter((b) => b.status === "pending").length;
  }, [bookings]);

  // Hourly peak revenue data (Simulation based on actual club hours)
  const hourlyData = [
    { hour: "09:00", revenue: 250000, height: 18 },
    { hour: "11:00", revenue: 480000, height: 35 },
    { hour: "13:00", revenue: 620000, height: 45 },
    { hour: "15:00", revenue: 890000, height: 65 },
    { hour: "17:00", revenue: 750000, height: 55 },
    { hour: "19:00", revenue: 1150000, height: 85, isPeak: true },
    { hour: "21:00", revenue: 1420000, height: 100, isPeak: true },
    { hour: "23:00", revenue: 540000, height: 40 },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. EXECUTIVE WELCOME & QUICK ACTION BAR ─────────────────────────── */}
      <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Title level={3} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                Xin chào, {user?.name || "Nguyễn Tiến Dũng (Chủ CLB)"}
              </Title>
              <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold !m-0">
                CHỦ CLB • SIMONIS EMERALD
              </Tag>
            </div>
            <Text className="!text-xs !text-slate-500 block">
              Trung tâm giám sát điều hành toàn diện, kiểm soát doanh thu thời gian thực và quản trị sàn bida
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Shift & Date badge */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <ClockCircleOutlined className="text-emerald-600" />
              <span>Ca chiều (13:00 - 23:00)</span>
            </div>

            {/* Quick Actions */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/pos")}
              leftIcon={<ThunderboltOutlined />}
              className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white shadow-2xs"
            >
              Mở POS Sơ Đồ Bàn
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/booking")}
              leftIcon={<CalendarOutlined />}
              className="!h-9 !rounded-xl !border-slate-300 !text-slate-700 hover:!border-emerald-600 font-medium !text-xs"
            >
              Duyệt Đặt Bàn {pendingBookingsCount > 0 && `(${pendingBookingsCount})`}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── 2. HIGH-DENSITY EXECUTIVE KPI CARDS ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Doanh Thu Hôm Nay */}
        <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white hover:shadow-sm transition-all">
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
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                <ArrowUpOutlined /> +18.4%
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Tạm tính sàn: <strong className="text-emerald-700 font-mono">{floorStats.totalTempRevenue.toLocaleString("vi-VN")}đ</strong></span>
              <span>Đã thu: <strong className="text-slate-800 font-mono">{(floorStats.paidRevenueToday / 1000000).toFixed(1)}M</strong></span>
            </div>
          </div>
        </Card>

        {/* KPI 2: Tỉ Lệ Lấp Đầy Sàn */}
        <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white hover:shadow-sm transition-all">
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
                ({floorStats.playing + floorStats.paused + floorStats.booked}/{floorStats.total} bàn đang mở)
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

        {/* KPI 3: Lượt Khách & Hội Viên */}
        <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white hover:shadow-sm transition-all">
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
                38 Cơ Thủ
              </span>
              <Tag color="gold" className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold">
                +5 VIP Mới
              </Tag>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Hội viên CLB: <strong className="text-slate-800">24 (63%)</strong></span>
              <span>Khách vãng lai: <strong className="text-slate-800">14</strong></span>
            </div>
          </div>
        </Card>

        {/* KPI 4: Trọng Tài & Cảnh Báo Kho */}
        <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white hover:shadow-sm transition-all">
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
              <Tag color={pendingBookingsCount > 0 ? "orange" : "default"} className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold">
                CẦN XỬ LÝ
              </Tag>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{pendingBookingsCount} Lịch hẹn chờ duyệt</span>
              <span className="text-amber-700 font-medium">{lowStockItems.length} Món sắp hết kho</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── 3. CORE OPERATIONAL SECTION (7 COLS / 5 COLS) ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (7 COLS): BÀN ĐANG HOẠT ĐỘNG & LỊCH HẸN HÔM NAY */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Bàn Đang Hoạt Động (Live POS Floor Monitor) */}
          <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ThunderboltOutlined className="text-base" />
                </div>
                <div>
                  <Title level={4} className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight">
                    Bàn Đang Hoạt Động (Live Floor)
                  </Title>
                  <Text className="!text-xs !text-slate-500 block">
                    {floorStats.playing + floorStats.paused} phiên chơi đang tính giờ tự động
                  </Text>
                </div>
              </div>

              <Button
                variant="link"
                size="sm"
                onClick={() => navigate("/admin/pos")}
                rightIcon={<RightOutlined />}
                className="!text-xs !font-bold !text-emerald-700 hover:!text-emerald-800 !p-0"
              >
                Vào Sơ Đồ Bàn POS
              </Button>
            </div>

            {/* List of active tables */}
            <div className="divide-y divide-slate-100">
              {activeTables.map((table) => {
                const { cost, formattedTime } = calculatePlayingDetails(table);
                const fnbTotal = table.currentSession?.orders.reduce((acc, cur) => acc + cur.price * cur.quantity, 0) || 0;
                const totalBill = cost + fnbTotal;
                const isPlaying = table.status === "playing";
                const isPaused = table.status === "paused";
                const isBooked = table.status === "booked";

                return (
                  <div
                    key={table.id}
                    onClick={() => navigate("/admin/pos")}
                    className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 font-mono leading-none">
                          {table.code}
                        </span>
                        <span className="text-xs font-black text-slate-800 leading-none mt-0.5">
                          {table.name.split(" ")[1] || "Bàn"}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {table.name}
                          </span>
                          <span className="text-xs text-slate-400 hidden sm:inline">• {table.typeName}</span>
                          {isPlaying && (
                            <Tag color="green" className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold">
                              ĐANG CHƠI
                            </Tag>
                          )}
                          {isPaused && (
                            <Tag color="orange" className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold">
                              TẠM DỪNG
                            </Tag>
                          )}
                          {isBooked && (
                            <Tag color="blue" className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold">
                              ĐÃ ĐẶT
                            </Tag>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          {isPlaying || isPaused ? (
                            <>
                              <UserOutlined className="text-slate-400 text-xs" />
                              <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                                {table.currentSession?.customerName}
                              </span>
                              {table.currentSession?.isMember && (
                                <Tag color="gold" className="!text-[9px] !px-1 !py-0 !border-0 !m-0 !font-bold">
                                  VIP
                                </Tag>
                              )}
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-slate-600">Từ {table.currentSession?.sessionStart}</span>
                            </>
                          ) : (
                            <span>Hẹn khách: <strong>{table.bookedInfo?.customerName}</strong> ({table.bookedInfo?.time})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 text-right">
                      {isPlaying || isPaused ? (
                        <div>
                          <div className="flex items-center justify-end gap-1.5">
                            <ClockCircleOutlined className={isPaused ? "text-amber-500" : "text-emerald-600"} />
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
                          Đã cọc 100k
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
              })}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Còn <strong>{floorStats.available} bàn trống</strong> sẵn sàng phục vụ khách</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate("/admin/pos")}
                className="!text-xs !font-bold !text-emerald-700 hover:!text-emerald-800 !p-0"
              >
                Mở Bàn Mới Ngay
              </Button>
            </div>
          </Card>

          {/* Card: Lịch Đặt Bàn Trong Ngày (Upcoming Bookings) */}
          <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CalendarOutlined className="text-base" />
                </div>
                <div>
                  <Title level={4} className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight">
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
                onClick={() => navigate("/admin/booking")}
                rightIcon={<RightOutlined />}
                className="!text-xs !font-bold !text-blue-700 hover:!text-blue-800 !p-0"
              >
                Quản Lý Đặt Bàn
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {bookings.slice(0, 4).map((b) => (
                <div key={b.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 truncate">{b.customerName}</span>
                      <span className="text-xs font-mono text-slate-500">({b.phone})</span>
                      {b.status === "approved" ? (
                        <Tag color="green" className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold">
                          ĐÃ DUYỆT
                        </Tag>
                      ) : b.status === "pending" ? (
                        <Tag color="orange" className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold">
                          CHỜ DUYỆT
                        </Tag>
                      ) : (
                        <Tag color="error" className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold">
                          TỪ CHỐI
                        </Tag>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Bàn yêu cầu: <strong className="text-slate-800">{b.tableName}</strong> • {b.duration} giờ chơi
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
              ))}
            </div>
          </Card>
        </div>

        {/* CỘT PHẢI (5 COLS): BIỂU ĐỒ GIỜ VÀNG, BANK POOL & CẢNH BÁO KHO F&B */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Biểu Đồ Doanh Thu Khung Giờ Vàng */}
          <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <RiseOutlined className="text-base" />
                </div>
                <div>
                  <Title level={4} className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight">
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
                  <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-1 group relative">
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
                  <strong className="text-slate-900 font-bold font-mono">65%</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <span className="text-[11px] text-emerald-800 block">Đồ Uống & Cafe</span>
                  <strong className="text-emerald-700 font-bold font-mono">25%</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                  <span className="text-[11px] text-amber-800 block">Ăn Vặt & Snack</span>
                  <strong className="text-amber-800 font-bold font-mono">10%</strong>
                </div>
              </div>
            </div>
          </Card>

          {/* Card: Trận Đấu Bank Pool & Cảnh Báo Kho Hàng */}
          <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrophyOutlined className="text-base" />
                </div>
                <div>
                  <Title level={4} className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight">
                    Giải Đấu & Trọng Tài Bank Pool
                  </Title>
                  <Text className="!text-xs !text-slate-500 block">
                    Trận thi đấu chính thức tại bàn VIP Match 13
                  </Text>
                </div>
              </div>

              <Tag color="green" className="!text-[10px] !px-2 !py-0.5 !font-bold">
                LIVE VAR
              </Tag>
            </div>

            <div className="p-4 space-y-3">
              {/* Match Score Strip */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                  <span>GIẢI CUEZONE BANK POOL CHAMPIONSHIP</span>
                  <span className="text-emerald-700 font-mono">RACE TO 5</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                      L
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Nguyễn Hoàng Long</span>
                      <span className="text-[10px] text-slate-500">Rank A • ELO 1520</span>
                    </div>
                  </div>

                  <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 font-mono font-black text-lg text-slate-900 shadow-2xs">
                    3 - 2
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Trần Quốc Bảo</span>
                      <span className="text-[10px] text-slate-500">Rank Pro • ELO 1680</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      B
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Trọng tài: <strong>Bùi Quốc Tuấn</strong></span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate("/admin/tournaments")}
                    className="!text-xs !font-bold !text-emerald-700 hover:!text-emerald-800 !p-0"
                  >
                    Mở Bảng Chấm Điểm Điện Tử &rarr;
                  </Button>
                </div>
              </div>

              {/* Low stock warning */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <AlertOutlined className="text-amber-600 text-sm" />
                  <div>
                    <span className="font-bold text-amber-950 block">Kho Hàng F&B: 2 Món Sắp Hết</span>
                    <span className="text-amber-800 text-[11px]">Bò khô cháy tỏi (còn 3), Bia Heineken (còn 8)</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/fnb")}
                  className="!text-xs !h-7 !rounded-lg !border-amber-300 !bg-white !text-amber-900 hover:!bg-amber-100"
                >
                  Nhập Kho
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
