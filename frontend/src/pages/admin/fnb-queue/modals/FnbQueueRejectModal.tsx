// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import { Modal, Input, Button } from "../../../../shared/ui";
import type { CustomerOrder } from "../../../../services/customer-order.service";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface FnbQueueRejectModalProps {
  open: boolean;
  targetOrder: CustomerOrder | null;
  selectedTemplate: string;
  customReason: string;
  templates: string[];
  onClose: () => void;
  onSelectTemplate: (template: string) => void;
  onChangeCustomReason: (reason: string) => void;
  onConfirmReject: () => void;
}

// ============================================================================
// 4. MAIN COMPONENT: MODAL TỪ CHỐI ĐƠN GỌI MÓN TẠI BÀN
// ============================================================================
export const FnbQueueRejectModal: React.FC<FnbQueueRejectModalProps> = ({
  open,
  targetOrder,
  selectedTemplate,
  customReason,
  templates,
  onClose,
  onSelectTemplate,
  onChangeCustomReason,
  onConfirmReject,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="font-bold text-slate-900 text-base whitespace-nowrap">
          Từ Chối Đơn Hàng #{targetOrder?.orderCode} ({targetOrder?.tableName})
        </div>
      }
    >
      <div className="space-y-4 py-2 text-xs">
        <div>
          <label className="block text-slate-700 font-semibold mb-1.5 whitespace-nowrap">
            Lý do mẫu nhanh:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectTemplate(tmpl)}
                className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-colors whitespace-nowrap ${
                  selectedTemplate === tmpl
                    ? "bg-rose-100 text-rose-800 border-rose-300 font-bold"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                {tmpl}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1.5 whitespace-nowrap">
            Lý do cụ thể khác:
          </label>
          <Input.TextArea
            rows={2}
            value={customReason}
            onChange={(e) => onChangeCustomReason(e.target.value)}
            placeholder="Nhập lý do gửi đến khách tại bàn..."
            className="!rounded-xl"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="!rounded-xl whitespace-nowrap"
          >
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirmReject}
            className="!rounded-xl font-bold whitespace-nowrap"
          >
            Xác Nhận Từ Chối
          </Button>
        </div>
      </div>
    </Modal>
  );
};
