// ============================================================================
// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU: DRAWER TIẾP NHẬN ORDER F&B TỪ KHÁCH QUA QR
// Khách hàng (/customer/fnb) -> POST /customer/fnb-orders -> Socket `customer-order:new`
//   -> CustomerOrderDrawer -> staffOrderService.getQueue() / updateStatus()
//   -> Backend: CustomerOrderService.updateStatus() (duyệt -> trừ tồn kho & cộng món vào bàn)
// ----------------------------------------------------------------------------
// 1. IMPORTS
// ============================================================================
// 1.1 Thư viện bên ngoài
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BellOutlined, ShoppingOutlined, SyncOutlined } from "@ant-design/icons";

// 1.2 UI Components, Services & Tiện ích nội bộ
import { Button, Drawer, Tooltip, message, notification } from "../../shared/ui";
import {
  staffOrderService,
  type CustomerOrder,
  type CustomerOrderStatus,
} from "../../services/customer-order.service";
import { getSocket } from "../../services/socket.service";
import { playOrderChime } from "../../utils/sound";

// 1.3 Sub-components & Modals
import { CustomerOrderCard } from "./customer-order/CustomerOrderCard";
import { CustomerOrderRejectModal } from "./customer-order/CustomerOrderRejectModal";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface CustomerOrderDrawerProps {
  onOrdersUpdated?: (orders: CustomerOrder[]) => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  filterTableId?: string | null;
}

type OrderFilterTab = "all" | "pending" | "preparing" | "ready";

// ============================================================================
// 3. CONSTANTS & HELPERS
// ============================================================================
const REJECT_TEMPLATES = [
  "Món tạm hết tồn kho",
  "Hết đá / Nguyên liệu pha chế",
  "Quầy Bar/Bếp đang quá tải",
  "Quán sắp đến giờ chốt ca",
];

// ============================================================================
// 4. MAIN COMPONENT: DRAWER PHÊ DUYỆT ĐƠN GỌI MÓN TRỰC TUYẾN TRÊN POS
// Đồng bộ đơn khách gọi từ mã QR tại bàn theo thời gian thực qua WebSocket + Polling
// ============================================================================
export const CustomerOrderDrawer: React.FC<CustomerOrderDrawerProps> = ({
  onOrdersUpdated,
  externalOpen,
  onExternalOpenChange,
  filterTableId,
}) => {
  // ── 4.1 Props & Hooks (State) ─────────────────────────────────────────────
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<OrderFilterTab>("all");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  // State modal từ chối đơn gọi món
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRejectOrder, setTargetRejectOrder] = useState<CustomerOrder | null>(null);
  const [selectedRejectTemplate, setSelectedRejectTemplate] = useState<string>(
    REJECT_TEMPLATES[0],
  );
  const [customRejectReason, setCustomRejectReason] = useState<string>("");

  const drawerOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setDrawerOpen = (open: boolean) => {
    if (onExternalOpenChange) {
      onExternalOpenChange(open);
    } else {
      setInternalOpen(open);
    }
  };

  // ── 4.2 Derived State (useMemo) ───────────────────────────────────────────
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders],
  );

  // Lọc đơn theo bàn được chọn (nếu mở từ nút trên card bàn) và theo tab trạng thái
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (filterTableId) {
      list = list.filter((o) => o.tableId === filterTableId || o.tableCode === filterTableId);
    }
    if (activeFilter === "all") return list;
    return list.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter, filterTableId]);

  // ── 4.3 Event Handlers (Nạp đơn, Cập nhật trạng thái, Từ chối đơn) ────────
  /**
   * Tải hàng đợi order F&B trực tuyến từ khách hàng và đồng bộ số lượng đơn chờ lên thẻ bàn POS.
   * Luồng đi: Drawer / Socket / Polling 15s -> staffOrderService.getQueue() -> onOrdersUpdated().
   *
   * @param {boolean} [isSilent=false] - True khi làm mới ngầm (không bật loading)
   * @returns {Promise<void>}
   */
  const loadOrders = useCallback(
    async (isSilent = false) => {
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
    },
    [onOrdersUpdated],
  );

  /**
   * Chuyển trạng thái đơn gọi món của khách (Duyệt pha chế -> Sẵn sàng -> Đã phục vụ hoặc Từ chối).
   * Luồng đi: CustomerOrderCard -> staffOrderService.updateStatus() -> Backend trừ tồn kho & thêm vào bill bàn.
   *
   * @param {CustomerOrder} order - Đơn gọi món F&B của khách
   * @param {CustomerOrderStatus} nextStatus - Trạng thái mục tiêu tiếp theo
   * @param {string} [reason] - Lý do từ chối nếu nextStatus = "rejected"
   * @returns {Promise<void>}
   */
  const handleUpdateStatus = async (
    order: CustomerOrder,
    nextStatus: CustomerOrderStatus,
    reason?: string,
  ) => {
    setBusyOrderId(order._id);
    try {
      try {
        await staffOrderService.updateStatus(order._id, nextStatus, reason);
      } catch (err: any) {
        // Fallback: nếu order đang ở preparing mà chuyển thẳng sang served, đi tuần tự qua ready
        if (order.status === "preparing" && nextStatus === "served") {
          await staffOrderService.updateStatus(order._id, "ready");
          await staffOrderService.updateStatus(order._id, "served");
        } else {
          throw err;
        }
      }
      message.success(
        nextStatus === "preparing"
          ? `Đã xác nhận đơn cho ${order.tableName}! Món đã được cộng vào hóa đơn bàn.`
          : nextStatus === "ready"
            ? `Đã báo xong món cho ${order.tableName}!`
            : nextStatus === "served"
              ? `Đã hoàn tất đơn của ${order.tableName}`
              : `Đã từ chối đơn của ${order.tableName}`,
      );
      // Cập nhật lạc quan state cục bộ ngay lập tức trước khi đồng bộ lại từ server
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? { ...o, status: nextStatus } : o)),
      );
      await loadOrders(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Không thể cập nhật trạng thái đơn";
      message.error(errorMsg);
    } finally {
      setBusyOrderId(null);
    }
  };

  /**
   * Mở modal nhập/chọn lý do khi thu ngân từ chối tiếp nhận đơn gọi món của khách.
   *
   * @param {CustomerOrder} order - Đơn gọi món cần từ chối
   * @returns {void}
   */
  const handleOpenRejectModal = (order: CustomerOrder) => {
    setTargetRejectOrder(order);
    setSelectedRejectTemplate(REJECT_TEMPLATES[0]);
    setCustomRejectReason("");
    setRejectModalOpen(true);
  };

  /**
   * Xác nhận từ chối đơn gọi món với lý do đã chọn hoặc tự nhập.
   *
   * @returns {Promise<void>}
   */
  const handleConfirmReject = async () => {
    if (!targetRejectOrder) return;
    const finalReason = customRejectReason.trim() || selectedRejectTemplate;
    setRejectModalOpen(false);
    await handleUpdateStatus(targetRejectOrder, "rejected", finalReason);
    setTargetRejectOrder(null);
    setCustomRejectReason("");
  };

  // ── 4.4 Effects (Polling định kỳ 15s & Lắng nghe WebSocket thời gian thực) ─
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

  // ── 4.5 Main Render JSX ───────────────────────────────────────────────────
  return (
    <>
      {/* Nút mở Drawer & Badge đếm số đơn chờ duyệt trên thanh POS */}
      <Tooltip
        title={
          pendingCount > 0
            ? `Có ${pendingCount} đơn gọi món cần duyệt ngay!`
            : "Danh sách đơn gọi món trực tuyến tại bàn"
        }
      >
        <Button
          variant={pendingCount > 0 ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setDrawerOpen(true);
            void loadOrders();
          }}
          leftIcon={
            <ShoppingOutlined
              className={
                pendingCount > 0
                  ? "text-amber-300 animate-bounce text-sm"
                  : "text-amber-600 text-sm"
              }
            />
          }
          className={`!rounded-xl !text-xs !h-8 !px-3 font-bold transition-all shadow-2xs whitespace-nowrap ${
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
              <span className="ml-1 text-[11px] text-amber-700 font-medium">({orders.length})</span>
            )
          )}
        </Button>
      </Tooltip>

      {/* Drawer danh sách đơn gọi món */}
      <Drawer
        title={
          <div className="flex items-center justify-between gap-3 pr-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-base shrink-0">
                <ShoppingOutlined />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight whitespace-nowrap">
                  Tiếp Nhận Đơn Order & Dịch Vụ Tại Bàn
                </h3>
                <p className="text-[11px] text-slate-500 font-normal">
                  Yêu cầu đồ uống, món ăn & phụ kiện bida khách gửi từ bàn
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadOrders()}
              icon={<SyncOutlined spin={loading} className="text-xs" />}
              className="!h-7 !px-2 !rounded-lg text-xs whitespace-nowrap"
            >
              Làm mới
            </Button>
          </div>
        }
        placement="right"
        size={500}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-4">
          {/* 4 Tab lọc trạng thái đơn */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto text-xs font-semibold">
            {(
              [
                { key: "all", label: `Tất cả (${orders.length})`, activeClass: "bg-white text-slate-900" },
                { key: "pending", label: `Chờ duyệt (${pendingCount})`, activeClass: "bg-amber-500 text-white" },
                {
                  key: "preparing",
                  label: `Đang làm (${orders.filter((o) => o.status === "preparing").length})`,
                  activeClass: "bg-blue-600 text-white",
                },
                {
                  key: "ready",
                  label: `Sẵn sàng (${orders.filter((o) => o.status === "ready").length})`,
                  activeClass: "bg-emerald-600 text-white",
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                  activeFilter === tab.key
                    ? `${tab.activeClass} shadow-2xs font-bold`
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Danh sách thẻ đơn hàng */}
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
              {filteredOrders.map((order) => (
                <CustomerOrderCard
                  key={order._id}
                  order={order}
                  isBusy={busyOrderId === order._id}
                  onUpdateStatus={(o, status) => void handleUpdateStatus(o, status)}
                  onOpenReject={handleOpenRejectModal}
                />
              ))}
            </div>
          )}
        </div>
      </Drawer>

      {/* Modal chọn hoặc nhập lý do từ chối đơn */}
      <CustomerOrderRejectModal
        open={rejectModalOpen}
        targetOrder={targetRejectOrder}
        selectedTemplate={selectedRejectTemplate}
        customReason={customRejectReason}
        templates={REJECT_TEMPLATES}
        onClose={() => {
          setRejectModalOpen(false);
          setTargetRejectOrder(null);
        }}
        onSelectTemplate={(tmpl) => {
          setSelectedRejectTemplate(tmpl);
          setCustomRejectReason("");
        }}
        onChangeCustomReason={setCustomRejectReason}
        onConfirm={() => void handleConfirmReject()}
      />
    </>
  );
};

export default CustomerOrderDrawer;
