import React from "react";
import { AppstoreOutlined, BankOutlined, CrownOutlined } from "@ant-design/icons";
import type { ClubSettingsData } from "../types/settings.types";

interface SettingsKpiCardsProps {
  actualTableCount: number;
  actualTablesBreakdown: { pool: number; carom: number; snooker: number };
  settings: ClubSettingsData;
}

export const SettingsKpiCards: React.FC<SettingsKpiCardsProps> = ({
  actualTableCount,
  actualTablesBreakdown,
  settings,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Card 1: Hệ Thống Bàn Bida */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Hệ Thống Bàn Bida
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <AppstoreOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-emerald-600 font-mono whitespace-nowrap flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          Đang hoạt động
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          {actualTableCount > 0
            ? `${actualTableCount} Bàn (${actualTablesBreakdown.pool} Pool · ${actualTablesBreakdown.carom} Carom · ${actualTablesBreakdown.snooker} Snooker)`
            : "Đang đồng bộ số lượng bàn..."}
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
      </div>

      {/* Card 2: Cổng Thanh Toán VietQR */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Cổng Thanh Toán VietQR
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <BankOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-cyan-600 font-mono whitespace-nowrap">
          {settings.bankName?.split(" (")[0] || "Chưa cấu hình"}
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          STK: {settings.bankAccountNo || "Chưa thiết lập"}
          {settings.bankAccountName ? ` · ${settings.bankAccountName}` : ""}
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
      </div>

      {/* Card 3: Chính Sách Hội Viên */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Chính Sách Hội Viên
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <CrownOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-amber-600 font-mono whitespace-nowrap">
          {settings.memberTiers?.length || 0} Cấp Bậc Thẻ
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          {settings.memberTiers && settings.memberTiers.length > 0
            ? `${settings.memberTiers.map((t) => t.tierName.replace(/Hội Viên\s*/i, "").split(" ")[0]).join(" · ")} (Tích điểm tự động)`
            : "Chưa cấu hình chính sách thẻ"}
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
      </div>
    </div>
  );
};
