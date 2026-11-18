import React from "react";
import {
  AppstoreOutlined,
  EditOutlined,
  ToolOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { Button, Pagination, Tag, Tooltip } from "../../../../shared/ui";
import type { BilliardTable } from "../../../../types";
import { getTableTypeLabel } from "../types/tables.types";

/**
 * Component: TableFloorGridView
 * Chức năng: Hiển thị sơ đồ sàn bàn bida dưới dạng thẻ lưới trực quan (Card Grid).
 * - Hiển thị trạng thái hoạt động: Đang chơi (Đỏ), Đặt trước (Xanh lam), Bảo trì (Xám), Trống (Xanh lá).
 * - Hiển thị loại bàn (Pool/Carom/Snooker), khu vực tầng và đơn giá giờ chơi.
 * - Các nút thao tác nhanh: Sửa bàn, Chuyển bảo trì, Xóa bàn (tự động khóa khi bàn đang có khách).
 */
interface TableFloorGridViewProps {
  filteredTables: BilliardTable[];
  paginatedTables: BilliardTable[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  onResetFilters: () => void;
  onOpenEditTable: (table: BilliardTable) => void;
  onToggleMaintenance: (table: BilliardTable) => void;
  onOpenDeleteConfirm: (table: BilliardTable) => void;
}

export const TableFloorGridView: React.FC<TableFloorGridViewProps> = ({
  filteredTables,
  paginatedTables,
  currentPage,
  setCurrentPage,
  pageSize,
  onResetFilters,
  onOpenEditTable,
  onToggleMaintenance,
  onOpenDeleteConfirm,
}) => {
  if (filteredTables.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400">
        <AppstoreOutlined className="text-4xl mb-2 text-slate-300" />
        <p className="text-sm font-medium">Không tìm thấy bàn nào phù hợp với bộ lọc</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="mt-2 whitespace-nowrap"
        >
          Xóa bộ lọc
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedTables.map((table) => {
          const isMaintenance = table.status === "maintenance";
          const isPlaying = table.status === "playing";
          const isBooked = table.status === "booked";
          const isLocked =
            table.status === "playing" ||
            table.status === "paused" ||
            table.status === "booked";

          return (
            <div
              key={table._id}
              className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md ${
                isPlaying
                  ? "bg-rose-50/20 border-rose-200"
                  : isBooked
                    ? "bg-blue-50/20 border-blue-200"
                    : isMaintenance
                      ? "bg-slate-50 border-slate-300"
                      : "bg-white border-slate-200"
              }`}
            >
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                  {table.code}
                </span>
                {isMaintenance ? (
                  <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !font-bold whitespace-nowrap">
                    Bảo trì
                  </Tag>
                ) : isPlaying ? (
                  <Tag
                    color="error"
                    className="!rounded-full !px-2.5 !py-0.5 !font-bold !bg-rose-50 !text-rose-700 !border-rose-200 whitespace-nowrap"
                  >
                    Đang chơi
                  </Tag>
                ) : isBooked ? (
                  <Tag
                    color="blue"
                    className="!rounded-full !px-2.5 !py-0.5 !font-bold !bg-blue-50 !text-blue-700 !border-blue-200 whitespace-nowrap"
                  >
                    Đã đặt
                  </Tag>
                ) : (
                  <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !font-bold whitespace-nowrap">
                    Trống
                  </Tag>
                )}
              </div>

              <div className="p-3.5 space-y-2.5 flex-1">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h4 className="text-base font-bold text-slate-900 mb-0 whitespace-nowrap">
                      {table.name}
                    </h4>
                    <Tag
                      color={
                        table.type === "snooker"
                          ? "purple"
                          : table.type === "carom"
                            ? "gold"
                            : "cyan"
                      }
                      className="!rounded-full !px-2 !py-0.5 !font-semibold !text-[11px] !m-0 whitespace-nowrap"
                    >
                      {getTableTypeLabel(table.type)}
                    </Tag>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-0 whitespace-nowrap">
                    <EnvironmentOutlined className="text-slate-400" />
                    <span>{table.area}</span>
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-baseline justify-between whitespace-nowrap">
                  <span className="text-xs text-slate-500 font-medium">Giá giờ:</span>
                  <span className="font-mono font-bold text-emerald-700 text-base">
                    {table.pricePerHour.toLocaleString("vi-VN")}đ
                    <span className="text-xs font-normal text-slate-400">/h</span>
                  </span>
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 whitespace-nowrap">
                <Tooltip
                  title={
                    isLocked
                      ? "Bàn đang có khách hoặc đã đặt, không thể sửa"
                      : "Sửa thông tin bàn"
                  }
                >
                  <span className={`flex-1 ${isLocked ? "inline-block cursor-not-allowed" : ""}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLocked}
                      onClick={() => onOpenEditTable(table)}
                      leftIcon={<EditOutlined />}
                      className={`!h-8 !w-full !rounded-xl !text-xs font-medium whitespace-nowrap ${
                        isLocked
                          ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                          : "!border-slate-300 hover:!border-emerald-600"
                      }`}
                    >
                      Sửa
                    </Button>
                  </span>
                </Tooltip>

                <Tooltip
                  title={
                    isMaintenance
                      ? "Mở lại bàn vào hoạt động"
                      : isLocked
                        ? "Bàn đang có khách hoặc đã đặt, không thể chuyển bảo trì"
                        : "Chuyển bàn sang bảo trì nỉ"
                  }
                >
                  <span className={isLocked ? "inline-block cursor-not-allowed" : ""}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLocked}
                      onClick={() => onToggleMaintenance(table)}
                      leftIcon={<ToolOutlined />}
                      className={`!h-8 !px-2.5 !rounded-xl !text-xs font-medium whitespace-nowrap ${
                        isMaintenance
                          ? "!bg-emerald-50 !border-emerald-300 !text-emerald-800"
                          : isLocked
                            ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                            : "!border-amber-300 !bg-amber-50/60 !text-amber-800 hover:!bg-amber-100"
                      }`}
                    >
                      {isMaintenance ? "Mở Lại" : "Bảo Trì"}
                    </Button>
                  </span>
                </Tooltip>

                <Tooltip
                  title={
                    isLocked
                      ? "Bàn đang có khách chơi hoặc đã đặt, không thể xóa"
                      : "Xóa bàn"
                  }
                >
                  <span className={isLocked ? "inline-block cursor-not-allowed" : ""}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLocked}
                      onClick={() => {
                        if (isLocked) return;
                        onOpenDeleteConfirm(table);
                      }}
                      leftIcon={
                        <DeleteOutlined
                          className={isLocked ? "!text-slate-400" : "text-rose-500"}
                        />
                      }
                      className={`!h-8 !px-2.5 !rounded-xl !text-xs font-medium whitespace-nowrap ${
                        isLocked
                          ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                          : "!border-slate-300 !text-rose-600 hover:!border-rose-300 hover:!bg-rose-50"
                      }`}
                    >
                      Xóa
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTables.length > pageSize && (
        <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredTables.length}
            onChange={(page) => setCurrentPage(page)}
            showTotal={(total, range) => (
              <span className="whitespace-nowrap">
                Hiển thị {range[0]}–{range[1]} / {total} bàn bida
              </span>
            )}
          />
        </div>
      )}
    </>
  );
};
