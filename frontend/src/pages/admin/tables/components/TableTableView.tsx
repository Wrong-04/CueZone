// ============================================================================
// 1. IMPORTS & ICONS
// ============================================================================
import React, { useMemo } from "react";
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  SearchFilterInput,
  Select,
  Table,
  Tooltip,
} from "../../../../shared/ui";
import type { BilliardTable } from "../../../../types";
import { TableFloorGridView } from "./TableFloorGridView";
import { getTableColumns } from "../utils/table-columns";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface TableTableViewProps {
  tables: BilliardTable[];
  filteredTables: BilliardTable[];
  loading: boolean;
  viewMode: "table" | "grid";
  setViewMode: (mode: "table" | "grid") => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  filterType: string;
  setFilterType: (val: string) => void;
  filterFloor: string;
  setFilterFloor: (val: string) => void;
  filterArea: string;
  setFilterArea: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  distinctFloors: number[];
  distinctAreas: string[];
  isFiltering: boolean;
  onResetFilters: () => void;
  onOpenEditTable: (table: BilliardTable) => void;
  onToggleMaintenance: (table: BilliardTable) => void;
  onOpenDeleteConfirm: (table: BilliardTable) => void;
}

export const TableTableView: React.FC<TableTableViewProps> = ({
  filteredTables,
  loading,
  viewMode,
  setViewMode,
  currentPage,
  setCurrentPage,
  pageSize,
  filterType,
  setFilterType,
  filterFloor,
  setFilterFloor,
  filterArea,
  setFilterArea,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
  distinctFloors,
  distinctAreas,
  isFiltering,
  onResetFilters,
  onOpenEditTable,
  onToggleMaintenance,
  onOpenDeleteConfirm,
}) => {
  const paginatedTables = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTables.slice(startIndex, startIndex + pageSize);
  }, [filteredTables, currentPage, pageSize]);

  const tableColumns = useMemo(() => {
    return getTableColumns({
      onOpenEditTable,
      onToggleMaintenance,
      onOpenDeleteConfirm,
    });
  }, [onOpenEditTable, onToggleMaintenance, onOpenDeleteConfirm]);

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
    >
      {/* ── Toolbar: Filters & Search ── */}
      <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={filterType}
            onChange={(val) => {
              setFilterType(val);
              setCurrentPage(1);
            }}
            className="!w-36 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả loại bàn" },
              { value: "pool", label: "Bàn Lỗ (Pool)" },
              { value: "carom", label: "Bàn Carom" },
              { value: "snooker", label: "Bàn Snooker" },
            ]}
          />

          <Select
            value={filterFloor}
            onChange={(val) => {
              setFilterFloor(val);
              setCurrentPage(1);
            }}
            className="!w-28 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả tầng" },
              ...distinctFloors.map((f) => ({ value: String(f), label: `Tầng ${f}` })),
            ]}
          />

          <Select
            value={filterArea}
            onChange={(val) => {
              setFilterArea(val);
              setCurrentPage(1);
            }}
            className="!w-36 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả khu vực" },
              ...distinctAreas.map((a) => ({ value: a, label: a })),
            ]}
          />

          <Select
            value={filterStatus}
            onChange={(val) => {
              setFilterStatus(val);
              setCurrentPage(1);
            }}
            className="!w-36 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "available", label: "Bàn trống" },
              { value: "playing", label: "Đang chơi" },
              { value: "paused", label: "Tạm dừng" },
              { value: "booked", label: "Đã đặt trước" },
              { value: "maintenance", label: "Bảo trì" },
            ]}
          />

          {isFiltering && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              leftIcon={<ClearOutlined />}
              className="!h-8 !px-2.5 !rounded-lg !text-xs !border-slate-300 !text-slate-500 hover:!text-slate-800 whitespace-nowrap"
            >
              Đặt lại
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2.5 self-end lg:self-center">
          <SearchFilterInput
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            placeholder="Tìm mã bàn, tên bàn, khu vực..."
            width={260}
          />

          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <Tooltip title="Xem dạng bảng">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  viewMode === "table"
                    ? "bg-white text-emerald-700 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <UnorderedListOutlined className="text-xs" />
                <span>Dạng bảng</span>
              </button>
            </Tooltip>
            <Tooltip title="Xem dạng sơ đồ sàn">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  viewMode === "grid"
                    ? "bg-white text-emerald-700 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <AppstoreOutlined className="text-xs" />
                <span>Sơ đồ sàn</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
        {(() => {
          const totalCount = filteredTables.length;
          const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
          const endItem = Math.min(currentPage * pageSize, totalCount);
          return (
            <span className="whitespace-nowrap">
              Hiển thị{" "}
              <strong className="text-slate-900 font-mono">
                {startItem}–{endItem}
              </strong>{" "}
              / <strong className="text-slate-900 font-mono">{totalCount}</strong> bàn bida
            </span>
          );
        })()}
        {isFiltering && (
          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap">
            Đang lọc
          </span>
        )}
      </div>

      {viewMode === "table" ? (
        <div className="overflow-x-auto">
          <Table
            dataSource={filteredTables.map((t) => ({ ...t, key: t._id }))}
            columns={tableColumns}
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: filteredTables.length,
              onChange: (page) => setCurrentPage(page),
              showTotal: (total, range) => (
                <span className="whitespace-nowrap">
                  Hiển thị {range[0]}–{range[1]} / {total} bàn bida
                </span>
              ),
            }}
            className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-tbody_td]:!py-3"
          />
        </div>
      ) : (
        <div className="p-4">
          <TableFloorGridView
            filteredTables={filteredTables}
            paginatedTables={paginatedTables}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            onResetFilters={onResetFilters}
            onOpenEditTable={onOpenEditTable}
            onToggleMaintenance={onToggleMaintenance}
            onOpenDeleteConfirm={onOpenDeleteConfirm}
          />
        </div>
      )}
    </Card>
  );
};
