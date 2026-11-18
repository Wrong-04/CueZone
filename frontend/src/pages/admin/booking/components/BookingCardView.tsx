// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  SwapOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Tag, Typography } from "../../../../shared/ui";
import type { BookingRequest } from "../../../../types/pos";
import { BOOKING_STATUS_CONFIG, formatMoney } from "../types/booking.types";

const { Text } = Typography;

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface BookingCardViewProps {
  bookings: BookingRequest[];
  onOpenApprove: (b: BookingRequest) => void;
  onOpenReject: (b: BookingRequest) => void;
  onCheckInNow: (b: BookingRequest) => void;
  onReconsider: (b: BookingRequest) => void;
}

// ============================================================================
// 3. MAIN COMPONENT: GIAO DIỆN XEM DẠNG THẺ (CARD GRID VIEW)
// ============================================================================
export const BookingCardView: React.FC<BookingCardViewProps> = ({
  bookings,
  onOpenApprove,
  onOpenReject,
  onCheckInNow,
  onReconsider,
}) => {
  if (bookings.length === 0) {
    return (
      <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
        <CalendarOutlined className="text-4xl text-slate-300 mb-2" />
        <p className="text-slate-500 font-medium text-sm">
          Không tìm thấy đơn đặt bàn nào theo tiêu chí lọc.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bookings.map((booking) => {
        const isPending = booking.status === "pending";
        const isApproved = booking.status === "approved";
        const isRejected = booking.status === "rejected";
        const statusCfg = BOOKING_STATUS_CONFIG[booking.status] || {
          label: booking.status,
          color: "default",
        };

        return (
          <Card
            key={booking.id}
            styles={{ body: { padding: 0 } }}
            className="!rounded-2xl !border-slate-200/90 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between bg-white"
          >
            <div className="p-4 space-y-3">
              {/* Card Header: Mã đơn & Trạng thái */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  {booking.id}
                </span>
                <Tag color={statusCfg.color} className="!rounded-full !px-2.5 !m-0 font-semibold text-xs whitespace-nowrap">
                  {statusCfg.label}
                </Tag>
              </div>

              {/* Customer Info & Table Info */}
              <div>
                <div className="flex items-center gap-2">
                  <UserOutlined className="text-emerald-600 text-sm" />
                  <span className="font-bold text-slate-900 text-sm">
                    {booking.customerName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <span>Bàn yêu cầu:</span>
                  <strong className="text-slate-800">
                    {booking.tableName || booking.tableId || "Chưa gán bàn"}
                  </strong>
                </div>
              </div>

              {/* Booking schedule */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                    <CalendarOutlined /> Ngày hẹn
                  </span>
                  <strong className="text-slate-800 font-mono">{booking.date}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                    <ClockCircleOutlined /> Khung giờ
                  </span>
                  <strong className="text-emerald-700 font-mono">
                    {booking.time} ({booking.duration}h)
                  </strong>
                </div>
              </div>

              {/* Customer contact & Financials */}
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <PhoneOutlined className="text-slate-400" /> SĐT liên hệ:
                  </span>
                  <span className="font-mono font-bold text-slate-900">{booking.phone}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tạm tính dự kiến:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatMoney(booking.estimatedCost)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200">
                  <span className="text-slate-500">Tiền cọc giữ bàn:</span>
                  <Text strong>{formatMoney(booking.deposit)}</Text>
                </div>
              </div>

              {/* Rejection reason if any */}
              {booking.rejectionReason && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <span className="font-bold block mb-0.5">Lý do từ chối:</span>
                  <span>{booking.rejectionReason}</span>
                </div>
              )}
            </div>

            {/* Card Footer: Action Buttons */}
            <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
              {isPending && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenReject(booking)}
                    leftIcon={<CloseCircleOutlined />}
                    className="!flex-1 !h-8 !rounded-xl !text-xs !border-rose-300 !text-rose-700 hover:!bg-rose-50 whitespace-nowrap"
                  >
                    Từ Chối
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenApprove(booking)}
                    leftIcon={<CheckCircleOutlined />}
                    className="!flex-1 !h-8 !rounded-xl !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold text-white shadow-2xs whitespace-nowrap"
                  >
                    Phê Duyệt
                  </Button>
                </>
              )}

              {isApproved && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenApprove(booking)}
                    leftIcon={<SwapOutlined />}
                    className="!h-8 !px-3 !rounded-xl !text-xs !border-slate-300 text-slate-700 whitespace-nowrap"
                  >
                    Đổi Bàn
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onCheckInNow(booking)}
                    leftIcon={<PlayCircleOutlined />}
                    className="!flex-1 !h-8 !rounded-xl !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold text-white shadow-2xs whitespace-nowrap"
                  >
                    Mở Bàn Cho Khách
                  </Button>
                </>
              )}

              {isRejected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReconsider(booking)}
                  className="!w-full !h-8 !rounded-xl !text-xs !border-slate-300 text-slate-700 hover:!border-emerald-600 whitespace-nowrap"
                >
                  Mở Lại Đơn Này
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
