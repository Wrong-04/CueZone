// ============================================================================
// 1. IMPORTS & ICONS
// ============================================================================
import React from "react";
import { Image, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import {
  CameraOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  EyeOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Button } from "../../../../shared/ui";
import type { FnbStockItem } from "../../../../types";
import { isItemMadeToOrder, isItemOutOfStock } from "../types/fnb.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface FnbTableViewProps {
  items: FnbStockItem[];
  loading: boolean;
  canManageInventory: boolean;
  onToggleZeroStock: (item: FnbStockItem) => void;
  onOpenEditModal: (item: FnbStockItem) => void;
  onNavigateToInventory: () => void;
}

// ============================================================================
// 4. MAIN COMPONENT: BẢNG DANH SÁCH MÓN ĂN & THỨC UỐNG F&B (TABLE VIEW)
// Hiển thị dạng bảng chi tiết gồm hình ảnh, tên món, danh mục, đơn giá, tồn kho và thao tác bật/tắt
// ============================================================================
export const FnbTableView: React.FC<FnbTableViewProps> = ({
  items,
  loading,
  canManageInventory,
  onToggleZeroStock,
  onOpenEditModal,
  onNavigateToInventory,
}) => {
  const tableColumns: TableColumnsType<FnbStockItem> = [
    {
      title: <span className="whitespace-nowrap font-bold">Hình Ảnh</span>,
      dataIndex: "image",
      key: "image",
      width: 90,
      render: (imgUrl: string, record: FnbStockItem) => (
        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shadow-2xs group shrink-0 bg-slate-50 flex items-center justify-center">
          {imgUrl ? (
            <Image
              src={imgUrl}
              alt={record.name}
              width={56}
              height={56}
              className="!w-14 !h-14 !object-cover rounded-xl transition-transform duration-300 group-hover:scale-110"
              preview={{
                cover: (
                  <div className="flex items-center justify-center text-[10px] text-white font-bold bg-black/50 whitespace-nowrap">
                    <EyeOutlined />
                  </div>
                ),
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300">
              <CameraOutlined className="text-base" />
              <span className="text-[9px] font-semibold text-slate-400 mt-0.5 whitespace-nowrap">
                Không ảnh
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: <span className="whitespace-nowrap font-bold">Mã & Tên Món</span>,
      dataIndex: "name",
      key: "name",
      render: (_: unknown, record: FnbStockItem) => (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-block px-2 py-0.5 rounded font-mono text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap shrink-0">
              {record.code}
            </span>
            <Tag color="cyan" className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-medium whitespace-nowrap">
              {record.categoryName}
            </Tag>
          </div>
          <span className="font-bold text-slate-900 text-sm block hover:text-emerald-700 transition-colors">
            {record.name}
          </span>
          <span className="text-[11px] text-slate-400 whitespace-nowrap">Đơn vị: {record.unit}</span>
        </div>
      ),
    },
    {
      title: <span className="whitespace-nowrap font-bold">Đơn Giá Bán</span>,
      dataIndex: "price",
      key: "price",
      width: 130,
      render: (price: number) => (
        <span className="font-extrabold text-emerald-700 text-sm whitespace-nowrap">
          {price.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: <span className="whitespace-nowrap font-bold">Tồn Kho & Phục Vụ</span>,
      dataIndex: "stockQuantity",
      key: "stockQuantity",
      width: 190,
      render: (qty: number, record: FnbStockItem) => {
        const isFresh = isItemMadeToOrder(record);
        const isOutOfStock = isItemOutOfStock(record);
        const isLowStock = !isFresh && !isOutOfStock && qty > 0 && qty <= record.minThreshold;
        const percent = Math.min(100, Math.round((qty / (record.minThreshold * 2.5 || 20)) * 100));

        if (isFresh) {
          return (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Tag color="cyan" className="!rounded-md !px-2 !py-0 !text-[10px] !font-bold whitespace-nowrap">
                  Pha chế tại chỗ
                </Tag>
              </div>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {isOutOfStock ? "Tạm ngưng phục vụ" : "Luôn sẵn sàng phục vụ"}
              </span>
            </div>
          );
        }

        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-black text-sm whitespace-nowrap ${
                  isOutOfStock ? "text-rose-600" : isLowStock ? "text-amber-600" : "text-slate-800"
                }`}
              >
                {qty} {record.unit}
              </span>
              <span className="text-[10.5px] text-slate-400 whitespace-nowrap">
                Tủ bar • Min: {record.minThreshold}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOutOfStock ? "bg-rose-500 w-0" : isLowStock ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${isOutOfStock ? 0 : Math.max(8, percent)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: <span className="whitespace-nowrap font-bold">Trạng Thái Phục Vụ</span>,
      key: "status",
      width: 140,
      align: "center",
      render: (_: unknown, record: FnbStockItem) => {
        const isFresh = isItemMadeToOrder(record);
        const outOfStock = isItemOutOfStock(record);
        if (outOfStock) {
          return (
            <Tag
              color="error"
              className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1 whitespace-nowrap"
            >
              <CloseCircleOutlined /> TẠM NGƯNG
            </Tag>
          );
        }
        if (!isFresh && record.stockQuantity <= record.minThreshold) {
          return (
            <Tag
              color="warning"
              className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1 whitespace-nowrap"
            >
              <WarningOutlined /> SẮP HẾT
            </Tag>
          );
        }
        return (
          <Tag
            color="green"
            className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1 whitespace-nowrap"
          >
            <CheckCircleOutlined /> ĐANG BÁN
          </Tag>
        );
      },
    },
    {
      title: <span className="whitespace-nowrap font-bold">Thao Tác</span>,
      key: "actions",
      width: 220,
      align: "right",
      render: (_: unknown, record: FnbStockItem) => {
        const isFresh = isItemMadeToOrder(record);
        const isOutOfStock = isItemOutOfStock(record);
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleZeroStock(record)}
              className={`!text-[11px] !h-8 !px-2.5 !rounded-xl font-bold whitespace-nowrap ${
                isOutOfStock
                  ? "!border-emerald-300 !text-emerald-700 hover:!bg-emerald-50"
                  : "!border-rose-200 !text-rose-600 hover:!bg-rose-50"
              }`}
            >
              {isOutOfStock ? "Mở bán lại" : "Báo hết"}
            </Button>
            {!isFresh && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onNavigateToInventory}
                className="!text-[11px] !h-8 !px-2.5 !rounded-xl !bg-slate-100 hover:!bg-slate-200 !text-slate-700 font-semibold whitespace-nowrap"
              >
                Xem sổ kho
              </Button>
            )}
            {canManageInventory && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenEditModal(record)}
                leftIcon={<EditOutlined />}
                className="!text-[11px] !h-8 !px-2.5 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold whitespace-nowrap"
              >
                Sửa
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
      <Table
        columns={tableColumns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          showTotal: (total, range) => (
            <span className="text-xs text-slate-500 whitespace-nowrap">
              Hiển thị {range[0]}-{range[1]} / {total} món
            </span>
          ),
          className: "!px-6 !py-4 !mb-0",
        }}
        scroll={{ x: 800 }}
      />
    </div>
  );
};
