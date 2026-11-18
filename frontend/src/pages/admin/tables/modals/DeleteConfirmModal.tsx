// ============================================================================
// 1. IMPORTS & ICONS
// ============================================================================
import React from "react";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Button, Modal, Space } from "../../../../shared/ui";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface DeleteConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  deleteTarget: { id: string; type: "table" | "pricing"; name: string } | null;
  saving: boolean;
  onConfirm: () => void;
}

// ============================================================================
// 4. MAIN COMPONENT: MODAL XÁC NHẬN XÓA BÀN HOẶC KHUNG GIÁ
// ============================================================================
export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  onCancel,
  deleteTarget,
  saving,
  onConfirm,
}) => {
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
      title={
        <Space align="center" size={8}>
          <ExclamationCircleOutlined className="text-rose-600 text-lg" />
          <span className="font-bold text-slate-900 text-base whitespace-nowrap">Xác Nhận Xóa</span>
        </Space>
      }
    >
      <div className="py-2 space-y-4 text-xs">
        <p className="text-slate-600 leading-relaxed mb-0 [text-wrap:balance]">
          Bạn có chắc chắn muốn xóa <strong>{deleteTarget?.name}</strong> khỏi danh mục? Thao tác
          này không thể hoàn tác.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="!rounded-xl whitespace-nowrap"
          >
            Hủy Bỏ
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={saving}
            onClick={onConfirm}
            className="!rounded-xl font-bold px-4 whitespace-nowrap"
          >
            Xác Nhận Xóa
          </Button>
        </div>
      </div>
    </Modal>
  );
};
