// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import { type Dayjs } from "dayjs";
import { DatePicker, Select, SearchFilterInput } from "../../../../shared/ui";
import { type DatePresetKey, type SortByOption } from "../types/invoice.types";

const { RangePicker } = DatePicker;

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface InvoiceFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  datePreset: DatePresetKey;
  onDatePresetChange: (val: DatePresetKey) => void;
  customDayjsRange: [Dayjs, Dayjs] | null;
  onCustomRangeChange: (dates: [Dayjs, Dayjs] | null, dateStrings: [string, string] | null) => void;
  tableTypeFilter: string;
  onTableTypeChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  paymentMethodFilter: string;
  onPaymentMethodChange: (val: string) => void;
  sortBy: SortByOption;
  onSortByChange: (val: SortByOption) => void;
}

// ============================================================================
// 4. MAIN COMPONENT: THANH CÔNG CỤ BỘ LỌC TÌM KIẾM HÓA ĐƠN
// ============================================================================
export const InvoiceFilterToolbar: React.FC<InvoiceFilterToolbarProps> = ({
  searchQuery,
  onSearchChange,
  datePreset,
  onDatePresetChange,
  customDayjsRange,
  onCustomRangeChange,
  tableTypeFilter,
  onTableTypeChange,
  statusFilter,
  onStatusChange,
  paymentMethodFilter,
  onPaymentMethodChange,
  sortBy,
  onSortByChange,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
      {/* Ô tìm kiếm thông tin hóa đơn */}
      <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
        <SearchFilterInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Tìm theo mã HĐ, tên khách, SĐT hoặc bàn..."
          width={340}
        />
      </div>

      {/* Cụm bộ lọc: Thời gian, loại bàn, trạng thái, thanh toán, sắp xếp */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Lọc khoảng thời gian */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
          <span>Thời gian:</span>
          <Select
            value={datePreset}
            onChange={(val) => onDatePresetChange(val as DatePresetKey)}
            className="!w-32 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả ngày" },
              { value: "today", label: "Hôm nay" },
              { value: "yesterday", label: "Hôm qua" },
              { value: "this_week", label: "Tuần này" },
              { value: "this_month", label: "Tháng này" },
              { value: "custom", label: "Tùy chọn..." },
            ]}
          />
        </div>

        {datePreset === "custom" && (
          <RangePicker
            value={customDayjsRange}
            onChange={(dates, dateStrings) => {
              onCustomRangeChange(
                dates as [Dayjs, Dayjs] | null,
                dates ? [dateStrings[0], dateStrings[1]] : null,
              );
            }}
            format="DD/MM/YYYY"
            className="!rounded-xl !text-xs !w-56"
          />
        )}

        {/* Lọc loại bàn */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
          <span>Loại bàn:</span>
          <Select
            value={tableTypeFilter}
            onChange={onTableTypeChange}
            className="!w-28 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả bàn" },
              { value: "pool", label: "Pool" },
              { value: "carom", label: "Carom" },
              { value: "snooker", label: "Snooker" },
              { value: "vip", label: "Phòng VIP" },
            ]}
          />
        </div>

        {/* Lọc trạng thái thanh toán */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
          <span>Trạng thái:</span>
          <Select
            value={statusFilter}
            onChange={onStatusChange}
            className="!w-32 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả" },
              { value: "paid", label: "Đã thanh toán" },
              { value: "cancelled", label: "Đã hủy" },
            ]}
          />
        </div>

        {/* Lọc phương thức thanh toán */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
          <span>Thanh toán:</span>
          <Select
            value={paymentMethodFilter}
            onChange={onPaymentMethodChange}
            className="!w-36 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả hình thức" },
              { value: "cash", label: "Tiền mặt" },
              { value: "vietqr", label: "Chuyển khoản (VietQR)" },
            ]}
          />
        </div>

        {/* Tiêu chí sắp xếp */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
          <span>Sắp xếp:</span>
          <Select
            value={sortBy}
            onChange={(val) => onSortByChange(val as SortByOption)}
            className="!w-36 !rounded-xl !text-xs"
            options={[
              { value: "newest", label: "Mới nhất trước" },
              { value: "oldest", label: "Cũ nhất trước" },
              { value: "amount_desc", label: "Tiền cao nhất" },
              { value: "amount_asc", label: "Tiền thấp nhất" },
              { value: "duration_desc", label: "Chơi lâu nhất" },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
