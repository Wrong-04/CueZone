// ============================================================================
// 1. IMPORTS
// ============================================================================
// 1.1 Thư viện bên ngoài
import React from "react";
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  SwapOutlined,
} from "@ant-design/icons";

// 1.2 UI Components nội bộ
import { Button, Tag, Tooltip } from "../../shared/ui";

// 1.4 Types
import type { BookingRequest } from "../../types/pos";
import type { EnrichedBookingRequest } from "./bookingDispatch.utils";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface BookingDispatchCardProps {
  booking: EnrichedBookingRequest;
  isTablePlaying: boolean;
  onOpenChangeTable: (booking: BookingRequest) => void;
  onCheckIn: (booking: BookingRequest) => void;
}

// ============================================================================
// 3. CONSTANTS & HELPERS
// ============================================================================
function renderBookingStatusTag(booking: EnrichedBookingRequest) {
  if (booking.status === "checked_in") {
    return (
      <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 whitespace-nowrap">
        ĐÃ NHẬN BÀN
      </Tag>
    );
  }
  if (booking.status === "rejected") {
    return (
      <Tag
        color="default"
        className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 !bg-slate-100 !text-slate-500 !border-slate-300 whitespace-nowrap"
      >
        ĐÃ HỦY
      </Tag>
    );
  }
  if (booking.isOverdueNoShow) {
    return (
      <Tag
        color="default"
        className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 !bg-slate-100 !text-slate-500 !border-slate-300 whitespace-nowrap"
      >
        HẾT HẠN GIỮ CHỖ
      </Tag>
    );
  }
  if (booking.isHolding) {
    return (
      <Tag color="warning" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 whitespace-nowrap">
        ĐANG GIỮ BÀN (15P)
      </Tag>
    );
  }
  if (booking.isUpcoming) {
    return (
      <Tag color="blue" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 whitespace-nowrap">
        SẮP ĐẾN (CÒN {booking.diffMinutes}P)
      </Tag>
    );
  }
  return (
    <Tag color="default" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 whitespace-nowrap">
      HẸN {booking.time}
    </Tag>
  );
}

// ============================================================================
// 4. MAIN COMPONENT: THẺ HIỂN THỊ LỊCH HẸN ĐẶT BÀN TRÊN DRAWER POS
// ============================================================================
export const BookingDispatchCard: React.FC<BookingDispatchCardProps> = ({
  booking,
  isTablePlaying,
  onOpenChangeTable,
  onCheckIn,
}) => {
  const isCheckedIn = booking.status === "checked_in";
  const isRejected = booking.status === "rejected";

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all ${
        booking.isOverdueNoShow || isCheckedIn || isRejected
          ? "bg-slate-50/70 border-slate-200 opacity-60"
          : booking.isHolding
            ? "bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/20"
            : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
      }`}
    >
      {/* Hàng trên: Tên khách, SĐT liên hệ & Nhãn trạng thái giữ bàn */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
        <div className="min-w-0">
          <span className="font-extrabold text-sm text-slate-900 block truncate">
            {booking.customerName}
          </span>
          <a
            href={`tel:${booking.phone}`}
            className="text-xs text-slate-500 font-mono hover:text-emerald-700 flex items-center gap-1 mt-0.5 whitespace-nowrap"
          >
            <PhoneOutlined className="text-slate-400 text-[10px]" />
            {booking.phone}
          </a>
        </div>

        <div className="shrink-0 text-right">{renderBookingStatusTag(booking)}</div>
      </div>

      {/* Phần giữa: Thông tin giờ hẹn, bàn đặt, thời lượng & tiền tạm tính */}
      <div className="grid grid-cols-2 gap-2 text-xs py-1">
        <div className="flex items-center gap-1.5 text-slate-600">
          <ClockCircleOutlined className="text-emerald-600 text-xs shrink-0" />
          <span className="whitespace-nowrap">Giờ hẹn:</span>
          <strong className="font-mono text-slate-900 font-bold whitespace-nowrap">{booking.time}</strong>
          <span className="text-[11px] text-slate-400 whitespace-nowrap">({booking.date})</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-600">
          <AppstoreOutlined className="text-emerald-600 text-xs shrink-0" />
          <span className="whitespace-nowrap">Bàn:</span>
          <strong className="text-emerald-900 font-extrabold truncate">{booking.tableName}</strong>
        </div>

        <div className="text-[11px] text-slate-500 whitespace-nowrap">
          Thời lượng: <strong className="text-slate-800">{booking.duration}h</strong>
        </div>

        <div className="text-[11px] text-slate-500 text-right whitespace-nowrap">
          Tạm tính:{" "}
          <strong className="font-mono text-slate-900">
            {(booking.estimatedCost || 0).toLocaleString("vi-VN")}đ
          </strong>
        </div>
      </div>

      {/* Ghi chú đặc biệt từ khách hàng (nếu có) */}
      {booking.note && (
        <div className="mt-1.5 text-[11px] bg-slate-50 p-1.5 rounded-lg text-slate-600 italic">
          Ghi chú: {booking.note}
        </div>
      )}

      {/* Hàng dưới: Chỉ hiện nút Đổi bàn / Nhận bàn cho các lịch hẹn còn hiệu lực */}
      {!isCheckedIn && !isRejected && !booking.isOverdueNoShow && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChangeTable(booking)}
            icon={<SwapOutlined />}
            className="!h-7.5 !px-2.5 !text-xs !rounded-lg !border-slate-300 text-slate-700 font-medium whitespace-nowrap shrink-0"
          >
            Đổi bàn
          </Button>

          <Tooltip
            title={
              isTablePlaying
                ? `Bàn ${booking.tableName} hiện đang có khách chơi!`
                : ""
            }
          >
            <span>
              <Button
                variant="primary"
                size="sm"
                disabled={isTablePlaying}
                onClick={() => onCheckIn(booking)}
                leftIcon={<PlayCircleOutlined />}
                className={`!h-7.5 !px-3.5 !text-xs font-bold !rounded-lg text-white shadow-2xs whitespace-nowrap shrink-0 ${
                  isTablePlaying
                    ? "!bg-slate-300 !border-slate-300 !cursor-not-allowed"
                    : "!bg-emerald-600 hover:!bg-emerald-700 !border-0"
                }`}
              >
                Nhận Bàn (Mở POS)
              </Button>
            </span>
          </Tooltip>
        </div>
      )}
    </div>
  );
};
