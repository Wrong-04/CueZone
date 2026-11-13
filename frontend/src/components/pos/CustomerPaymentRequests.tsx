import { useCallback, useEffect, useState } from "react";
import {
  CheckOutlined,
  CloseOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  DollarOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from "../../shared/ui";
import {
  staffOrderService,
  type CheckoutRequest,
} from "../../services/customer-order.service";
import type { CheckoutReceipt } from "../../types/pos";
import PosReceiptModal from "../../pages/pos/modals/PosReceiptModal";
import { getTypeLabel } from "../../pages/pos/constants/posConstants";

const { Text } = Typography;

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
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
  onConfirm: () => void;
}) {
  const activeOrders = request.orders.filter(
    (order) => order.status !== "cancelled" && order.quantity > 0,
  );
  const paymentMethodLabel =
    request.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản QR";

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

      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-900">
        <InfoCircleOutlined className="mt-0.5 shrink-0" />
        <div>
          Khách chọn <strong>{paymentMethodLabel}</strong>. Chỉ xác nhận khi đã nhận đủ tiền.
          <div className="mt-1 text-[11px] text-blue-700">
            Yêu cầu lúc {new Date(request.requestedAt).toLocaleTimeString("vi-VN")}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Quay lại
        </Button>
        <Button icon={<CheckOutlined />} loading={loading} onClick={onConfirm}>
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

  const resolve = async (request: CheckoutRequest, approved: boolean) => {
    const key = `${request.tableId}:${request.sessionId}`;
    setWorkingKey(key);
    try {
      const result = await staffOrderService.resolvePaymentRequest(
        request.tableId,
        request.sessionId,
        approved,
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
              request={confirmingRequest}
              loading={workingKey === `${confirmingRequest.tableId}:${confirmingRequest.sessionId}`}
              onCancel={() => setConfirmingRequest(null)}
              onConfirm={() => void resolve(confirmingRequest, true)}
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
                          <Tag color={request.paymentMethod === "cash" ? "gold" : "blue"}>
                            {request.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
                          </Tag>
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
