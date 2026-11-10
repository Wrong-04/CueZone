import React from "react";
import { RollbackOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import clsx from "clsx";
import { Button, Input, Modal, Space, Tag } from "../../../shared/ui";
import { DEFAULT_CANCEL_REASONS } from "../constants/posConstants";
import type { PosOrderItem } from "../../../types/pos";

interface PosCancelItemModalProps {
  open: boolean;
  onClose: () => void;
  cancellingItem: PosOrderItem | null;
  cancelQty: number;
  setCancelQty: React.Dispatch<React.SetStateAction<number>>;
  cancelReason: string;
  onSelectCancelReason: (reason: string) => void;
  customCancelReason: string;
  setCustomCancelReason: (val: string) => void;
  restoreStock: boolean;
  setRestoreStock: React.Dispatch<React.SetStateAction<boolean>>;
  onConfirmCancelItem: () => void;
  saving: boolean;
  loading: boolean;
}

export const PosCancelItemModal: React.FC<PosCancelItemModalProps> = ({
  open,
  onClose,
  cancellingItem,
  cancelQty,
  setCancelQty,
  cancelReason,
  onSelectCancelReason,
  customCancelReason,
  setCustomCancelReason,
  restoreStock,
  setRestoreStock,
  onConfirmCancelItem,
  saving,
  loading,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={460}
      title={
        <Space align="center" size={8}>
          <RollbackOutlined className="text-rose-600 text-base" />
          <span className="font-bold text-slate-900 text-sm">
            Xác Nhận Trả / Hủy Món
          </span>
        </Space>
      }
    >
      {cancellingItem && (
        <div className="py-2 space-y-4">
          {/* Item Info Card */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-900 block">{cancellingItem.name}</span>
              <span className="text-[11px] text-slate-500 font-mono">
                Đang phục vụ: {cancellingItem.quantity} • Đơn giá: {cancellingItem.price.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <Tag color="default" className="!font-bold font-mono !text-xs !border-slate-300">
              {(cancellingItem.price * cancelQty).toLocaleString("vi-VN")}đ
            </Tag>
          </div>

          {/* Quantity Selector */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              Số lượng hủy / trả lại:
            </label>
            {cancellingItem.quantity > 1 ? (
              <div className="flex items-center gap-3">
                <Space size={6} align="center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancelQty <= 1}
                    onClick={() => setCancelQty((q) => Math.max(1, q - 1))}
                    className="!h-8 !w-8 !p-0 !rounded-lg"
                  >
                    <MinusOutlined className="text-xs" />
                  </Button>
                  <span className="font-bold text-sm w-8 text-center font-mono text-slate-900">
                    {cancelQty}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancelQty >= cancellingItem.quantity}
                    onClick={() => setCancelQty((q) => Math.min(cancellingItem.quantity, q + 1))}
                    className="!h-8 !w-8 !p-0 !rounded-lg"
                  >
                    <PlusOutlined className="text-xs" />
                  </Button>
                </Space>
                <span className="text-xs text-slate-500">
                  (Tối đa {cancellingItem.quantity} món)
                </span>
              </div>
            ) : (
              <Tag color="blue" className="!font-bold !text-xs !px-2.5 !py-0.5 !rounded-lg">
                1 món
              </Tag>
            )}
          </div>

          {/* Quick Reason selector: 6 balanced buttons (3 rows x 2 cols) */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              Lý do hủy món (Chọn nhanh):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_CANCEL_REASONS.map((reasonOption) => (
                <button
                  key={reasonOption}
                  type="button"
                  onClick={() => onSelectCancelReason(reasonOption)}
                  className={clsx(
                    "p-2 rounded-xl text-xs text-left border transition-all cursor-pointer",
                    cancelReason === reasonOption
                      ? "bg-rose-50 border-rose-400 text-rose-800 font-bold shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300",
                  )}
                >
                  {reasonOption}
                </button>
              ))}
            </div>

            {cancelReason === "Khác" && (
              <div className="mt-2">
                <Input
                  placeholder="Gõ lý do cụ thể..."
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  size="small"
                  className="!rounded-lg !text-xs"
                />
              </div>
            )}
          </div>

          {/* Consolidated Summary & Stock Restore Card */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="text-xs font-semibold text-slate-700">Khấu trừ tiền trên hóa đơn bàn:</span>
              <span className="text-sm font-black text-rose-600 font-mono">
                -{(cancellingItem.price * cancelQty).toLocaleString("vi-VN")}đ
              </span>
            </div>

            <div
              className="flex items-start justify-between gap-3 cursor-pointer select-none"
              onClick={() => setRestoreStock((s) => !s)}
            >
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {restoreStock ? "✓ Hoàn trả vào tồn kho hàng hóa" : "✕ Không nhập kho (Hủy hao hụt)"}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {restoreStock
                    ? `Cộng trả lại +${cancelQty} vào kho (Dành cho đồ đóng lon / nguyên gói chưa khui)`
                    : `Không cộng kho (Dành cho đồ pha chế / nấu chín đã làm hoặc món hỏng/đổ bỏ)`}
                </span>
              </div>
              <input
                type="checkbox"
                checked={restoreStock}
                onChange={(e) => setRestoreStock(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="!rounded-xl !text-xs"
            >
              Bỏ qua
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onConfirmCancelItem}
              loading={saving}
              disabled={loading}
              className="!rounded-xl font-bold !text-xs !px-4"
            >
              Xác Nhận Hủy Món
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PosCancelItemModal;
