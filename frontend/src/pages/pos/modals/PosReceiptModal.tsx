import React from "react";
import { PrinterOutlined } from "@ant-design/icons";
import { Button, Modal, message } from "../../../shared/ui";
import { getClubPaymentSettings } from "../constants/posConstants";
import type { PosOrderItem } from "../../../types/pos";

export interface PaidSummary {
  invoiceCode: string;
  tableName: string;
  customerName: string;
  sessionStart: string;
  sessionEnd: string;
  durationFormatted: string;
  pricePerHour: number;
  playingCost: number;
  carriedCost: number;
  orders: PosOrderItem[];
  fnbTotal: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  voucherCode?: string;
  deposit: number;
  refundAmount: number;
  finalAmount: number;
  paymentMethod: string;
  pointsAwarded?: number;
  earnedPoints?: number;
  timeSlots?: Array<{
    tierName: string;
    startTime: string;
    endTime: string;
    minutes: number;
    pricePerHour: number;
    cost: number;
  }>;
}

interface PosReceiptModalProps {
  open: boolean;
  onClose: () => void;
  isPrePrintReceipt?: boolean;
  paidSummary: any;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({
  open,
  onClose,
  isPrePrintReceipt,
  paidSummary,
}) => {
  const isPrePrint = isPrePrintReceipt ?? (paidSummary?.invoiceCode?.startsWith("PRE-") ?? false);
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      title={
        <div className="flex items-center justify-between pr-4">
          <span className="font-bold text-slate-900 text-sm">
            {isPrePrint ? "Phiếu Tạm Tính (Kiểm Đồ)" : "Hóa Đơn Thanh Toán"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.print();
              message.success(
                isPrePrint
                  ? "Đang in phiếu tạm tính cho khách kiểm tra..."
                  : "Đang gửi lệnh in tới máy in nhiệt quầy thu ngân...",
              );
            }}
            leftIcon={<PrinterOutlined />}
            className="!text-xs !h-8 !rounded-xl"
          >
            {isPrePrint ? "In Phiếu Tạm Tính" : "In Hóa Đơn"}
          </Button>
        </div>
      }
    >
      {paidSummary && (() => {
        const clubSettings = getClubPaymentSettings();
        return (
          <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 font-mono text-xs space-y-3">
            <div className="text-center pb-2 border-b border-slate-200">
              <span className="text-sm font-black text-slate-900 block">
                {clubSettings.clubName}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {clubSettings.address}
              </span>
              <span className="text-[10px] text-slate-500 block">Hotline: {clubSettings.hotline}</span>
            <span className="text-[11px] font-bold text-slate-800 block mt-1">
              {isPrePrint
                ? `PHIẾU TẠM TÍNH (${paidSummary.invoiceCode})`
                : `HÓA ĐƠN THANH TOÁN (${paidSummary.invoiceCode})`}
            </span>
            {isPrePrint && (
              <span className="text-[9.5px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-1">
                ⚠ Phiếu kiểm tra dịch vụ - Chưa thanh toán
              </span>
            )}
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Bàn:</span>
              <strong>{paidSummary.tableName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Khách hàng:</span>
              <strong>{paidSummary.customerName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Thời gian chơi:</span>
              <strong>
                {paidSummary.sessionStart} - {paidSummary.sessionEnd} (
                {paidSummary.durationFormatted})
              </strong>
            </div>
            {paidSummary.timeSlots && paidSummary.timeSlots.length > 1 ? (
              <div className="py-1 my-1 border-y border-dashed border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Chi tiết tính tiền theo khung giờ:
                </span>
                {paidSummary.timeSlots.map((slot, idx) => (
                  <div key={idx} className="flex justify-between text-[10.5px]">
                    <span>
                      {slot.tierName} ({slot.startTime}–{slot.endTime}): {slot.minutes}p ×{" "}
                      {slot.pricePerHour.toLocaleString()}đ
                    </span>
                    <span className="font-bold">{slot.cost.toLocaleString()}đ</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-between">
                <span>Đơn giá giờ:</span>
                <span>{paidSummary.pricePerHour.toLocaleString("vi-VN")}đ/h</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1 border-t border-slate-100">
              <span>Tiền giờ chơi:</span>
              <span>{paidSummary.playingCost.toLocaleString("vi-VN")}đ</span>
            </div>
            {paidSummary.carriedCost > 0 && (
              <div className="flex justify-between font-bold pt-1 border-t border-slate-100 text-purple-700">
                <span>Tiền giờ chuyển / gộp bàn:</span>
                <span>+{paidSummary.carriedCost.toLocaleString("vi-VN")}đ</span>
              </div>
            )}
          </div>

          {paidSummary.orders && paidSummary.orders.length > 0 && (
            <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
              <span className="font-bold block mb-1">ĐỒ UỐNG & MÓN ĐÃ DÙNG:</span>
              {paidSummary.orders.map((item: PosOrderItem, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <span>{item.name || "Món F&B"} x{Number(item.quantity) || 1}</span>
                    {item.originTableName && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">
                        [{item.originTableName}]
                      </span>
                    )}
                  </span>
                  <span>{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString("vi-VN")}đ</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1 border-t border-slate-100">
                <span>Tổng đồ uống & món:</span>
                <span>{paidSummary.fnbTotal.toLocaleString("vi-VN")}đ</span>
              </div>
            </div>
          )}

          <div className="pt-2 border-t-2 border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Tổng tiền dịch vụ:</span>
              <span>{paidSummary.subtotal.toLocaleString("vi-VN")}đ</span>
            </div>
            {paidSummary.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>
                  Giảm giá{" "}
                  {paidSummary.voucherCode
                    ? `(${paidSummary.voucherCode})`
                    : `(${paidSummary.discountPercent}%)`}
                  :
                </span>
                <span>-{paidSummary.discountAmount.toLocaleString("vi-VN")}đ</span>
              </div>
            )}
            {paidSummary.deposit > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Tiền cọc đã trừ:</span>
                <span className="font-mono">-{paidSummary.deposit.toLocaleString("vi-VN")}đ</span>
              </div>
            )}
            {paidSummary.refundAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Cần hoàn lại khách:</span>
                <span className="font-mono">{paidSummary.refundAmount.toLocaleString("vi-VN")}đ</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200 text-slate-900">
              <span>TỔNG THANH TOÁN:</span>
              <span className="text-emerald-700">
                {paidSummary.finalAmount.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Hình thức thanh toán:</span>
              <span className="uppercase">{paidSummary.paymentMethod}</span>
            </div>
            {(paidSummary.pointsAwarded ?? paidSummary.earnedPoints ?? 0) > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Điểm tích lũy hội viên:</span>
                <span>+{(paidSummary.pointsAwarded ?? paidSummary.earnedPoints ?? 0)}</span>
              </div>
            )}
          </div>

          <div className="text-center pt-3 border-t border-slate-200 text-[10px] text-slate-400">
            Cảm ơn quý khách đã sử dụng dịch vụ tại CueZone!
            <br />
            Hẹn gặp lại quý khách!
          </div>
        </div>
      );
    })()}
    </Modal>
  );
};

export default PosReceiptModal;
