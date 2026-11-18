// ============================================================================
// 1. IMPORTS
// ============================================================================
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { Button, Tag } from "../../../../shared/ui";
import { type ClubInvoice, formatMoney } from "../types/invoice.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface InvoiceColumnsOptions {
  onViewDetail: (invoice: ClubInvoice) => void;
  onOpenCancel: (invoice: ClubInvoice) => void;
}

// ============================================================================
// 3. BUILDER: CẤU HÌNH CỘT BẢNG HÓA ĐƠN & DOANH THU
// Tách biệt toàn bộ logic render UI cột bảng để tinh gọn trang InvoicesManagementPage
// ============================================================================
export function buildInvoiceColumns({
  onViewDetail,
  onOpenCancel,
}: InvoiceColumnsOptions) {
  return [
    {
      title: "Mã HĐ / Ngày",
      key: "code",
      className: "whitespace-nowrap",
      render: (_: unknown, record: ClubInvoice) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap">
            {record.code}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1 font-mono whitespace-nowrap">
            {record.date}
          </span>
        </div>
      ),
    },
    {
      title: "Bàn & Khách Hàng",
      key: "table_customer",
      className: "whitespace-nowrap",
      render: (_: unknown, record: ClubInvoice) => (
        <div>
          <div className="flex items-center gap-1.5 mb-0.5 whitespace-nowrap">
            <span className="font-bold text-slate-900 text-sm">{record.tableName}</span>
            {record.memberRank && record.memberRank !== "Phổ thông" && (
              <Tag color="gold" className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold whitespace-nowrap">
                {record.memberRank}
              </Tag>
            )}
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {record.customerName} {record.customerPhone ? `• ${record.customerPhone}` : ""}
          </span>
        </div>
      ),
    },
    {
      title: "Thời Gian Chơi",
      key: "time",
      className: "whitespace-nowrap",
      render: (_: unknown, record: ClubInvoice) => (
        <div className="text-xs">
          <span className="font-bold text-slate-800 block whitespace-nowrap">{record.durationText}</span>
          <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
            {record.timeIn} - {record.timeOut}
          </span>
        </div>
      ),
    },
    {
      title: "Tiền Giờ / Dịch Vụ",
      key: "breakdown",
      className: "whitespace-nowrap",
      render: (_: unknown, record: ClubInvoice) => (
        <div className="text-xs font-mono">
          <div className="text-slate-600 whitespace-nowrap">
            Giờ: <strong>{formatMoney(record.tableFee)}</strong>
          </div>
          <div className="text-emerald-700 whitespace-nowrap">
            F&B: <strong>{formatMoney(record.fnbFee)}</strong>
          </div>
        </div>
      ),
    },
    {
      title: "Tổng Thanh Toán",
      key: "finalTotal",
      className: "whitespace-nowrap",
      render: (_: unknown, record: ClubInvoice) => (
        <div>
          <span className="font-black text-emerald-800 text-sm font-mono block whitespace-nowrap">
            {formatMoney(record.finalTotal)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
            {record.paymentMethodText}
          </span>
        </div>
      ),
    },
    {
      title: "Trạng Thái",
      dataIndex: "status",
      key: "status",
      className: "whitespace-nowrap",
      align: "center" as const,
      render: (status: string) => {
        if (status === "paid") {
          return (
            <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold whitespace-nowrap">
              <CheckCircleOutlined /> ĐÃ THANH TOÁN
            </Tag>
          );
        }
        return (
          <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold whitespace-nowrap">
            <CloseCircleOutlined /> ĐÃ HỦY
          </Tag>
        );
      },
    },
    {
      title: "Thao Tác",
      key: "actions",
      className: "whitespace-nowrap",
      align: "right" as const,
      render: (_: unknown, record: ClubInvoice) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            icon={<FileTextOutlined />}
            onClick={() => onViewDetail(record)}
            className="!h-7.5 !px-2.5 !rounded-lg !text-xs !border-slate-200 text-slate-700 hover:!border-emerald-600 whitespace-nowrap"
          >
            Chi tiết & In
          </Button>
          {record.status === "paid" && (
            <Button
              size="sm"
              variant="outline"
              icon={<CloseCircleOutlined />}
              onClick={() => onOpenCancel(record)}
              className="!h-7.5 !px-2 !rounded-lg !text-xs !border-rose-200 !text-rose-600 hover:!bg-rose-50 whitespace-nowrap"
              title="Hủy hóa đơn này"
            />
          )}
        </div>
      ),
    },
  ];
}
