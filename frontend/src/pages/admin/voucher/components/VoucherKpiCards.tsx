// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import {
  GiftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
} from "@ant-design/icons";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
export interface VoucherStats {
  total: number;
  active: number;
  expired: number;
  totalUses: number;
}

interface VoucherKpiCardsProps {
  stats: VoucherStats;
}

// ============================================================================
// 4. MAIN COMPONENT: CỤM 4 THẺ KPI CHỈ SỐ MÃ KHUYẾN MÃI
// Đồng bộ 100% Design System: Bo góc 2xl, thanh màu 4px đỉnh thẻ, badge icon góc phải, số liệu font-mono nổi bật
// ============================================================================
export const VoucherKpiCards: React.FC<VoucherKpiCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* ── Thẻ 1: Tổng số chương trình voucher ─────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Tổng số chương trình
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <GiftOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-emerald-600 font-mono whitespace-nowrap">
          {stats.total} <span className="text-sm font-bold text-emerald-600">chương trình</span>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Chương trình voucher đang quản lý
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
      </div>

      {/* ── Thẻ 2: Đang hoạt động khả dụng ──────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Đang hoạt động
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <CheckCircleOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-cyan-600 font-mono whitespace-nowrap">
          {stats.active} <span className="text-sm font-bold text-cyan-600">mã khả dụng</span>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Sẵn sàng áp dụng khi thanh toán
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
      </div>

      {/* ── Thẻ 3: Tạm ngưng hoặc đã hết hạn ────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Tạm ngưng / Hết hạn
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <ClockCircleOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-amber-600 font-mono whitespace-nowrap">
          {stats.expired} <span className="text-sm font-bold text-amber-600">mã dừng</span>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Đã quá hạn hoặc tạm ngưng áp dụng
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
      </div>

      {/* ── Thẻ 4: Tổng lượt đã dùng thành công ─────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Tổng lượt đã dùng
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
            <HistoryOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-blue-600 font-mono whitespace-nowrap">
          {stats.totalUses} <span className="text-sm font-bold text-blue-600">lượt</span>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Khách hàng đã đổi mã thành công
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
      </div>
    </div>
  );
};
