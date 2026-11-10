import { useCallback, useEffect, useState } from "react";
import {
  CheckOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  ShoppingOutlined,
  PrinterOutlined,
  CloseOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { Button, Card, Tag, Modal, Input, message, Tooltip } from "../../shared/ui";
import CustomerPaymentRequests from "../../components/pos/CustomerPaymentRequests";
import {
  staffOrderService,
  type CustomerOrder,
  type CustomerOrderStatus,
} from "../../services/customer-order.service";

const statusLabels: Record<CustomerOrderStatus, { text: string; color: string }> = {
  pending: { text: "Chờ xác nhận", color: "gold" },
  preparing: { text: "Đang chuẩn bị", color: "blue" },
  ready: { text: "Sẵn sàng phục vụ", color: "cyan" },
  served: { text: "Đã phục vụ", color: "default" },
  rejected: { text: "Đã từ chối", color: "error" },
};

const nextStatus: Partial<Record<CustomerOrderStatus, CustomerOrderStatus>> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

const rejectTemplates = [
  "Món tạm hết tồn kho",
  "Hết đá / Nguyên liệu pha chế",
  "Quầy Bar/Bếp đang quá tải",
  "Quán sắp đến giờ chốt ca",
];

function money(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export default function FnbOrderQueuePage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRejectOrder, setTargetRejectOrder] = useState<CustomerOrder | null>(null);
  const [selectedRejectTemplate, setSelectedRejectTemplate] = useState<string>(rejectTemplates[0]);
  const [customRejectReason, setCustomRejectReason] = useState<string>("");

  const loadOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      setOrders(await staffOrderService.getQueue());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách đơn tại bàn");
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
      message.success(
        status === "preparing"
          ? `Đã duyệt đơn cho ${order.tableName}! Món đã được cộng vào hóa đơn bàn.`
          : status === "ready"
            ? `Đã báo xong món cho ${order.tableName}!`
            : status === "served"
              ? `Đã hoàn tất phục vụ đơn của ${order.tableName}`
              : `Đã từ chối đơn của ${order.tableName}`,
      );
      await loadOrders(false);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Không thể cập nhật order");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!targetRejectOrder) return;
    const finalReason = customRejectReason.trim() || selectedRejectTemplate;
    setRejectModalOpen(false);
    await updateStatus(targetRejectOrder, "rejected", finalReason);
    setTargetRejectOrder(null);
    setCustomRejectReason("");
  };

  const handlePrintTicket = (order: CustomerOrder) => {
    const printWindow = window.open("", "_blank", "width=380,height=560");
    if (!printWindow) {
      message.warning("Vui lòng cho phép mở popup để in phiếu order");
      return;
    }
    const itemsHtml = order.items
      .map(
        (item) => `
        <tr style="border-bottom: 1px dashed #bbb;">
          <td style="padding: 7px 0; font-weight: bold; font-size: 13px;">${item.name}</td>
          <td style="padding: 7px 0; text-align: center; font-size: 15px; font-weight: 900;">x${item.quantity}</td>
        </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Phiếu Bếp / Kho - ${order.tableName}</title>
          <style>
            body { font-family: monospace, sans-serif; padding: 12px; max-width: 280px; margin: 0 auto; color: #000; }
            h2 { text-align: center; margin: 0; font-size: 17px; }
            p { margin: 4px 0; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .badge { font-size: 15px; font-weight: bold; text-align: center; background: #e5e7eb; padding: 5px; border-radius: 4px; margin: 6px 0; }
          </style>
        </head>
        <body>
          <h2>CUEZONE CLUB</h2>
          <p style="text-align: center; font-size: 11px;">PHIẾU ORDER TẠI BÀN (BẾP / BAR / KHO)</p>
          <div class="divider"></div>
          <div class="badge">${order.tableName}</div>
          <p>Mã đơn: <strong>#${order.orderCode}</strong></p>
          <p>Giờ gọi: ${new Date(order.createdAt).toLocaleTimeString("vi-VN")} (${new Date(order.createdAt).toLocaleDateString("vi-VN")})</p>
          ${order.note ? `<p style="background: #fef3c7; padding: 4px; border: 1px solid #fde68a;">Ghi chú: <strong>${order.note}</strong></p>` : ""}
          <div class="divider"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000; text-align: left; font-size: 11px;">
                <th>TÊN MÓN / PHỤ KIỆN</th>
                <th style="text-align: center;">SL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="divider"></div>
          <p style="text-align: center; font-size: 10px;">--- Vui lòng chuẩn bị và giao ra bàn ---</p>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-0">
            <ShoppingOutlined className="text-emerald-600" /> Tiếp Nhận Đơn Order & Dịch Vụ Tại Bàn
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Xác nhận món & phụ kiện trước khi tự động trừ kho và cộng vào hóa đơn phiên bàn.
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
          <p className="py-8 text-center text-slate-500">Đang tải danh sách đơn...</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="!rounded-2xl !border-slate-200">
          <p className="py-8 text-center text-slate-500">Hiện không có đơn nào cần xử lý.</p>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {orders.map((order) => {
            const next = nextStatus[order.status];
            const meta = statusLabels[order.status] || statusLabels.pending;
            return (
              <Card
                key={order._id}
                className={`!rounded-2xl border transition-all ${
                  order.status === "pending"
                    ? "!border-amber-300 !bg-amber-50/20 ring-1 ring-amber-200"
                    : "!border-slate-200 !bg-white"
                }`}
                title={
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-700 text-white text-xs font-black">
                        {order.tableName}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-500">
                        #{order.orderCode}
                      </span>
                    </div>
                    <Tag color={meta.color}>{meta.text}</Tag>
                  </div>
                }
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ClockCircleOutlined />
                    <span>
                      {new Date(order.createdAt).toLocaleTimeString("vi-VN")}{" "}
                      ({new Date(order.createdAt).toLocaleDateString("vi-VN")})
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-3">
                    {order.items.map((item, idx) => (
                      <div key={`${item.productId}-${idx}`} className="flex justify-between gap-3 py-2 text-xs">
                        <span className="font-medium text-slate-800">
                          <strong>{item.quantity}x</strong> {item.name}
                        </span>
                        <span className="font-mono font-semibold text-slate-700">
                          {money(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2.5 text-xs font-bold border-t border-slate-200">
                      <span className="text-slate-600">Tổng cộng tiền món:</span>
                      <span className="font-mono text-sm text-emerald-700">{money(order.totalAmount)}</span>
                    </div>
                  </div>

                  {order.note && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 text-xs text-amber-900 flex items-start gap-1.5">
                      <InfoCircleOutlined className="text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Ghi chú:</strong> {order.note}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-2">
                    <Tooltip title="In phiếu báo Bếp / Bar / Kho (80mm)">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintTicket(order)}
                        icon={<PrinterOutlined className="text-slate-600" />}
                        className="!h-8 !px-2.5 !rounded-xl !border-slate-300 hover:!bg-slate-100 text-xs font-semibold"
                      >
                        In phiếu
                      </Button>
                    </Tooltip>

                    <div className="flex items-center gap-1.5">
                      {order.status === "pending" && (
                        <Button
                          variant="danger-outline"
                          size="sm"
                          disabled={busyId === order._id}
                          onClick={() => {
                            setTargetRejectOrder(order);
                            setRejectModalOpen(true);
                          }}
                          leftIcon={<CloseOutlined className="text-rose-500" />}
                          className="!h-8 !px-2.5 !rounded-xl text-xs font-semibold !text-rose-600 !border-rose-200 hover:!bg-rose-50"
                        >
                          Từ chối
                        </Button>
                      )}
                      {next && (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={busyId === order._id}
                          leftIcon={<CheckOutlined />}
                          onClick={() => void updateStatus(order, next)}
                          className={`!h-8 !px-3 !rounded-xl text-xs font-bold text-white shadow-2xs ${
                            order.status === "pending"
                              ? "!bg-emerald-600 hover:!bg-emerald-700"
                              : order.status === "preparing"
                                ? "!bg-blue-600 hover:!bg-blue-700"
                                : "!bg-emerald-600 hover:!bg-emerald-700"
                          }`}
                        >
                          {order.status === "pending"
                            ? "Xác nhận duyệt"
                            : order.status === "preparing"
                              ? "Báo xong món"
                              : "Đã phục vụ"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal từ chối đơn kèm lý do nhanh */}
      <Modal
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          setTargetRejectOrder(null);
        }}
        onOk={() => void handleConfirmReject()}
        okText="Xác nhận từ chối"
        cancelText="Hủy bỏ"
        title={
          <span className="text-rose-700 font-bold flex items-center gap-2">
            <CloseOutlined />
            <span>Từ Chối Đơn Order {targetRejectOrder?.tableName}</span>
          </span>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <p className="text-slate-600 mb-0">
            Vui lòng chọn hoặc nhập lý do từ chối để hệ thống gửi thông báo rõ ràng cho khách:
          </p>

          <div className="space-y-2">
            <label className="font-bold text-slate-700 block">Chọn lý do phổ biến:</label>
            <div className="grid grid-cols-1 gap-1.5">
              {rejectTemplates.map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setSelectedRejectTemplate(template)}
                  className={`text-left p-2.5 rounded-xl border transition cursor-pointer text-xs ${
                    selectedRejectTemplate === template
                      ? "bg-rose-50 border-rose-400 text-rose-900 font-bold ring-1 ring-rose-300"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {template}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Hoặc nhập lý do chi tiết khác:</label>
            <Input.TextArea
              rows={2}
              value={customRejectReason}
              onChange={(e) => setCustomRejectReason(e.target.value)}
              placeholder="Ví dụ: Bàn đang chờ tính tiền trả bàn..."
              className="!rounded-xl"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
