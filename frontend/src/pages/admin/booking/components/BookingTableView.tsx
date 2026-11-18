// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import { PlayCircleOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Space, Table, Tag } from "../../../../shared/ui";
import type { BookingRequest } from "../../../../types/pos";
import { BOOKING_STATUS_CONFIG, formatMoney } from "../types/booking.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface BookingTableViewProps {
  bookings: BookingRequest[];
  onOpenApprove: (b: BookingRequest) => void;
  onOpenReject: (b: BookingRequest) => void;
  onCheckInNow: (b: BookingRequest) => void;
  onReconsider: (b: BookingRequest) => void;
}

// ============================================================================
// 3. MAIN COMPONENT: GIAO DIỆN XEM DẠNG BẢNG (TABLE VIEW)
// ============================================================================
export const BookingTableView: React.FC<BookingTableViewProps> = ({
  bookings,
  onOpenApprove,
  onOpenReject,
  onCheckInNow,
  onReconsider,
}) => {
  const tableColumns = [
    {
      title: "Mã Đơn / Khách Hàng",
      key: "customer",
      className: "whitespace-nowrap",
      render: (_: any, record: BookingRequest) => (
        <div>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
            <UserOutlined className="text-emerald-600" />
            <span>{record.customerName}</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500 block">{record.phone}</span>
          <span className="font-mono text-[10px] text-slate-400 block mt-0.5">{record.id}</span>
        </div>
      ),
    },
    {
      title: "Bàn Yêu Cầu",
      key: "table",
      className: "whitespace-nowrap",
      render: (_: any, record: BookingRequest) => (
        <div>
          <strong className="text-slate-800 text-xs block">
            {record.tableName || record.tableId || "Chưa gán bàn"}
          </strong>
          {record.note && (
            <span className="text-[11px] text-slate-400 italic block truncate max-w-[160px]">
              &quot;{record.note}&quot;
            </span>
          )}
        </div>
      ),
    },
    {
      title: "Khung Giờ Hẹn",
      key: "schedule",
      className: "whitespace-nowrap",
      render: (_: any, record: BookingRequest) => (
        <div>
          <strong className="text-emerald-800 font-mono text-xs block">
            {record.time} ({record.duration}h)
          </strong>
          <span className="text-slate-500 text-[11px] font-mono block">{record.date}</span>
        </div>
      ),
    },
    {
      title: "Chi Phí Tạm Tính",
      key: "cost",
      className: "whitespace-nowrap",
      render: (_: any, record: BookingRequest) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          {formatMoney(record.estimatedCost)}
        </span>
      ),
    },
    {
      title: "Trạng Thái",
      key: "status",
      className: "whitespace-nowrap",
      render: (_: any, record: BookingRequest) => {
        const cfg = BOOKING_STATUS_CONFIG[record.status] || {
          label: record.status,
          color: "default",
        };
        return (
          <Tag color={cfg.color} className="!rounded-full !px-2.5 !py-0.5 !font-bold whitespace-nowrap">
            {cfg.label.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Thao Tác",
      key: "actions",
      className: "whitespace-nowrap",
      align: "right" as const,
      render: (_: any, record: BookingRequest) => (
        <Space size={4}>
          {record.status === "pending" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenReject(record)}
                className="!h-7 !px-2 !rounded-lg !text-xs !border-rose-300 !text-rose-700 hover:!bg-rose-50 whitespace-nowrap"
              >
                Từ Chối
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenApprove(record)}
                className="!h-7 !px-3 !rounded-lg !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold whitespace-nowrap"
              >
                Duyệt
              </Button>
            </>
          )}

          {record.status === "approved" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onCheckInNow(record)}
              leftIcon={<PlayCircleOutlined />}
              className="!h-7 !px-3 !rounded-lg !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold whitespace-nowrap"
            >
              Mở Bàn
            </Button>
          )}

          {record.status === "rejected" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReconsider(record)}
              className="!h-7 !px-2.5 !rounded-lg !text-xs !border-slate-300 whitespace-nowrap"
            >
              Mở Lại
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
    >
      <div className="overflow-x-auto">
        <Table
          dataSource={bookings.map((b) => ({ ...b, key: b.id }))}
          columns={tableColumns}
          pagination={{ pageSize: 8, showTotal: (total) => `Tổng cộng ${total} đơn đặt bàn` }}
          className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-tbody_td]:!py-3.5"
        />
      </div>
    </Card>
  );
};
