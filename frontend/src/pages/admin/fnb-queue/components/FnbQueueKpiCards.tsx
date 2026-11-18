// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import {
  ClockCircleOutlined,
  CoffeeOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
export interface FnbQueueMetrics {
  total: number;
  pending: number;
  preparing: number;
  ready: number;
}

interface FnbQueueKpiCardsProps {
  metrics: FnbQueueMetrics;
}

// ============================================================================
// 4. MAIN COMPONENT: CỤM THẺ KPI HÀNG ĐỢI BẾP & BAR
// Chuẩn hóa 100% Design System: Thẻ bo góc 2xl, thanh màu 4px đỉnh, icon badge góc phải, số liệu font-mono nổi bật
// ============================================================================
export const FnbQueueKpiCards: React.FC<FnbQueueKpiCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* ── Thẻ 1: Chờ xác nhận (Món mới gọi tại bàn) ──────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Chờ xác nhận
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <ClockCircleOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-amber-600 font-mono whitespace-nowrap">
          {metrics.pending} <span className="text-sm font-bold text-amber-600">đơn chờ</span>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Món mới khách vừa order qua mã QR
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
      </div>

      {/* ── Thẻ 2: Đang chuẩn bị / Pha chế ─────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Đang chuẩn bị
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
            <CoffeeOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-blue-600 font-mono whitespace-nowrap">
          {metrics.preparing} <span className="text-sm font-bold text-blue-600">đang làm</span>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Bếp & Bar đang chế biến theo thứ tự
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
      </div>

      {/* ── Thẻ 3: Sẵn sàng phục vụ ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Sẵn sàng phục vụ
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <CheckCircleOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-emerald-600 font-mono whitespace-nowrap">
          {metrics.ready} <span className="text-sm font-bold text-emerald-600">chờ mang ra</span>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Món đã hoàn tất, chờ nhân viên mang đến bàn
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
      </div>

      {/* ── Thẻ 4: Tổng đơn hàng đợi trong ca ──────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Tổng đơn hàng đợi
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <ThunderboltOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-cyan-600 font-mono whitespace-nowrap">
          {metrics.total} <span className="text-sm font-bold text-cyan-600">yêu cầu</span>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Tổng lượt gọi món đang xử lý
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
      </div>
    </div>
  );
};
