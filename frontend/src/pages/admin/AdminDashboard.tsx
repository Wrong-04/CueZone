// ── 1. IMPORTS ────────────────────────────────────────────────────────────────
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ThunderboltOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, Tag, Typography } from "../../shared/ui";

import { useAuth } from "../../contexts/AuthContext";
import { useDashboardData } from "./dashboard/hooks/useDashboardData";
import { DashboardKpiCards } from "./dashboard/components/DashboardKpiCards";
import { ActiveTablesWidget } from "./dashboard/components/ActiveTablesWidget";
import { TodayBookingsWidget } from "./dashboard/components/TodayBookingsWidget";
import { PeakHoursWidget } from "./dashboard/components/PeakHoursWidget";
import { LiveTournamentWidget } from "./dashboard/components/LiveTournamentWidget";

// ── 2. TYPES & INTERFACES ─────────────────────────────────────────────────────
// Types are imported from ./dashboard/types/dashboard.types

// ── 3. CONSTANTS & HELPERS ────────────────────────────────────────────────────
const { Title, Text } = Typography;

// ── 4. MAIN COMPONENT ─────────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    shiftInfo,
    floorStats,
    customerStats,
    hourlyData,
    revenueSplit,
    activeTables,
    bookings,
    activeTournament,
    activeBracketMatch,
    lowStockItems,
    loadDashboardData,
    calculatePlayingDetails,
  } = useDashboardData();

  return (
    <div className="space-y-6 pb-12 max-w-[1440px] mx-auto">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50 via-teal-50 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <Title
                level={2}
                className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight whitespace-nowrap"
              >
                Xin chào, {user?.name || user?.email?.split("@")[0] || "Chủ quán"}
              </Title>
              <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black whitespace-nowrap">
                CHỦ QUÁN • QUẢN LÝ
              </Tag>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 block leading-relaxed [text-wrap:balance]">
              Theo dõi doanh thu, tình trạng bàn và hoạt động tại câu lạc bộ hôm nay.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 whitespace-nowrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 whitespace-nowrap">
              <ClockCircleOutlined className="text-emerald-600" />
              <span>{shiftInfo.label}</span>
              <span className="text-slate-400 font-normal">({shiftInfo.hours})</span>
            </div>

            <Button
              variant="outline"
              size="md"
              leftIcon={<ReloadOutlined />}
              onClick={() => void loadDashboardData(true)}
              className="!rounded-xl !text-xs !text-slate-600 hover:!text-slate-900 whitespace-nowrap"
            >
              Làm mới
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={<ThunderboltOutlined />}
              onClick={() => navigate("/pos")}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold shadow-sm whitespace-nowrap"
            >
              Mở Sơ Đồ Bàn (POS)
            </Button>

            <Button
              variant="secondary"
              size="md"
              leftIcon={<CalendarOutlined />}
              onClick={() => navigate("/pos?drawer=booking")}
              className="!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !rounded-xl !font-semibold whitespace-nowrap"
            >
              Lịch Đặt Bàn
            </Button>
          </div>
        </div>
      </div>

      {/* ── 4 THẺ KPI SUMMARY (ĐỒNG BỘ DESIGN SYSTEM) ──────────────────────── */}
      <DashboardKpiCards
        floorStats={floorStats}
        customerStats={customerStats}
        lowStockItems={lowStockItems}
      />

      {/* ── HÀNG 1: BÀN HOẠT ĐỘNG + KHUNG GIỜ CAO ĐIỂM ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <ActiveTablesWidget
            activeTables={activeTables}
            floorStats={floorStats}
            calculatePlayingDetails={calculatePlayingDetails}
            onNavigatePos={() => navigate("/pos")}
          />
        </div>
        <div className="lg:col-span-5">
          <PeakHoursWidget hourlyData={hourlyData} revenueSplit={revenueSplit} />
        </div>
      </div>

      {/* ── HÀNG 2: ĐẶT BÀN HÔM NAY + GIẢI ĐẤU TRỰC TIẾP ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <TodayBookingsWidget
            todayBookings={bookings}
            onNavigateBooking={() => navigate("/pos?drawer=booking")}
          />
        </div>
        <div className="lg:col-span-5">
          <LiveTournamentWidget
            activeTournament={activeTournament}
            activeBracketMatch={activeBracketMatch}
            lowStockItems={lowStockItems}
            onNavigateTournament={() => navigate("/tournaments")}
            onNavigateFnb={() => navigate("/fnb")}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
