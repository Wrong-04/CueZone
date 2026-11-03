import { useCallback, useEffect, useState } from "react";
import { CheckOutlined, ClockCircleOutlined, ReloadOutlined, ShoppingOutlined } from "@ant-design/icons";
import { Button, Card, Tag } from "../../shared/ui";
import CustomerPaymentRequests from "../../components/pos/CustomerPaymentRequests";
import {
  staffOrderService,
  type CustomerOrder,
  type CustomerOrderStatus,
} from "../../services/customer-order.service";

const statusLabels: Record<CustomerOrderStatus, string> = {
  pending: "Chờ xác nhận",
  preparing: "Đang chuẩn bị",
  ready: "Sẵn sàng",
  served: "Đã phục vụ",
  rejected: "Đã từ chối",
};

const nextStatus: Partial<Record<CustomerOrderStatus, CustomerOrderStatus>> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

function money(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export default function FnbOrderQueuePage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      setOrders(await staffOrderService.getQueue());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải order tại bàn");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadOrders(), 0);
    const interval = window.setInterval(() => void loadOrders(false), 15000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadOrders]);

  const updateStatus = async (
    order: CustomerOrder,
    status: CustomerOrderStatus,
    rejectedReason?: string,
  ) => {
    setBusyId(order._id);
    setError("");
    try {
      await staffOrderService.updateStatus(order._id, status, rejectedReason);
      await loadOrders(false);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Không thể cập nhật order");
    } finally {
      setBusyId(null);
    }
  };

  const rejectOrder = (order: CustomerOrder) => {
    const reason = window.prompt(`Lý do từ chối order ${order.orderCode}:`);
    if (!reason?.trim()) return;
    void updateStatus(order, "rejected", reason.trim());
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ShoppingOutlined className="text-emerald-600" /> Order F&B tại bàn
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xác nhận món trước khi cộng vào hóa đơn phiên bàn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CustomerPaymentRequests />
          <Button variant="outline" leftIcon={<ReloadOutlined />} onClick={() => void loadOrders()}>
            Tải lại
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <Card className="!rounded-2xl !border-slate-200">
          <p className="py-8 text-center text-slate-500">Đang tải order...</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="!rounded-2xl !border-slate-200">
          <p className="py-8 text-center text-slate-500">Hiện không có order cần xử lý.</p>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {orders.map((order) => {
            const next = nextStatus[order.status];
            return (
              <Card
                key={order._id}
                className="!rounded-2xl !border-slate-200"
                title={
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>{order.orderCode} · {order.tableName} ({order.tableCode})</span>
                    <Tag color={order.status === "pending" ? "gold" : "blue"}>
                      {statusLabels[order.status]}
                    </Tag>
                  </div>
                }
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ClockCircleOutlined />
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-3">
                    {order.items.map((item) => (
                      <div key={item.productId} className="flex justify-between gap-3 py-2 text-sm">
                        <span>{item.name} x{item.quantity}</span>
                        <span>{money(item.unitPrice * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 text-sm font-bold">
                      <span>Tổng cộng</span><span>{money(order.totalAmount)}</span>
                    </div>
                  </div>
                  {order.note && (
                    <p className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900">
                      Ghi chú: {order.note}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    {order.status === "pending" && (
                      <Button
                        variant="danger-outline"
                        disabled={busyId === order._id}
                        onClick={() => rejectOrder(order)}
                      >
                        Từ chối
                      </Button>
                    )}
                    {next && (
                      <Button
                        variant="primary"
                        loading={busyId === order._id}
                        leftIcon={<CheckOutlined />}
                        onClick={() => void updateStatus(order, next)}
                      >
                        {order.status === "pending"
                          ? "Xác nhận & chuẩn bị"
                          : order.status === "preparing"
                            ? "Món đã sẵn sàng"
                            : "Đã phục vụ"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
