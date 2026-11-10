import React from "react";
import {
  Card,
  Typography,
  Tag,
  Button,
  Tooltip,
  Select,
  SegmentedPillList,
  SearchFilterInput,
} from "../../../shared/ui";
import {
  SyncOutlined,
  CalendarOutlined,
  UsergroupAddOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";
import CustomerOrderDrawer from "../../../components/pos/CustomerOrderDrawer";
import CustomerPaymentRequests from "../../../components/pos/CustomerPaymentRequests";
import { BookingDispatchDrawer } from "../../../components/booking/BookingDispatchDrawer";
import type { PosTable, BookingRequest } from "../../../types/pos";
import type { CustomerOrder } from "../../../services/customer-order.service";

const { Title } = Typography;

export interface PosFloorStats {
  total: number;
  playing: number;
  paused: number;
  booked: number;
  available: number;
  occupancyRate: number;
  totalTempRevenue: number;
}

interface PosFloorHeaderProps {
  stats: PosFloorStats;
  tables: PosTable[];
  socketConnected: boolean;
  orderDrawerOpen: boolean;
  setOrderDrawerOpen: (open: boolean) => void;
  orderDrawerFilterTableId: string | null;
  setOrderDrawerFilterTableId: (id: string | null) => void;
  bookingDrawerOpen: boolean;
  setBookingDrawerOpen: (open: boolean) => void;
  todayBookingsCount: number;
  waitlistCount: number;
  onOpenWaitlist: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  loading: boolean;
  saving: boolean;
  onReload: () => Promise<void>;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  statusPillItems: Array<{
    key: string;
    label: string;
    badge?: number;
    dotClassName?: string;
  }>;
  filterArea: string;
  setFilterArea: (area: string) => void;
  areaOptions: Array<{ value: string; label: string }>;
  filterType: string;
  setFilterType: (type: string) => void;
  tableTypeOptions: Array<{ value: string; label: string }>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOrdersUpdated: (orders: CustomerOrder[]) => void;
  onCheckInFromBooking: (tableId: string, booking: BookingRequest) => void;
}

export const PosFloorHeader: React.FC<PosFloorHeaderProps> = ({
  stats,
  tables,
  socketConnected,
  orderDrawerOpen,
  setOrderDrawerOpen,
  orderDrawerFilterTableId,
  setOrderDrawerFilterTableId,
  bookingDrawerOpen,
  setBookingDrawerOpen,
  todayBookingsCount,
  waitlistCount,
  onOpenWaitlist,
  isFullscreen,
  toggleFullscreen,
  loading,
  saving,
  onReload,
  filterStatus,
  setFilterStatus,
  statusPillItems,
  filterArea,
  setFilterArea,
  areaOptions,
  filterType,
  setFilterType,
  tableTypeOptions,
  searchQuery,
  setSearchQuery,
  onOrdersUpdated,
  onCheckInFromBooking,
}) => {
  return (
    <Card
      styles={{ body: { padding: "12px 18px" } }}
      className="!rounded-2xl !border-slate-200 shadow-2xs bg-white"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip title={socketConnected ? "Đã kết nối Socket.io - Đồng bộ trực tiếp tức thì" : "Đang kết nối Socket.io..."}>
            <span
              className={`flex h-2.5 w-2.5 rounded-full cursor-pointer ${
                socketConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
            />
          </Tooltip>
          <Title level={4} className="!text-base sm:!text-lg !font-black !text-slate-900 !mb-0 tracking-tight whitespace-nowrap">
            Sơ Đồ Bàn Trực Tiếp
          </Title>
          <Tag
            color="green"
            className="!rounded-full !px-2 !py-0.5 !text-[10px] !font-bold !m-0 whitespace-nowrap"
          >
            TOÀN QUÁN • {stats.total} BÀN
          </Tag>
          <Tag
            color={stats.occupancyRate > 70 ? "volcano" : "blue"}
            className="!rounded-full !px-2 !py-0.5 !text-[10px] !font-bold !m-0 whitespace-nowrap hidden sm:inline-flex"
          >
            LẤP ĐẦY: {stats.occupancyRate}%
          </Tag>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end min-w-0">
          {/* Đơn gọi món trực tuyến */}
          <CustomerOrderDrawer
            onOrdersUpdated={onOrdersUpdated}
            externalOpen={orderDrawerOpen}
            onExternalOpenChange={(open) => {
              setOrderDrawerOpen(open);
              if (!open) setOrderDrawerFilterTableId(null);
            }}
            filterTableId={orderDrawerFilterTableId}
          />

          {/* Yêu cầu thanh toán tại bàn */}
          <CustomerPaymentRequests />

          {/* Lịch Đặt Bàn & Điều Phối */}
          <BookingDispatchDrawer
            open={bookingDrawerOpen}
            onClose={() => setBookingDrawerOpen(false)}
            tables={tables}
            onCheckInTable={onCheckInFromBooking}
            onTablesReload={onReload}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setBookingDrawerOpen(true)}
            leftIcon={<CalendarOutlined className="text-emerald-600 text-sm" />}
            className={`!rounded-xl !text-xs !h-8 !px-2.5 font-bold transition-all shadow-2xs ${
              todayBookingsCount > 0
                ? "!border-emerald-500 !bg-emerald-50/90 !text-emerald-800 hover:!bg-emerald-100"
                : "!border-slate-200 !text-slate-700 hover:!border-slate-300"
            }`}
          >
            Lịch Hẹn {todayBookingsCount > 0 ? `(${todayBookingsCount})` : ""}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenWaitlist}
            leftIcon={<UsergroupAddOutlined />}
            className={`!rounded-xl !text-xs !h-8 !px-2.5 font-semibold ${
              waitlistCount > 0
                ? "!border-amber-400 !text-amber-800 !bg-amber-50 hover:!bg-amber-100 font-bold"
                : "!border-slate-200 !text-slate-700 hover:!border-slate-300"
            }`}
          >
            DS Chờ {waitlistCount > 0 ? `(${waitlistCount})` : ""}
          </Button>

          {/* Doanh thu tạm tính */}
          <div className="px-2.5 py-1 rounded-xl bg-emerald-50/90 border border-emerald-200/90 flex items-center gap-1.5 shadow-2xs shrink-0">
            <span className="text-[11px] font-semibold text-emerald-800 whitespace-nowrap">
              Tạm tính:
            </span>
            <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono whitespace-nowrap">
              {stats.totalTempRevenue.toLocaleString("vi-VN")}đ
            </span>
          </div>

          {/* Nhóm nút tiện ích (Toàn màn hình & Tải lại) - luôn gắn kết cạnh nhau */}
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip title={isFullscreen ? "Thu nhỏ cửa sổ" : "Toàn màn hình (Kiosk POS)"}>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                className="!rounded-xl !h-8 !w-8 !p-0 !min-w-0 !border-slate-200 text-slate-600 hover:!border-emerald-600 hover:text-emerald-700"
                aria-label="Toàn màn hình"
              />
            </Tooltip>

            <Tooltip title="Tải lại dữ liệu">
              <Button
                variant="outline"
                size="sm"
                onClick={onReload}
                loading={loading}
                disabled={saving}
                icon={<SyncOutlined />}
                className="!rounded-xl !h-8 !w-8 !p-0 !min-w-0 !border-slate-200 text-slate-600 hover:!border-emerald-600 hover:text-emerald-700"
                aria-label="Tải lại"
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 min-w-0">
          <SegmentedPillList
            items={statusPillItems}
            activeKey={filterStatus}
            onSelect={(key) => setFilterStatus(key)}
            className="[&_button]:!px-2.5 [&_button]:!py-1 [&_button]:!text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Select
            value={filterArea}
            onChange={(val) => setFilterArea(val as string)}
            className="w-40 sm:w-44 !text-xs font-semibold"
            options={areaOptions}
          />

          <Select
            value={filterType}
            onChange={(val) => setFilterType(val as string)}
            className="w-40 sm:w-44 !text-xs font-semibold"
            options={tableTypeOptions}
          />

          <SearchFilterInput
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            placeholder="Tìm số bàn, khách... (Phím /)"
            width={175}
            className="pos-search-input [&_.ant-input-affix-wrapper]:!h-8 [&_.ant-input-affix-wrapper]:!py-0"
          />
        </div>
      </div>
    </Card>
  );
};

export default PosFloorHeader;
