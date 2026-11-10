import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
  QrcodeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Alert, Button, message } from "../../shared/ui";
import {
  tournamentService,
  type TournamentItem,
  type TournamentPayment,
} from "../../services/tournament.service";

export default function CustomerPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<TournamentItem | null>(null);
  const [payment, setPayment] = useState<TournamentPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [deadlinePassed, setDeadlinePassed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) {
      setError("Không tìm thấy mã giải đấu");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    Promise.all([
      tournamentService.getTournamentById(id).catch(() => null),
      tournamentService.getPayment(id),
    ])
      .then(([tourneyData, paymentData]) => {
        if (!active) return;
        setTournament(tourneyData);
        setPayment(paymentData);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Không thể tải thông tin thanh toán");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

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

  async function handleRefresh() {
    if (!id || refreshing) return;
    setRefreshing(true);
    setError("");
    try {
      const updated = await tournamentService.getPayment(id);
      setPayment(updated);
      message.success("Đã làm mới trạng thái thanh toán");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật trạng thái");
    } finally {
      setRefreshing(false);
    }
  }

  async function copyToClipboard(value: string, label: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      message.success(`Đã sao chép ${label}`);
    } catch {
      message.warning(`Không thể tự động sao chép ${label}. Vui lòng sao chép thủ công.`);
    }
  }

  const feeAmount = payment?.amount ?? tournament?.registrationFee ?? 0;
  const isAwaiting = payment?.state === "awaiting_payment";
  const isPaidPending = payment?.state === "paid_pending";
  const isConfirmed = payment?.state === "confirmed";
  const isRefund = payment?.state === "refund_required" || Boolean(payment?.extraPayment);
  const isReconcile = payment?.state === "reconciliation_required";
  const showQr = isAwaiting && Boolean(payment?.qrUrl) && !deadlinePassed;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 py-4 sm:px-6 sm:py-6 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/customer/tournaments")}
            leftIcon={<ArrowLeftOutlined />}
            className="!rounded-xl"
          >
            Danh sách giải
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mb-0">
              Chuyển khoản tham gia giải
            </h1>
            <p className="text-xs text-slate-500 mb-0">
              {tournament?.name || "Giải đấu CueZone"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          loading={refreshing}
          onClick={() => void handleRefresh()}
          leftIcon={<ReloadOutlined />}
          className="!rounded-xl"
        >
          Kiểm tra thanh toán
        </Button>
      </div>

      {error && <Alert type="error" title={error} />}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 space-y-2 shadow-2xs">
          <div className="inline-block animate-spin w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full" />
          <p>Đang tải thông tin chuyển khoản…</p>
        </div>
      ) : error && !payment ? (
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center space-y-3 shadow-2xs">
          <ExclamationCircleOutlined className="text-2xl text-rose-500" />
          <h2 className="text-base font-bold text-slate-900 mb-0">Không thể tải thông tin thanh toán</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void handleRefresh()} className="!rounded-xl">
            Thử tải lại
          </Button>
        </div>
      ) : !payment || payment.state === "not_started" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3 shadow-2xs">
          <ExclamationCircleOutlined className="text-2xl text-amber-500" />
          <h2 className="text-base font-bold text-slate-900 mb-0">Chưa tạo mã chuyển khoản</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Giải đấu này chưa có mã thanh toán nào được tạo cho tài khoản của bạn. Vui lòng quay lại danh sách giải để bấm đăng ký.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/customer/tournaments")}
            className="!rounded-xl"
          >
            Về danh sách giải đấu
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Trạng thái đăng ký
              </span>
              {isConfirmed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircleOutlined /> Đã xác nhận tham gia
                </span>
              ) : isPaidPending ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 border border-sky-200">
                  Đã nhận tiền — chờ xác nhận
                </span>
              ) : isAwaiting ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                  Chờ chuyển khoản
                </span>
              ) : isReconcile ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800 border border-indigo-200">
                  Đang đối soát danh sách
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-200">
                  Cần xử lý hoàn tiền
                </span>
              )}
            </div>

            {isPaidPending && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-950 space-y-1">
                <p className="font-semibold mb-0">Hệ thống đã ghi nhận khoản chuyển khoản của bạn.</p>
                <p className="text-sky-900/80 mb-0">
                  Danh sách chính thức sẽ được ban tổ chức chốt sau hạn đăng ký. Bạn có thể kiểm tra lại tại trang này hoặc liên hệ nhân viên nếu cần hỗ trợ.
                </p>
              </div>
            )}

            {isConfirmed && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950">
                Chúc mừng bạn đã có tên trong danh sách thi đấu chính thức của giải.
              </div>
            )}

            {isRefund && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-950 space-y-2">
                <p className="font-semibold mb-0">Khoản chuyển khoản này cần nhân viên hỗ trợ đối soát hoặc hoàn tiền thủ công.</p>
                <p className="text-rose-900/90 mb-0">
                  Vui lòng chuẩn bị ảnh chụp bill chuyển khoản ngân hàng và liên hệ nhân viên CLB qua Zalo để được hoàn trả trực tiếp.
                </p>
                {payment.zaloUrl && payment.zaloUrl.startsWith("https://zalo.me/") ? (
                  <a
                    href={payment.zaloUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
                  >
                    Mở Zalo nhân viên hỗ trợ &rarr;
                  </a>
                ) : (
                  <p className="text-[11px] text-slate-500 mb-0">
                    CLB chưa cấu hình đường dẫn Zalo. Vui lòng liên hệ trực tiếp quầy thu ngân hoặc số hotline CLB.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            <div className="md:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                <QrcodeOutlined /> Mã QR thanh toán
              </div>

              {showQr ? (
                <div className="space-y-2">
                  <div className="inline-block rounded-xl border border-slate-200 p-2.5 bg-white shadow-inner">
                    <img
                      src={payment.qrUrl || ""}
                      alt={`Mã QR chuyển khoản ${feeAmount.toLocaleString("vi-VN")} đồng`}
                      className="mx-auto h-auto w-56 max-w-full"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mb-0">
                    Mở ứng dụng ngân hàng và quét mã để tự động điền số tiền và nội dung.
                  </p>
                </div>
              ) : isAwaiting && deadlinePassed ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-xs text-amber-900 space-y-2">
                  <p className="font-semibold mb-0">Đã hết hạn chuyển khoản của mã này</p>
                  <p className="text-[11px] text-amber-800/80 mb-0">
                    Mã QR đã được ẩn để tránh phát sinh giao dịch trễ. Nếu bạn đã chuyển khoản trước đó, vui lòng bấm &ldquo;Kiểm tra thanh toán&rdquo; hoặc liên hệ nhân viên.
                  </p>
                </div>
              ) : isPaidPending || isConfirmed ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-xs text-emerald-950 space-y-2">
                  <CheckCircleOutlined className="text-3xl text-emerald-600 block" />
                  <p className="font-semibold mb-0">Không cần chuyển khoản thêm</p>
                  <p className="text-[11px] text-emerald-900/80 mb-0">
                    Hệ thống đã xác nhận tiền cho đăng ký này.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-xs text-slate-500">
                  Mã QR hiện không khả dụng cho trạng thái này.
                </div>
              )}
            </div>

            <div className="md:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <BankOutlined className="text-brand text-base" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-0">
                  Thông tin chuyển khoản SePay
                </h2>
              </div>

              <dl className="space-y-3.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2.5">
                  <dt className="text-slate-400 font-medium">Số tiền cần chuyển</dt>
                  <dd className="font-mono font-black text-base text-amber-700 mb-0">
                    {feeAmount.toLocaleString("vi-VN")} VNĐ
                  </dd>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2.5">
                  <dt className="text-slate-400 font-medium">Ngân hàng thụ hưởng</dt>
                  <dd className="font-semibold text-slate-800 mb-0">
                    {payment.bankCode || "---"}
                  </dd>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
                  <dt className="text-slate-400 font-medium">Số tài khoản</dt>
                  <dd className="flex items-center gap-2 font-mono font-bold text-slate-900 mb-0">
                    <span>{payment.accountNumber || "---"}</span>
                    {payment.accountNumber && (
                      <button
                        type="button"
                        aria-label="Sao chép số tài khoản"
                        onClick={() => void copyToClipboard(payment.accountNumber || "", "số tài khoản")}
                        className="rounded p-1 text-brand hover:bg-emerald-50 transition"
                      >
                        <CopyOutlined />
                      </button>
                    )}
                  </dd>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2.5">
                  <dt className="text-slate-400 font-medium">Chủ tài khoản</dt>
                  <dd className="font-semibold text-slate-800 uppercase mb-0">
                    {payment.accountName || "---"}
                  </dd>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
                  <dt className="text-slate-400 font-medium">
                    Nội dung chuyển khoản <span className="text-rose-500 font-bold">*</span>
                  </dt>
                  <dd className="flex items-center gap-2 font-mono font-bold text-brand mb-0 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                    <span className="tracking-wide break-all">{payment.reference || "---"}</span>
                    {payment.reference && (
                      <button
                        type="button"
                        aria-label="Sao chép nội dung chuyển khoản"
                        onClick={() => void copyToClipboard(payment.reference || "", "nội dung chuyển khoản")}
                        className="rounded p-1 text-brand hover:bg-emerald-100 transition"
                      >
                        <CopyOutlined />
                      </button>
                    )}
                  </dd>
                </div>

                {payment.createdAt && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2.5 text-[11px] text-slate-500">
                    <dt className="text-slate-400 font-medium">Thời gian tạo mã</dt>
                    <dd className="font-mono text-slate-700 mb-0">
                      {new Date(payment.createdAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </dd>
                  </div>
                )}

                {payment.deadline && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-[11px] text-slate-500">
                    <dt className="text-slate-400">Hạn chót thanh toán</dt>
                    <dd className="font-mono mb-0">
                      {new Date(payment.deadline).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-200/80">
                <strong>Lưu ý:</strong> Vui lòng giữ nguyên chính xác nội dung chuyển khoản để hệ thống đối soát giao dịch tự động.
              </div>
            </div>
          </div>

          {Boolean(payment.receipts?.length) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-0">
                Lịch sử giao dịch ngân hàng đã nhận ({payment.receipts?.length})
              </h3>
              <ul className="divide-y divide-slate-100 text-xs mb-0">
                {payment.receipts?.map((r) => (
                  <li key={r.providerId} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-slate-500">Mã GD: {r.providerId}</span>
                    <span className="font-mono font-bold text-emerald-800">
                      +{r.amount.toLocaleString("vi-VN")} VNĐ
                    </span>
                    <span className="text-slate-400">
                      {new Date(r.bankPaidAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-center pt-2">
            <Link
              to="/customer/tournaments"
              className="text-xs font-semibold text-slate-500 hover:text-brand inline-flex items-center gap-1.5"
            >
              <ArrowLeftOutlined /> Quay lại danh sách giải đấu
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
