// ============================================================================
// 1. IMPORTS & TYPOGRAPHY
// ============================================================================
import React from "react";
import { CalendarOutlined, RightOutlined } from "@ant-design/icons";
import { Card, Button, Tag, Typography } from "../../../../shared/ui";
import type { BookingRequest } from "../../../../types/pos";

const { Title, Text } = Typography;

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface TodayBookingsWidgetProps {
  todayBookings: BookingRequest[];
  onNavigateBooking: () => void;
}

// ============================================================================
// 4. MAIN COMPONENT: WIDGET LỊCH ĐẶT BÀN HÔM NAY (DASHBOARD)
// Hiển thị danh sách khách hàng đã đặt chỗ trước trong ngày và trạng thái duyệt
// ============================================================================
export const TodayBookingsWidget: React.FC<TodayBookingsWidgetProps> = ({
  todayBookings,
  onNavigateBooking,
}) => {
  return (
    <Card
      styles={{ body: { padding: 0 } }}
      className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
    >
      {/* ── Tiêu đề Widget & Nút điều hướng sang Quản lý Đặt bàn ──────────── */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <CalendarOutlined className="text-base" />
          </div>
          <div>
            <Title
              level={4}
              className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight whitespace-nowrap"
            >
              Lịch Đặt Bàn Trong Ngày
            </Title>
            <Text className="!text-xs !text-slate-500 block whitespace-nowrap">
              {todayBookings.length} lịch đặt trực tuyến qua website khách hàng
            </Text>
          </div>
        </div>

        <Button
          variant="link"
          size="sm"
          onClick={onNavigateBooking}
          rightIcon={<RightOutlined />}
          className="!text-xs !font-bold !text-blue-700 hover:!text-blue-800 !p-0 whitespace-nowrap"
        >
          Quản Lý Đặt Bàn
        </Button>
      </div>

      <div className="divide-y divide-slate-100">
        {todayBookings.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Chưa có lịch đặt bàn nào hôm nay
          </div>
        ) : (
          todayBookings.slice(0, 4).map((b) => (
            <div
              key={b.id}
              className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 truncate">
                    {b.customerName}
                  </span>
                  <span className="text-xs font-mono text-slate-500 whitespace-nowrap">({b.phone})</span>
                  {b.status === "approved" ? (
                    <Tag
                      color="green"
                      className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold whitespace-nowrap"
                    >
                      ĐÃ DUYỆT
                    </Tag>
                  ) : b.status === "pending" ? (
                    <Tag
                      color="orange"
                      className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold whitespace-nowrap"
                    >
                      CHỜ DUYỆT
                    </Tag>
                  ) : (
                    <Tag
                      color="error"
                      className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold whitespace-nowrap"
                    >
                      TỪ CHỐI
                    </Tag>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                  Bàn yêu cầu: <strong className="text-slate-800">{b.tableName}</strong> •{" "}
                  {b.duration} giờ chơi
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-xs font-bold text-blue-900 font-mono whitespace-nowrap">
                  {b.time} ({b.date})
                </div>
                <span className="text-[11px] text-slate-400 block whitespace-nowrap">
                  Tạm tính: {b.estimatedCost.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
