import { useCallback, useEffect, useState } from "react";
import {
  CheckOutlined,
  CloseOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  QrcodeOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from "../../shared/ui";
import {
  staffOrderService,
  type CheckoutPaymentDetails,
  type CheckoutPaymentMethod,
  type CheckoutRequest,
} from "../../services/customer-order.service";
import { tournamentService, type ClubBankInfo } from "../../services/tournament.service";
import { getSepayQrUrl } from "../../utils/sepay-qr";
import type { CheckoutReceipt } from "../../types/pos";
import PosReceiptModal from "../../pages/pos/modals/PosReceiptModal";
import { getTypeLabel } from "../../pages/pos/constants/posConstants";

const { Text } = Typography;

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function SepayPaymentDetails({
  bank,
  loading,
  error,
  amount,
  tableCode,
}: {
  bank: ClubBankInfo | null;
  loading: boolean;
  error: string;
  amount: number;
  tableCode: string;
}) {
  if (loading) {
    return <Text type="secondary">Đang tải thông tin tài khoản SePay…</Text>;
  }
  if (error) {
    return <Text type="danger">{error}</Text>;
  }
  if (!bank) {
    return <Text type="danger">Chưa có thông tin tài khoản SePay.</Text>;
  }

  return (
    <div className="flex items-center gap-3">
      <img
        src={getSepayQrUrl(bank, amount, tableCode)}
        alt={`Mã QR SePay bàn ${tableCode}`}
        className="h-24 w-24 rounded-lg border border-emerald-200 bg-white p-1 object-contain"
      />
      <div className="min-w-0 space-y-1 text-[11px]">
        <Tag color="green" className="!m-0 !text-[10px] !font-bold">
          SEPAY · {bank.bankCode}
        </Tag>
        <div className="truncate text-slate-600">
          STK: <strong className="font-mono text-slate-900">{bank.accountNumber}</strong>
        </div>
        <div className="truncate text-slate-600">
          Chủ TK: <strong className="text-slate-900">{bank.accountName}</strong>
        </div>
        <div className="font-mono font-bold text-emerald-700">{formatMoney(amount)}</div>
        <div className="font-mono text-slate-500">Nội dung: CueZone {tableCode}</div>
      </div>
    </div>
  );
}

function PaymentConfirmation({
  request,
  loading,
  onCancel,
  onConfirm,
}: {
  request: CheckoutRequest;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (paymentMethod: CheckoutPaymentMethod, paymentDetails: CheckoutPaymentDetails) => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const [sepayResult, setSepayResult] = useState<{
    bank?: ClubBankInfo;
    error?: string;
  } | null>(null);
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
  const paymentDetails = {
    cashAmount: paymentMethod === "vnpay" ? 0 : cashAmount,
    transferAmount,
  };

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

  return (
    <div className="space-y-3 py-2 text-xs">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <Text strong className="block text-sm">
              {request.tableCode} · {request.tableName}
            </Text>
            <Text type="secondary">
              {getTypeLabel(request.tableType)} · Bắt đầu lúc {request.sessionStart}
            </Text>
          </div>
          <Tag color="green">
            <ClockCircleOutlined /> {request.durationFormatted} ({request.durationMinutes} phút)
          </Tag>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div>
            <Text strong>{request.customerName}</Text>
            <Text type="secondary" className="ml-2">
              {request.customerPhone || "Chưa có SĐT"}
            </Text>
          </div>
          <Tag color="gold">Hội viên {request.membershipTierName}</Tag>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <Text strong className="mb-2 block">
          Bảng kê dịch vụ sử dụng
        </Text>
        <div className="space-y-2">
          <div className="flex justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <ClockCircleOutlined className="text-indigo-600" />
              Tiền giờ chơi ({request.durationMinutes} phút)
            </span>
            <Text strong>{formatMoney(request.playingCost)}</Text>
          </div>
          <div className="flex justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <CoffeeOutlined className="text-amber-600" />
              Đồ uống & dịch vụ ({activeOrders.length} món)
            </span>
            <Text strong>{formatMoney(request.fnbTotal)}</Text>
          </div>
          {activeOrders.length > 0 && (
            <div className="space-y-1 rounded-xl bg-slate-50 p-2">
              {activeOrders.map((order, index) => (
                <div
                  key={order.id || `${order.name}-${index}`}
                  className="flex justify-between gap-3 text-slate-600"
                >
                  <span>
                    {order.name} × {order.quantity}
                  </span>
                  <span className="shrink-0 font-mono">
                    {formatMoney(order.price * order.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex justify-between">
          <span>Tổng tiền dịch vụ</span>
          <span className="font-mono">{formatMoney(request.subtotal)}</span>
        </div>
        {request.membershipDiscountAmount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Ưu đãi hội viên ({request.membershipTierName})</span>
            <span className="font-mono">-{formatMoney(request.membershipDiscountAmount)}</span>
          </div>
        )}
        {request.voucherDiscountAmount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Voucher {request.voucherCode}</span>
            <span className="font-mono">-{formatMoney(request.voucherDiscountAmount)}</span>
          </div>
        )}
        {request.deposit > 0 && (
          <div className="flex justify-between text-amber-700">
            <span>Tiền cọc đã trừ</span>
            <span className="font-mono">-{formatMoney(request.deposit)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
          <span>TỔNG CỘNG THANH TOÁN</span>
          <span className="font-mono text-lg text-emerald-700">
            {formatMoney(request.totalDue)}
          </span>
        </div>
      </div>

      <div>
        <Text strong className="mb-2 block">
          Phương thức thanh toán:
        </Text>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={paymentMethod === "cash" ? "primary" : "outline"}
            onClick={() => selectPaymentMethod("cash")}
            leftIcon={<DollarOutlined />}
            className={`!h-11 !flex-col !gap-1 !rounded-xl ${
              paymentMethod === "cash"
                ? "!bg-emerald-600 !border-emerald-600 !text-white"
                : "!border-slate-200 !text-slate-700"
            }`}
          >
            <span className="text-[11px] font-bold">Tiền Mặt</span>
          </Button>
          <Button
            variant={paymentMethod === "vnpay" ? "primary" : "outline"}
            onClick={() => selectPaymentMethod("vnpay")}
            leftIcon={<QrcodeOutlined />}
            className={`!h-11 !flex-col !gap-1 !rounded-xl ${
              paymentMethod === "vnpay"
                ? "!bg-emerald-600 !border-emerald-600 !text-white"
                : "!border-slate-200 !text-slate-700"
            }`}
          >
            <span className="text-[11px] font-bold">Chuyển Khoản QR</span>
          </Button>
          <Button
            variant={paymentMethod === "split" ? "primary" : "outline"}
            onClick={() => selectPaymentMethod("split")}
            leftIcon={<SwapOutlined />}
            className={`!h-11 !flex-col !gap-1 !rounded-xl ${
              paymentMethod === "split"
                ? "!bg-emerald-600 !border-emerald-600 !text-white"
                : "!border-slate-200 !text-slate-700"
            }`}
          >
            <span className="text-[11px] font-bold">Tiền Mặt + QR</span>
          </Button>
        </div>
      </div>

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
                className="!h-9 !px-2.5 !text-xs"
              >
                Đủ tiền
              </Button>
            </div>
          </div>
          {actualCashReceived === totalDue ? (
            <div className="flex justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-800">
              <span>Khách trả đủ tiền mặt ({formatMoney(totalDue)})</span>
              <strong>Tiền thừa: 0đ</strong>
            </div>
          ) : actualCashReceived > totalDue ? (
            <div className="flex justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-900">
              <span>Tiền thừa trả khách:</span>
              <strong className="font-mono">{formatMoney(actualCashReceived - totalDue)}</strong>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
              <span className="text-[11px] text-amber-900">
                Khách đưa còn thiếu: <strong>{formatMoney(totalDue - actualCashReceived)}</strong>
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setPaymentMethod("split");
                  setCashReceived(actualCashReceived);
                }}
                leftIcon={<QrcodeOutlined />}
                className="!h-7 !px-2.5 !text-[11px]"
              >
                Quét QR phần thiếu
              </Button>
            </div>
          )}
        </div>
      )}

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
            >
              50% ({formatMoney(Math.floor(totalDue / 2))})
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCashReceived(0)}>
              0đ tiền mặt
            </Button>
            <span className="ml-auto font-bold text-indigo-900">
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

      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-900">
        <InfoCircleOutlined className="mt-0.5 shrink-0" />
        <div>
          Khách đã gửi yêu cầu thanh toán. Chọn phương thức thực tế và chỉ xác nhận sau khi đã thu đủ tiền.
          <div className="mt-1 text-[11px] text-blue-700">
            Yêu cầu lúc {new Date(request.requestedAt).toLocaleTimeString("vi-VN")}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
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
        >
          Xác nhận & In Hóa Đơn
        </Button>
      </div>
    </div>
  );
}

export default function CustomerPaymentRequests() {
  const [requests, setRequests] = useState<CheckoutRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workingKey, setWorkingKey] = useState("");
  const [confirmingRequest, setConfirmingRequest] = useState<CheckoutRequest | null>(null);
  const [paidSummary, setPaidSummary] = useState<CheckoutReceipt | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setRequests(await staffOrderService.getPaymentRequests());
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể tải yêu cầu thanh toán");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => void loadRequests(), 0);
    const timer = window.setInterval(() => void loadRequests(), 10000);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(timer);
    };
  }, [loadRequests]);

  const resolve = async (
    request: CheckoutRequest,
    approved: boolean,
    payment?: {
      paymentMethod: CheckoutPaymentMethod;
      paymentDetails: CheckoutPaymentDetails;
    },
  ) => {
    const key = `${request.tableId}:${request.sessionId}`;
    setWorkingKey(key);
    try {
      const result = await staffOrderService.resolvePaymentRequest(
        request.tableId,
        request.sessionId,
        approved,
        payment,
      );
      if (result.status === "paid") {
        setOpen(false);
        setConfirmingRequest(null);
        message.success("Đã xác nhận thanh toán. Có thể in hóa đơn cho khách.");
        setPaidSummary(result.receipt);
      } else {
        message.success("Đã từ chối yêu cầu thanh toán");
      }
      await loadRequests();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể xử lý yêu cầu");
    } finally {
      setWorkingKey("");
    }
  };

  if (requests.length === 0 && !confirmingRequest && !paidSummary) {
    return null;
  }

  return (
    <>
      {requests.length > 0 && (
        <Button
          variant="primary"
          size="sm"
          icon={<BellOutlined className="animate-bounce" />}
          className="!rounded-xl !text-xs !h-8 !px-3 font-bold !bg-rose-600 hover:!bg-rose-700 !border-rose-600 text-white animate-pulse shadow-sm shrink-0"
          onClick={() => setOpen(true)}
        >
          Khách gọi thanh toán ({requests.length})
        </Button>
      )}
      <Modal
        title={
          confirmingRequest ? (
            <span className="font-bold">
              <DollarOutlined className="mr-2 text-emerald-600" />
              Thanh Toán Bàn - {confirmingRequest.tableCode}
            </span>
          ) : (
            "Yêu cầu thanh toán tại bàn"
          )
        }
        open={open}
        onCancel={() => {
          if (confirmingRequest) setConfirmingRequest(null);
          else setOpen(false);
        }}
        footer={null}
        width={620}
        afterOpenChange={(visible) => {
          if (visible) void loadRequests();
        }}
      >
        {confirmingRequest ? (
          <div className="max-h-[70vh] overflow-y-auto">
            <PaymentConfirmation
              key={`${confirmingRequest.tableId}:${confirmingRequest.sessionId}`}
              request={confirmingRequest}
              loading={workingKey === `${confirmingRequest.tableId}:${confirmingRequest.sessionId}`}
              onCancel={() => setConfirmingRequest(null)}
              onConfirm={(paymentMethod, paymentDetails) =>
                void resolve(confirmingRequest, true, { paymentMethod, paymentDetails })
              }
            />
          </div>
        ) : (
          <div className="max-h-[65vh] space-y-3 overflow-y-auto py-2">
            {loading && !requests.length ? (
              <Text type="secondary">Đang tải yêu cầu…</Text>
            ) : requests.length ? (
              requests.map((request) => {
                const key = `${request.tableId}:${request.sessionId}`;
                return (
                  <Card key={key} size="small">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Text strong>{request.tableCode} · {request.tableName}</Text>
                        <div><Text>{request.customerName}</Text></div>
                        <Text type="secondary">{request.customerPhone || "Chưa có SĐT"}</Text>
                        <div>
                          <Tag color="blue">Khách gọi thanh toán</Tag>
                          {request.voucherCode && <Tag color="purple">Voucher {request.voucherCode}</Tag>}
                        </div>
                        <Text type="secondary" className="text-xs">
                          Yêu cầu lúc {new Date(request.requestedAt).toLocaleTimeString("vi-VN")}
                        </Text>
                      </div>
                      <div className="text-right">
                        <Text strong className="block text-lg">
                          {request.totalDue.toLocaleString("vi-VN")}đ
                        </Text>
                        <Space className="mt-2">
                          <Button
                            size="sm"
                            variant="danger-outline"
                            icon={<CloseOutlined />}
                            loading={workingKey === key}
                            onClick={() => void resolve(request, false)}
                          >
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            icon={<CheckOutlined />}
                            loading={workingKey === key}
                            onClick={() => setConfirmingRequest(request)}
                          >
                            Xác nhận
                          </Button>
                        </Space>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Text type="secondary">Không có yêu cầu thanh toán đang chờ.</Text>
            )}
          </div>
        )}
      </Modal>
      <PosReceiptModal
        open={paidSummary !== null}
        onClose={() => setPaidSummary(null)}
        paidSummary={paidSummary}
      />
    </>
  );
}
