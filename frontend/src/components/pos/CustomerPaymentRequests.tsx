import { useCallback, useEffect, useState } from "react";
import { CheckOutlined, CloseOutlined, WalletOutlined } from "@ant-design/icons";
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

const { Text } = Typography;

export default function CustomerPaymentRequests() {
  const [requests, setRequests] = useState<CheckoutRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workingKey, setWorkingKey] = useState("");

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
      await staffOrderService.resolvePaymentRequest(
        request.tableId,
        request.sessionId,
        approved,
      );
      message.success(approved ? "Đã xác nhận thanh toán" : "Đã từ chối yêu cầu thanh toán");
      await loadRequests();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể xử lý yêu cầu");
    } finally {
      setWorkingKey("");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        icon={<WalletOutlined />}
        className="!rounded-xl !text-xs !h-8"
        onClick={() => setOpen(true)}
      >
        Thanh toán chờ {requests.length ? `(${requests.length})` : ""}
      </Button>
      <Modal
        title="Yêu cầu thanh toán tại bàn"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={620}
        afterOpenChange={(visible) => {
          if (visible) void loadRequests();
        }}
      >
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
                          onClick={() => void resolve(request, true)}
                        >
                          Đã nhận tiền
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
      </Modal>
    </>
  );
}
