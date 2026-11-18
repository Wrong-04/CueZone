// ============================================================================
// 1. IMPORTS & ICONS
// ============================================================================
import React from "react";
import {
  AppstoreOutlined,
  BarsOutlined,
  FilterOutlined,
  CoffeeOutlined,
  PictureOutlined,
  SortAscendingOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, Input, Select, SegmentedPillList } from "../../../../shared/ui";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface FnbFilterToolbarProps {
  categoryPillItems: Array<{ key: string; label: string; count: number }>;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  stockStatusFilter: string;
  setStockStatusFilter: (val: string) => void;
  serviceTypeFilter: string;
  setServiceTypeFilter: (val: string) => void;
  photoStatusFilter: string;
  setPhotoStatusFilter: (val: string) => void;
  sortOption: string;
  setSortOption: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  viewMode: "grid" | "table";
  setViewMode: (mode: "grid" | "table") => void;
  isFilterActive: boolean;
  onResetFilters: () => void;
  totalFiltered: number;
  totalItems: number;
}

// ============================================================================
// 4. MAIN COMPONENT: THANH CÔNG CỤ BỘ LỌC THỰC ĐƠN & TỒN KHO F&B
// Hỗ trợ chọn danh mục dạng pills, lọc trạng thái kho, loại món, ảnh, sắp xếp và chuyển đổi lưới/bảng
// ============================================================================

export const FnbFilterToolbar: React.FC<FnbFilterToolbarProps> = ({
  categoryPillItems,
  selectedCategory,
  setSelectedCategory,
  stockStatusFilter,
  setStockStatusFilter,
  serviceTypeFilter,
  setServiceTypeFilter,
  photoStatusFilter,
  setPhotoStatusFilter,
  sortOption,
  setSortOption,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  isFilterActive,
  onResetFilters,
  totalFiltered,
  totalItems,
}) => {
  return (
    <div className="space-y-3.5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
      <div className="overflow-x-auto pb-1">
        <SegmentedPillList
          items={categoryPillItems}
          activeKey={selectedCategory}
          onSelect={(key) => setSelectedCategory(key)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2 xl:gap-2.5">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 whitespace-nowrap">
              <FilterOutlined /> Trạng thái:
            </span>
            <Select
              value={stockStatusFilter}
              onChange={(val) => setStockStatusFilter(val)}
              className="!w-32 !rounded-xl !text-xs"
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                { value: "in_stock", label: "Đang mở bán" },
                { value: "low_stock", label: "Cảnh báo sắp hết" },
                { value: "out_of_stock", label: "Tạm ngưng bán" },
              ]}
            />
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 whitespace-nowrap">
              <CoffeeOutlined /> Loại hình:
            </span>
            <Select
              value={serviceTypeFilter}
              onChange={(val) => setServiceTypeFilter(val)}
              className="!w-32 !rounded-xl !text-xs"
              options={[
                { value: "all", label: "Tất cả loại hình" },
                { value: "made_to_order", label: "☕ Pha chế / Bếp" },
                { value: "packaged", label: "📦 Đóng gói" },
              ]}
            />
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 whitespace-nowrap">
              <PictureOutlined /> Ảnh:
            </span>
            <Select
              value={photoStatusFilter}
              onChange={(val) => setPhotoStatusFilter(val)}
              className="!w-28 !rounded-xl !text-xs"
              options={[
                { value: "all", label: "Tất cả ảnh" },
                { value: "has_image", label: "📷 Có ảnh" },
                { value: "no_image", label: "⚠️ Chưa có ảnh" },
              ]}
            />
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 whitespace-nowrap">
              <SortAscendingOutlined /> Sắp xếp:
            </span>
            <Select
              value={sortOption}
              onChange={(val) => setSortOption(val)}
              className="!w-36 !rounded-xl !text-xs"
              options={[
                { value: "default", label: "Mặc định hệ thống" },
                { value: "stock_asc", label: "Tồn kho: Thấp → Cao" },
                { value: "stock_desc", label: "Tồn kho: Cao → Thấp" },
                { value: "price_asc", label: "Giá bán: Thấp → Cao" },
                { value: "price_desc", label: "Giá bán: Cao → Thấp" },
                { value: "name_asc", label: "Tên món: A → Z" },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-40 xl:w-44">
            <Input
              placeholder="Tìm món, mã món..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="!rounded-xl !h-9 text-xs"
            />
          </div>

          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <Button
              variant={viewMode === "grid" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              leftIcon={<AppstoreOutlined />}
              className={`!rounded-lg !text-xs !font-bold !h-7 !px-2.5 whitespace-nowrap ${
                viewMode === "grid"
                  ? "!bg-white !text-emerald-700 !shadow-2xs !border-transparent"
                  : "!text-slate-600 hover:!text-slate-900"
              }`}
            >
              Dạng lưới thẻ
            </Button>
            <Button
              variant={viewMode === "table" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              leftIcon={<BarsOutlined />}
              className={`!rounded-lg !text-xs !font-bold !h-7 !px-2.5 whitespace-nowrap ${
                viewMode === "table"
                  ? "!bg-white !text-emerald-700 !shadow-2xs !border-transparent"
                  : "!text-slate-600 hover:!text-slate-900"
              }`}
            >
              Dạng bảng
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs h-7">
        <div className="text-slate-500 font-medium whitespace-nowrap">
          Đang hiển thị{" "}
          <strong className="text-slate-800 font-bold">{totalFiltered}</strong> /{" "}
          <span className="text-slate-600">{totalItems}</span> món
          <span
            className={`text-emerald-600 ml-1.5 font-semibold transition-opacity whitespace-nowrap ${
              isFilterActive ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            (Đang áp dụng bộ lọc)
          </span>
        </div>

        <button
          type="button"
          onClick={onResetFilters}
          tabIndex={isFilterActive ? 0 : -1}
          className={`text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer transition-opacity whitespace-nowrap ${
            isFilterActive ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <ReloadOutlined className="text-[11px]" /> Đặt lại bộ lọc
        </button>
      </div>
    </div>
  );
};
