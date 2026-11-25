// ============================================================================
// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU: PHÊ DUYỆT YÊU CẦU THANH TOÁN TỪ KHÁCH TẠI BÀN
// Khách hàng (/customer/fnb) -> POST /customer/fnb-orders/:tableId/checkout
//   -> CustomerPaymentRequests -> staffOrderService.getPaymentRequests() / resolvePaymentRequest()
//   -> Backend: SessionService.resolveCustomerPaymentRequest() -> gọi checkout() & mở PosReceiptModal
// ----------------------------------------------------------------------------
// 1. IMPORTS
// ============================================================================
// 1.1 Thư viện bên ngoài
import { useCallback, useEffect, useState } from "react";
import {
  BellOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
} from "@ant-design/icons";

// 1.2 UI Components & Services nội bộ
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
  type CheckoutPaymentDetails,
  type CheckoutPaymentMethod,
  type CheckoutRequest,
} from "../../services/customer-order.service";

// 1.3 Sub-components & Modals
import PosReceiptModal from "../../pages/pos/modals/PosReceiptModal";
import { PaymentRequestConfirmPanel } from "./payment-requests/PaymentRequestConfirmPanel";

// 1.4 Types
import type { CheckoutReceipt } from "../../types/pos";

// ============================================================================
// 3. CONSTANTS & ALIASES
// ============================================================================
const { Text } = Typography;

// ============================================================================
// 4. MAIN COMPONENT: PHÊ DUYỆT YÊU CẦU THANH TOÁN TỪ BÀN TRÊN MÀN HÌNH POS
// Nhận thông báo khi khách bấm gọi tính tiền trên điện thoại, đối soát & xuất bill K80
// ============================================================================
export default function CustomerPaymentRequests() {
  // ── 4.1 Props & Hooks (State) ─────────────────────────────────────────────
  const [requests, setRequests] = useState<CheckoutRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workingKey, setWorkingKey] = useState("");
  const [confirmingRequest, setConfirmingRequest] = useState<CheckoutRequest | null>(null);
  const [paidSummary, setPaidSummary] = useState<CheckoutReceipt | null>(null);

  // ── 4.3 Event Handlers (Nạp danh sách & Xác nhận/Từ chối thanh toán) ───────
  /**
   * Tải danh sách các bàn có khách bấm gọi thanh toán trực tuyến từ điện thoại.
   * Luồng đi: Polling 10s / mở modal -> staffOrderService.getPaymentRequests() -> GET /customer/fnb-orders/payment-requests.
   *
   * @returns {Promise<void>}
   */
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setRequests(await staffOrderService.getPaymentRequests());
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không thể tải yêu cầu thanh toán",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Duyệt thanh toán (kèm hình thức thu tiền thực tế) hoặc từ chối yêu cầu gọi tính tiền của khách.
   * Luồng đi: PaymentRequestConfirmPanel -> staffOrderService.resolvePaymentRequest() -> trả receipt -> mở PosReceiptModal.
   *
   * @param {CheckoutRequest} request - Thông tin bàn và phiên đang yêu cầu thanh toán
   * @param {boolean} approved - true để xác nhận thu tiền, false để từ chối trả lại trạng thái chơi
   * @param {{ paymentMethod: CheckoutPaymentMethod; paymentDetails: CheckoutPaymentDetails }} [payment] - Phương thức & số tiền thu
   * @returns {Promise<void>}
   */
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

  // ── 4.4 Effects (Polling định kỳ 10s lấy yêu cầu gọi thanh toán mới) ──────
  useEffect(() => {
    const initialFetch = window.setTimeout(() => void loadRequests(), 0);
    const timer = window.setInterval(() => void loadRequests(), 10000);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(timer);
    };
  }, [loadRequests]);

  // ── 4.5 Early Return (Ẩn nút khi chưa có yêu cầu nào và không mở modal) ──
  if (requests.length === 0 && !confirmingRequest && !paidSummary) {
    return null;
  }

  // ── 4.6 Main Render JSX ───────────────────────────────────────────────────
  return (
    <>
      {requests.length > 0 && (
        <Button
          variant="primary"
          size="sm"
          icon={<BellOutlined className="animate-bounce" />}
          className="!rounded-xl !text-xs !h-8 !px-3 font-bold !bg-rose-600 hover:!bg-rose-700 !border-rose-600 text-white animate-pulse shadow-sm shrink-0 whitespace-nowrap"
          onClick={() => setOpen(true)}
        >
          Khách gọi thanh toán ({requests.length})
        </Button>
      )}

      <Modal
        title={
          confirmingRequest ? (
            <span className="font-bold whitespace-nowrap">
              <DollarOutlined className="mr-2 text-emerald-600" />
              Thanh Toán Bàn - {confirmingRequest.tableCode}
            </span>
          ) : (
            <span className="whitespace-nowrap">Yêu cầu thanh toán tại bàn</span>
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
            <PaymentRequestConfirmPanel
              key={`${confirmingRequest.tableId}:${confirmingRequest.sessionId}`}
              request={confirmingRequest}
              loading={
                workingKey === `${confirmingRequest.tableId}:${confirmingRequest.sessionId}`
              }
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
                        <Text strong>
                          {request.tableCode} · {request.tableName}
                        </Text>
                        <div>
                          <Text>{request.customerName}</Text>
                        </div>
                        <Text type="secondary">{request.customerPhone || "Chưa có SĐT"}</Text>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Tag color="blue" className="whitespace-nowrap">
                            Khách gọi thanh toán
                          </Tag>
                          {request.voucherCode && (
                            <Tag color="purple" className="whitespace-nowrap">
                              Voucher {request.voucherCode}
                            </Tag>
                          )}
                        </div>
                        <Text type="secondary" className="text-xs">
                          Yêu cầu lúc {new Date(request.requestedAt).toLocaleTimeString("vi-VN")}
                        </Text>
                      </div>
                      <div className="text-right">
                        <Text strong className="block text-lg whitespace-nowrap">
                          {request.totalDue.toLocaleString("vi-VN")}đ
                        </Text>
                        <Space className="mt-2">
                          <Button
                            size="sm"
                            variant="danger-outline"
                            icon={<CloseOutlined />}
                            loading={workingKey === key}
                            onClick={() => void resolve(request, false)}
                            className="whitespace-nowrap"
                          >
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            icon={<CheckOutlined />}
                            loading={workingKey === key}
                            onClick={() => setConfirmingRequest(request)}
                            className="whitespace-nowrap"
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
