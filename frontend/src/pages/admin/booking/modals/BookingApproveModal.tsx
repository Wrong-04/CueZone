// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import { CheckCircleOutlined, MessageOutlined } from "@ant-design/icons";
import { Button, Modal, Select, Space, Typography } from "../../../../shared/ui";
import type { BookingRequest, PosTable } from "../../../../types/pos";

const { Text } = Typography;

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface BookingApproveModalProps {
  open: boolean;
  booking: BookingRequest | null;
  tables: PosTable[];
  assignedTableId: string;
  saving: boolean;
  loading: boolean;
  loadError: string;
  onClose: () => void;
  setAssignedTableId: (val: string) => void;
  onConfirmApprove: () => void;
}

// ============================================================================
// 3. MAIN COMPONENT: MODAL PHÊ DUYỆT & GÁN BÀN ĐẶT TRƯỚC
// ============================================================================
export const BookingApproveModal: React.FC<BookingApproveModalProps> = ({
  open,
  booking,
  tables,
  assignedTableId,
  saving,
  loading,
  loadError,
  onClose,
  setAssignedTableId,
  onConfirmApprove,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <Space align="center" size={8}>
          <CheckCircleOutlined className="text-emerald-600 text-lg" />
          <span className="font-bold text-slate-900 text-base">
            Xác Nhận Giữ Bàn Cho Khách ({booking?.customerName})
          </span>
        </Space>
      }
    >
      <div className="py-2 space-y-4 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Khách hàng:</span>
            <strong className="text-slate-900">{booking?.customerName}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Số điện thoại:</span>
            <span className="font-mono font-bold text-slate-800">{booking?.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Giờ hẹn chơi:</span>
            <span className="font-mono font-bold text-emerald-800">
              {booking?.time} ({booking?.date}) · Chơi khoảng {booking?.duration} tiếng
            </span>
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1.5">
            Chọn bàn xếp cho khách:
          </label>
          <Select
            value={assignedTableId}
            onChange={(val) => setAssignedTableId(val)}
            className="!w-full !rounded-xl"
            options={tables
              .filter(
                (t) =>
                  t.status === "available" || t.bookedInfo?.bookingId === booking?.id,
              )
              .map((t) => ({
                value: t.id,
                label: `${t.name} (${t.typeName}) - ${t.pricePerHour.toLocaleString()}đ/h [${
                  t.status === "available"
                    ? "Đang trống"
                    : t.status === "booked"
                      ? "Đang có lịch hẹn"
                      : "Đang có khách chơi"
                }]`,
              }))}
          />
          <Text type="secondary" className="block mt-1">
            Bàn này sẽ được khóa giữ chỗ trên sơ đồ quán, khách khác không thể đặt trùng giờ.
          </Text>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
          <MessageOutlined className="text-emerald-600 text-base flex-shrink-0" />
          <span>Sau khi giữ bàn, thu ngân có thể bấm mở bàn chơi ngay khi khách tới quán.</span>
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
            variant="primary"
            size="sm"
            onClick={onConfirmApprove}
            loading={saving}
            disabled={loading || !!loadError}
            leftIcon={<CheckCircleOutlined />}
            className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4 whitespace-nowrap"
          >
            Đồng Ý Giữ Bàn
          </Button>
        </div>
      </div>
    </Modal>
  );
};
