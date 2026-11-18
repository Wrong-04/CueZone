// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Space } from "../../../../shared/ui";
import type { BookingRequest } from "../../../../types/pos";
import { REJECTION_QUICK_TEMPLATES } from "../types/booking.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface BookingRejectModalProps {
  open: boolean;
  booking: BookingRequest | null;
  rejectionReason: string;
  saving: boolean;
  loading: boolean;
  loadError: string;
  onClose: () => void;
  setRejectionReason: (val: string) => void;
  onConfirmReject: () => void;
}

// ============================================================================
// 3. MAIN COMPONENT: MODAL TỪ CHỐI ĐẶT BÀN
// ============================================================================
export const BookingRejectModal: React.FC<BookingRejectModalProps> = ({
  open,
  booking,
  rejectionReason,
  saving,
  loading,
  loadError,
  onClose,
  setRejectionReason,
  onConfirmReject,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <Space align="center" size={8}>
          <ExclamationCircleOutlined className="text-rose-600 text-lg" />
          <span className="font-bold text-slate-900 text-base">
            Từ Chối Đặt Bàn - {booking?.customerName}
          </span>
        </Space>
      }
    >
      <div className="py-2 space-y-4 text-xs">
        <p className="text-slate-600 leading-relaxed mb-0">
          Vui lòng chọn hoặc nhập lý do từ chối để thông báo lại cho
          khách <strong>{booking?.customerName}</strong> ({booking?.phone}):
        </p>

        <div>
          <label className="block text-slate-700 font-semibold mb-1.5">Lý do chọn nhanh:</label>
          <div className="flex flex-wrap gap-1.5">
            {REJECTION_QUICK_TEMPLATES.map((reason, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => setRejectionReason(reason)}
                className="!h-auto !py-1 !px-2.5 !text-[11px] !rounded-lg !border-slate-200 !bg-slate-50 hover:!bg-emerald-50 hover:!border-emerald-300 !text-slate-700 font-normal whitespace-nowrap"
              >
                {reason}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1.5">Nội dung gửi cho khách:</label>
          <Input.TextArea
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Nhập lý do gửi đến khách..."
            className="!rounded-xl"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="!rounded-xl whitespace-nowrap"
          >
            Đóng
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirmReject}
            loading={saving}
            disabled={loading || !!loadError}
            className="!rounded-xl font-bold px-4 whitespace-nowrap"
          >
            Xác Nhận Từ Chối
          </Button>
        </div>
      </div>
    </Modal>
  );
};
