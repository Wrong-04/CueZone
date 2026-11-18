// ============================================================================
// 1. IMPORTS
// ============================================================================
// 1.1 Thư viện bên ngoài
import React from "react";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";

// 1.2 UI Components & Services nội bộ
import { Input, Modal, Space } from "../../../shared/ui";

// 1.4 Types
import type { CustomerOrder } from "../../../services/customer-order.service";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface CustomerOrderRejectModalProps {
  open: boolean;
  targetOrder: CustomerOrder | null;
  selectedTemplate: string;
  customReason: string;
  templates: string[];
  onClose: () => void;
  onSelectTemplate: (template: string) => void;
  onChangeCustomReason: (reason: string) => void;
  onConfirm: () => void;
}

// ============================================================================
// 4. MAIN COMPONENT: MODAL TỪ CHỐI ĐƠN GỌI MÓN KÈM LÝ DO NHANH
// ============================================================================
export const CustomerOrderRejectModal: React.FC<CustomerOrderRejectModalProps> = ({
  open,
  targetOrder,
  selectedTemplate,
  customReason,
  templates,
  onClose,
  onSelectTemplate,
  onChangeCustomReason,
  onConfirm,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={onConfirm}
      okText="Xác nhận từ chối"
      cancelText="Hủy bỏ"
      okButtonProps={{ danger: true }}
      title={
        <Space align="center" size={8}>
          <CloseOutlined className="text-rose-600" />
          <span className="font-bold text-slate-900 text-sm whitespace-nowrap">
            Từ chối đơn gọi món - {targetOrder?.tableName}
          </span>
        </Space>
      }
    >
      <div className="py-3 space-y-3.5 text-xs">
        <p className="text-slate-600">
          Khách sẽ nhận được thông báo về lý do từ chối đơn món này. Vui lòng chọn lý do nhanh:
        </p>

        {/* Danh sách lý do từ chối mẫu */}
        <div className="space-y-1.5">
          {templates.map((template) => (
            <div
              key={template}
              onClick={() => {
                onSelectTemplate(template);
                onChangeCustomReason("");
              }}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                selectedTemplate === template && !customReason
                  ? "bg-rose-50/70 border-rose-300 text-rose-950 font-bold"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>{template}</span>
              {selectedTemplate === template && !customReason && (
                <CheckOutlined className="text-rose-600 text-xs" />
              )}
            </div>
          ))}
        </div>

        {/* Nhập lý do khác */}
        <div>
          <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">
            Hoặc nhập lý do khác:
          </label>
          <Input.TextArea
            rows={2}
            placeholder="Nhập lý do cụ thể gửi tới khách..."
            value={customReason}
            onChange={(e) => onChangeCustomReason(e.target.value)}
            className="!rounded-xl text-xs"
          />
        </div>
      </div>
    </Modal>
  );
};
