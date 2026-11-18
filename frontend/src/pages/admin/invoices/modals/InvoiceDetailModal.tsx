// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import {
  CloseCircleOutlined,
  FileTextOutlined,
  PrinterOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { Button, Modal } from "../../../../shared/ui";
import type { ClubInvoice, ClubReceiptSettings } from "../types/invoice.types";
import { isInvoiceCancellable } from "../types/invoice.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface InvoiceDetailModalProps {
  invoice: ClubInvoice | null;
  settings: ClubReceiptSettings;
  onClose: () => void;
  onPrint: () => void;
  onOpenCancel: (invoice: ClubInvoice) => void;
}

// ============================================================================
// 3. MAIN COMPONENT: MODAL CHI TIẾT HÓA ĐƠN & XEM TRƯỚC PHIẾU THANH TOÁN
// ============================================================================
export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  settings,
  onClose,
  onPrint,
  onOpenCancel,
}) => {
  if (!invoice) return null;

  return (
    <Modal
      open={Boolean(invoice)}
      onCancel={onClose}
      footer={null}
      width={540}
      title={
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <FileTextOutlined className="text-emerald-600 text-lg" />
          <span className="font-black text-slate-900 text-base">Phiếu Thanh Toán Bida</span>
        </div>
      }
    >
      <div className="py-4 space-y-4 text-xs font-sans">
        {/* Banner nếu hóa đơn đã bị hủy */}
        {invoice.status === "cancelled" && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-sm text-rose-700">
              <CloseCircleOutlined className="text-base" /> HÓA ĐƠN NÀY ĐÃ ĐƯỢC HỦY
            </div>
            <div className="text-xs">
              <strong>Lý do hủy:</strong> {invoice.cancelReason || "Không có lý do cụ thể"}
            </div>
            {invoice.cancelledAt && (
              <div className="text-[11px] text-rose-600">
                Thời gian hủy: {new Date(invoice.cancelledAt).toLocaleString("vi-VN")}
                {invoice.cancellerName ? ` • Người thực hiện: ${invoice.cancellerName}` : ""}
              </div>
            )}
          </div>
        )}

        {/* Bill Receipt Card */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 text-slate-800">
          {/* Receipt Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <span className="font-black text-base tracking-widest text-slate-900 block">
              {settings.clubName.toUpperCase()}
            </span>
            <span className="text-[11px] text-slate-500 block">{settings.address}</span>
          </div>

          {/* Meta information */}
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div>
              Mã HD: <strong className="font-mono">{invoice.code}</strong>
            </div>
            <div className="text-right">
              Ngày: <strong>{invoice.date}</strong>
            </div>
            <div>
              Bàn chơi: <strong className="text-emerald-800">{invoice.tableName}</strong>
            </div>
            <div className="text-right">
              Thu ngân: <strong>{invoice.cashierName}</strong>
            </div>
            <div>
              Khách hàng: <strong>{invoice.customerName}</strong>
            </div>
            <div className="text-right">
              Hạng thẻ:{" "}
              <strong className="text-purple-700">
                {invoice.memberRank === "Normal" || invoice.memberRank === "Standard"
                  ? "Phổ thông"
                  : invoice.memberRank}
              </strong>
            </div>
            <div>
              Giờ vào: <strong>{invoice.timeIn}</strong>
            </div>
            <div className="text-right">
              Giờ ra: <strong>{invoice.timeOut}</strong>
            </div>
          </div>

          {/* Table of items */}
          <div className="pt-2 border-t border-dashed border-slate-300">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-300 text-slate-500 font-bold text-[10px] uppercase">
                <tr>
                  <th className="py-1.5">Tên Dịch Vụ</th>
                  <th className="py-1.5 text-center">SL</th>
                  <th className="py-1.5 text-right">Đơn Giá</th>
                  <th className="py-1.5 text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 font-medium text-slate-900">{item.name}</td>
                    <td className="py-2 text-center">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {item.price.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="py-2 text-right font-mono font-bold">
                      {item.subtotal.toLocaleString("vi-VN")}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="pt-3 border-t border-slate-300 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span>Tiền giờ bàn:</span>
              <span className="font-mono">{invoice.tableFee.toLocaleString("vi-VN")}đ</span>
            </div>
            <div className="flex justify-between">
              <span>Đồ uống & Dịch vụ:</span>
              <span className="font-mono">{invoice.fnbFee.toLocaleString("vi-VN")}đ</span>
            </div>
            <div className="flex justify-between">
              <span>Tạm tính:</span>
              <span className="font-mono font-bold">{invoice.subtotal.toLocaleString("vi-VN")}đ</span>
            </div>

            {invoice.voucherDiscountAmount && invoice.voucherDiscountAmount > 0 ? (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Voucher {invoice.voucherCode ? `(${invoice.voucherCode})` : ""}:</span>
                <span className="font-mono">
                  -{invoice.voucherDiscountAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            ) : null}

            {invoice.membershipDiscountAmount && invoice.membershipDiscountAmount > 0 ? (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Ưu đãi hội viên{invoice.discountPercent ? ` (${invoice.discountPercent}%)` : ""}:</span>
                <span className="font-mono">
                  -{invoice.membershipDiscountAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            ) : invoice.discountAmount > 0 && !invoice.voucherDiscountAmount ? (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Giảm giá ({invoice.discountPercent > 0 ? `${invoice.discountPercent}%` : "Ưu đãi"}):</span>
                <span className="font-mono">
                  -{invoice.discountAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            ) : null}

            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-dashed border-slate-300">
              <span>TỔNG CỘNG:</span>
              <span className="font-mono text-emerald-700">
                {invoice.finalTotal.toLocaleString("vi-VN")}đ
              </span>
            </div>

            <div className="flex justify-between text-xs text-slate-500 pt-1">
              <span>Hình thức thanh toán:</span>
              <strong>{invoice.paymentMethodText}</strong>
            </div>
          </div>

          {/* VietQR Box preview */}
          <div className="pt-3 border-t border-dashed border-slate-300 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 text-[11px] font-bold text-slate-700">
              <QrcodeOutlined /> Quét mã VietQR chuyển khoản
            </div>
            <div className="text-[11px] text-slate-400 italic">
              Xin cảm ơn Quý khách & Hẹn gặp lại tại {settings.clubName}!
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div>
            {invoice.status === "paid" && (
              <Button
                variant="outline"
                size="md"
                disabled={!isInvoiceCancellable(invoice)}
                leftIcon={<CloseCircleOutlined />}
                onClick={() => onOpenCancel(invoice)}
                className={`!rounded-xl !font-bold text-xs ${
                  isInvoiceCancellable(invoice)
                    ? "!border-rose-300 !text-rose-600 hover:!bg-rose-50 hover:!border-rose-400"
                    : "!border-slate-200 !text-slate-400 opacity-60 cursor-not-allowed"
                }`}
                title={isInvoiceCancellable(invoice) ? "Hủy hóa đơn này" : "Không thể hủy"}
              >
                Hủy Hóa Đơn
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              className="!rounded-xl !text-xs"
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<PrinterOutlined />}
              onClick={onPrint}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold text-xs px-6"
            >
              In Hóa Đơn
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
