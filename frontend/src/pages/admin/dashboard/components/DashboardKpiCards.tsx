import React from "react";
import {
  DollarOutlined,
  AppstoreOutlined,
  TeamOutlined,
  AlertOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { Tag } from "../../../../shared/ui";
import type { DashboardFloorStats, CustomerStats } from "../types/dashboard.types";
import type { FnbStockItem } from "../../../../types";

interface DashboardKpiCardsProps {
  floorStats: DashboardFloorStats;
  customerStats: CustomerStats;
  lowStockItems: FnbStockItem[];
}

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({
  floorStats,
  customerStats,
  lowStockItems,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Doanh thu đã thu hôm nay */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Doanh Thu Đã Thu Hôm Nay
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <DollarOutlined />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-black text-emerald-600 font-mono whitespace-nowrap">
            {floorStats.paidRevenueToday.toLocaleString("vi-VN")}đ
          </span>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 whitespace-nowrap">
            <CheckCircleOutlined /> Đã thanh toán
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="whitespace-nowrap">
            Tạm tính bàn đang chơi:{" "}
            <strong className="text-amber-700 font-mono">
              {floorStats.totalTempRevenue.toLocaleString("vi-VN")}đ
            </strong>
          </span>
          <span className="whitespace-nowrap">
            Tổng:{" "}
            <strong className="text-slate-700 font-mono">
              {floorStats.grandRevenueToday.toLocaleString("vi-VN")}đ
            </strong>
          </span>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
      </div>

      {/* Card 2: Công suất hoạt động */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Công Suất Hoạt Động
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <AppstoreOutlined />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-black text-cyan-600 font-mono whitespace-nowrap">
            {floorStats.occupancyRate}%
          </span>
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            ({floorStats.occupiedTables}/{floorStats.total} bàn đang phục vụ)
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {floorStats.playing} chơi
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {floorStats.paused} dừng
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {floorStats.booked} đặt
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            {floorStats.available} trống
          </span>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
      </div>

      {/* Card 3: Khách hàng hôm nay */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Khách Hàng Hôm Nay
          </span>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
            <TeamOutlined />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-black text-purple-600 font-mono whitespace-nowrap">
            {customerStats.total} Cơ Thủ
          </span>
          <Tag color="gold" className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold whitespace-nowrap">
            {customerStats.members} Hội Viên
          </Tag>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="whitespace-nowrap">
            Hội viên: <strong className="text-slate-800">{customerStats.members} ({customerStats.memberPercent}%)</strong>
          </span>
          <span className="whitespace-nowrap">
            Khách lẻ: <strong className="text-slate-800">{customerStats.guests}</strong>
          </span>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-purple-500" />
      </div>

      {/* Card 4: Cảnh báo vận hành */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Cảnh Báo Vận Hành
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <AlertOutlined />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-black text-amber-600 font-mono whitespace-nowrap">
            {lowStockItems.length + floorStats.paused} Việc
          </span>
          <Tag
            color={lowStockItems.length + floorStats.paused > 0 ? "orange" : "default"}
            className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold whitespace-nowrap"
          >
            CẦN XỬ LÝ
          </Tag>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="whitespace-nowrap">{floorStats.paused} Bàn tạm dừng</span>
          <span className="text-amber-700 font-medium whitespace-nowrap">
            {lowStockItems.length} Món sắp hết kho
          </span>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
      </div>
    </div>
  );
};
