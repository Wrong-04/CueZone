// ============================================================================
// 1. IMPORTS
// ============================================================================
import { useEffect, useState } from "react";
import {
  CheckOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  QrcodeOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { Button, Input, Typography } from "../../../shared/ui";
import {
  type CheckoutPaymentDetails,
  type CheckoutPaymentMethod,
  type CheckoutRequest,
} from "../../../services/customer-order.service";
import { tournamentService, type ClubBankInfo } from "../../../services/tournament.service";
import {
  PaymentBreakdownSection,
  SepayPaymentDetails,
  formatMoney,
} from "./PaymentBreakdownSection";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface PaymentRequestConfirmPanelProps {
  request: CheckoutRequest;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (
    paymentMethod: CheckoutPaymentMethod,
    paymentDetails: CheckoutPaymentDetails,
  ) => void;
}

// ============================================================================
// 3. CONSTANTS & ALIASES
// ============================================================================
const { Text } = Typography;

// ============================================================================
// 4. MAIN COMPONENT: BẢNG XÁC NHẬN THANH TOÁN TỪ YÊU CẦU CỦA KHÁCH TẠI BÀN
// Chọn phương thức thu tiền (Tiền mặt / QR / Kết hợp), tính tiền thừa/thiếu và chốt hóa đơn
// ============================================================================
export function PaymentRequestConfirmPanel({
  request,
  loading,
  onCancel,
  onConfirm,
}: PaymentRequestConfirmPanelProps) {
  // ── 4.1 State: Phương thức thanh toán, Tiền khách đưa & Thông tin SePay ───
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const [sepayResult, setSepayResult] = useState<{
    bank?: ClubBankInfo;
    error?: string;
  } | null>(null);

  // ── 4.2 Derived State: Tính toán tiền mặt, tiền QR và danh sách món hợp lệ ─
  const activeOrders = request.orders.filter(
    (order) => order.status !== "cancelled" && order.quantity > 0,
  );
  const totalDue = Math.max(0, request.totalDue);
  const cashAmount =
    paymentMethod === "split"
      ? Math.min(totalDue, Math.max(0, cashReceived ?? Math.floor(totalDue / 2)))
      : totalDue;
  const transferAmount =
    paymentMethod === "vnpay"
      ? totalDue
      : paymentMethod === "split"
        ? Math.max(0, totalDue - cashAmount)
        : 0;
  const needsSepay = transferAmount > 0;
  const sepayBank = sepayResult?.bank ?? null;
  const sepayError = sepayResult?.error ?? "";
  const sepayLoading = needsSepay && sepayResult === null;
  const actualCashReceived = cashReceived ?? totalDue;
  const cashShort = paymentMethod === "cash" && actualCashReceived < totalDue;
  const paymentDetails: CheckoutPaymentDetails = {
    cashAmount: paymentMethod === "vnpay" ? 0 : cashAmount,
    transferAmount,
  };

  // ── 4.3 Event Handlers ────────────────────────────────────────────────────
  const selectPaymentMethod = (method: CheckoutPaymentMethod) => {
    setPaymentMethod(method);
    setCashReceived((current) =>
      method === "split"
        ? current === null
          ? Math.floor(totalDue / 2)
          : Math.min(totalDue, Math.max(0, current))
        : null,
    );
  };

  // ── 4.4 Effects: Tải thông tin ngân hàng SePay khi cần hiển thị mã QR ─────
  useEffect(() => {
    let active = true;
    if (needsSepay) {
      tournamentService
        .getBankInfo()
        .then((bank) => {
          if (active) setSepayResult({ bank });
        })
        .catch((error: unknown) => {
          if (active) {
            setSepayResult({
              error:
                error instanceof Error
                  ? error.message
                  : "Không thể tải thông tin tài khoản SePay.",
            });
          }
        });
    }
    return () => {
      active = false;
    };
  }, [needsSepay]);

  // ── 4.5 Main Render JSX ───────────────────────────────────────────────────
  return (
    <div className="space-y-3 py-2 text-xs">
      {/* Khối 1-3: Thông tin bàn chơi, bảng kê dịch vụ & tổng thanh toán */}
      <PaymentBreakdownSection request={request} activeOrders={activeOrders} />

      {/* Khối 4: Chọn hình thức thu tiền (Tiền mặt / QR / Kết hợp) */}
      <div>
        <Text strong className="mb-2 block">
          Phương thức thanh toán:
        </Text>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: "cash", label: "Tiền Mặt", icon: <DollarOutlined /> },
              { key: "vnpay", label: "Chuyển Khoản QR", icon: <QrcodeOutlined /> },
              { key: "split", label: "Tiền Mặt + QR", icon: <SwapOutlined /> },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.key}
              variant={paymentMethod === opt.key ? "primary" : "outline"}
              onClick={() => selectPaymentMethod(opt.key)}
              leftIcon={opt.icon}
              className={`!h-11 !flex-col !gap-1 !rounded-xl whitespace-nowrap ${
                paymentMethod === opt.key
                  ? "!bg-emerald-600 !border-emerald-600 !text-white"
                  : "!border-slate-200 !text-slate-700"
              }`}
            >
              <span className="text-[11px] font-bold">{opt.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Khối 5A: Thu tiền mặt & tính tiền thừa */}
      {paymentMethod === "cash" && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <Text strong>Tiền mặt khách đưa:</Text>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                value={cashReceived ?? totalDue}
                onChange={(event) =>
                  setCashReceived(Math.max(0, Math.floor(Number(event.target.value) || 0)))
                }
                className="!h-9 !w-36 !text-right font-mono font-bold"
              />
              <span>đ</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCashReceived(totalDue)}
                className="!h-9 !px-2.5 !text-xs whitespace-nowrap"
              >
                Đủ tiền
              </Button>
            </div>
          </div>
          {actualCashReceived === totalDue ? (
            <div className="flex justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-800">
              <span>Khách trả đủ tiền mặt ({formatMoney(totalDue)})</span>
              <strong className="whitespace-nowrap">Tiền thừa: 0đ</strong>
            </div>
          ) : actualCashReceived > totalDue ? (
            <div className="flex justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-900">
              <span>Tiền thừa trả khách:</span>
              <strong className="font-mono whitespace-nowrap">
                {formatMoney(actualCashReceived - totalDue)}
              </strong>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
              <span className="text-[11px] text-amber-900">
                Khách đưa còn thiếu:{" "}
                <strong className="whitespace-nowrap">{formatMoney(totalDue - actualCashReceived)}</strong>
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setPaymentMethod("split");
                  setCashReceived(actualCashReceived);
                }}
                leftIcon={<QrcodeOutlined />}
                className="!h-7 !px-2.5 !text-[11px] whitespace-nowrap"
              >
                Quét QR phần thiếu
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Khối 5B: Thanh toán kết hợp Tiền mặt + Chuyển khoản QR */}
      {paymentMethod === "split" && (
        <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <Text strong>Tiền mặt nhận:</Text>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                max={totalDue}
                value={cashAmount}
                onChange={(event) =>
                  setCashReceived(
                    Math.min(
                      totalDue,
                      Math.max(0, Math.floor(Number(event.target.value) || 0)),
                    ),
                  )
                }
                className="!h-9 !w-36 !text-right font-mono font-bold"
              />
              <span>đ</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCashReceived(Math.floor(totalDue / 2))}
              className="whitespace-nowrap"
            >
              50% ({formatMoney(Math.floor(totalDue / 2))})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCashReceived(0)}
              className="whitespace-nowrap"
            >
              0đ tiền mặt
            </Button>
            <span className="ml-auto font-bold text-indigo-900 whitespace-nowrap">
              QR: {formatMoney(transferAmount)}
            </span>
          </div>
          {transferAmount > 0 && (
            <SepayPaymentDetails
              bank={sepayBank}
              loading={sepayLoading}
              error={sepayError}
              amount={transferAmount}
              tableCode={request.tableCode}
            />
          )}
        </div>
      )}

      {/* Khối 5C: Thanh toán 100% Chuyển khoản QR */}
      {paymentMethod === "vnpay" && transferAmount > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <SepayPaymentDetails
            bank={sepayBank}
            loading={sepayLoading}
            error={sepayError}
            amount={transferAmount}
            tableCode={request.tableCode}
          />
        </div>
      )}

      {/* Lưu ý xác nhận tiền trước khi xuất hóa đơn */}
      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-900">
        <InfoCircleOutlined className="mt-0.5 shrink-0" />
        <div>
          Khách đã gửi yêu cầu thanh toán. Chọn phương thức thực tế và chỉ xác nhận sau khi đã thu đủ tiền.
          <div className="mt-1 text-[11px] text-blue-700">
            Yêu cầu lúc {new Date(request.requestedAt).toLocaleTimeString("vi-VN")}
          </div>
        </div>
      </div>

      {/* Cụm nút hành động */}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={loading} className="whitespace-nowrap">
          Quay lại
        </Button>
        <Button
          icon={<CheckOutlined />}
          loading={loading}
          disabled={
            cashShort ||
            (needsSepay && (sepayLoading || Boolean(sepayError) || !sepayBank))
          }
          onClick={() => onConfirm(paymentMethod, paymentDetails)}
          className="whitespace-nowrap"
        >
          Xác nhận & In Hóa Đơn
        </Button>
      </div>
    </div>
  );
}
