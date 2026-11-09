import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CoffeeOutlined,
  InfoCircleOutlined,
  ShoppingOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Button,
  Drawer,
  Input,
  Modal,
  Space,
  Tooltip,
  message,
  notification,
} from "../../shared/ui";
import {
  staffOrderService,
  type CustomerOrder,
  type CustomerOrderStatus,
} from "../../services/customer-order.service";
import { getSocket } from "../../services/socket.service";
import { playOrderChime } from "../../utils/sound";

const statusConfig: Record<
  CustomerOrderStatus,
  { label: string; color: string; tagBg: string }
> = {
  pending: { label: "Chờ xác nhận", color: "orange", tagBg: "bg-amber-50 text-amber-800 border-amber-300" },
  preparing: { label: "Đang pha chế / Bếp", color: "blue", tagBg: "bg-blue-50 text-blue-800 border-blue-200" },
  ready: { label: "Sẵn sàng phục vụ", color: "cyan", tagBg: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  served: { label: "Đã phục vụ", color: "default", tagBg: "bg-slate-100 text-slate-600 border-slate-200" },
  rejected: { label: "Đã từ chối", color: "error", tagBg: "bg-rose-50 text-rose-700 border-rose-200" },
};

const rejectTemplates = [
  "Món tạm hết tồn kho",
  "Hết đá / Nguyên liệu pha chế",
  "Quầy Bar/Bếp đang quá tải",
  "Quán sắp đến giờ chốt ca",
];

interface Props {
  onOrdersUpdated?: (orders: CustomerOrder[]) => void;
}

export const CustomerOrderDrawer: React.FC<Props> = ({ onOrdersUpdated }) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "preparing" | "ready">("all");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRejectOrder, setTargetRejectOrder] = useState<CustomerOrder | null>(null);
  const [selectedRejectTemplate, setSelectedRejectTemplate] = useState<string>(rejectTemplates[0]);
  const [customRejectReason, setCustomRejectReason] = useState<string>("");

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders],
  );

  const loadOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await staffOrderService.getQueue();
      setOrders(data);
      onOrdersUpdated?.(data);
    } catch {
      // Bỏ qua lỗi ngầm nếu là silent polling
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [onOrdersUpdated]);

  // Khởi tạo polling và lắng nghe Socket.io realtime
  useEffect(() => {
    void loadOrders();
    const interval = setInterval(() => void loadOrders(true), 15000);

    const socket = getSocket();
    const handleNewOrder = (order: CustomerOrder) => {
      playOrderChime();
      notification.info({
        icon: <BellOutlined className="text-amber-500" />,
        message: "Có đơn gọi món trực tuyến mới!",
        description: `Bàn ${order.tableName} vừa gửi đơn gồm ${order.items.length} món (${order.totalAmount.toLocaleString("vi-VN")}đ). Vui lòng mở Drawer để kiểm tra và duyệt món!`,
        placement: "topRight",
        duration: 8,
      });
      void loadOrders(true);
    };

    const handleStatusChanged = () => {
      void loadOrders(true);
    };

    socket.on("customer-order:new", handleNewOrder);
    socket.on("customer-order:status_changed", handleStatusChanged);

    return () => {
      clearInterval(interval);
      socket.off("customer-order:new", handleNewOrder);
      socket.off("customer-order:status_changed", handleStatusChanged);
    };
  }, [loadOrders]);

  const handleUpdateStatus = async (
    order: CustomerOrder,
    nextStatus: CustomerOrderStatus,
    reason?: string,
  ) => {
    setBusyOrderId(order._id);
    try {
      await staffOrderService.updateStatus(order._id, nextStatus, reason);
      message.success(
        nextStatus === "preparing"
          ? `Đã xác nhận đơn cho ${order.tableName}! Món đã được cộng vào hóa đơn bàn.`
          : nextStatus === "ready"
            ? `Đã báo xong món cho ${order.tableName}!`
            : nextStatus === "served"
              ? `Đã hoàn tất phục vụ đơn của ${order.tableName}`
              : `Đã từ chối đơn của ${order.tableName}`,
      );
      await loadOrders(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Không thể cập nhật trạng thái đơn";
      message.error(errorMsg);
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!targetRejectOrder) return;
    const finalReason = customRejectReason.trim() || selectedRejectTemplate;
    setRejectModalOpen(false);
    await handleUpdateStatus(targetRejectOrder, "rejected", finalReason);
    setTargetRejectOrder(null);
    setCustomRejectReason("");
  };

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  return (
    <>
      {/* Nút bấm hiển thị Badge đỏ cam trên thanh công cụ POS */}
      <Tooltip title={pendingCount > 0 ? `Có ${pendingCount} đơn gọi món cần duyệt ngay!` : "Danh sách đơn gọi món trực tuyến tại bàn"}>
        <Button
          variant={pendingCount > 0 ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setDrawerOpen(true);
            void loadOrders();
          }}
          leftIcon={
            <ShoppingOutlined
              className={pendingCount > 0 ? "text-amber-300 animate-bounce text-sm" : "text-amber-600 text-sm"}
            />
          }
          className={`!rounded-xl !text-xs !h-8 !px-3 font-bold transition-all shadow-2xs ${
            pendingCount > 0
              ? "!bg-gradient-to-r !from-amber-600 !to-rose-600 hover:!from-amber-700 hover:!to-rose-700 !border-none text-white animate-pulse"
              : "!border-amber-200 !bg-amber-50/70 !text-amber-900 hover:!bg-amber-100"
          }`}
        >
          <span>Đơn gọi món</span>
          {pendingCount > 0 ? (
            <span className="ml-1 px-1.5 py-0.2 bg-white text-rose-700 font-extrabold rounded-full text-[10px] shadow-xs">
              {pendingCount}
            </span>
          ) : (
            orders.length > 0 && (
              <span className="ml-1 text-[11px] text-amber-700 font-medium">
                ({orders.length})
              </span>
            )
          )}
        </Button>
      </Tooltip>

      {/* Drawer trượt từ bên phải */}
      <Drawer
        title={
          <div className="flex items-center justify-between gap-3 pr-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-base">
                <CoffeeOutlined />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight">
                  Tiếp Nhận Đơn Gọi Món Trực Tuyến
                </h3>
                <p className="text-[11px] text-slate-500 font-normal">
                  Đơn khách gửi từ điện thoại qua QR tại bàn
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadOrders()}
              icon={<SyncOutlined spin={loading} className="text-xs" />}
              className="!h-7 !px-2 !rounded-lg text-xs"
            >
              Làm mới
            </Button>
          </div>
        }
        placement="right"
        width={500}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-4">
          {/* Tabs bộ lọc trạng thái */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                activeFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tất cả ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("pending")}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                activeFilter === "pending"
                  ? "bg-amber-500 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-amber-800"
              }`}
            >
              Chờ duyệt ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("preparing")}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                activeFilter === "preparing"
                  ? "bg-blue-600 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-blue-800"
              }`}
            >
              Đang làm ({orders.filter((o) => o.status === "preparing").length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("ready")}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                activeFilter === "ready"
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-emerald-800"
              }`}
            >
              Sẵn sàng ({orders.filter((o) => o.status === "ready").length})
            </button>
          </div>

          {/* Danh sách đơn hàng */}
          {loading && orders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <SyncOutlined spin className="text-xl text-amber-500" />
              <div>Đang tải danh sách đơn gọi món...</div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 space-y-1">
              <ShoppingOutlined className="text-3xl text-slate-300 mb-2" />
              <div className="font-semibold text-slate-700">Không có đơn gọi món nào</div>
              <div className="text-slate-400 text-[11px]">
                Khi khách tại bàn gửi order qua điện thoại, thông báo và đơn sẽ hiện ngay tại đây.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const isPending = order.status === "pending";
                const isPreparing = order.status === "preparing";
                const isReady = order.status === "ready";
                const isBusy = busyOrderId === order._id;
                const statusMeta = statusConfig[order.status] || statusConfig.pending;

                return (
                  <div
                    key={order._id}
                    className={`rounded-2xl border transition-all p-3.5 space-y-3 shadow-2xs ${
                      isPending
                        ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    {/* Header đơn */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-700 text-white text-xs font-black tracking-tight">
                            {order.tableName}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-500">
                            #{order.orderCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                          <ClockCircleOutlined className="text-slate-400 text-[10px]" />
                          <span>
                            {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            ({new Date(order.createdAt).toLocaleDateString("vi-VN")})
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.tagBg}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    {/* Danh sách món */}
                    <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-2.5 space-y-1.5 text-xs">
                      {order.items.map((item, idx) => (
                        <div
                          key={`${order._id}-${idx}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex items-center gap-1.5">
                            <span className="font-black text-slate-800 text-xs">
                              {item.quantity}x
                            </span>
                            <span className="truncate text-slate-800 font-medium">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-mono text-slate-600 shrink-0 font-semibold text-[11px]">
                            {(item.unitPrice * item.quantity).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      ))}

                      {/* Ghi chú của khách nếu có */}
                      {order.note && (
                        <div className="pt-1.5 mt-1 border-t border-slate-200/80 text-[11px] text-amber-900 bg-amber-50/90 p-1.5 rounded-lg flex items-start gap-1.5">
                          <InfoCircleOutlined className="text-amber-600 text-xs shrink-0 mt-0.5" />
                          <span>
                            <strong>Ghi chú:</strong> {order.note}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tổng tiền và Nút thao tác */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tổng tiền món:</span>
                        <span className="font-mono font-black text-sm text-emerald-700">
                          {order.totalAmount.toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isPending && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => {
                                setTargetRejectOrder(order);
                                setRejectModalOpen(true);
                              }}
                              leftIcon={<CloseOutlined className="text-rose-500" />}
                              className="!h-8 !px-2.5 !rounded-xl text-xs font-semibold !text-rose-600 !border-rose-200 hover:!bg-rose-50"
                            >
                              Từ chối
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => void handleUpdateStatus(order, "preparing")}
                              leftIcon={<CheckOutlined />}
                              className="!h-8 !px-3 !rounded-xl text-xs font-bold !bg-emerald-600 hover:!bg-emerald-700 text-white shadow-2xs"
                            >
                              Xác nhận duyệt
                            </Button>
                          </>
                        )}

                        {isPreparing && (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handleUpdateStatus(order, "ready")}
                            leftIcon={<CheckOutlined />}
                            className="!h-8 !px-3 !rounded-xl text-xs font-bold !bg-blue-600 hover:!bg-blue-700 text-white shadow-2xs"
                          >
                            Báo xong món
                          </Button>
                        )}

                        {isReady && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handleUpdateStatus(order, "served")}
                            leftIcon={<CheckOutlined className="text-emerald-600" />}
                            className="!h-8 !px-3 !rounded-xl text-xs font-bold !border-emerald-300 !text-emerald-700 hover:!bg-emerald-50"
                          >
                            Đã phục vụ
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Drawer>

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
        okButtonProps={{ danger: true }}
        title={
          <Space align="center" size={8}>
            <CloseOutlined className="text-rose-600" />
            <span className="font-bold text-slate-900 text-sm">
              Từ chối đơn gọi món - {targetRejectOrder?.tableName}
            </span>
          </Space>
        }
      >
        <div className="py-3 space-y-3.5 text-xs">
          <p className="text-slate-600">
            Khách sẽ nhận được thông báo về lý do từ chối đơn món này. Vui lòng chọn lý do nhanh:
          </p>

          <div className="space-y-1.5">
            {rejectTemplates.map((template) => (
              <div
                key={template}
                onClick={() => {
                  setSelectedRejectTemplate(template);
                  setCustomRejectReason("");
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedRejectTemplate === template && !customRejectReason
                    ? "bg-rose-50/70 border-rose-300 text-rose-950 font-bold"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{template}</span>
                {selectedRejectTemplate === template && !customRejectReason && (
                  <CheckOutlined className="text-rose-600 text-xs" />
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Hoặc nhập lý do khác:
            </label>
            <Input.TextArea
              rows={2}
              placeholder="Nhập lý do cụ thể gửi tới khách..."
              value={customRejectReason}
              onChange={(e) => setCustomRejectReason(e.target.value)}
              className="!rounded-xl text-xs"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CustomerOrderDrawer;
