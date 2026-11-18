// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import {
  DollarOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { formatMoney } from "../types/invoice.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
export interface InvoiceMetrics {
  totalRevenue: number;
  totalInvoices: number;
  tableHoursRevenue: number;
  fnbRevenue: number;
  cashRevenue: number;
  bankRevenue: number;
  discountTotal?: number;
  cancelledInvoicesCount?: number;
}

interface InvoiceKpiCardsProps {
  metrics: InvoiceMetrics;
}

// ============================================================================
// 4. MAIN COMPONENT: CỤM 4 THẺ KPI DOANH THU & HÓA ĐƠN
// Chuẩn hóa 100% Design System: Thẻ bo góc 2xl, thanh màu 4px đỉnh thẻ, icon badge góc phải, số liệu font-mono nổi bật
// ============================================================================
export const InvoiceKpiCards: React.FC<InvoiceKpiCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* ── Thẻ 1: Tổng thực thu sau giảm giá ───────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Tổng thực thu
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <DollarOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-emerald-600 font-mono whitespace-nowrap">
          {formatMoney(metrics.totalRevenue)}
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          {metrics.totalInvoices} hóa đơn hoàn tất
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
      </div>

      {/* ── Thẻ 2: Doanh thu tiền giờ bida ─────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Doanh thu tiền giờ
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <ClockCircleOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-cyan-600 font-mono whitespace-nowrap">
          {formatMoney(metrics.tableHoursRevenue)}
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Tổng tiền giờ bida tất cả bàn chơi
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
      </div>

      {/* ── Thẻ 3: Doanh thu dịch vụ ăn uống & đồ uống F&B ─────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Doanh thu F&B
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <CoffeeOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-amber-600 font-mono whitespace-nowrap">
          {formatMoney(metrics.fnbRevenue)}
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Đồ uống, thức ăn & dịch vụ kèm
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
      </div>

      {/* ── Thẻ 4: Đối soát két tiền mặt & chuyển khoản VietQR ─────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Két tiền & Chuyển khoản
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
            <QrcodeOutlined />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 my-0.5">
          <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-200/60">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider whitespace-nowrap">
              Tiền mặt
            </div>
            <div className="text-sm sm:text-base font-black text-amber-900 font-mono leading-tight mt-0.5 whitespace-nowrap">
              {formatMoney(metrics.cashRevenue)}
            </div>
          </div>
          <div className="bg-blue-50/80 p-2 rounded-xl border border-blue-200/60">
            <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider whitespace-nowrap">
              Chuyển khoản
            </div>
            <div className="text-sm sm:text-base font-black text-blue-900 font-mono leading-tight mt-0.5 whitespace-nowrap">
              {formatMoney(metrics.bankRevenue)}
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Đối soát thu ngân cuối ca chơi
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
      </div>
    </div>
  );
};
