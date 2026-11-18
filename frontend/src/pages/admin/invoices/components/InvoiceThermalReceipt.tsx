// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import type { ClubInvoice, ClubReceiptSettings } from "../types/invoice.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface InvoiceThermalReceiptProps {
  invoice: ClubInvoice | null;
  settings: ClubReceiptSettings;
}

// ============================================================================
// 3. MAIN COMPONENT: MẪU IN PHIẾU THANH TOÁN NHIỆT 80MM (THERMAL RECEIPT)
// ============================================================================
export const InvoiceThermalReceipt: React.FC<InvoiceThermalReceiptProps> = ({
  invoice,
  settings,
}) => {
  if (!invoice) return null;

  return (
    <div
      id="thermal-receipt-print-area"
      className="hidden print:block font-mono text-black text-[12px] leading-tight p-4 max-w-[80mm] mx-auto bg-white"
    >
      <div className="text-center pb-2 border-b border-black">
        <div className="font-bold text-sm tracking-wider">{settings.clubName.toUpperCase()}</div>
        <div className="text-[10px] mt-0.5">{settings.address}</div>
        <div className="text-[10px]">Hotline: {settings.hotline}</div>
        <div className="text-xs font-bold mt-2 uppercase">PHIẾU THANH TOÁN</div>
        <div className="text-[11px] font-mono">Mã HĐ: {invoice.code}</div>
      </div>

      <div className="py-2 text-[11px] space-y-0.5 border-b border-black border-dashed">
        <div className="flex justify-between">
          <span>Ngày:</span> <span>{invoice.date}</span>
        </div>
        <div className="flex justify-between">
          <span>Bàn:</span> <span className="font-bold">{invoice.tableName}</span>
        </div>
        <div className="flex justify-between">
          <span>Khách hàng:</span> <span>{invoice.customerName}</span>
        </div>
        <div className="flex justify-between">
          <span>Giờ vào - ra:</span>
          <span>
            {invoice.timeIn} - {invoice.timeOut} ({invoice.durationText})
          </span>
        </div>
        <div className="flex justify-between">
          <span>Thu ngân:</span> <span>{invoice.cashierName}</span>
        </div>
      </div>

      <div className="py-2 border-b border-black border-dashed">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1">Dịch vụ</th>
              <th className="py-1 text-center">SL</th>
              <th className="py-1 text-right">Đ.Giá</th>
              <th className="py-1 text-right">T.Tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1 font-bold">Tiền giờ bàn</td>
              <td className="py-1 text-center">1</td>
              <td className="py-1 text-right">{invoice.tableFee.toLocaleString("vi-VN")}đ</td>
              <td className="py-1 text-right font-bold">{invoice.tableFee.toLocaleString("vi-VN")}đ</td>
            </tr>
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="py-0.5">{item.name}</td>
                <td className="py-0.5 text-center">{item.quantity}</td>
                <td className="py-0.5 text-right">{item.price.toLocaleString("vi-VN")}đ</td>
                <td className="py-0.5 text-right font-bold">{item.subtotal.toLocaleString("vi-VN")}đ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="py-2 text-[11px] space-y-1 border-b border-black">
        <div className="flex justify-between">
          <span>Tiền giờ:</span>
          <span>{invoice.tableFee.toLocaleString("vi-VN")}đ</span>
        </div>
        <div className="flex justify-between">
          <span>Tiền F&B:</span>
          <span>{invoice.fnbFee.toLocaleString("vi-VN")}đ</span>
        </div>
        <div className="flex justify-between">
          <span>Tạm tính:</span>
          <span>{invoice.subtotal.toLocaleString("vi-VN")}đ</span>
        </div>
        {invoice.voucherDiscountAmount ? (
          <div className="flex justify-between font-bold">
            <span>Giảm Voucher:</span>
            <span>-{invoice.voucherDiscountAmount.toLocaleString("vi-VN")}đ</span>
          </div>
        ) : null}
        {invoice.membershipDiscountAmount ? (
          <div className="flex justify-between font-bold">
            <span>Ưu đãi hội viên:</span>
            <span>-{invoice.membershipDiscountAmount.toLocaleString("vi-VN")}đ</span>
          </div>
        ) : null}
        <div className="flex justify-between text-sm font-bold pt-1 border-t border-black">
          <span>TỔNG CỘNG:</span>
          <span>{invoice.finalTotal.toLocaleString("vi-VN")}đ</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-700">
          <span>Hình thức TT:</span>
          <span>{invoice.paymentMethodText}</span>
        </div>
      </div>

      <div className="text-center pt-3 text-[10px] space-y-1">
        <div>Wifi: {settings.wifiSSID} - Pass: {settings.wifiPassword}</div>
        <div className="italic">Cảm ơn Quý khách & Hẹn gặp lại!</div>
      </div>
    </div>
  );
};
