import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SafetyCertificateFilled,
} from "@ant-design/icons";
import { Button, Tag, message } from "../../shared/ui";
import { type TournamentPayment } from "../../services/tournament.service";

export interface TournamentPaymentReceiptProps {
  tournament: {
    id: string;
    title: string;
    date?: string;
    format?: string;
  };
  payment: TournamentPayment;
  onRefresh?: () => void;
  refreshing?: boolean;
  onClose?: () => void;
}

export function TournamentPaymentReceipt({
  tournament,
  payment,
  onRefresh,
  refreshing = false,
  onClose,
}: TournamentPaymentReceiptProps) {
  const feeAmount = payment.amount ?? 0;
  const isProvisional = payment.provisionalSeat;
  const rank = payment.rank;
  const paidTime = payment.receipts?.[0]?.bankPaidAt || payment.createdAt;

  const copyToClipboard = async (val: string, label: string) => {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      message.success(`Đã sao chép ${label}`);
    } catch {
      message.warning(`Không thể tự động sao chép ${label}. Vui lòng sao chép thủ công.`);
    }
  };

  return (
    <div className="space-y-4 py-1 text-slate-800">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-[#064e3b] to-slate-950 p-5 sm:p-6 text-white shadow-xl border border-emerald-500/25 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald-400/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-amber-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider">
              <SafetyCertificateFilled className="text-emerald-400" />
              ĐÃ GHI NHẬN THANH TOÁN QUA SEPAY
            </span>
            <span className="text-xs font-mono text-emerald-200/80">
              Mã GD: <strong className="text-white font-mono">{payment.reference || "---"}</strong>
            </span>
          </div>

          <div>
            <span className="text-xs text-emerald-300/90 font-medium block">
              Giải đấu tham dự:
            </span>
            <h2 className="text-base sm:text-lg font-black text-white leading-snug line-clamp-2 mt-0.5 mb-0">
              {tournament.title}
            </h2>
          </div>

          <div className="pt-2 flex flex-wrap items-end justify-between gap-3 border-t border-emerald-500/15">
            <div>
              <span className="text-[11px] text-slate-300 block uppercase tracking-wider">
                Lệ phí đã thanh toán
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-300">
                {feeAmount.toLocaleString("vi-VN")} VNĐ
              </span>
            </div>

            <div className="text-right">
              {isProvisional ? (
                <Tag color="green" className="!font-bold !text-xs !rounded-full !px-3 !py-1 !m-0 shadow-xs">
                  ✓ Thuộc suất thi đấu dự kiến (#{rank || 1})
                </Tag>
              ) : rank ? (
                <Tag color="gold" className="!font-bold !text-xs !rounded-full !px-3 !py-1 !m-0 shadow-xs">
                  Thứ tự nộp tiền: #{rank}
                </Tag>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <DollarOutlined className="text-emerald-700" /> Biên lai xác nhận SePay
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Khớp lệnh tự động
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 block text-[11px]">Nội dung chuyển khoản</span>
            <div className="flex items-center justify-between font-mono font-bold text-slate-900">
              <span className="break-all">{payment.reference || "---"}</span>
              {payment.reference && (
                <button
                  type="button"
                  aria-label="Sao chép nội dung chuyển khoản"
                  onClick={() => void copyToClipboard(payment.reference || "", "nội dung chuyển khoản")}
                  className="text-brand hover:bg-emerald-50 rounded p-1 transition cursor-pointer ml-1"
                >
                  <CopyOutlined />
                </button>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 block text-[11px]">Thời gian ngân hàng nhận</span>
            <div className="font-mono font-semibold text-slate-800">
              {paidTime
                ? new Date(paidTime).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })
                : "Đã cập nhật hệ thống"}
            </div>
          </div>

          {payment.bankCode && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 block text-[11px]">Ngân hàng thụ hưởng CLB</span>
              <div className="font-semibold text-slate-800">
                {payment.bankCode} • {payment.accountNumber || "---"}
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 block text-[11px]">Trạng thái đối soát</span>
            <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircleOutlined /> Đã khớp sao kê tài khoản CLB
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block border-b border-slate-100 pb-2">
          Tiến trình giải đấu
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
              <CheckCircleOutlined className="text-emerald-600" />
              <span>Bước 1: Ghi danh</span>
            </div>
            <span className="text-[11px] text-emerald-700/80 block">
              Đã tạo mã và đăng ký thành công
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
              <CheckCircleOutlined className="text-emerald-600" />
              <span>Bước 2: Nộp lệ phí</span>
            </div>
            <span className="text-[11px] text-emerald-700/80 block">
              Đã khớp tiền ngân hàng qua SePay
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
              <ClockCircleOutlined className="text-amber-600" />
              <span>Bước 3: Chốt nhánh</span>
            </div>
            <span className="text-[11px] text-amber-800/90 block">
              Đang chờ ban tổ chức bốc thăm lịch đấu
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 flex items-start gap-3 text-xs text-sky-950">
        <InfoCircleOutlined className="text-sky-600 text-base shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sky-950 mb-0">Lưu ý cho cơ thủ</p>
          <p className="text-sky-900/80 leading-relaxed mb-0 text-[11px]">
            Ban tổ chức sẽ hoàn tất chốt danh sách sau khi kết thúc hạn đăng ký. Ngay khi được duyệt chính thức, Thẻ VĐV (kèm mã QR check-in nhận bàn) sẽ tự động kích hoạt tại đây và trong mục <strong>Lịch Sử Thi Đấu</strong> của bạn.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
        <div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              loading={refreshing}
              onClick={onRefresh}
              leftIcon={<ReloadOutlined />}
              className="!rounded-xl text-xs font-semibold"
            >
              Làm mới trạng thái
            </Button>
          )}
        </div>

        {onClose && (
          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
            className="!rounded-xl !bg-[#064e3b] hover:!bg-[#047857] text-white font-bold text-xs"
          >
            Đóng & Tiếp tục theo dõi
          </Button>
        )}
      </div>
    </div>
  );
}
