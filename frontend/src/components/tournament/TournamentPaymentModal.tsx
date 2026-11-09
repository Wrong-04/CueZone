import { useEffect, useState } from "react";
import {
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DollarOutlined,
  PhoneOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Modal, Tag, message } from "../../shared/ui";
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
  const [payment, setPayment] = useState<TournamentPayment | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [view, setView] = useState<"confirm" | "payment">("confirm");

  const isFree = tournament.feeAmount === 0;

  useEffect(() => {
    let active = true;
    setChecking(true);
    setError("");
    tournamentService
      .getPayment(tournament.id)
      .then((res) => {
        if (!active) return;
        setPayment(res);
        if (res && res.state !== "not_started" && !isFree) {
          setView("payment");
        }
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
  }, [tournament.id, isFree]);

  useEffect(() => {
    const deadline = payment?.deadline ? new Date(payment.deadline).getTime() : 0;
    if (!deadline) {
      setDeadlinePassed(false);
      return;
    }
    const update = () => setDeadlinePassed(Date.now() >= deadline);
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [payment?.deadline]);

  async function handleConfirmRegistration() {
    if (submitting) return;

    if (payment && payment.state !== "not_started" && !isFree) {
      setView("payment");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await tournamentService.register(tournament.id);
      setPayment(res);
      message.success(isFree ? "Đăng ký tham gia giải thành công!" : "Đã tạo mã chuyển khoản!");
      if (onSuccess) onSuccess();

      if (isFree) {
        onClose();
      } else {
        setView("payment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký không thành công. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError("");
    try {
      const updated = await tournamentService.getPayment(tournament.id);
      setPayment(updated);
      message.success("Đã làm mới trạng thái thanh toán");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật trạng thái");
    } finally {
      setRefreshing(false);
    }
  }

  async function copyToClipboard(val: string, label: string) {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      message.success(`Đã sao chép ${label}`);
    } catch {
      message.warning(`Không thể tự động sao chép ${label}. Vui lòng sao chép thủ công.`);
    }
  }

  const feeAmount = payment?.amount ?? tournament.feeAmount;
  const isAwaiting = payment?.state === "awaiting_payment";
  const isPaidPending = payment?.state === "paid_pending";
  const isConfirmed = payment?.state === "confirmed";
  const isRefund = payment?.state === "refund_required" || Boolean(payment?.extraPayment);
  const showQr = isAwaiting && Boolean(payment?.qrUrl) && !deadlinePassed;

  return (
    <Modal
      open
      onCancel={() => {
        if (!submitting && !refreshing) onClose();
      }}
      footer={null}
      width={view === "payment" ? 740 : 520}
      title={
        <div className="flex items-center gap-2 text-slate-900">
          <TrophyOutlined className="text-amber-500" />
          <span className="font-bold text-base">
            {view === "payment" ? "Chuyển khoản qua SePay" : "Xác nhận đăng ký giải đấu"}
          </span>
        </div>
      }
    >
      {view === "confirm" ? (
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

          {payment && payment.state !== "not_started" && (
            <Alert
              type="info"
              message="Bạn đã có thông tin thanh toán cho giải đấu này. Bấm nút bên dưới để xem trực tiếp mã chuyển khoản."
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
              {payment && payment.state !== "not_started" && payment.createdAt && (
                <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
                  <span className="text-slate-400">Thời gian tạo mã:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(payment.createdAt).toLocaleString("vi-VN", {
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
              {payment && payment.state !== "not_started"
                ? "Xem mã chuyển khoản"
                : isFree
                  ? "Ghi danh tham gia"
                  : "Tạo mã chuyển khoản"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5 py-1 text-slate-800 max-h-[85vh] overflow-y-auto sm:overflow-visible pr-0.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 mb-0 leading-tight truncate max-w-md">
                {tournament.title}
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">
                Lệ phí: <strong className="text-amber-700 font-black">{feeAmount.toLocaleString("vi-VN")} VNĐ</strong>
              </span>
            </div>
            <div>
              {isConfirmed ? (
                <Tag color="green" className="!font-bold !text-xs !rounded-full !m-0 !px-2.5 !py-0.5">
                  <CheckCircleOutlined /> Đã xác nhận tham gia
                </Tag>
              ) : isPaidPending ? (
                <Tag color="blue" className="!font-bold !text-xs !rounded-full !m-0 !px-2.5 !py-0.5">
                  Đã nhận tiền — chờ chốt
                </Tag>
              ) : isAwaiting ? (
                <Tag color="gold" className="!font-bold !text-xs !rounded-full !m-0 !px-2.5 !py-0.5">
                  Chờ chuyển khoản
                </Tag>
              ) : isRefund ? (
                <Tag color="red" className="!font-bold !text-xs !rounded-full !m-0 !px-2.5 !py-0.5">
                  Cần hoàn tiền
                </Tag>
              ) : null}
            </div>
          </div>

          {error && <Alert type="error" message={error} />}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                <QrcodeOutlined className="text-brand" /> Quét mã VietQR
              </div>

              {showQr ? (
                <div className="space-y-1.5 text-center">
                  <div className="inline-block rounded-xl border border-slate-200 p-2 bg-white shadow-2xs">
                    <img
                      src={payment?.qrUrl || ""}
                      alt={`QR SePay ${feeAmount.toLocaleString("vi-VN")}đ`}
                      className="h-40 w-40 object-contain mx-auto"
                    />
                  </div>
                  <span className="block text-[11px] text-slate-500">
                    Quét mã để tự động điền thông tin
                  </span>
                </div>
              ) : isPaidPending || isConfirmed ? (
                <div className="py-8 space-y-2 text-center">
                  <CheckCircleOutlined className="text-4xl text-emerald-600 block mx-auto" />
                  <span className="font-bold text-xs text-emerald-950 block">Đã ghi nhận thanh toán</span>
                  <span className="text-[11px] text-emerald-800/80 block">Không cần chuyển khoản thêm</span>
                </div>
              ) : isAwaiting && deadlinePassed ? (
                <div className="py-8 space-y-1.5 text-center text-amber-900">
                  <span className="font-bold text-xs block">Đã hết hạn chuyển khoản</span>
                  <span className="text-[11px] text-amber-800/80 block">Mã QR đã ẩn để tránh giao dịch trễ</span>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Mã QR hiện không khả dụng
                </div>
              )}
            </div>

            <div className="sm:col-span-7 space-y-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <BankOutlined className="text-brand" /> Ngân hàng
                  </span>
                  <span className="font-bold text-slate-800">{payment?.bankCode || "---"}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 text-[11px]">Số tài khoản</span>
                  <span className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                    {payment?.accountNumber || "---"}
                    {payment?.accountNumber && (
                      <button
                        type="button"
                        aria-label="Sao chép số tài khoản"
                        onClick={() => void copyToClipboard(payment.accountNumber || "", "số tài khoản")}
                        className="text-brand hover:bg-emerald-50 rounded p-1 transition cursor-pointer"
                      >
                        <CopyOutlined />
                      </button>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 text-[11px]">Chủ tài khoản</span>
                  <span className="font-semibold text-slate-800 uppercase">{payment?.accountName || "---"}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 text-[11px]">Nội dung CK</span>
                  <span className="font-mono font-bold text-brand bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1.5">
                    <span className="break-all">{payment?.reference || "---"}</span>
                    {payment?.reference && (
                      <button
                        type="button"
                        aria-label="Sao chép nội dung chuyển khoản"
                        onClick={() => void copyToClipboard(payment.reference || "", "nội dung chuyển khoản")}
                        className="text-brand hover:bg-emerald-100 rounded p-0.5 transition cursor-pointer"
                      >
                        <CopyOutlined />
                      </button>
                    )}
                  </span>
                </div>

                {payment?.createdAt && (
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-[11px]">
                    <span className="text-slate-400">Thời gian tạo mã</span>
                    <span className="font-mono text-slate-600">
                      {new Date(payment.createdAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </span>
                  </div>
                )}

                {payment?.deadline && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Hạn chót thanh toán</span>
                    <span className="font-mono text-slate-600">
                      {new Date(payment.deadline).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {isRefund && payment?.zaloUrl && payment.zaloUrl.startsWith("https://zalo.me/") && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-900 flex items-center justify-between">
                  <span>Cần đối soát hoặc hoàn tiền:</span>
                  <a
                    href={payment.zaloUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-brand hover:underline"
                  >
                    Liên hệ Zalo nhân viên &rarr;
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={onClose}
              className="!rounded-xl"
            >
              Đóng
            </Button>

            <Button
              variant="outline"
              size="sm"
              loading={refreshing}
              onClick={() => void handleRefresh()}
              leftIcon={<ReloadOutlined />}
              className="!rounded-xl"
            >
              Cập nhật trạng thái
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
