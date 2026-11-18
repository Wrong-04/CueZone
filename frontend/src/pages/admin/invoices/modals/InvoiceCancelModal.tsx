// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import { CloseCircleOutlined } from "@ant-design/icons";
import { Button, Input, Modal } from "../../../../shared/ui";
import type { ClubInvoice } from "../types/invoice.types";
import { CANCEL_REASONS_QUICK } from "../types/invoice.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface InvoiceCancelModalProps {
  open: boolean;
  invoice: ClubInvoice | null;
  cancelReason: string;
  restockInventory: boolean;
  cancelLoading: boolean;
  onClose: () => void;
  setCancelReason: (val: string) => void;
  setRestockInventory: (val: boolean) => void;
  onConfirmCancel: () => void;
}

// ============================================================================
// 3. MAIN COMPONENT: MODAL HỦY HÓA ĐƠN & HOÀN KHO F&B
// ============================================================================
export const InvoiceCancelModal: React.FC<InvoiceCancelModalProps> = ({
  open,
  invoice,
  cancelReason,
  restockInventory,
  cancelLoading,
  onClose,
  setCancelReason,
  setRestockInventory,
  onConfirmCancel,
}) => {
  if (!invoice) return null;

  return (
    <Modal
      open={open}
      onCancel={() => {
        if (!cancelLoading) onClose();
      }}
      footer={null}
      width={500}
      title={
        <div className="flex items-center gap-2 pb-2 border-b border-rose-100 text-rose-700 font-black text-base">
          <CloseCircleOutlined className="text-rose-600 text-lg" />
          <span>Xác Nhận Hủy Hóa Đơn</span>
        </div>
      }
    >
      <div className="py-3 space-y-4 text-xs font-sans">
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
          <div className="font-bold text-sm text-rose-900">
            Hóa đơn: {invoice.code} ({invoice.tableName})
          </div>
          <div className="flex justify-between text-xs text-rose-700">
            <span>
              Tổng tiền: <strong>{invoice.finalTotal.toLocaleString("vi-VN")}đ</strong>
            </span>
            <span>
              Khách: <strong>{invoice.customerName}</strong>
            </span>
          </div>
          <div className="text-[11px] text-rose-600 leading-relaxed pt-1 border-t border-rose-200/60">
            ⚠️ <strong>Lưu ý:</strong> Hóa đơn bị hủy sẽ không tính vào doanh thu ca hôm nay. Lượt dùng voucher và điểm tích lũy của khách (nếu có) sẽ được tự động hoàn lại.
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-bold text-slate-800 block">
            Chọn nhanh lý do hủy:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CANCEL_REASONS_QUICK.map((reasonItem) => (
              <button
                key={reasonItem}
                type="button"
                onClick={() => setCancelReason(reasonItem)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                  cancelReason === reasonItem
                    ? "bg-rose-100 text-rose-800 border-rose-300 font-bold"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {reasonItem}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-800 block">
            Lý do cụ thể <span className="text-rose-500">*</span>:
          </label>
          <Input.TextArea
            rows={2}
            placeholder="Ghi rõ lý do hủy hóa đơn này..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="!rounded-xl text-xs !border-slate-300 focus:!border-rose-500"
          />
        </div>

        {/* Tùy chọn hoàn kho mặt hàng F&B */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={restockInventory}
              onChange={(e) => setRestockInventory(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="font-bold text-slate-800 text-xs block">
                Cộng hoàn đồ ăn / nước uống lại vào kho
              </span>
              <span className="text-[11px] text-slate-500 block leading-relaxed mt-0.5">
                Chỉ tích chọn nếu khách <strong>chưa dùng đồ</strong> (do thu ngân tính nhầm bill). Nếu khách <strong>đã dùng đồ rồi</strong> thì không tích chọn để kho kiểm kê chính xác số lượng.
              </span>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={cancelLoading}
            className="!rounded-xl !text-xs whitespace-nowrap"
          >
            Đóng
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<CloseCircleOutlined />}
            onClick={onConfirmCancel}
            loading={cancelLoading}
            className="!bg-rose-600 hover:!bg-rose-700 !border-rose-600 !rounded-xl !font-bold text-xs px-5 whitespace-nowrap"
          >
            Xác Nhận Hủy Hóa Đơn
          </Button>
        </div>
      </div>
    </Modal>
  );
};
