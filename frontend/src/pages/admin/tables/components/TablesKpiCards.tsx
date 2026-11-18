import React from "react";
import { AppstoreOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { TablesStats } from "../types/tables.types";

interface TablesKpiCardsProps {
  stats: TablesStats;
}

export const TablesKpiCards: React.FC<TablesKpiCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
      {/* Card 1: Tổng Số Bàn */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Tổng Số Bàn
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <AppstoreOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-emerald-600 font-mono whitespace-nowrap">
          {stats.total} Bàn
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          {stats.floorBreakdown.length > 0
            ? stats.floorBreakdown.map((fb) => `Tầng ${fb.floor}: ${fb.count}`).join(" • ")
            : "Chưa phân tầng"}
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
      </div>

      {/* Card 2: Bàn Bida Lỗ (Pool) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Bàn Bida Lỗ (Pool)
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <AppstoreOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-cyan-600 font-mono whitespace-nowrap">
          {stats.pool} Bàn
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          {stats.total > 0 ? Math.round((stats.pool / stats.total) * 100) : 0}% tổng số bàn
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
      </div>

      {/* Card 3: Bàn Bida Carom (Phăng) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Bàn Bida Carom
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <AppstoreOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-amber-600 font-mono whitespace-nowrap">
          {stats.carom} Bàn
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          {stats.total > 0 ? Math.round((stats.carom / stats.total) * 100) : 0}% tổng số bàn
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
      </div>

      {/* Card 4: Bàn Bida Snooker */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Bàn Bida Snooker
          </span>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
            <AppstoreOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-purple-600 font-mono whitespace-nowrap">
          {stats.snooker} Bàn
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          {stats.total > 0 ? Math.round((stats.snooker / stats.total) * 100) : 0}% tổng số bàn
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-purple-500" />
      </div>

      {/* Card 5: Tình trạng vận hành */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Tình Trạng Vận Hành
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
            <ThunderboltOutlined />
          </div>
        </div>
        <div className="flex flex-wrap items-baseline gap-1.5 mb-1">
          <span className="text-2xl font-black text-emerald-600 font-mono whitespace-nowrap">
            {stats.available} Trống
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-lg font-bold text-rose-600 font-mono whitespace-nowrap">
            {stats.playing} Chơi
          </span>
          {stats.paused > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-sm font-bold text-amber-600 font-mono whitespace-nowrap">
                {stats.paused} Tạm dừng
              </span>
            </>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-1 whitespace-nowrap">
          Đã đặt: {stats.booked} • Bảo trì: {stats.maintenance}
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
      </div>
    </div>
  );
};
