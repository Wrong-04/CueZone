// ============================================================================
// 1. IMPORTS & ICONS
// ============================================================================
import React from "react";
import {
  ClockCircleOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Button, Card, Space, Tag, Tooltip, Typography } from "../../../../shared/ui";
import type { PricingTier } from "../../../../types";
import { formatActivePricingLabel, formatDaysOfWeek } from "../types/tables.types";

const { Title, Text } = Typography;

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface TablePricingTierViewProps {
  pricingTiers: PricingTier[];
  activePricingTier: PricingTier | null;
  currentTime: number;
  timelineDayFilter: "today" | "weekday" | "weekend";
  setTimelineDayFilter: (val: "today" | "weekday" | "weekend") => void;
  timelineSegments: Array<{
    name: string;
    startTime: string;
    endTime: string;
    widthPercent: number;
    isCurrent: boolean;
    isFallback: boolean;
    bgColor: string;
    tier?: PricingTier;
  }>;
  onOpenEditPricing: (tier: PricingTier) => void;
  onToggleTierActive: (tier: PricingTier) => void;
  onOpenDeleteConfirm: (tier: PricingTier) => void;
}

// ============================================================================
// 4. MAIN COMPONENT: GIAO DIỆN BẢNG GIÁ THEO KHUNG GIỜ & DÒNG THỜI GIAN
// Hiển thị biểu đồ timeline 24h trực quan và danh sách các gói cước tiền giờ áp dụng
// ============================================================================
export const TablePricingTierView: React.FC<TablePricingTierViewProps> = ({
  pricingTiers,
  activePricingTier,
  currentTime,
  timelineDayFilter,
  setTimelineDayFilter,
  timelineSegments,
  onOpenEditPricing,
  onToggleTierActive,
  onOpenDeleteConfirm,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Title level={4} className="!text-base !font-black !text-slate-900 !mb-0 whitespace-nowrap">
            Biểu Giá Giờ Chơi Theo Khung Giờ
          </Title>
          <Text className="!text-xs !text-slate-500 whitespace-nowrap">
            Tự động áp dụng mức giá tương ứng theo thời gian khách mở bàn tại quầy POS
          </Text>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
              <ClockCircleOutlined className="text-emerald-600" />
              Lịch Khung Giờ Trong Ngày (24h)
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
              <button
                type="button"
                onClick={() => setTimelineDayFilter("today")}
                className={`px-2 py-0.5 rounded-md font-medium transition-all whitespace-nowrap ${
                  timelineDayFilter === "today"
                    ? "bg-white text-emerald-700 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setTimelineDayFilter("weekday")}
                className={`px-2 py-0.5 rounded-md font-medium transition-all whitespace-nowrap ${
                  timelineDayFilter === "weekday"
                    ? "bg-white text-emerald-700 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ngày thường (T2–T6)
              </button>
              <button
                type="button"
                onClick={() => setTimelineDayFilter("weekend")}
                className={`px-2 py-0.5 rounded-md font-medium transition-all whitespace-nowrap ${
                  timelineDayFilter === "weekend"
                    ? "bg-white text-emerald-700 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cuối tuần (T7–CN)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px] whitespace-nowrap">
              Thời gian:{" "}
              <strong className="text-slate-900 font-mono">
                {new Date(currentTime).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
              {" • "}Đang áp dụng:{" "}
              <strong className="text-emerald-700 whitespace-nowrap">
                {formatActivePricingLabel(activePricingTier)}
              </strong>
            </span>
          </div>
        </div>

        {/* Thanh Timeline 24H ĐỘNG từ Database */}
        <div className="h-7 w-full rounded-lg overflow-hidden flex text-[10px] font-bold text-white shadow-inner bg-slate-100">
          {timelineSegments.map((seg, idx) => (
            <Tooltip
              key={idx}
              title={`${seg.name}: ${seg.startTime} – ${seg.endTime}`}
            >
              <div
                style={{ width: `${seg.widthPercent}%` }}
                className={`${seg.bgColor} flex items-center justify-center truncate px-1 transition-all cursor-pointer relative ${
                  seg.isCurrent ? "ring-2 ring-white ring-inset font-black" : ""
                }`}
              >
                {seg.widthPercent > 10 && (
                  <span className="truncate whitespace-nowrap">
                    {seg.startTime}–{seg.endTime} {seg.widthPercent > 18 ? `(${seg.name.replace(/Khung Giờ\s*/gi, "")})` : ""}
                  </span>
                )}
              </div>
            </Tooltip>
          ))}
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 font-mono px-0.5 whitespace-nowrap">
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
          <span>24:00</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pricingTiers.map((tier) => {
          const isTierActive = tier._id === activePricingTier?._id;
          const isPaused = tier.isActive === false;

          return (
            <Card
              key={tier._id}
              styles={{ body: { padding: 0 } }}
              className={`!rounded-2xl border transition-all overflow-hidden shadow-2xs hover:shadow-sm ${
                isPaused
                  ? "!border-slate-200 bg-slate-50/60 opacity-80"
                  : isTierActive
                    ? "!border-emerald-500 bg-white ring-2 ring-emerald-500/20"
                    : "!border-slate-200 bg-white"
              }`}
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
                      isPaused
                        ? "bg-slate-200 text-slate-500"
                        : isTierActive
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <ClockCircleOutlined className="text-base" />
                  </div>
                  <div>
                    <strong
                      className={`text-sm block whitespace-nowrap ${isPaused ? "text-slate-500 line-through" : "text-slate-900"}`}
                    >
                      {tier.name}
                    </strong>
                    <span className="font-mono text-xs text-slate-500 font-bold whitespace-nowrap">
                      {tier.startTime} – {tier.endTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 whitespace-nowrap">
                  {isPaused ? (
                    <Tag
                      color="default"
                      className="!rounded-full !px-3 !py-1 !font-bold inline-flex items-center gap-1.5 shadow-2xs text-slate-600 bg-slate-100 border-slate-300 whitespace-nowrap"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      TẠM NGƯNG
                    </Tag>
                  ) : isTierActive ? (
                    <Tag
                      color="green"
                      className="!rounded-full !px-3 !py-1 !font-bold inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ĐANG ÁP DỤNG
                    </Tag>
                  ) : (
                    <Tag
                      color="blue"
                      className="!rounded-full !px-3 !py-1 !font-bold inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                    >
                      THEO LỊCH
                    </Tag>
                  )}
                  {tier.dayType === "peak" && (
                    <Tag color="gold" className="!rounded-full !px-2.5 !py-0.5 !font-bold whitespace-nowrap">
                      GIỜ VÀNG
                    </Tag>
                  )}
                  {tier.dayType === "weekend" && (
                    <Tag color="blue" className="!rounded-full !px-2.5 !py-0.5 !font-bold whitespace-nowrap">
                      CUỐI TUẦN
                    </Tag>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="py-2.5 px-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-center">
                    <span className="text-[11px] text-slate-700 font-bold block mb-1 whitespace-nowrap">
                      Khu Phổ Thông
                    </span>
                    <strong className="text-sm font-black text-slate-900 font-mono whitespace-nowrap">
                      {tier.prices.standard.toLocaleString("vi-VN")}đ
                    </strong>
                  </div>

                  <div className="py-2.5 px-2 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col justify-center">
                    <span className="text-[11px] text-amber-900 font-bold block mb-1 whitespace-nowrap">
                      Khu VIP
                    </span>
                    <strong className="text-sm font-black text-amber-900 font-mono whitespace-nowrap">
                      {tier.prices.vip.toLocaleString("vi-VN")}đ
                    </strong>
                  </div>

                  <div className="py-2.5 px-2 rounded-xl bg-purple-50/70 border border-purple-200/80 flex flex-col justify-center">
                    <span className="text-[11px] text-purple-900 font-bold block mb-1 whitespace-nowrap">
                      Khu Thi Đấu
                    </span>
                    <strong className="text-sm font-black text-purple-900 font-mono whitespace-nowrap">
                      {(tier.prices.match ?? tier.prices.vip + 10000).toLocaleString("vi-VN")}đ
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 whitespace-nowrap">{formatDaysOfWeek(tier)}</span>

                  <Space size={6} className="whitespace-nowrap">
                    <Tooltip
                      title={
                        isTierActive
                          ? "Khung giờ đang dùng cho bàn đang chơi, không thể sửa"
                          : "Sửa khung giờ và giá"
                      }
                    >
                      <span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isTierActive}
                          onClick={() => onOpenEditPricing(tier)}
                          leftIcon={<EditOutlined />}
                          className={`!h-7 !px-2.5 !rounded-lg !text-xs !border-slate-300 whitespace-nowrap ${
                            isTierActive
                              ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400"
                              : "hover:!border-emerald-600"
                          }`}
                        >
                          Sửa Giá
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip
                      title={
                        isTierActive
                          ? "Khung giờ đang dùng cho bàn đang chơi, không thể tạm ngưng"
                          : isPaused
                            ? "Bật lại khung giờ này"
                            : "Tạm ngưng khung giờ này"
                      }
                    >
                      <span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isTierActive}
                          onClick={() => onToggleTierActive(tier)}
                          leftIcon={
                            isPaused ? (
                              <PlayCircleOutlined className="text-emerald-600" />
                            ) : (
                              <PauseCircleOutlined
                                className={isTierActive ? "text-slate-400" : "text-amber-600"}
                              />
                            )
                          }
                          className={`!h-7 !px-2.5 !rounded-lg !text-xs font-medium !border-slate-300 whitespace-nowrap ${
                            isTierActive
                              ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400"
                              : isPaused
                                ? "!text-emerald-700 hover:!border-emerald-500 hover:!bg-emerald-50"
                                : "!text-amber-700 hover:!border-amber-500 hover:!bg-amber-50"
                          }`}
                        >
                          {isPaused ? "Bật Lại" : "Tạm Ngưng"}
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip
                      title={
                        isTierActive
                          ? "Khung giờ đang dùng cho bàn đang chơi, không thể xóa"
                          : "Xóa khung giờ"
                      }
                    >
                      <span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isTierActive}
                          onClick={() => onOpenDeleteConfirm(tier)}
                          leftIcon={<DeleteOutlined className="text-rose-500" />}
                          className={`!h-7 !px-2.5 !rounded-lg !text-xs !border-slate-300 !text-rose-600 hover:!border-rose-300 hover:!bg-rose-50 whitespace-nowrap ${
                            isTierActive
                              ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400"
                              : ""
                          }`}
                        >
                          Xóa
                        </Button>
                      </span>
                    </Tooltip>
                  </Space>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
