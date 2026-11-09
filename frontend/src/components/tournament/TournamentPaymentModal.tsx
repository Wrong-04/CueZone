import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarOutlined,
  DollarOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Modal, message } from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  tournamentService,
  type TournamentPayment,
} from "../../services/tournament.service";

interface TournamentRegistrationModalProps {
  tournament: {
    id: string;
    title: string;
    feeAmount: number;
    date?: string;
    format?: string;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function TournamentPaymentModal({
  tournament,
  onClose,
  onSuccess,
}: TournamentRegistrationModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [existingPayment, setExistingPayment] = useState<TournamentPayment | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isFree = tournament.feeAmount === 0;

  useEffect(() => {
    let active = true;
    setChecking(true);
    setError("");
    tournamentService
      .getPayment(tournament.id)
      .then((res) => {
        if (!active) return;
        setExistingPayment(res);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Không thể kiểm tra trạng thái đăng ký");
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [tournament.id]);

  async function handleConfirmRegistration() {
    if (submitting) return;

    if (existingPayment && existingPayment.state !== "not_started") {
      onClose();
      navigate(`/customer/tournaments/${tournament.id}/payment`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await tournamentService.register(tournament.id);
      message.success(isFree ? "Đăng ký tham gia giải thành công!" : "Đã tạo mã chuyển khoản!");
      onClose();
      if (onSuccess) onSuccess();

      if (isFree) {
        navigate("/customer/tournaments");
      } else {
        navigate(`/customer/tournaments/${tournament.id}/payment`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký không thành công. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasExistingIntent =
    existingPayment && existingPayment.state !== "not_started";

  return (
    <Modal
      open
      onCancel={() => {
        if (!submitting) onClose();
      }}
      footer={null}
      width={500}
      title={
        <div className="flex items-center gap-2 text-slate-900">
          <TrophyOutlined className="text-amber-500" />
          <span className="font-bold text-base">Xác nhận đăng ký giải đấu</span>
        </div>
      }
    >
      <div className="space-y-4 py-2 text-xs text-slate-700">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2">
          <h2 className="text-sm font-bold text-slate-900 leading-snug mb-0">
            {tournament.title}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-slate-600 text-[11px] font-mono">
            {tournament.date && (
              <span className="flex items-center gap-1.5">
                <CalendarOutlined className="text-emerald-700" />
                {tournament.date}
              </span>
            )}
            {tournament.format && (
              <span className="flex items-center gap-1.5 text-slate-500">
                Thể thức: {tournament.format}
              </span>
            )}
          </div>
        </div>

        {error && <Alert type="error" message={error} />}

        {hasExistingIntent && (
          <Alert
            type="info"
            message="Bạn đã có thông tin đăng ký cho giải đấu này. Bấm tiếp tục để xem mã thanh toán và trạng thái."
          />
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1.5">
            Thông tin cơ thủ đăng ký
          </span>
          <dl className="grid grid-cols-2 gap-2 text-xs mb-0">
            <div>
              <dt className="text-slate-400 font-medium">Họ và tên</dt>
              <dd className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0">
                <UserOutlined className="text-slate-400" />
                {user?.name || "Hội viên CueZone"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400 font-medium">Số điện thoại</dt>
              <dd className="font-mono font-semibold text-slate-900 flex items-center gap-1.5 mb-0">
                <PhoneOutlined className="text-slate-400" />
                {user?.phone || "Chưa cập nhật"}
              </dd>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <DollarOutlined className="text-amber-600" /> Lệ phí tham gia:
              </span>
              <strong className="font-mono text-sm font-black text-amber-700">
                {isFree ? "Miễn phí" : `${tournament.feeAmount.toLocaleString("vi-VN")} VNĐ`}
              </strong>
            </div>
            {hasExistingIntent && existingPayment?.createdAt && (
              <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
                <span className="text-slate-400">Thời gian tạo mã:</span>
                <span className="font-mono text-slate-700">
                  {new Date(existingPayment.createdAt).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </span>
              </div>
            )}
          </dl>
        </div>

        {!isFree && (
          <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 flex items-start gap-2 border border-slate-200/80">
            <SafetyCertificateOutlined className="text-brand text-sm mt-0.5 shrink-0" />
            <p className="mb-0">
              Sau khi xác nhận, hệ thống sẽ tạo mã chuyển khoản SePay riêng kèm mã QR để bạn hoàn tất thanh toán.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={onClose}
            className="!rounded-xl"
          >
            Đóng
          </Button>

          <Button
            variant="primary"
            size="sm"
            loading={submitting || checking}
            onClick={() => void handleConfirmRegistration()}
            className="!bg-[#064e3b] hover:!bg-[#047857] !border-[#064e3b] text-white font-bold !rounded-xl"
          >
            {hasExistingIntent
              ? "Xem thông tin chuyển khoản"
              : isFree
                ? "Ghi danh tham gia"
                : "Tạo mã chuyển khoản"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
