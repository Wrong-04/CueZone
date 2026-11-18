// ============================================================================
// 1. IMPORTS & TYPOGRAPHY
// ============================================================================
import React from "react";
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  UserOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Card, Button, Tag, Typography } from "../../../../shared/ui";
import type { PosTable } from "../../../../types/pos";
import type { DashboardFloorStats } from "../types/dashboard.types";

const { Title, Text } = Typography;

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface ActiveTablesWidgetProps {
  activeTables: PosTable[];
  floorStats: DashboardFloorStats;
  calculatePlayingDetails: (table: PosTable) => {
    minutes: number;
    cost: number;
    formattedTime: string;
  };
  onNavigatePos: () => void;
}

// ============================================================================
// 4. MAIN COMPONENT: WIDGET BÀN ĐANG HOẠT ĐỘNG (DASHBOARD REAL-TIME)
// Hiển thị danh sách các bàn đang mở chơi, thời gian đã chơi và tạm tính tiền giờ
// ============================================================================
export const ActiveTablesWidget: React.FC<ActiveTablesWidgetProps> = ({
  activeTables,
  floorStats,
  calculatePlayingDetails,
  onNavigatePos,
}) => {
  return (
    <Card
      styles={{ body: { padding: 0 } }}
      className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
    >
      {/* ── Tiêu đề Widget & Tóm tắt số bàn đang chơi ───────────────────────── */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ThunderboltOutlined className="text-base" />
          </div>
          <div>
            <Title
              level={4}
              className="!text-base !font-black !text-slate-900 !mb-0 tracking-tight whitespace-nowrap"
            >
              Bàn Đang Hoạt Động
            </Title>
            <Text className="!text-xs !text-slate-500 block whitespace-nowrap">
              {activeTables.length} bàn đang phục vụ ({floorStats.playing} đang chơi, {floorStats.paused} tạm dừng, {floorStats.booked} đặt trước)
            </Text>
          </div>
        </div>

        <Button
          variant="link"
          size="sm"
          onClick={onNavigatePos}
          rightIcon={<RightOutlined />}
          className="!text-xs !font-bold !text-emerald-700 hover:!text-emerald-800 !p-0 whitespace-nowrap"
        >
          Vào Sơ Đồ Bàn POS
        </Button>
      </div>

      <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
        {activeTables.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Hiện không có bàn nào đang hoạt động
          </div>
        ) : (
          activeTables.map((table) => {
            const { cost, formattedTime } = calculatePlayingDetails(table);
            const fnbTotal =
              table.currentSession?.orders.reduce((acc, cur) => {
                if ((cur as any).status === "cancelled") return acc;
                const qty = Math.max(
                  0,
                  Number(cur.quantity || 1) - Number((cur as any).cancelledQuantity || 0),
                );
                return acc + (cur.price || 0) * qty;
              }, 0) || 0;
            const totalBill = cost + fnbTotal;
            const isPlaying = table.status === "playing";
            const isPaused = table.status === "paused";
            const isBooked = table.status === "booked";

            return (
              <div
                key={table.id}
                onClick={onNavigatePos}
                className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 font-mono leading-none">
                      {table.code.split("-")[0]}
                    </span>
                    <span className="text-xs font-black text-slate-800 font-mono leading-none mt-0.5">
                      {table.code.split("-")[1] || table.code}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {table.name}
                      </span>
                      <span className="text-xs text-slate-400 hidden sm:inline whitespace-nowrap">
                        • {table.typeName}
                      </span>
                      {isPlaying && (
                        <Tag
                          color="green"
                          className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold whitespace-nowrap"
                        >
                          ĐANG CHƠI
                        </Tag>
                      )}
                      {isPaused && (
                        <Tag
                          color="orange"
                          className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold whitespace-nowrap"
                        >
                          TẠM DỪNG
                        </Tag>
                      )}
                      {isBooked && (
                        <Tag
                          color="blue"
                          className="!text-[10px] !px-1.5 !py-0 !border-0 !m-0 !font-bold whitespace-nowrap"
                        >
                          ĐÃ ĐẶT
                        </Tag>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      {isPlaying || isPaused ? (
                        <>
                          <UserOutlined className="text-slate-400 text-xs" />
                          <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                            {table.currentSession?.customerName || "Khách lẻ"}
                          </span>
                          {table.currentSession?.isMember && (
                            <Tag
                              color="gold"
                              className="!text-[9px] !px-1 !py-0 !border-0 !m-0 !font-bold whitespace-nowrap"
                            >
                              VIP
                            </Tag>
                          )}
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-slate-600 whitespace-nowrap">
                            Từ {table.currentSession?.sessionStart || "--:--"}
                          </span>
                        </>
                      ) : (
                        <span className="whitespace-nowrap">
                          Hẹn khách: <strong>{table.bookedInfo?.customerName || "Khách đặt trước"}</strong>{" "}
                          {table.bookedInfo?.time
                            ? `• Lúc ${table.bookedInfo.time.replace(/\s*\(([^)]+)\)/, " • $1")}`
                            : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  {isPlaying || isPaused ? (
                    <div>
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <ClockCircleOutlined
                          className={isPaused ? "text-amber-500" : "text-emerald-600"}
                        />
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {formattedTime}
                        </span>
                      </div>
                      <span className="text-xs font-black text-emerald-700 font-mono block whitespace-nowrap">
                        {totalBill.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-blue-700 font-medium whitespace-nowrap">
                      {table.bookedInfo?.deposit
                        ? `Đã cọc ${table.bookedInfo.deposit.toLocaleString("vi-VN")}đ`
                        : "Giữ chỗ đặt trước"}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="!h-8 !px-2.5 !rounded-lg !text-xs !border-slate-300 hover:!border-emerald-600 hidden sm:inline-flex whitespace-nowrap"
                  >
                    Vào Bàn
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="whitespace-nowrap">
          Còn <strong>{floorStats.available} bàn trống</strong> sẵn sàng phục vụ khách
        </span>
        <Button
          variant="link"
          size="sm"
          onClick={onNavigatePos}
          className="!text-xs !font-bold !text-emerald-700 hover:!text-emerald-800 !p-0 whitespace-nowrap"
        >
          Mở Bàn Mới Ngay
        </Button>
      </div>
    </Card>
  );
};
