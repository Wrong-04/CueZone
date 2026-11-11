import { useEffect, useState } from "react";
import {
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DollarOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
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
import { getSocket } from "../../services/socket.service";
import {
  TournamentAthletePassCard,
  type TournamentEPassData,
} from "./TournamentEPassModal";
import { TournamentPaymentReceipt } from "./TournamentPaymentReceipt";

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

  useEffect(() => {
    if (view !== "payment" || !payment || !["awaiting_payment", "paid_pending"].includes(payment.state)) {
      return;
    }

    let isMounted = true;
    const socket = getSocket();
    const tourneyChannel = `tournament:${tournament.id}:payment`;

    const handleSocketUpdate = (eventData: any) => {
      if (!isMounted) return;
      if (eventData && (eventData.userId === user?._id || !eventData.userId)) {
        tournamentService
          .getPayment(tournament.id)
          .then((latest) => {
            if (!isMounted) return;
            setPayment(latest);
            if (latest.state === "confirmed") {
              message.success("Thanh toán thành công! Bạn đã được xác nhận vào giải đấu!");
              if (onSuccess) onSuccess();
            }
          })
          .catch(() => undefined);
      }
    };

    socket.on(tourneyChannel, handleSocketUpdate);
    socket.on("tournament:payment_updated", handleSocketUpdate);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      tournamentService
        .getPayment(tournament.id)
        .then((latest) => {
          if (!isMounted) return;
          if (latest && latest.state !== payment.state) {
            setPayment(latest);
            if (latest.state === "confirmed") {
              window.clearInterval(interval);
              message.success("Thanh toán thành công! Bạn đã được xác nhận vào giải đấu!");
              if (onSuccess) onSuccess();
            }
          }
        })
        .catch(() => undefined);
    }, 15000);

    return () => {
      isMounted = false;
      socket.off(tourneyChannel, handleSocketUpdate);
      socket.off("tournament:payment_updated", handleSocketUpdate);
      window.clearInterval(interval);
    };
  }, [tournament.id, payment?.state, view, onSuccess, user?._id]);

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
  const isRefund =
    payment?.state === "refund_required" ||
    payment?.state === "reconciliation_required" ||
    Boolean(payment?.extraPayment);
  const showQr = isAwaiting && Boolean(payment?.qrUrl) && !deadlinePassed;

  const modalWidth =
    view === "confirm"
      ? 520
      : isConfirmed
        ? 560
        : isPaidPending
          ? 620
          : 740;

  const modalTitle =
    view === "confirm"
      ? "Xác nhận đăng ký giải đấu"
      : isConfirmed
        ? "Thẻ Cơ Thủ & Xác Nhận Thi Đấu"
        : isPaidPending
          ? "Biên Nhận Ghi Danh — Chờ Chốt Suất"
          : isRefund
            ? "Xử Lý Hoàn Tiền Giao Dịch"
            : "Chuyển khoản tham gia giải đấu";

  const passData: TournamentEPassData = {
    tournamentId: tournament.id,
    tournamentName: tournament.title,
    format: tournament.format,
    startDate: tournament.date || new Date().toISOString(),
    athleteName: user?.name || "Cơ thủ CueZone",
    athletePhone: user?.phone || "---",
    athleteCode: `CZ-${tournament.id.slice(-4).toUpperCase()}-${(user?.phone || user?._id || "").replace(/\D/g, "").slice(-4) || "VĐV"}`,
    feeAmount: feeAmount,
  };

  return (
    <Modal
      open
      onCancel={() => {
        if (!submitting && !refreshing) onClose();
      }}
      footer={null}
      width={modalWidth}
      title={
        <div className="flex items-center gap-2 text-slate-900">
          {isConfirmed ? (
            <TrophyOutlined className="text-amber-500" />
          ) : isPaidPending ? (
            <CheckCircleOutlined className="text-emerald-600" />
          ) : isRefund ? (
            <ExclamationCircleOutlined className="text-rose-500" />
          ) : (
            <TrophyOutlined className="text-amber-500" />
          )}
          <span className="font-bold text-base">{modalTitle}</span>
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

          {error && <Alert type="error" title={error} />}

          {payment && payment.state !== "not_started" && (
            <Alert
              type="info"
              title="Bạn đã có thông tin thanh toán cho giải đấu này. Bấm nút bên dưới để xem trực tiếp trạng thái ghi danh."
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
                ? "Xem trạng thái ghi danh"
                : isFree
                  ? "Ghi danh tham gia"
                  : "Tạo mã chuyển khoản"}
            </Button>
          </div>
        </div>
      ) : isConfirmed ? (
        <div className="space-y-4 py-1 text-slate-800">
          <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-[#064e3b] to-slate-950 p-4 text-white flex items-center justify-between gap-3 shadow-md border border-emerald-500/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <TrophyOutlined /> Xác Nhận Thi Đấu Chính Thức
              </div>
              <p className="text-xs text-emerald-100/90 leading-snug mb-0">
                Chúc mừng <strong>{user?.name || "Cơ thủ"}</strong>! Bạn đã có tên trong danh sách thi đấu giải đấu.
              </p>
            </div>
            <Tag color="green" className="!font-bold !text-xs !rounded-full !px-3 !py-1 !m-0 shrink-0">
              <CheckCircleOutlined /> Đã Xác Nhận
            </Tag>
          </div>

          <TournamentAthletePassCard
            data={passData}
            renderActions={(handleDownload) => (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  leftIcon={<DownloadOutlined />}
                  className="!rounded-xl border-emerald-500 text-emerald-800 hover:!bg-emerald-50 font-bold text-xs"
                >
                  Tải Thẻ Thi Đấu (PNG)
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onClose}
                  className="!rounded-xl !bg-[#064e3b] hover:!bg-[#047857] text-white font-bold text-xs"
                >
                  Đóng & Xem Lịch Thi Đấu
                </Button>
              </div>
            )}
          />
        </div>
      ) : isPaidPending && payment ? (
        <TournamentPaymentReceipt
          tournament={tournament}
          payment={payment}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onClose={onClose}
        />
      ) : isRefund ? (
        <div className="space-y-4 py-2 text-slate-800">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <ExclamationCircleOutlined className="text-rose-600 text-lg" />
              <span>Khoản thanh toán cần xử lý đối soát hoặc hoàn tiền</span>
            </div>
            <p className="text-xs text-rose-900/90 leading-relaxed mb-0">
              Giải đấu có thể đã đủ số lượng cơ thủ tối đa trước thời điểm ngân hàng khớp lệnh, hoặc giao dịch chuyển khoản phát sinh chênh lệch cần hoàn trả lại cho bạn.
            </p>
            <div className="p-3 bg-white rounded-xl border border-rose-100 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Số tiền đã chuyển:</span>
                <strong className="text-slate-900">{feeAmount.toLocaleString("vi-VN")} VNĐ</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mã tham chiếu:</span>
                <strong className="text-rose-700">{payment?.reference || "---"}</strong>
              </div>
            </div>
            {payment?.zaloUrl && (
              <div className="pt-2">
                <a
                  href={payment.zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition"
                >
                  Liên hệ Zalo Quản Lý CLB (Hỗ Trợ Hoàn Tiền) &rarr;
                </a>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={onClose} className="!rounded-xl">
              Đóng
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
              <Tag color="gold" className="!font-bold !text-xs !rounded-full !m-0 !px-2.5 !py-0.5">
                Chờ chuyển khoản
              </Tag>
            </div>
          </div>

          {error && <Alert type="error" title={error} />}

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
