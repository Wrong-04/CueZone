// ============================================================================
// 1. IMPORTS
// ============================================================================
// 1.1 Thư viện bên ngoài
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarOutlined,
  PlusOutlined,
  SyncOutlined,
} from "@ant-design/icons";

// 1.2 UI Components & Services nội bộ
import {
  Drawer,
  Button,
  Input,
  Select,
  Modal,
  message,
} from "../../shared/ui";
import { bookingService } from "../../services/pos.service";
import { getSocket } from "../../services/socket.service";

// 1.3 Sub-components & Utils
import { BookingDispatchCard } from "./BookingDispatchCard";
import {
  computeBookingCounts,
  enrichBookings,
  filterAndSortBookings,
  type BookingTabKey,
} from "./bookingDispatch.utils";

// 1.4 Types
import type { BookingRequest, PosTable } from "../../types/pos";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface BookingDispatchDrawerProps {
  open: boolean;
  onClose: () => void;
  tables: PosTable[];
  onCheckInTable: (tableId: string, booking: BookingRequest) => void;
  onTablesReload: () => Promise<void>;
  onOpenCreateBookingModal?: () => void;
}

// ============================================================================
// 4. MAIN COMPONENT: DRAWER ĐIỀU PHỐI LỊCH ĐẶT BÀN TRÊN MÀN HÌNH POS
// Tiếp nhận khách đặt trước qua website/hotline, theo dõi thời gian giữ chỗ 15p và mở bàn nhanh
// ============================================================================
export const BookingDispatchDrawer: React.FC<BookingDispatchDrawerProps> = ({
  open,
  onClose,
  tables,
  onCheckInTable,
  onTablesReload,
  onOpenCreateBookingModal,
}) => {
  // ── 4.1 Props & Hooks (State) ─────────────────────────────────────────────
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabFilter, setTabFilter] = useState<BookingTabKey>("today");

  // Modal đổi bàn cho khách đã đặt trước
  const [changeTableModalOpen, setChangeTableModalOpen] = useState(false);
  const [selectedBookingForChange, setSelectedBookingForChange] =
    useState<BookingRequest | null>(null);
  const [newTargetTableId, setNewTargetTableId] = useState("");
  const [savingAction, setSavingAction] = useState(false);

  // ── 4.2 Derived State (useMemo) ───────────────────────────────────────────
  // Ngày hôm nay theo múi giờ Việt Nam (UTC+7) định dạng YYYY-MM-DD
  const todayIso = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getTime() + 7 * 3600000);
    return d.toISOString().slice(0, 10);
  }, []);

  // Đánh giá trạng thái giữ chỗ, thống kê tab và lọc/sắp xếp qua bookingDispatch.utils.ts
  const enrichedBookings = useMemo(
    () => enrichBookings(bookings, todayIso, tables),
    [bookings, todayIso, tables],
  );

  const counts = useMemo(
    () => computeBookingCounts(enrichedBookings, todayIso),
    [enrichedBookings, todayIso],
  );

  const sortedBookings = useMemo(
    () => filterAndSortBookings(enrichedBookings, tabFilter, searchQuery, todayIso),
    [enrichedBookings, tabFilter, searchQuery, todayIso],
  );

  const filterTabs = [
    { key: "urgent", label: `Cần đón (${counts.urgent})` },
    { key: "today", label: `Hôm nay (${counts.today})` },
    { key: "noshow", label: `Hết hạn (${counts.noshow})` },
    { key: "all", label: `Tất cả (${counts.all})` },
  ];

  // ── 4.3 Event Handlers (Nạp dữ liệu & Xử lý nhận/đổi bàn) ─────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookingService.getAll();
      // Loại bỏ các bản ghi trùng lặp (cùng khách + bàn + ngày + giờ)
      const seen = new Set<string>();
      const deduped = (data || []).filter((b) => {
        if (!b) return false;
        const key = `${b.phone || ""}_${b.tableId || ""}_${b.date || ""}_${b.time || ""}`;
        if (b.status !== "rejected" && b.status !== "checked_in" && seen.has(key)) return false;
        if (b.status !== "rejected" && b.status !== "checked_in") seen.add(key);
        return true;
      });
      setBookings(deduped);
    } catch {
      // Bỏ qua lỗi khi đóng/mở nhanh drawer
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenChangeTable = (b: BookingRequest) => {
    setSelectedBookingForChange(b);
    setNewTargetTableId(b.tableId);
    setChangeTableModalOpen(true);
  };

  const handleCheckIn = (b: BookingRequest) => {
    const target = tables.find((t) => t.id === b.tableId || t.code === b.tableId);
    if (target && (target.status === "playing" || target.status === "paused")) {
      Modal.confirm({
        title: `Bàn ${target.name} đang có khách chơi!`,
        content: `Bàn ${target.name} hiện chưa trống. Bạn có muốn chọn bàn bida trống khác để xếp cho khách ${b.customerName} không?`,
        okText: "Chọn bàn khác",
        cancelText: "Bỏ qua",
        onOk: () => handleOpenChangeTable(b),
      });
      return;
    }
    onClose();
    onCheckInTable(b.tableId, b);
  };

  const handleSaveChangeTable = async () => {
    if (!selectedBookingForChange || !newTargetTableId) return;
    setSavingAction(true);
    try {
      await bookingService.update(selectedBookingForChange.id, {
        status:
          selectedBookingForChange.status === "rejected" ||
          selectedBookingForChange.status === "pending"
            ? selectedBookingForChange.status
            : "approved",
        tableId: newTargetTableId,
      });
      message.success("Đã đổi bàn bida cho khách thành công");
      setChangeTableModalOpen(false);
      void fetchBookings();
      void onTablesReload();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || "Không thể đổi bàn");
    } finally {
      setSavingAction(false);
    }
  };

  // ── 4.4 Effects (Nạp dữ liệu khi mở & Lắng nghe Socket.io) ─────────────────
  useEffect(() => {
    if (open) {
      void fetchBookings();
    }
  }, [open, fetchBookings]);

  useEffect(() => {
    const socket = getSocket();
    const handleSync = () => {
      if (open) void fetchBookings();
    };
    socket.on("booking:created", handleSync);
    socket.on("booking:updated", handleSync);
    socket.on("booking:cancelled", handleSync);
    return () => {
      socket.off("booking:created", handleSync);
      socket.off("booking:updated", handleSync);
      socket.off("booking:cancelled", handleSync);
    };
  }, [open, fetchBookings]);

  // ── 4.5 Main Render JSX ───────────────────────────────────────────────────
  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        placement="right"
        size={560}
        title={
          <div className="flex items-center justify-between w-full pr-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base shrink-0">
                <CalendarOutlined />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-sm block whitespace-nowrap">
                  Lịch Hẹn Đặt Bàn
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Quản lý khách đặt trước và nhận bàn tại quầy
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchBookings()}
                loading={loading}
                icon={<SyncOutlined />}
                className="!h-8 !w-8 !p-0 !rounded-xl !border-slate-200"
                title="Tải lại danh sách"
              />
              {onOpenCreateBookingModal && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenCreateBookingModal}
                  leftIcon={<PlusOutlined />}
                  className="!h-8 !px-2.5 !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-0 font-bold !rounded-xl text-white shadow-2xs whitespace-nowrap"
                >
                  Đặt Qua Hotline
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-3.5 pb-6">
          {/* Ô tìm kiếm nhanh */}
          <div className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên khách, SĐT, số bàn..."
              allowClear
              className="!h-9 !rounded-xl !text-xs"
            />
          </div>

          {/* 4 Tab phân loại lịch đặt */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl w-full">
            {filterTabs.map((tab) => {
              const isActive = tabFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTabFilter(tab.key as BookingTabKey)}
                  className={`relative flex items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap ${
                    isActive
                      ? "bg-white text-emerald-800 shadow-2xs font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  {tab.key === "urgent" && counts.urgent > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Danh sách thẻ đặt bàn */}
          {loading && sortedBookings.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <SyncOutlined spin className="text-2xl text-emerald-600" />
              <p className="text-xs">Đang đồng bộ danh sách khách đặt bàn...</p>
            </div>
          ) : sortedBookings.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 space-y-2 text-slate-400">
              <CalendarOutlined className="text-3xl text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 mb-0">
                Không có lịch đặt bàn nào trong mục này
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Khi khách đặt bàn online hoặc qua Hotline, thông tin sẽ tự động hiển thị và đồng bộ tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedBookings.map((b) => {
                const targetTable = tables.find((t) => t.id === b.tableId || t.code === b.tableId);
                return (
                  <BookingDispatchCard
                    key={b.id}
                    booking={b}
                    isTablePlaying={targetTable?.status === "playing"}
                    onOpenChangeTable={handleOpenChangeTable}
                    onCheckIn={handleCheckIn}
                  />
                );
              })}
            </div>
          )}
        </div>
      </Drawer>

      {/* Modal đổi bàn bida cho lịch đặt trước */}
      <Modal
        open={changeTableModalOpen}
        onCancel={() => setChangeTableModalOpen(false)}
        title="Đổi Bàn Cho Lịch Hẹn Đặt Trước"
        footer={[
          <Button
            key="cancel"
            variant="outline"
            size="sm"
            onClick={() => setChangeTableModalOpen(false)}
            className="whitespace-nowrap"
          >
            Bỏ qua
          </Button>,
          <Button
            key="ok"
            variant="primary"
            size="sm"
            loading={savingAction}
            onClick={handleSaveChangeTable}
            className="!bg-emerald-600 !border-emerald-600 text-white font-bold whitespace-nowrap"
          >
            Xác nhận đổi bàn
          </Button>,
        ]}
      >
        <div className="space-y-3 py-2 text-xs">
          <p className="text-slate-600">
            Khách hàng: <strong>{selectedBookingForChange?.customerName}</strong> ({selectedBookingForChange?.phone})
            <br />
            Khung giờ: <strong>{selectedBookingForChange?.time} ({selectedBookingForChange?.date})</strong>
          </p>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Chọn bàn mới:</label>
            <Select
              value={newTargetTableId}
              onChange={(val) => setNewTargetTableId(val)}
              className="w-full !h-9"
              options={tables.map((t) => ({
                value: t.id,
                label: `${t.code} • ${t.name} (${t.typeName}) - ${t.status === "available" ? "Bàn trống" : "Đang chơi"}`,
              }))}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};
