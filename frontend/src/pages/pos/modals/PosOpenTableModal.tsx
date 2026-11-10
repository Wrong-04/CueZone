import React from "react";
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  BulbOutlined,
  PhoneOutlined,
  UserOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Button, Input, Modal, Space } from "../../../shared/ui";
import { RANK_DISCOUNT_PERCENT } from "../constants/posConstants";
import type { PosTable } from "../../../types/pos";

export interface MemberLookupInfo {
  name: string;
  phone: string;
  rank?: string;
}

interface PosOpenTableModalProps {
  open: boolean;
  onClose: () => void;
  selectedTable: PosTable | null;
  isCheckInMode: boolean;
  customerPhone: string;
  onPhoneChange: (val: string) => void | Promise<void>;
  customerName: string;
  setCustomerName: (val: string) => void;
  sessionNote: string;
  setSessionNote: (val: string) => void;
  openModalMemberInfo: MemberLookupInfo | null;
  isSearchingOpenMember: boolean;
  onConfirmOpen: () => void;
  saving?: boolean;
  loading?: boolean;
  loadError?: any;
  getBookingUpcomingMinutes: (timeStr?: string) => number;
}

export const PosOpenTableModal: React.FC<PosOpenTableModalProps> = ({
  open,
  onClose,
  selectedTable,
  isCheckInMode,
  customerPhone,
  onPhoneChange,
  customerName,
  setCustomerName,
  sessionNote,
  setSessionNote,
  openModalMemberInfo,
  isSearchingOpenMember,
  onConfirmOpen,
  saving = false,
  loading = false,
  loadError,
  getBookingUpcomingMinutes,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <Space align="center" size={8}>
          <PlayCircleOutlined className="text-emerald-600 text-lg" />
          <span className="font-bold text-slate-900 text-base">
            Mở Bàn Tính Giờ - {selectedTable?.name}
          </span>
        </Space>
      }
    >
      <div className="py-3 space-y-4">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
          <div className="flex justify-between">
            <span>Loại bàn:</span>
            <strong className="font-bold text-slate-900">{selectedTable?.typeName}</strong>
          </div>
          <div className="flex justify-between">
            <span>Đơn giá giờ:</span>
            <strong className="font-bold text-emerald-700 font-mono">
              {selectedTable?.pricePerHour.toLocaleString("vi-VN")}đ / giờ
            </strong>
          </div>
        </div>

        {/* Box xác nhận nhận bàn nếu khách hẹn đến */}
        {isCheckInMode && selectedTable?.bookedInfo && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-xs text-blue-900">
              <CheckCircleOutlined className="text-blue-600 text-sm shrink-0" />
              <span>XÁC NHẬN KHÁCH HẸN ĐẾN NHẬN BÀN</span>
            </div>
            <div className="text-xs text-blue-800 leading-relaxed">
              Khách đặt: <strong>{selectedTable.bookedInfo.customerName}</strong>
              {selectedTable.bookedInfo.phone ? ` (${selectedTable.bookedInfo.phone})` : ""} · Giờ hẹn:{" "}
              <strong>{selectedTable.bookedInfo.time.split(" ")[0]}</strong>.
            </div>
          </div>
        )}

        {/* Cảnh báo bàn có lịch đặt trước khi mở cho khách vãng lai */}
        {!isCheckInMode && selectedTable?.bookedInfo && (() => {
          const modalUpcomingMin = getBookingUpcomingMinutes(selectedTable.bookedInfo?.time);
          if (modalUpcomingMin > 0) {
            return (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <AlertOutlined className="text-amber-600 animate-bounce text-sm shrink-0" />
                  <span>CHÚ Ý: Bàn đã có khách hẹn đặt trước!</span>
                </div>
                <div className="text-xs text-amber-800 leading-relaxed">
                  Khách <strong>{selectedTable.bookedInfo.customerName}</strong>
                  {selectedTable.bookedInfo.phone ? ` (${selectedTable.bookedInfo.phone})` : ""} đã đặt bàn này lúc{" "}
                  <strong>{selectedTable.bookedInfo.time.split(" ")[0]}</strong> (còn khoảng{" "}
                  <strong>
                    {Math.floor(modalUpcomingMin / 60) > 0
                      ? `${Math.floor(modalUpcomingMin / 60)} giờ `
                      : ""}
                    {modalUpcomingMin % 60} phút
                  </strong>{" "}
                  nữa).
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-100/70 p-2 rounded-lg border border-amber-200/80">
                  <BulbOutlined className="text-amber-600 shrink-0 text-xs" />
                  <span><strong>Nhắc nhở thu ngân:</strong> Vui lòng trao đổi trước với khách vãng lai về thời gian có thể chơi để tránh trùng lịch đón khách đã đặt.</span>
                </div>
              </div>
            );
          }
          return (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-950 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-xs text-red-900">
                <AlertOutlined className="text-red-600 text-sm shrink-0" />
                <span>CẢNH BÁO: Đang trong khung giờ giữ bàn hẹn!</span>
              </div>
              <div className="text-xs text-red-800 leading-relaxed">
                Bàn này đang được giữ cho khách <strong>{selectedTable.bookedInfo.customerName}</strong> hẹn lúc{" "}
                <strong>{selectedTable.bookedInfo.time.split(" ")[0]}</strong>. Nếu mở cho khách vãng lai khác, vui lòng kiểm tra kỹ hoặc hủy lịch giữ bàn trước.
              </div>
            </div>
          );
        })()}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Số điện thoại khách (tùy chọn):
          </label>
          <Input
            placeholder="Nhập SĐT để tự động nhận diện hội viên..."
            value={customerPhone}
            onChange={(e) => void onPhoneChange(e.target.value)}
            prefix={<PhoneOutlined className="text-slate-400" />}
            className="!h-10 !rounded-xl font-mono text-xs"
          />
        </div>

        {openModalMemberInfo ? (
          <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between transition-all">
            <div className="flex items-center gap-2.5">
              <CheckCircleOutlined className="text-emerald-600 text-lg shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 flex-wrap">
                  <span className="whitespace-nowrap">Hội viên:</span>
                  <span className="truncate">{openModalMemberInfo.name}</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
                    Hạng {openModalMemberInfo.rank || "VIP"}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-700 font-medium whitespace-nowrap">
                  ⭐ Đã nhận diện! Tự động giảm {RANK_DISCOUNT_PERCENT[openModalMemberInfo.rank || "Standard"] || 10}% tiền giờ khi thanh toán
                </div>
              </div>
            </div>
          </div>
        ) : isSearchingOpenMember ? (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <SyncOutlined spin className="text-emerald-600" />
            <span>Đang kiểm tra tài khoản hội viên...</span>
          </div>
        ) : customerPhone.trim().length >= 8 ? (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Số điện thoại chưa đăng ký hội viên (áp dụng giá tiêu chuẩn)</span>
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Tên khách hàng:
          </label>
          <Input
            placeholder="Để trống mặc định là 'Khách lẻ'..."
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            prefix={<UserOutlined className="text-slate-400" />}
            className="!h-10 !rounded-xl"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Ghi chú (tùy chọn):
          </label>
          <Input.TextArea
            rows={2}
            placeholder="Mượn găng tay, cơ cá nhân, nước uống trước..."
            value={sessionNote}
            onChange={(e) => setSessionNote(e.target.value)}
            className="!rounded-xl"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="!rounded-xl"
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirmOpen}
            loading={saving}
            disabled={loading || !!loadError}
            leftIcon={<PlayCircleOutlined />}
            className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
          >
            Xác Nhận Mở Bàn
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PosOpenTableModal;
