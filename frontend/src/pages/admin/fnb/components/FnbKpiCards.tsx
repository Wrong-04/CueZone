import React from "react";
import {
  ShopOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CoffeeOutlined,
} from "@ant-design/icons";
import type { FnbMetrics } from "../types/fnb.types";

interface FnbKpiCardsProps {
  metrics: FnbMetrics;
}

export const FnbKpiCards: React.FC<FnbKpiCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Tổng số món thực đơn */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Tổng món thực đơn
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <ShopOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-emerald-600 font-mono whitespace-nowrap">
          {metrics.totalItems} món
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Đồ uống, món ăn & ăn vặt đang quản lý
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
      </div>

      {/* Card 2: Đang sẵn sàng phục vụ */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Đang mở bán
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <CheckCircleOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-cyan-600 font-mono whitespace-nowrap">
          {metrics.availableCount} món
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Sẵn sàng nhận order và phục vụ tại bàn
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
      </div>

      {/* Card 3: Cảnh báo hết / sắp hết */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Tạm ngưng / Cần nhập
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
            <WarningOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-amber-600 font-mono whitespace-nowrap">
          {metrics.lowOrOutCount} món
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Mặt hàng hết kho hoặc dưới mức tối thiểu
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
      </div>

      {/* Card 4: Món pha chế tại chỗ */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Món chế biến / Pha chế
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
            <CoffeeOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-blue-600 font-mono whitespace-nowrap">
          {metrics.madeToOrderCount} món
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Món order trực tiếp không quản lý theo lon/chai
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
      </div>
    </div>
  );
};
