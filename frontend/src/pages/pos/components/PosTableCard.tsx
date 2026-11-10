import React from "react";
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  AlertOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  UserOutlined,
  CoffeeOutlined,
  ShoppingOutlined,
  DollarOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { Button, Card, Tag, Tooltip } from "../../../shared/ui";
import type { PosTable } from "../../../types/pos";

export interface PosTableCardProps {
  table: PosTable;
  calculatePlayingDetails: (table: PosTable) => any;
  formatSessionStartTime?: (startedAt?: number, sessionStart?: string) => string;
  getBookingOverdueMinutes: (timeStr?: string) => number;
  getBookingUpcomingMinutes: (timeStr?: string) => number;
  pendingOrdersByTable: Record<string, number>;
  saving?: boolean;
  loading?: boolean;
  loadError?: any;
  onOpenTableModal: (table: PosTable, isCheckIn: boolean) => void;
  onTogglePause: (table: PosTable) => void;
  onOpenTransferModal: (table: PosTable, action: "transfer" | "merge") => void;
  onOpenCheckout: (table: PosTable) => void;
  onPrePrintBill?: (table: PosTable) => void;
  onOpenReceiptPreview?: (table: PosTable) => void;
  onOpenFnbModal: (table: PosTable) => void;
  onCancelBooking: (table: PosTable) => void;
  onOpenOrderDrawerForTable: (tableId: string) => void;
}

export const PosTableCard: React.FC<PosTableCardProps> = ({
  table,
  calculatePlayingDetails,
  formatSessionStartTime,
  getBookingOverdueMinutes,
  getBookingUpcomingMinutes,
  pendingOrdersByTable,
  saving = false,
  loading = false,
  loadError,
  onOpenTableModal,
  onTogglePause,
  onOpenTransferModal,
  onOpenCheckout,
  onPrePrintBill,
  onOpenReceiptPreview,
  onOpenFnbModal,
  onCancelBooking,
  onOpenOrderDrawerForTable,
}) => {
  const triggerPrePrint = onPrePrintBill || onOpenReceiptPreview;
  const defaultFormatTime = (startedAt?: number, sessionStartFallback?: string): string => {
    if (!startedAt) return sessionStartFallback || "--:--";
    const date = new Date(startedAt);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };
  const formatTime = formatSessionStartTime || defaultFormatTime;
  const { cost, formattedTime, minutes } = calculatePlayingDetails(table);
  const fnbTotal = (table.currentSession?.orders || []).reduce(
    (acc: number, cur: any) =>
      cur.status !== "cancelled"
        ? acc + (Number(cur.price) || 0) * (Number(cur.quantity) || 0)
        : acc,
    0,
  );
  const totalTableBill = cost + fnbTotal;

  const isPlaying = table.status === "playing";
  const isPaused = table.status === "paused";
  const isBooked = table.status === "booked";
  const isAvailable = table.status === "available";
  const isMaintenance = table.status === "maintenance";
  const overdueMinutes = isBooked ? getBookingOverdueMinutes(table.bookedInfo?.time) : 0;
  const upcomingMinutes = isBooked ? getBookingUpcomingMinutes(table.bookedInfo?.time) : -1;
  const isUpcoming = isBooked && upcomingMinutes >= 0 && upcomingMinutes <= 45;
  const isOverdue = isBooked && overdueMinutes > 0;
  const isExpiredHold = isBooked && overdueMinutes > 15;
  const isHoldingForBooking = isBooked && (isUpcoming || (isOverdue && !isExpiredHold));
  const hasAdvanceBooking = isBooked && upcomingMinutes > 45;
  const isGenericBooked = isBooked && !isHoldingForBooking && !hasAdvanceBooking && !isExpiredHold;
  const displayTableName = table.name.replace(/\s*•\s*.*$/, "");

  return (
    <Card
      key={table.id}
      styles={{
        body: {
          padding: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        },
      }}
      className={`!rounded-2xl transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-md h-full flex flex-col [&>.ant-card-body]:!flex [&>.ant-card-body]:!flex-col [&>.ant-card-body]:!h-full [&>.ant-card-body]:!flex-1 [&>.ant-card-body]:!justify-between ${
        isPlaying
          ? "!border-emerald-400/80 !bg-white ring-1 ring-emerald-500/15"
          : isPaused
            ? "!border-amber-400/80 !bg-white ring-1 ring-amber-400/20"
            : isExpiredHold
              ? "!border-red-400/80 !bg-white ring-1 ring-red-400/30"
              : isHoldingForBooking || isGenericBooked
                ? overdueMinutes > 0
                  ? "!border-amber-400 !bg-amber-50/20 ring-2 ring-amber-400 shadow-sm"
                  : "!border-blue-400 !bg-blue-50/20 ring-2 ring-blue-400 shadow-sm"
                : hasAdvanceBooking
                  ? "!border-blue-200/90 !bg-white hover:!border-emerald-300 hover:shadow-sm"
                : isMaintenance
                  ? "!border-rose-300 !bg-rose-50/20"
                  : "!border-slate-200 !bg-white hover:!border-emerald-300 hover:shadow-sm"
      }`}
    >
      <div
        className={`h-1.5 w-full shrink-0 ${
          isPlaying
            ? "bg-emerald-500"
            : isPaused
              ? "bg-amber-400"
              : isExpiredHold
                ? "bg-red-500"
                : isHoldingForBooking || isGenericBooked
                  ? overdueMinutes > 0
                    ? "bg-amber-500"
                    : "bg-blue-500"
                  : hasAdvanceBooking
                    ? "bg-sky-400"
                  : isMaintenance
                    ? "bg-rose-400"
                    : "bg-slate-200"
        }`}
      />

      <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-col gap-1.5">
        {/* Dòng 1: Mã bàn + Tên bàn bên trái; Tag trạng thái bên phải */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="font-mono text-[11px] font-black text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0 shadow-2xs">
              {table.code}
            </span>
            <span className="font-extrabold text-sm text-slate-900 truncate" title={table.name}>
              {displayTableName}
            </span>
          </div>

          <div className="shrink-0 flex items-center">
            {/* Tag trạng thái */}
            {isPlaying && (
              <Tag
                color="green"
                className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ĐANG CHƠI
              </Tag>
            )}
            {isPaused && (
              <Tag
                color="orange"
                className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <PauseCircleOutlined className="text-[10px]" />
                TẠM DỪNG
              </Tag>
            )}
            {hasAdvanceBooking ? (
              <div className="flex items-center gap-1 shrink-0">
                <Tag
                  color="default"
                  className="!rounded-full !px-2 !py-0.5 !text-[10px] !font-bold !m-0 !bg-slate-100 !text-slate-600 border border-slate-200 whitespace-nowrap"
                >
                  BÀN TRỐNG
                </Tag>
                <Tag
                  color="blue"
                  className="!rounded-full !px-2 !py-0.5 !text-[9.5px] !font-bold !m-0 border border-blue-200 shadow-2xs inline-flex items-center whitespace-nowrap"
                >
                  <ClockCircleOutlined className="mr-1 text-[10px]" />
                  Hẹn {table.bookedInfo?.time ? table.bookedInfo.time.split(" ")[0] : ""}
                </Tag>
              </div>
            ) : isExpiredHold ? (
              <Tag
                color="error"
                className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1 animate-pulse whitespace-nowrap shrink-0"
              >
                <AlertOutlined className="text-[10px]" />
                QUÁ HẠN {overdueMinutes}P (HẾT GIỮ)
              </Tag>
            ) : isHoldingForBooking || isGenericBooked ? (
              overdueMinutes > 0 ? (
                <Tag
                  color="warning"
                  className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <ClockCircleOutlined className="text-[10px]" />
                  TRỄ {overdueMinutes}P
                </Tag>
              ) : (
                <Tag
                  color="blue"
                  className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1 animate-pulse whitespace-nowrap shrink-0"
                >
                  <CalendarOutlined className="text-[10px]" />
                  GIỮ BÀN ĐÓN KHÁCH
                </Tag>
              )
            ) : isAvailable ? (
              <Tag
                color="default"
                className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 !bg-slate-100 !text-slate-600 border border-slate-200 whitespace-nowrap shrink-0"
              >
                BÀN TRỐNG
              </Tag>
            ) : isMaintenance ? (
              <Tag
                color="error"
                className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 whitespace-nowrap shrink-0"
              >
                BẢO TRÌ
              </Tag>
            ) : null}
          </div>
        </div>

        {/* Dòng 2: Loại bàn & Khu vực bên trái; Tác vụ nhanh Tạm dừng / Chuyển bàn bên phải */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div
            className="text-[10.5px] text-slate-500 leading-tight truncate font-medium flex-1 min-w-0"
            title={`${table.typeName} • ${table.area || "Khu chính"}`}
          >
            {table.typeName} • {table.area || "Khu chính"}
          </div>

          {(isPlaying || isPaused) && (
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs shrink-0">
              <Tooltip title={isPaused ? "Tiếp tục tính giờ" : "Tạm dừng tính giờ"}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePause(table);
                  }}
                  disabled={saving || loading || !!loadError}
                  className={`h-5 w-5 rounded flex items-center justify-center text-xs transition-colors cursor-pointer ${
                    isPaused
                      ? "bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold"
                      : "hover:bg-slate-100 text-slate-500 hover:text-amber-600"
                  }`}
                  aria-label={isPaused ? "Tiếp tục" : "Tạm dừng"}
                >
                  {isPaused ? (
                    <PlayCircleOutlined className="text-[11px] text-amber-700" />
                  ) : (
                    <PauseCircleOutlined className="text-[11px]" />
                  )}
                </button>
              </Tooltip>

              <Tooltip title="Chuyển sang bàn khác">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTransferModal(table, "transfer");
                  }}
                  className="h-5 w-5 rounded flex items-center justify-center text-xs hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                  aria-label="Chuyển bàn"
                >
                  <SwapOutlined className="text-[10px]" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      <div className="p-3.5 flex-1 flex flex-col justify-between min-h-[135px]">
        {isPlaying || isPaused ? (
          <div className="space-y-2.5">
            {/* Timer row */}
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-1.5">
                <ClockCircleOutlined
                  className={
                    isPaused ? "text-amber-500 text-sm" : "text-emerald-600 text-sm"
                  }
                />
                <span
                  className={`text-xl font-black font-mono tracking-wider ${isPaused ? "text-amber-600" : "text-slate-900"}`}
                >
                  {formattedTime}
                </span>
                {minutes >= 180 && (
                  <Tag
                    color={minutes >= 1440 ? "error" : "warning"}
                    className="!rounded-md !px-1.5 !py-0 !text-[9px] !font-bold !m-0 font-mono"
                  >
                    {minutes >= 1440
                      ? `> ${Math.floor(minutes / 1440)} ngày`
                      : minutes >= 240
                        ? "> 4h"
                        : "> 3h"}
                  </Tag>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Từ{" "}
                {formatTime(
                  table.currentSession?.startedAt,
                  table.currentSession?.sessionStart,
                )}
              </span>
            </div>

            {/* Customer & Breakdown */}
            <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <UserOutlined className="text-slate-400 text-xs shrink-0" />
                  <span
                    className="font-bold text-slate-800 truncate"
                    title={table.currentSession?.customerName || "Khách lẻ"}
                  >
                    {table.currentSession?.customerName || "Khách lẻ"}
                  </span>
                  {table.currentSession?.isMember && (
                    <Tag
                      color="gold"
                      className="!text-[9px] !px-1.5 !py-0 !border-0 !m-0 !font-bold !rounded shrink-0 whitespace-nowrap"
                    >
                      {table.currentSession.memberRank || "VIP"}
                    </Tag>
                  )}
                </div>
                <span className="text-slate-500 font-mono text-[11px] font-medium whitespace-nowrap shrink-0">
                  {cost.toLocaleString("vi-VN")}đ
                </span>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-500 text-[11px] flex items-center gap-1 whitespace-nowrap">
                  <CoffeeOutlined className="text-slate-400 text-[10px]" />
                  Dịch vụ (
                  {(table.currentSession?.orders || []).filter(
                    (o: any) => o.status !== "cancelled" && (Number(o.quantity) || 0) > 0,
                  ).length}
                  ):
                </span>
                <span className="text-emerald-700 font-mono font-semibold text-[11px] whitespace-nowrap shrink-0">
                  {fnbTotal.toLocaleString("vi-VN")}đ
                </span>
              </div>

              {/* Badge cảnh báo đơn gọi món mới tại bàn */}
              {(() => {
                const tablePendingCount =
                  (pendingOrdersByTable[table.id] || 0) +
                  (pendingOrdersByTable[table.code] || 0);
                if (tablePendingCount <= 0) return null;
                return (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenOrderDrawerForTable(table.id || table.code);
                    }}
                    className="p-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 text-[11px] font-bold flex items-center justify-between cursor-pointer animate-pulse shadow-2xs transition-colors"
                    title="Bấm để mở danh sách duyệt đơn cho bàn này"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShoppingOutlined className="text-rose-600 animate-bounce text-xs" />
                      <span>{tablePendingCount} đơn chờ duyệt!</span>
                    </span>
                    <span className="text-[10px] text-rose-700 font-bold underline">
                      Duyệt ngay ➔
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Grand Total */}
            <div className="flex items-baseline justify-between pt-2 border-t border-dashed border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600">Tạm tính:</span>
              </div>
              <span className="text-base font-black text-emerald-700 font-mono tracking-tight">
                {totalTableBill.toLocaleString("vi-VN")}đ
              </span>
            </div>

            {/* Cảnh báo lịch hẹn sắp tới khi bàn đang có khách chơi */}
            {table.bookedInfo && (
              <div
                className={`mt-2 p-1.5 rounded-xl border text-[11px] flex items-center justify-between gap-1.5 ${
                  upcomingMinutes >= 0 && upcomingMinutes <= 45
                    ? "bg-amber-50/95 border-amber-300 text-amber-900 shadow-2xs"
                    : "bg-blue-50/70 border-blue-200 text-blue-900"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertOutlined
                    className={
                      upcomingMinutes >= 0 && upcomingMinutes <= 45
                        ? "text-amber-600 animate-bounce text-xs shrink-0"
                        : "text-blue-600 text-xs shrink-0"
                    }
                  />
                  <span className="truncate">
                    Hẹn: <strong>{table.bookedInfo.time?.split(" ")[0]}</strong> ({table.bookedInfo.customerName})
                  </span>
                </div>
                {upcomingMinutes >= 0 && upcomingMinutes <= 45 ? (
                  <span className="font-bold text-amber-800 whitespace-nowrap text-[10px] bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                    Còn {upcomingMinutes}p
                  </span>
                ) : null}
              </div>
            )}
          </div>
        ) : isHoldingForBooking || isExpiredHold || isGenericBooked ? (
          <div className="space-y-2 py-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <UserOutlined className="text-blue-600 text-xs shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate">
                  {table.bookedInfo?.customerName || "Khách hẹn trước"}
                </span>
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-500 shrink-0">
                {table.bookedInfo?.phone || "—"}
              </span>
            </div>

            <div
              className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                isExpiredHold
                  ? "bg-red-50/80 border-red-200/80"
                  : "bg-blue-50/80 border-blue-200/70"
              }`}
            >
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-600">Giờ hẹn:</span>
                <span className="font-bold text-blue-800 font-mono">
                  {table.bookedInfo?.time
                    ? table.bookedInfo.time.replace(/\s*\(?hôm nay\)?\s*/gi, "").trim()
                    : "Chưa rõ"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-600">Giữ bàn tối đa:</span>
                <span className="font-medium text-slate-800 text-[10px]">15 phút</span>
              </div>
              {isExpiredHold ? (
                <div className="flex justify-between items-center text-[10px] font-bold pt-1 border-t border-red-200 text-red-600 bg-red-100/60 -mx-1 px-1.5 py-0.5 rounded">
                  <span className="flex items-center gap-1">
                    <AlertOutlined className="text-red-600 animate-pulse" />
                    Tình trạng:
                  </span>
                  <span>Quá hạn {overdueMinutes}p • Đang tự động hủy</span>
                </div>
              ) : overdueMinutes > 0 ? (
                <div className="flex justify-between items-center text-[10px] font-bold pt-1 border-t border-amber-200 text-amber-800 bg-amber-100/60 -mx-1 px-1.5 py-0.5 rounded">
                  <span>Tình trạng:</span>
                  <span>Trễ hẹn {overdueMinutes} phút (Chờ tối đa 15p)</span>
                </div>
              ) : isUpcoming ? (
                <div className="flex justify-between items-center text-[10px] font-bold pt-1 border-t border-amber-200 text-amber-800 bg-amber-100/60 -mx-1 px-1.5 py-0.5 rounded">
                  <span className="flex items-center gap-1">
                    <AlertOutlined className="text-amber-600 animate-bounce" />
                    Khung giờ giữ bàn:
                  </span>
                  <span>Đang giữ bàn chờ khách (còn {upcomingMinutes}p)</span>
                </div>
              ) : null}
            </div>
            <span className="text-[10px] text-slate-400 block text-center italic">
              {isExpiredHold
                ? "Đã quá hạn giữ bàn 15 phút. Đang tự động giải phóng bàn..."
                : 'Khách đến? Bấm "Khách Nhận Bàn" bên dưới'}
            </span>
          </div>
        ) : hasAdvanceBooking ? (
          <div
            onClick={() => onOpenTableModal(table, false)}
            className="py-1 space-y-2 flex-1 flex flex-col justify-between cursor-pointer group"
            title="Bàn đang trống • Chạm để mở bàn tính giờ cho khách chơi nhanh"
          >
            <div className="flex items-baseline justify-between p-2 rounded-xl bg-slate-50/90 border border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/20 transition-all">
              <span className="text-xs font-semibold text-slate-500">Đơn giá giờ:</span>
              <span className="text-base font-black font-mono text-emerald-700">
                {table.pricePerHour.toLocaleString("vi-VN")}đ
                <span className="text-xs font-normal text-slate-400">/h</span>
              </span>
            </div>

            {/* Banner nhắc lịch hẹn trước */}
            <div className="p-2 rounded-xl bg-blue-50/80 border border-blue-200/70 text-[11px] text-blue-900 space-y-0.5">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1 text-blue-800">
                  <CalendarOutlined className="text-blue-600 text-xs" /> Khách hẹn:
                </span>
                <span className="font-bold truncate max-w-[120px]">
                  {table.bookedInfo?.customerName || "Khách hẹn"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10.5px] text-slate-600">
                <span>Nhận bàn lúc:</span>
                <strong className="text-blue-800 font-mono">
                  {table.bookedInfo?.time || ""}
                </strong>
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold pt-0.5 border-t border-blue-100/70">
                ✓ Còn {Math.floor(upcomingMinutes / 60) > 0 ? `${Math.floor(upcomingMinutes / 60)}h` : ""}{upcomingMinutes % 60}p • Đón khách vãng lai chơi nhanh
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircleOutlined className="text-emerald-600 text-xs" /> Bàn sẵn sàng đón khách
              </span>
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-emerald-600 transition-colors">
                Bấm mở bàn ➔
              </span>
            </div>
          </div>
        ) : isMaintenance ? (
          <div className="py-2 space-y-2 flex-1 flex flex-col justify-center items-center text-center">
            <div className="p-3 w-full rounded-xl bg-rose-50/70 border border-rose-200/80 text-rose-900 space-y-1">
              <div className="flex items-center justify-center gap-1.5 font-bold text-xs text-rose-800">
                <AlertOutlined className="text-rose-600 text-sm" />
                <span>BÀN ĐANG BẢO TRÌ</span>
              </div>
              <p className="text-[11px] text-rose-700/90 mb-0">
                Tạm dừng đón khách để bảo dưỡng mặt bàn, thay vải nỉ hoặc sửa cơ bóng.
              </p>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onOpenTableModal(table, false)}
            className="py-1 space-y-2 flex-1 flex flex-col justify-center cursor-pointer group"
            title="Chạm để mở bàn tính giờ"
          >
            <div className="flex items-baseline justify-between p-2.5 rounded-xl bg-slate-50/90 border border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/20 transition-all">
              <span className="text-xs font-semibold text-slate-500">Đơn giá giờ:</span>
              <span className="text-base font-black font-mono text-emerald-700">
                {table.pricePerHour.toLocaleString("vi-VN")}đ
                <span className="text-xs font-normal text-slate-400">/h</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircleOutlined className="text-emerald-600 text-xs" /> Bàn sẵn sàng
                đón khách
              </span>
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-emerald-600 transition-colors">
                Bấm mở bàn ➔
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-3.5 py-2.5 bg-slate-50/80 border-t border-slate-100 shrink-0 mt-auto">
        {isHoldingForBooking || isGenericBooked ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenTableModal(table, true)}
              leftIcon={<PlayCircleOutlined />}
              style={{ backgroundColor: "#2563eb", borderColor: "#2563eb", color: "#ffffff" }}
              className="!flex-1 !rounded-xl font-bold !text-xs !h-9 shadow-2xs text-white"
            >
              Khách Nhận Bàn
            </Button>
            <Tooltip title="Hủy giữ bàn và chuyển về trạng thái Trống">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancelBooking(table)}
                disabled={saving}
                className="!rounded-xl !text-xs !h-9 !px-2.5 !border-red-200 !text-red-600 hover:!border-red-500 hover:!bg-red-50 font-medium"
              >
                Hủy
              </Button>
            </Tooltip>
          </div>
        ) : isExpiredHold ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancelBooking(table)}
              disabled={saving}
              className="!flex-1 !rounded-xl !text-xs !h-9 !px-2.5 !border-red-300 !text-red-700 hover:!bg-red-50 font-bold"
            >
              Hủy / Giải Phóng Bàn
            </Button>
            <Tooltip title="Mở bàn tính giờ cho khách mới">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenTableModal(table, false)}
                leftIcon={<PlayCircleOutlined />}
                className="!rounded-xl !bg-emerald-600 hover:!bg-emerald-700 font-bold !text-xs !h-9 !px-3 text-white shrink-0"
              >
                Mở Bàn Mới
              </Button>
            </Tooltip>
          </div>
        ) : hasAdvanceBooking ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenTableModal(table, false)}
              leftIcon={<PlayCircleOutlined />}
              className="!flex-1 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs !h-9 shadow-2xs text-white"
            >
              Mở Bàn Tính Giờ
            </Button>
            <Tooltip title="Khách đặt trước đến sớm nhận bàn">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenTableModal(table, true)}
                className="!rounded-xl !border-blue-300 !text-blue-700 hover:!bg-blue-50 font-bold !text-xs !h-9 !px-2.5 shrink-0"
              >
                Nhận Bàn
              </Button>
            </Tooltip>
          </div>
        ) : isAvailable ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenTableModal(table, false)}
            leftIcon={<PlayCircleOutlined />}
            className="!w-full !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs !h-9 shadow-2xs text-white"
          >
            Mở Bàn Tính Giờ
          </Button>
        ) : isPlaying || isPaused ? (
          <div className="flex items-center gap-1.5 min-w-0">
            {/* 1. Nút Thanh Toán: To rõ ràng, nổi bật nhất quầy */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenCheckout(table)}
              leftIcon={<DollarOutlined />}
              className="!flex-1 min-w-0 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-black !text-xs !h-9 text-white shadow-2xs tracking-wide whitespace-nowrap !px-2.5"
            >
              <span className="whitespace-nowrap">Thanh Toán</span>
            </Button>

            {/* 2. Nút In Tạm Tính: Hỗ trợ quầy in phiếu kiểm tiền cho khách trước khi thu */}
            <Tooltip title="In phiếu tạm tính cho khách kiểm đồ">
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerPrePrint?.(table)}
                icon={<PrinterOutlined className="text-slate-600" />}
                className="!rounded-xl !h-9 !w-9 !min-h-9 !p-0 !min-w-9 !border-slate-200 hover:!border-emerald-500 !bg-white hover:!bg-slate-50 text-slate-700 shadow-2xs shrink-0"
                aria-label="In tạm tính"
              />
            </Tooltip>

            {/* 3. Nút Gọi Món: Tinh tế, hiện badge số lượng món */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenFnbModal(table)}
              leftIcon={<CoffeeOutlined className="text-emerald-700" />}
              className="!rounded-xl !text-xs !h-9 !px-2.5 !border-slate-200 hover:!border-emerald-500 !bg-white hover:!bg-emerald-50/50 !text-slate-800 font-bold shadow-2xs shrink-0 whitespace-nowrap"
            >
              <span className="whitespace-nowrap">Gọi Món</span>
              {(() => {
                const totalQty = (table.currentSession?.orders || [])
                  .filter((o: any) => o.status !== "cancelled")
                  .reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
                if (totalQty <= 0) return null;
                return (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black font-mono">
                    {totalQty}
                  </span>
                );
              })()}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="!w-full !rounded-xl !text-xs !h-9 !text-slate-400"
          >
            Bàn đang bảo trì
          </Button>
        )}
      </div>
    </Card>
  );
};

export default PosTableCard;
