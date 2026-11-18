import React from "react";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

interface BookingMetrics {
  total: number;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
}

interface BookingKpiCardsProps {
  metrics: BookingMetrics;
}

/**
 * Component: BookingKpiCards
 * Chức năng: Hiển thị 4 thẻ KPI tóm tắt tình trạng đặt bàn bida:
 * 1. Tổng đơn đặt chỗ: Toàn bộ đơn đặt chỗ trực tuyến và hotline.
 * 2. Chờ xác nhận: Đơn đặt mới cần duyệt và xếp bàn.
 * 3. Đã giữ chỗ thành công: Đã chốt bàn và sẵn sàng đón khách.
 * 4. Đã vào bàn (Check-in): Khách đã có mặt và bắt đầu tính giờ chơi.
 */
export const BookingKpiCards: React.FC<BookingKpiCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Tổng đơn đặt */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Tổng đơn đặt chỗ
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
            <CalendarOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-emerald-600 font-mono whitespace-nowrap">
          {metrics.total} <span className="text-sm font-bold text-emerald-600">lượt</span>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Toàn bộ đơn đặt chỗ trên hệ thống
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
      </div>

      {/* Card 2: Chờ duyệt */}
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
          Khách đặt trước cần duyệt & xếp bàn
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
      </div>

      {/* Card 3: Đã duyệt & Giữ bàn */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Đã giữ chỗ thành công
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
            <CheckCircleOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-cyan-600 font-mono whitespace-nowrap">
          {metrics.approved} <span className="text-sm font-bold text-cyan-600">bàn giữ</span>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Đã chốt bàn & sẵn sàng đón khách
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
      </div>

      {/* Card 4: Đã nhận bàn */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Đã vào bàn (Check-in)
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
            <ThunderboltOutlined />
          </div>
        </div>
        <div className="text-3xl font-black text-blue-600 font-mono whitespace-nowrap">
          {metrics.completed} <span className="text-sm font-bold text-blue-600">đang chơi</span>
        </div>
        <div className="text-xs text-slate-400 mt-2 whitespace-nowrap">
          Khách đã nhận bàn và tính giờ chơi
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
      </div>
    </div>
  );
};
