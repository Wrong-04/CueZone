// ============================================================================
// 1. IMPORTS
// ============================================================================
// 1.1 Thư viện bên ngoài & Icons
import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ClockCircleOutlined,
  ReloadOutlined,
  ShoppingOutlined,
  SearchOutlined,
} from "@ant-design/icons";

// 1.2 Hooks, utils, services nội bộ
import { Button, Input, message } from "../../shared/ui";
import {
  staffOrderService,
  type CustomerOrder,
  type CustomerOrderStatus,
} from "../../services/customer-order.service";
import { getSocket } from "../../services/socket.service";

// 1.3 Sub-components, Modals & Tiện ích in ấn
import { FnbQueueKpiCards, type FnbQueueMetrics } from "./fnb-queue/components/FnbQueueKpiCards";
import { FnbQueueOrderCard } from "./fnb-queue/components/FnbQueueOrderCard";
import { FnbQueueRejectModal } from "./fnb-queue/modals/FnbQueueRejectModal";
import { printKitchenTicket } from "./fnb-queue/utils/print-ticket.utils";

// ============================================================================
// 3. CONSTANTS & MAPPINGS
// ============================================================================
const STATUS_LABELS: Record<CustomerOrderStatus, { text: string; color: string }> = {
  pending: { text: "Chờ xác nhận", color: "gold" },
  preparing: { text: "Đang chuẩn bị", color: "blue" },
  ready: { text: "Sẵn sàng phục vụ", color: "cyan" },
  served: { text: "Đã phục vụ", color: "default" },
  rejected: { text: "Đã từ chối", color: "error" },
};

const NEXT_STATUS: Partial<Record<CustomerOrderStatus, CustomerOrderStatus>> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

const REJECT_TEMPLATES = [
  "Món tạm hết tồn kho",
  "Hết đá / Nguyên liệu pha chế",
  "Quầy Bar/Bếp đang quá tải",
  "Quán sắp đến giờ chốt ca",
];

// ============================================================================
// 4. MAIN COMPONENT: HÀNG ĐỢI XỬ LÝ ĐƠN F&B TẠI BÀN (REAL-TIME KITCHEN QUEUE)
// ============================================================================
export default function FnbOrderQueuePage() {
  // ── 4.1 State: Danh sách đơn hàng, Tải dữ liệu, Tìm kiếm ───────────────────
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ── 4.2 State: Modal từ chối đơn hàng ─────────────────────────────────────
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [targetRejectOrder, setTargetRejectOrder] = useState<CustomerOrder | null>(null);
  const [selectedRejectTemplate, setSelectedRejectTemplate] = useState<string>(REJECT_TEMPLATES[0]);
  const [customRejectReason, setCustomRejectReason] = useState<string>("");

  // ── 4.3 Derived State: Tính toán chỉ số KPI hàng đợi bếp & bar ────────────
  const metrics: FnbQueueMetrics = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      ready: orders.filter((o) => o.status === "ready").length,
    };
  }, [orders]);

  // Phân chia danh sách đơn theo trạng thái
  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "pending"),
    [orders],
  );
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status === "preparing" || o.status === "ready"),
    [orders],
  );

  const q = searchQuery.toLowerCase().trim();
  const filteredPendingOrders = useMemo(() => {
    if (!q) return pendingOrders;
    return pendingOrders.filter(
      (o) =>
        o.tableName.toLowerCase().includes(q) ||
        String(o.orderCode).toLowerCase().includes(q) ||
        o.items.some((it) => it.name.toLowerCase().includes(q)),
    );
  }, [pendingOrders, q]);

  const filteredActiveOrders = useMemo(() => {
    if (!q) return activeOrders;
    return activeOrders.filter(
      (o) =>
        o.tableName.toLowerCase().includes(q) ||
        String(o.orderCode).toLowerCase().includes(q) ||
        o.items.some((it) => it.name.toLowerCase().includes(q)),
    );
  }, [activeOrders, q]);

  // ── 4.4 Action Handlers (Nạp đơn, Cập nhật trạng thái, Từ chối đơn) ────────
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

  const handleOpenRejectModal = (order: CustomerOrder) => {
    setTargetRejectOrder(order);
    setSelectedRejectTemplate(REJECT_TEMPLATES[0]);
    setCustomRejectReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!targetRejectOrder) return;
    const finalReason = customRejectReason.trim() || selectedRejectTemplate;
    setRejectModalOpen(false);
    await updateStatus(targetRejectOrder, "rejected", finalReason);
    setTargetRejectOrder(null);
    setCustomRejectReason("");
  };

  // ── 4.5 Effects (Nạp dữ liệu & Socket thời gian thực) ─────────────────────
  useEffect(() => {
    void loadOrders();

    const socket = getSocket();
    if (socket) {
      const handleRealtimeOrder = () => {
        void loadOrders(false);
      };

      socket.on("customer-order:new", handleRealtimeOrder);
      socket.on("customer-order:status_changed", handleRealtimeOrder);

      return () => {
        socket.off("customer-order:new", handleRealtimeOrder);
        socket.off("customer-order:status_changed", handleRealtimeOrder);
      };
    }
  }, [loadOrders]);

  // ── 4.6 Main Render JSX ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* ── 1. TIÊU ĐỀ TRANG VÀ THANH TÌM KIẾM ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingOutlined className="text-emerald-600 text-2xl" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Hàng Đợi Món Bếp & Bar
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Nhận yêu cầu gọi món từ mã QR tại bàn bida thời gian thực. Bếp và quầy Bar làm món theo thứ tự.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-64">
            <Input
              placeholder="Tìm theo bàn, mã đơn, tên món..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefix={<SearchOutlined className="text-slate-400" />}
              allowClear
              className="!rounded-xl text-xs !h-10"
            />
          </div>
          <Button
            variant="outline"
            icon={<ReloadOutlined />}
            onClick={() => void loadOrders()}
            disabled={loading}
            className="!rounded-xl !h-10 text-xs font-semibold !border-slate-200 whitespace-nowrap"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* ── 2. CỤM THẺ KPI HÀNG ĐỢI BẾP & BAR CHUẨN DESIGN SYSTEM ──────────── */}
      <FnbQueueKpiCards metrics={metrics} />

      {/* ── 3. KHỐI ĐƠN MỚI CHỜ DUYỆT ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <ClockCircleOutlined className="text-amber-500" />
          <span className="whitespace-nowrap">Món Mới Khách Gọi ({filteredPendingOrders.length})</span>
        </div>

        {filteredPendingOrders.length === 0 ? (
          <div className="py-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
            {searchQuery ? "Không tìm thấy đơn món nào khớp với từ khóa." : "Hiện không có đơn nào đang chờ nhận."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPendingOrders.map((order) => (
              <FnbQueueOrderCard
                key={order._id}
                order={order}
                isPending={true}
                busy={busyId === order._id}
                onOpenReject={handleOpenRejectModal}
                onPrint={printKitchenTicket}
                onUpdateStatus={updateStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 4. KHỐI ĐƠN ĐANG CHUẨN BỊ & SẴN SÀNG PHỤC VỤ ──────────────────── */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <ShoppingOutlined className="text-sky-600" />
          <span className="whitespace-nowrap">Món Đang Làm & Chờ Mang Ra ({filteredActiveOrders.length})</span>
        </div>

        {filteredActiveOrders.length === 0 ? (
          <div className="py-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
            {searchQuery ? "Không có món nào đang làm khớp với tìm kiếm." : "Hiện không có món nào đang trong quá trình chế biến / phục vụ."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActiveOrders.map((order) => (
              <FnbQueueOrderCard
                key={order._id}
                order={order}
                isPending={false}
                statusLabel={STATUS_LABELS[order.status]}
                nextStatus={NEXT_STATUS[order.status]}
                busy={busyId === order._id}
                onOpenReject={handleOpenRejectModal}
                onPrint={printKitchenTicket}
                onUpdateStatus={updateStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 5. MODAL TỪ CHỐI ĐƠN HÀNG ─────────────────────────────────────── */}
      <FnbQueueRejectModal
        open={rejectModalOpen}
        targetOrder={targetRejectOrder}
        selectedTemplate={selectedRejectTemplate}
        customReason={customRejectReason}
        templates={REJECT_TEMPLATES}
        onClose={() => setRejectModalOpen(false)}
        onSelectTemplate={setSelectedRejectTemplate}
        onChangeCustomReason={setCustomRejectReason}
        onConfirmReject={handleConfirmReject}
      />
    </div>
  );
}
