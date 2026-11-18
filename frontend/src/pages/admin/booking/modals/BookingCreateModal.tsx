// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import { DollarOutlined, PhoneOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Select, Space } from "../../../../shared/ui";
import type { PosTable } from "../../../../types/pos";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface BookingCreateModalProps {
  open: boolean;
  tables: PosTable[];
  newName: string;
  setNewName: (val: string) => void;
  newPhone: string;
  setNewPhone: (val: string) => void;
  newTableId: string;
  setNewTableId: (val: string) => void;
  newDate: string;
  setNewDate: (val: string) => void;
  newTime: string;
  setNewTime: (val: string) => void;
  newDuration: number;
  setNewDuration: (val: number) => void;
  newDeposit: number;
  setNewDeposit: (val: number) => void;
  newNote: string;
  setNewNote: (val: string) => void;
  saving: boolean;
  loading: boolean;
  loadError: string;
  onClose: () => void;
  onCreateBooking: () => void;
}

// ============================================================================
// 3. MAIN COMPONENT: MODAL TẠO LỊCH ĐẶT BÀN NHANH (HOTLINE / KHÁCH QUEN)
// ============================================================================
export const BookingCreateModal: React.FC<BookingCreateModalProps> = ({
  open,
  tables,
  newName,
  setNewName,
  newPhone,
  setNewPhone,
  newTableId,
  setNewTableId,
  newDate,
  setNewDate,
  newTime,
  setNewTime,
  newDuration,
  setNewDuration,
  newDeposit,
  setNewDeposit,
  newNote,
  setNewNote,
  saving,
  loading,
  loadError,
  onClose,
  onCreateBooking,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <Space align="center" size={8}>
          <PhoneOutlined className="text-emerald-600 text-lg" />
          <span className="font-bold text-slate-900 text-base">
            Đặt Bàn Mới (Hotline / Khách Quen)
          </span>
        </Space>
      }
    >
      <div className="py-2 space-y-3.5 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Họ tên khách hàng:</label>
            <Input
              placeholder="Nguyễn Văn A..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              prefix={<UserOutlined className="text-slate-400" />}
              className="!h-9 !rounded-xl"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Số điện thoại:</label>
            <Input
              placeholder="0912 345 678..."
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              prefix={<PhoneOutlined className="text-slate-400" />}
              className="!h-9 !rounded-xl font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Chọn bàn bida:</label>
            <Select
              value={newTableId}
              onChange={(val) => setNewTableId(val)}
              className="!w-full !rounded-xl"
              options={tables
                .filter((t) => t.status === "available")
                .map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.typeName}) - ${t.pricePerHour.toLocaleString()}đ/h`,
                }))}
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Ngày hẹn:</label>
            <Input
              type="date"
              value={newDate}
              onChange={(event) => setNewDate(event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Giờ bắt đầu:</label>
            <Input
              placeholder="19:00"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="!h-9 !rounded-xl font-mono text-center"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Thời lượng (giờ):</label>
            <Select
              value={newDuration}
              onChange={(val) => setNewDuration(Number(val))}
              className="!w-full !rounded-xl"
              options={[
                { value: 1, label: "1 Giờ" },
                { value: 2, label: "2 Giờ" },
                { value: 3, label: "3 Giờ" },
                { value: 4, label: "4 Giờ" },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">
            Tiền cọc nhận trước (nếu có):
          </label>
          <Input
            type="number"
            value={newDeposit}
            onChange={(e) => setNewDeposit(Number(e.target.value))}
            prefix={<DollarOutlined className="text-emerald-600" />}
            placeholder="0"
            className="!h-9 !rounded-xl font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">
            Ghi chú của khách:
          </label>
          <Input.TextArea
            rows={2}
            placeholder="Khách yêu cầu cơ riêng, phòng lạnh, chuẩn bị nước trước..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
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
            variant="primary"
            size="sm"
            onClick={onCreateBooking}
            loading={saving}
            disabled={loading || !!loadError}
            className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4 whitespace-nowrap"
          >
            Lưu & Giữ Bàn
          </Button>
        </div>
      </div>
    </Modal>
  );
};
