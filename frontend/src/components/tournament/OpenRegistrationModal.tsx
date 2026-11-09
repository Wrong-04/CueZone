import React from "react";
import dayjs from "dayjs";
import { ExclamationCircleOutlined, CloseCircleOutlined, FireOutlined } from "@ant-design/icons";
import { Modal, Button } from "../../shared/ui";
import type { TournamentItem } from "../../services/tournament.service";

interface OpenRegistrationModalProps {
  open: boolean;
  loading: boolean;
  tournament: TournamentItem | null;
  onConfirm: () => void;
  onClose: () => void;
}

export const OpenRegistrationModal: React.FC<OpenRegistrationModalProps> = ({
  open,
  loading,
  tournament,
  onConfirm,
  onClose,
}) => {
  const isExpired =
    tournament?.registrationDeadline && dayjs(tournament.registrationDeadline).isBefore(dayjs());

  return (
    <Modal
      open={open}
      onCancel={() => {
        if (!loading) onClose();
      }}
      footer={null}
      width={480}
      title={
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <ExclamationCircleOutlined className="text-amber-500 text-lg" />
          <span className="font-black text-slate-900 text-base">Xác Nhận Mở Đăng Ký Giải Đấu</span>
        </div>
      }
    >
      <div className="py-4 space-y-3 text-xs text-slate-600">
        <p className="leading-relaxed">
          Bạn có chắc chắn muốn mở cổng đăng ký trực tuyến cho giải đấu:
        </p>
        <div className="p-3.5 rounded-2xl bg-emerald-950 text-white border border-emerald-700 space-y-1">
          <strong className="text-sm text-amber-300 block mb-1">{tournament?.name}</strong>
          <div>
            Quy mô: <strong>{tournament?.maxPlayers} cơ thủ</strong>
          </div>
          <div>
            Lệ phí:{" "}
            <strong className="font-mono text-emerald-300">
              {Number(tournament?.registrationFee).toLocaleString("vi-VN")}đ
            </strong>
          </div>
          <div>
            Hạn đăng ký:{" "}
            <strong className="font-mono">
              {tournament?.registrationDeadline
                ? new Date(tournament.registrationDeadline).toLocaleString("vi-VN")
                : "---"}
            </strong>
          </div>
        </div>

        {isExpired && (
          <div className="text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 text-[11px] font-medium flex items-start gap-2">
            <CloseCircleOutlined className="text-rose-600 mt-0.5 shrink-0" />
            <span>
              Cảnh báo: Hạn chót đăng ký của giải đấu này đã quá hạn. Bạn cần bấm &quot;Sửa Thông
              Tin&quot; để gia hạn thời gian trước khi có thể mở đăng ký.
            </span>
          </div>
        )}

        <p className="text-slate-400 text-[11px] italic">
          * Sau khi mở đăng ký, giải đấu sẽ hiển thị trên ứng dụng của các cơ thủ hội viên để ghi
          danh.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="md"
            disabled={loading}
            onClick={onClose}
            className="!rounded-xl !text-xs"
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={Boolean(isExpired)}
            loading={loading}
            onClick={onConfirm}
            leftIcon={<FireOutlined />}
            className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-5 !text-xs text-white"
          >
            Xác Nhận Mở Đăng Ký
          </Button>
        </div>
      </div>
    </Modal>
  );
};
