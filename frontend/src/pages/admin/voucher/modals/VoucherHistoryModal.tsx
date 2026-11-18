// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import { HistoryOutlined } from "@ant-design/icons";
import { Button, Modal } from "../../../../shared/ui";
import type { Voucher, VoucherUsage } from "../../../../services/voucher.service";
import { formatMoney, safeFormatDate } from "../types/voucher.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface VoucherHistoryModalProps {
  voucher: Voucher | null;
  history: VoucherUsage[];
  loading: boolean;
  onClose: () => void;
}

// ============================================================================
// 3. MAIN COMPONENT: MODAL LỊCH SỬ ÁP DỤNG VOUCHER
// ============================================================================
export const VoucherHistoryModal: React.FC<VoucherHistoryModalProps> = ({
  voucher,
  history,
  loading,
  onClose,
}) => {
  return (
    <Modal
      open={Boolean(voucher)}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      className="!w-full max-w-2xl"
      title={
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <HistoryOutlined className="text-sky-600" />
          Lịch sử sử dụng mã: <span className="text-emerald-700 font-mono">{voucher?.code}</span>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            Tổng số lượt đã dùng: <span className="font-bold text-slate-800">{voucher?.usageCount || 0}</span>
          </div>
          <div>
            Ưu đãi:{" "}
            <span className="font-semibold text-emerald-700">
              {voucher?.discountType === "percent"
                ? `Giảm ${voucher.discountValue}%`
                : `Giảm ${formatMoney(voucher?.discountValue)}`}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Đang tải lịch sử...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">Mã này chưa được áp dụng cho hóa đơn nào.</div>
        ) : (
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {history.map((usage) => (
              <div
                key={usage._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3.5 text-xs shadow-xs"
              >
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{usage.customerName || "Khách vãng lai"}</div>
                  <div className="text-slate-400 mt-0.5">
                    Hóa đơn: <span className="font-mono text-slate-600">{usage.invoiceCode}</span> ·{" "}
                    {safeFormatDate(usage.usedAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-600 font-bold text-sm">
                    -{formatMoney(usage.discountAmount)}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Tổng hóa đơn: {formatMoney(usage.subtotal)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button size="sm" variant="outline" onClick={onClose} className="!rounded-xl">
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};
