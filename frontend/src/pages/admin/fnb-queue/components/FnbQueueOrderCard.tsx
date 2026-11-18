// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import {
  CheckOutlined,
  CloseOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { Button, Card, Tag } from "../../../../shared/ui";
import type {
  CustomerOrder,
  CustomerOrderStatus,
} from "../../../../services/customer-order.service";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface FnbQueueOrderCardProps {
  order: CustomerOrder;
  isPending: boolean;
  statusLabel?: { text: string; color: string };
  nextStatus?: CustomerOrderStatus;
  busy: boolean;
  onOpenReject: (order: CustomerOrder) => void;
  onPrint: (order: CustomerOrder) => void;
  onUpdateStatus: (order: CustomerOrder, status: CustomerOrderStatus) => void;
}

// ============================================================================
// 3. HELPERS
// ============================================================================
function formatCurrency(value: number): string {
  return `${value.toLocaleString("vi-VN")}đ`;
}

// ============================================================================
// 4. MAIN COMPONENT: THẺ HIỂN THỊ ĐƠN GỌI MÓN F&B TẠI BÀN
// ============================================================================
export const FnbQueueOrderCard: React.FC<FnbQueueOrderCardProps> = ({
  order,
  isPending,
  statusLabel,
  nextStatus,
  busy,
  onOpenReject,
  onPrint,
  onUpdateStatus,
}) => {
  return (
    <Card
      key={order._id}
      className={`!rounded-2xl shadow-xs flex flex-col justify-between ${
        isPending
          ? "border-amber-200 bg-amber-50/20"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="space-y-3">
        {/* Hàng 1: Tên bàn & Mã số đơn */}
        <div className="flex items-center justify-between whitespace-nowrap">
          <span className="font-bold text-base text-slate-900">{order.tableName}</span>
          <Tag
            color={isPending ? "gold" : statusLabel?.color || "default"}
            className="!rounded-full !px-2.5 !py-0.5 !m-0 font-bold text-xs whitespace-nowrap"
          >
            {isPending ? `#${order.orderCode}` : statusLabel?.text || `#${order.orderCode}`}
          </Tag>
        </div>

        {/* Hàng 2: Thời gian khách gọi */}
        <div className="text-xs text-slate-500 whitespace-nowrap">
          {isPending ? "Gọi lúc: " : `Mã: #${order.orderCode} · `}
          {new Date(order.createdAt).toLocaleTimeString("vi-VN")}
        </div>

        {/* Hàng 3: Ghi chú nếu có */}
        {order.note && (
          <div className="p-2 bg-amber-100/60 rounded-xl text-xs text-amber-900 font-medium">
            Ghi chú: {order.note}
          </div>
        )}

        {/* Hàng 4: Danh sách các món gọi */}
        <div className="divide-y divide-slate-100 border-t border-b border-slate-100 py-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between py-1 text-xs">
              <span className="font-medium text-slate-800">
                {item.name} <strong className="text-emerald-700">x{item.quantity}</strong>
              </span>
              <span className="font-mono text-slate-600 whitespace-nowrap">
                {formatCurrency(item.unitPrice * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Hàng 5: Tổng tiền (đơn chờ duyệt) */}
        {isPending && (
          <div className="flex justify-between text-xs font-bold text-slate-800 pt-1">
            <span className="whitespace-nowrap">Tổng tiền:</span>
            <span className="font-mono text-emerald-700 text-sm whitespace-nowrap">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        )}
      </div>

      {/* Hàng thao tác dưới cùng */}
      <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-4">
        {isPending ? (
          <>
            <Button
              size="sm"
              variant="outline"
              icon={<CloseOutlined />}
              onClick={() => onOpenReject(order)}
              className="!rounded-xl text-xs !border-rose-200 text-rose-600 hover:!bg-rose-50 whitespace-nowrap"
            >
              Từ chối
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<PrinterOutlined />}
              onClick={() => onPrint(order)}
              className="!rounded-xl text-xs"
              title="In phiếu order bếp"
            />
            <Button
              size="sm"
              variant="primary"
              icon={<CheckOutlined />}
              loading={busy}
              onClick={() => onUpdateStatus(order, "preparing")}
              className="!rounded-xl text-xs flex-1 !bg-emerald-600 hover:!bg-emerald-700 font-bold whitespace-nowrap"
            >
              Nhận làm món
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              icon={<PrinterOutlined />}
              onClick={() => onPrint(order)}
              className="!rounded-xl text-xs"
              title="In lại phiếu"
            />
            {nextStatus && (
              <Button
                size="sm"
                variant="primary"
                loading={busy}
                onClick={() => onUpdateStatus(order, nextStatus)}
                className="!rounded-xl text-xs flex-1 !bg-emerald-600 hover:!bg-emerald-700 font-bold whitespace-nowrap"
              >
                {nextStatus === "ready" ? "Báo Sẵn Sàng" : "Hoàn Tất Phục Vụ"}
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
