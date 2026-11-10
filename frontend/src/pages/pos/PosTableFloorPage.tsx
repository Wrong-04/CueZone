import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { posService, bookingService } from "../../services/pos.service";
import { productService } from "../../services/product.service";
import type { PosTable, BookingRequest } from "../../types/pos";
import type { PricingTier } from "../../types";
import { calculateSplitPlayingDetails, defaultPricingTiers } from "../../utils/pricing";
import {
  ExclamationCircleOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Button, Modal, message, notification } from "../../shared/ui";
import { getSocket } from "../../services/socket.service";
import type { CustomerOrder } from "../../services/customer-order.service";

import { getAreaLabel, getTypeLabel, getFnbCategoryLabel } from "./constants/posConstants";
import { usePosWaitlist } from "./hooks/usePosWaitlist";
import { usePosTransfer } from "./hooks/usePosTransfer";
import { usePosFnb } from "./hooks/usePosFnb";
import { usePosCheckout } from "./hooks/usePosCheckout";
import { usePosOpenTable } from "./hooks/usePosOpenTable";

import PosFloorHeader from "./components/PosFloorHeader";
import PosTableCard from "./components/PosTableCard";
import PosOpenTableModal from "./modals/PosOpenTableModal";
import PosTransferTableModal from "./modals/PosTransferTableModal";
import PosFnbModal from "./modals/PosFnbModal";
import PosCancelItemModal from "./modals/PosCancelItemModal";
import PosCheckoutModal from "./modals/PosCheckoutModal";
import PosReceiptModal from "./modals/PosReceiptModal";
import PosWaitlistModal from "./modals/PosWaitlistModal";

export interface FnbStockItem {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryName: string;
  price: number;
  priceFormatted: string;
  stockQuantity: number;
  minThreshold: number;
  unit: string;
  image?: string;
  isMadeToOrder?: boolean;
}

export const PosTableFloorPage: React.FC = () => {
  const [tables, setTables] = useState<PosTable[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(defaultPricingTiers);
  const [fnbStock, setFnbStock] = useState<FnbStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Drawer states
  const [pendingOrdersByTable, setPendingOrdersByTable] = useState<Record<string, number>>({});
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [orderDrawerFilterTableId, setOrderDrawerFilterTableId] = useState<string | null>(null);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const [todayBookingsCount, setTodayBookingsCount] = useState(0);

  // Live clock ticker
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter states
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Target table currently focused by any modal
  const [selectedTable, setSelectedTable] = useState<PosTable | null>(null);

  // Common save wrapper
  const busy = useRef(false);
  const save = useCallback(async (action: () => Promise<any>): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    try {
      await action();
      return true;
    } catch (error: any) {
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message || error.message || "Không thể lưu thay đổi";
      message.error(errorCode === "WAL001" ? `${errorCode}: ${errorMessage}` : errorMessage);
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }, []);

  // Dynamic playing details calculation
  const calculatePlayingDetails = useCallback(
    (table: PosTable) => {
      return calculateSplitPlayingDetails(table, pricingTiers, currentTime);
    },
    [pricingTiers, currentTime],
  );

  // Helper date parsing
  const parseBookingDateTime = useCallback(
    (timeStr?: string, refTime = currentTime): Date | null => {
      if (!timeStr) return null;
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (!timeMatch) return null;
      const h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);

      const bookingDate = new Date(refTime);
      const dateMatch = timeStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        bookingDate.setFullYear(
          parseInt(dateMatch[1], 10),
          parseInt(dateMatch[2], 10) - 1,
          parseInt(dateMatch[3], 10),
        );
      }
      bookingDate.setHours(h, m, 0, 0);
      return bookingDate;
    },
    [currentTime],
  );

  const getBookingOverdueMinutes = useCallback(
    (timeStr?: string): number => {
      const bDate = parseBookingDateTime(timeStr, currentTime);
      if (!bDate) return 0;
      const diffMs = currentTime - bDate.getTime();
      return diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
    },
    [parseBookingDateTime, currentTime],
  );

  const getBookingUpcomingMinutes = useCallback(
    (timeStr?: string): number => {
      const bDate = parseBookingDateTime(timeStr, currentTime);
      if (!bDate) return -1;
      const diffMs = bDate.getTime() - currentTime;
      return diffMs > 0 ? Math.floor(diffMs / 60000) : -1;
    },
    [parseBookingDateTime, currentTime],
  );

  // Load tables, pricing tiers, and F&B stock
  const loadTables = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [tableData, pricingData, productsData] = await Promise.all([
          posService.getTables(),
          posService.getPricingTiers().catch(() => []),
          productService.getFnbMenu().catch(() => []),
        ]);
        setTables(tableData);
        setSelectedTable((prev) =>
          prev ? tableData.find((t) => t.id === prev.id) || prev : null,
        );
        if (pricingData && pricingData.length > 0) {
          setPricingTiers(pricingData);
        }
        if (Array.isArray(productsData)) {
          const mappedStock: FnbStockItem[] = productsData.map((p) => ({
            id: String(p._id),
            code: p.sku || `PRD-${String(p._id).slice(-4).toUpperCase()}`,
            name: p.name,
            category: p.category,
            categoryName: getFnbCategoryLabel(p.category),
            price: p.salePrice,
            priceFormatted: `${p.salePrice.toLocaleString("vi-VN")}đ`,
            stockQuantity: p.stock ?? 0,
            minThreshold: 10,
            unit: (p as any).unit || "Phần",
            image: p.imageUrl,
          }));
          setFnbStock(mappedStock);
        }
        setLoadError("");
      } catch (error: any) {
        setLoadError(error.response?.data?.message || error.message || "Không thể tải sơ đồ bàn");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [],
  );

  // Initial load and socket listener
  useEffect(() => {
    void loadTables();
    const socket = getSocket();
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleTableChange = () => {
      void loadTables(true);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("table:status-changed", handleTableChange);
    socket.on("table:status_changed", handleTableChange);

    setSocketConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("table:status-changed", handleTableChange);
      socket.off("table:status_changed", handleTableChange);
    };
  }, [loadTables]);

  // Today's bookings count
  useEffect(() => {
    const fetchBookingsCount = async () => {
      try {
        const bookings = await bookingService.getAll();
        const todayStr = new Date().toISOString().slice(0, 10);
        const count = (bookings || []).filter(
          (b: any) =>
            b.date === todayStr &&
            (b.status === "confirmed" || b.status === "approved" || b.status === "pending"),
        ).length;
        setTodayBookingsCount(count);
      } catch {
        // Bỏ qua lỗi
      }
    };
    void fetchBookingsCount();
  }, []);

  // Online orders handler
  const handleOrdersUpdated = useCallback((orders: CustomerOrder[]) => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.status === "pending" && o.tableId) {
        map[o.tableId] = (map[o.tableId] || 0) + 1;
      }
    });
    setPendingOrdersByTable(map);
  }, []);

  // 1. Hook: Waitlist
  const waitlistHook = usePosWaitlist({
    tables,
    onSelectTableForWaitlist: (targetTable, name, phone, note) => {
      setSelectedTable(targetTable);
      openTableHook.setCustomerName(name);
      openTableHook.setCustomerPhone(phone);
      openTableHook.setSessionNote(note);
      openTableHook.setOpenModalVisible(true);
    },
  });

  // 2. Hook: Open Table
  const openTableHook = usePosOpenTable({
    selectedTable,
    setSelectedTable,
    save,
    pendingWaitlistEntryId: waitlistHook.pendingWaitlistEntryId,
    clearPendingWaitlist: waitlistHook.clearPendingWaitlist,
    fetchWaitlist: waitlistHook.fetchWaitlist,
  });

  // 3. Hook: Transfer / Merge
  const transferHook = usePosTransfer({
    tables,
    selectedTable,
    setSelectedTable,
    save,
    loadTables,
  });

  // 4. Hook: F&B
  const fnbHook = usePosFnb({
    selectedTable,
    setSelectedTable,
    save,
    loadTables,
    fnbStock,
    setFnbStock,
  });

  // 5. Hook: Checkout
  const checkoutHook = usePosCheckout({
    selectedTable,
    setSelectedTable,
    save,
    calculatePlayingDetails,
  });

  // Pause / Resume table
  const handleTogglePause = async (table: PosTable) => {
    if (!table.currentSession) return;
    if (await save(() => posService.pause(table))) {
      message.success(
        table.currentSession.isPaused
          ? `Đã tiếp tục tính giờ ${table.name}`
          : `Đã tạm dừng tính giờ ${table.name}`,
      );
    }
  };

  // Cancel booking
  const handleCancelBooking = (table: PosTable) => {
    Modal.confirm({
      title: `Hủy giữ bàn đặt trước [${table.code}]?`,
      content: `Khách ${table.bookedInfo?.customerName || "hẹn trước"} chưa nhận bàn. Bạn có chắc muốn hủy giữ bàn này và chuyển về trạng thái Trống?`,
      okText: "Hủy giữ bàn",
      okType: "danger",
      cancelText: "Bỏ qua",
      onOk: async () => {
        try {
          await posService.cancelBooking(table.id);
          message.success(`Đã hủy giữ bàn ${table.name} thành công`);
          await loadTables();
        } catch (err: any) {
          message.error(err.message || "Không thể hủy giữ bàn");
        }
      },
    });
  };

  // Check-in from booking drawer
  const handleCheckInFromBooking = (tableId: string, booking: BookingRequest) => {
    const target =
      tables.find((t) => t.id === tableId || t.code === tableId) ||
      tables.find((t) => t.status === "available");
    if (!target) {
      message.warning("Toàn bộ bàn bida hiện đã kín!");
      return;
    }
    setSelectedTable(target);
    openTableHook.setCustomerName(booking.customerName || "");
    openTableHook.setCustomerPhone(booking.phone || "");
    openTableHook.setSessionNote(
      booking.note ? `Lịch hẹn ${booking.time}: ${booking.note}` : `Lịch hẹn lúc ${booking.time}`,
    );
    openTableHook.setIsCheckInMode(true);
    openTableHook.setOpenModalVisible(true);
    if (booking.phone) {
      void openTableHook.handlePhoneChangeInOpenModal(booking.phone);
    }
  };

  // Handle URL query searchParams
  useEffect(() => {
    if (searchParams.get("drawer") === "booking") {
      setBookingDrawerOpen(true);
      setSearchParams({}, { replace: true });
      return;
    }
    const tableId = searchParams.get("tableId");
    if (loading || loadError || !tableId) return;
    const table = tables.find((item) => item.id === tableId);
    if (table?.status === "booked") {
      setSelectedTable(table);
      openTableHook.setCustomerName(table.bookedInfo?.customerName || "");
      openTableHook.setCustomerPhone(table.bookedInfo?.phone || "");
      openTableHook.setIsCheckInMode(true);
      openTableHook.setOpenModalVisible(true);
    }
  }, [searchParams, tables, loading, loadError, setSearchParams, openTableHook]);

  // Warning when advance booking approaches
  const notifiedUpcomingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    tables.forEach((table) => {
      if (
        (table.status === "playing" || table.status === "paused") &&
        table.bookedInfo?.time
      ) {
        const upcomingMin = getBookingUpcomingMinutes(table.bookedInfo.time);
        if (upcomingMin < 0) return;
        const customerName = table.bookedInfo.customerName || "Khách hẹn";
        const bookingTime = table.bookedInfo.time.split(" ")[0] || table.bookedInfo.time;

        if (upcomingMin <= 30 && upcomingMin > 15) {
          const key30 = `${table.id}-${table.bookedInfo.time}-30`;
          if (!notifiedUpcomingRef.current.has(key30)) {
            notifiedUpcomingRef.current.add(key30);
            notification.warning({
              message: `Nhắc lịch hẹn sắp tới • ${table.name}`,
              description: `Bàn ${table.name} sắp có khách đặt (${customerName} lúc ${bookingTime}), còn ${upcomingMin} phút. Vui lòng nhắc khách đang chơi hoặc chuẩn bị bàn trống thay thế nếu khách muốn chơi tiếp!`,
              placement: "topRight",
              duration: 8,
            });
          }
        }

        if (upcomingMin <= 15) {
          const key15 = `${table.id}-${table.bookedInfo.time}-15`;
          if (!notifiedUpcomingRef.current.has(key15)) {
            notifiedUpcomingRef.current.add(key15);
            notification.error({
              message: `KHẨN CẤP: Sắp đến giờ hẹn • ${table.name}`,
              description: `Chỉ còn ${upcomingMin} phút nữa đến giờ hẹn của ${customerName} (${bookingTime}). Vui lòng tiến hành thanh toán / hỗ trợ chuyển bàn cho khách đang chơi để sẵn sàng đón khách đặt!`,
              placement: "topRight",
              duration: 12,
            });
          }
        }
      }
    });
  }, [tables, currentTime, getBookingUpcomingMinutes]);

  // Auto-cancel bookings overdue by 15 mins
  const autoReleasingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    tables.forEach((table) => {
      if (table.status === "booked" && table.bookedInfo?.time) {
        const overdueMin = getBookingOverdueMinutes(table.bookedInfo.time);
        if (overdueMin > 15 && !autoReleasingRef.current.has(table.id)) {
          autoReleasingRef.current.add(table.id);
          const customerName = table.bookedInfo.customerName || "Khách hẹn";
          message.warning(
            `Bàn ${table.name} đã quá hạn giữ chỗ 15 phút (${customerName}). Hệ thống đang tự động hủy giữ bàn!`,
            5,
          );
          posService
            .cancelBooking(table.id)
            .then(() => {
              void loadTables(true);
            })
            .catch((err) => {
              console.error("Lỗi khi tự động giải phóng bàn quá hạn:", err);
              autoReleasingRef.current.delete(table.id);
            });
        }
      }
    });
  }, [tables, currentTime, getBookingOverdueMinutes, loadTables]);

  // Dynamic statistics (No hardcoded counts)
  const stats = useMemo(() => {
    let playing = 0;
    let paused = 0;
    let booked = 0;
    let available = 0;
    let totalTempRevenue = 0;

    tables.forEach((t) => {
      const isBookedItem = t.status === "booked";
      const upMinItem = isBookedItem ? getBookingUpcomingMinutes(t.bookedInfo?.time) : -1;
      const overMinItem = isBookedItem ? getBookingOverdueMinutes(t.bookedInfo?.time) : 0;
      const isHoldingItem =
        isBookedItem &&
        ((upMinItem >= 0 && upMinItem <= 45) || (overMinItem > 0 && overMinItem <= 15));

      if (t.status === "playing") playing++;
      else if (t.status === "paused") paused++;
      else if (t.status === "booked") {
        if (isHoldingItem) booked++;
        else {
          available++;
          booked++;
        }
      } else if (t.status === "available") {
        available++;
      }

      if (t.status === "playing" || t.status === "paused" || t.currentSession) {
        const { cost } = calculatePlayingDetails(t);
        const fnbCost = (t.currentSession?.orders || []).reduce(
          (acc, cur) =>
            cur.status !== "cancelled"
              ? acc + (Number(cur.price) || 0) * (Number(cur.quantity) || 0)
              : acc,
          0,
        );
        totalTempRevenue += cost + fnbCost;
      }
    });

    const activeCount = playing + paused;
    const occupancyRate = tables.length > 0 ? Math.round((activeCount / tables.length) * 100) : 0;

    return {
      total: tables.length,
      playing,
      paused,
      booked,
      available,
      activeCount,
      occupancyRate,
      totalTempRevenue,
    };
  }, [tables, calculatePlayingDetails, getBookingUpcomingMinutes, getBookingOverdueMinutes]);

  // Dynamic Area Options (Derives directly from actual table data)
  const areaOptions = useMemo(() => {
    const areaMap: Record<string, number> = {};
    tables.forEach((t) => {
      const key = t.area || "standard";
      areaMap[key] = (areaMap[key] || 0) + 1;
    });

    const list = [{ value: "all", label: `Tất cả khu vực (${tables.length})` }];
    Object.entries(areaMap).forEach(([areaKey, count]) => {
      list.push({
        value: areaKey,
        label: `${getAreaLabel(areaKey)} (${count})`,
      });
    });
    return list;
  }, [tables]);

  // Dynamic Table Type Options (Derives directly from actual table data)
  const typeStats = useMemo(() => {
    const map: Record<string, { total: number; available: number }> = {};
    tables.forEach((t) => {
      const key = t.type || "pool";
      if (!map[key]) map[key] = { total: 0, available: 0 };
      map[key].total++;
      if (t.status === "available") map[key].available++;
    });
    return map;
  }, [tables]);

  const tableTypeOptions = useMemo(() => {
    const list = [{ value: "all", label: `Tất cả loại bàn (${tables.length})` }];
    Object.entries(typeStats).forEach(([typeKey, data]) => {
      list.push({
        value: typeKey,
        label: `${getTypeLabel(typeKey)} (${data.total})`,
      });
    });
    return list;
  }, [typeStats, tables.length]);

  // Status pills config
  const statusPillItems = useMemo(
    () => [
      { key: "all", label: "Tất cả", badge: stats.total },
      { key: "playing", label: "Đang chơi", badge: stats.playing, dotClassName: "bg-emerald-500" },
      { key: "paused", label: "Tạm dừng", badge: stats.paused, dotClassName: "bg-amber-500" },
      { key: "booked", label: "Đã đặt", badge: stats.booked, dotClassName: "bg-blue-500" },
      { key: "available", label: "Bàn trống", badge: stats.available, dotClassName: "bg-slate-400" },
    ],
    [stats],
  );

  const availableTables = useMemo(() => tables.filter((t) => t.status === "available"), [tables]);

  const getTableOptionsForGuest = useCallback(
    (preferredType: string) => {
      if (availableTables.length === 0) return [];
      const matching = availableTables.filter((t) => t.typeName === preferredType || !preferredType);
      const others = availableTables.filter((t) => t.typeName !== preferredType && preferredType);

      const groups: Array<{ label: string; options: Array<{ value: string; label: string }> }> = [];
      if (matching.length > 0) {
        groups.push({
          label: `⭐ Phù hợp nhất (${matching.length} bàn)`,
          options: matching.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.typeName}) • ${t.pricePerHour.toLocaleString("vi-VN")}đ/h`,
          })),
        });
      }
      if (others.length > 0) {
        groups.push({
          label: `Bàn loại khác (${others.length} bàn)`,
          options: others.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.typeName}) • ${t.pricePerHour.toLocaleString("vi-VN")}đ/h`,
          })),
        });
      }
      return groups;
    },
    [availableTables],
  );

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      if (filterArea !== "all" && table.area !== filterArea) return false;
      if (filterType !== "all" && table.type !== filterType) return false;

      const isBookedTable = table.status === "booked";
      const upMinTable = isBookedTable ? getBookingUpcomingMinutes(table.bookedInfo?.time) : -1;
      const overMinTable = isBookedTable ? getBookingOverdueMinutes(table.bookedInfo?.time) : 0;
      const isHoldingTable =
        isBookedTable &&
        ((upMinTable >= 0 && upMinTable <= 45) || (overMinTable > 0 && overMinTable <= 15));

      if (filterStatus === "playing" && table.status !== "playing") return false;
      if (filterStatus === "paused" && table.status !== "paused") return false;
      if (filterStatus === "booked" && !isHoldingTable) return false;
      if (filterStatus === "available" && table.status !== "available" && isHoldingTable) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = table.name.toLowerCase().includes(query);
        const matchCode = table.code.toLowerCase().includes(query);
        const matchCustomer =
          table.currentSession?.customerName?.toLowerCase().includes(query) ||
          table.bookedInfo?.customerName?.toLowerCase().includes(query);
        const matchPhone =
          table.currentSession?.customerPhone?.includes(query) ||
          table.bookedInfo?.phone?.includes(query);
        if (!matchName && !matchCode && !matchCustomer && !matchPhone) return false;
      }

      return true;
    });
  }, [tables, filterArea, filterType, filterStatus, searchQuery, getBookingUpcomingMinutes, getBookingOverdueMinutes]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="space-y-4 max-w-full overflow-hidden min-w-0">
      {/* 1. Header & Filters */}
      <PosFloorHeader
        stats={stats}
        tables={tables}
        socketConnected={socketConnected}
        orderDrawerOpen={orderDrawerOpen}
        setOrderDrawerOpen={setOrderDrawerOpen}
        orderDrawerFilterTableId={orderDrawerFilterTableId}
        setOrderDrawerFilterTableId={setOrderDrawerFilterTableId}
        bookingDrawerOpen={bookingDrawerOpen}
        setBookingDrawerOpen={setBookingDrawerOpen}
        todayBookingsCount={todayBookingsCount}
        waitlistCount={waitlistHook.waitlist.length}
        onOpenWaitlist={() => waitlistHook.setWaitlistModalVisible(true)}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        loading={loading}
        saving={saving}
        onReload={() => loadTables()}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        statusPillItems={statusPillItems}
        filterArea={filterArea}
        setFilterArea={setFilterArea}
        areaOptions={areaOptions}
        filterType={filterType}
        setFilterType={setFilterType}
        tableTypeOptions={tableTypeOptions}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOrdersUpdated={handleOrdersUpdated}
        onCheckInFromBooking={handleCheckInFromBooking}
      />

      {/* 2. Error Message */}
      {loadError && (
        <div className="p-4 bg-red-50/90 border border-red-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 text-red-700 text-xs font-semibold">
            <ExclamationCircleOutlined className="text-base text-red-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTables()}
            className="!rounded-xl !text-xs !border-red-300 !text-red-700 hover:!bg-red-100/70 font-bold shrink-0"
          >
            Thử tải lại
          </Button>
        </div>
      )}

      {/* 3. Loading State */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <SyncOutlined spin className="text-emerald-600 text-3xl" />
          <span className="text-slate-600 font-bold text-xs tracking-wide">
            Đang tải dữ liệu sơ đồ bàn trực tiếp từ máy chủ...
          </span>
        </div>
      )}

      {/* 4. Empty State */}
      {!loading && !loadError && filteredTables.length === 0 && (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
            <SearchOutlined />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 text-sm mb-0">
              Không tìm thấy bàn nào phù hợp
            </h4>
            <p className="text-xs text-slate-500 mb-0">
              {filterStatus === "available"
                ? "Hiện tại không còn bàn trống theo tiêu chí này. Bạn có thể thêm khách vào danh sách chờ."
                : "Vui lòng thử điều chỉnh bộ lọc khu vực, loại bàn hoặc từ khóa tìm kiếm."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterArea("all");
                setFilterType("all");
                setFilterStatus("all");
                setSearchQuery("");
              }}
              className="!rounded-xl !text-xs"
            >
              Xóa bộ lọc
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => waitlistHook.setWaitlistModalVisible(true)}
              className="!rounded-xl !text-xs !bg-amber-600 hover:!bg-amber-700 !border-amber-600"
            >
              Thêm khách chờ bàn
            </Button>
          </div>
        </div>
      )}

      {/* 5. Table Grid */}
      {!loading && !loadError && filteredTables.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(285px,1fr))] gap-3.5">
          {filteredTables.map((table) => (
            <PosTableCard
              key={table.id}
              table={table}
              calculatePlayingDetails={calculatePlayingDetails}
              getBookingOverdueMinutes={getBookingOverdueMinutes}
              getBookingUpcomingMinutes={getBookingUpcomingMinutes}
              pendingOrdersByTable={pendingOrdersByTable}
              onOpenTableModal={(tbl, isCheckIn) => openTableHook.handleOpenTableModal(tbl, isCheckIn)}
              onTogglePause={handleTogglePause}
              onOpenTransferModal={(tbl, action) => transferHook.handleOpenTransferModal(tbl, action)}
              onOpenFnbModal={(tbl) => fnbHook.handleOpenFnbModal(tbl)}
              onOpenCheckout={(tbl) => checkoutHook.handleOpenCheckout(tbl)}
              onPrePrintBill={(tbl) => checkoutHook.handleOpenPrePrintReceipt(tbl)}
              onCancelBooking={handleCancelBooking}
              onOpenOrderDrawerForTable={(tableId) => {
                setOrderDrawerFilterTableId(tableId);
                setOrderDrawerOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* 6. Modals */}
      <PosOpenTableModal
        open={openTableHook.openModalVisible}
        onClose={() => openTableHook.setOpenModalVisible(false)}
        selectedTable={selectedTable}
        isCheckInMode={openTableHook.isCheckInMode}
        customerPhone={openTableHook.customerPhone}
        onPhoneChange={openTableHook.handlePhoneChangeInOpenModal}
        customerName={openTableHook.customerName}
        setCustomerName={openTableHook.setCustomerName}
        sessionNote={openTableHook.sessionNote}
        setSessionNote={openTableHook.setSessionNote}
        openModalMemberInfo={openTableHook.openModalMemberInfo}
        isSearchingOpenMember={openTableHook.isSearchingOpenMember}
        onConfirmOpen={openTableHook.handleOpenTable}
        saving={saving}
        loading={loading}
        getBookingUpcomingMinutes={getBookingUpcomingMinutes}
      />

      <PosTransferTableModal
        open={transferHook.transferModalVisible}
        onClose={() => transferHook.setTransferModalVisible(false)}
        transferAction={transferHook.transferAction}
        onSwitchAction={transferHook.handleSwitchTransferAction}
        selectedTable={selectedTable}
        tables={tables}
        targetTableId={transferHook.targetTableId}
        setTargetTableId={transferHook.setTargetTableId}
        loadingMoveTargets={transferHook.loadingMoveTargets}
        eligibleMoveData={transferHook.eligibleMoveData}
        transferReason={transferHook.transferReason}
        setTransferReason={transferHook.setTransferReason}
        onConfirmTransferOrMerge={transferHook.handleTransferOrMerge}
        saving={saving}
        loading={loading}
      />

      <PosFnbModal
        open={fnbHook.fnbModalVisible}
        onClose={() => fnbHook.setFnbModalVisible(false)}
        selectedTable={selectedTable}
        fnbTab={fnbHook.fnbTab}
        setFnbTab={fnbHook.setFnbTab}
        activeServedOrders={fnbHook.activeServedOrders}
        cancelledOrders={fnbHook.cancelledOrders}
        activeFnbTotal={fnbHook.activeFnbTotal}
        fnbSearchText={fnbHook.fnbSearchText}
        setFnbSearchText={fnbHook.setFnbSearchText}
        fnbCategory={fnbHook.fnbCategory}
        setFnbCategory={fnbHook.setFnbCategory}
        fnbCategoryOptions={fnbHook.fnbCategoryOptions}
        filteredFnbStock={fnbHook.filteredFnbStock}
        newOrderList={fnbHook.newOrderList}
        onAddFnbItem={fnbHook.handleAddFnbItem}
        onUpdateNewOrderItemQty={fnbHook.handleUpdateNewOrderItemQty}
        onRemoveNewOrderItem={fnbHook.handleRemoveNewOrderItem}
        onConfirmAddFnbOrder={fnbHook.handleConfirmAddFnbOrder}
        onOpenCancelModal={fnbHook.handleOpenCancelModal}
        saving={saving}
        loading={loading}
      />

      <PosCancelItemModal
        open={fnbHook.cancelModalVisible}
        onClose={() => fnbHook.setCancelModalVisible(false)}
        cancellingItem={fnbHook.cancellingItem}
        cancelQty={fnbHook.cancelQty}
        setCancelQty={fnbHook.setCancelQty}
        cancelReason={fnbHook.cancelReason}
        onSelectCancelReason={fnbHook.handleSelectCancelReason}
        customCancelReason={fnbHook.customCancelReason}
        setCustomCancelReason={fnbHook.setCustomCancelReason}
        restoreStock={fnbHook.restoreStock}
        setRestoreStock={fnbHook.setRestoreStock}
        onConfirmCancelItem={fnbHook.handleConfirmCancelItem}
        saving={saving}
        loading={loading}
      />

      <PosCheckoutModal
        open={checkoutHook.checkoutModalVisible}
        onClose={() => checkoutHook.setCheckoutModalVisible(false)}
        selectedTable={selectedTable}
        calculatePlayingDetails={calculatePlayingDetails}
        checkoutPhone={checkoutHook.checkoutPhone}
        setCheckoutPhone={checkoutHook.setCheckoutPhone}
        loyaltyCustomer={checkoutHook.loyaltyCustomer}
        setLoyaltyCustomer={checkoutHook.setLoyaltyCustomer}
        discountPercent={checkoutHook.discountPercent}
        setDiscountPercent={checkoutHook.setDiscountPercent}
        isSearchingMember={checkoutHook.isSearchingMember}
        onSearchLoyaltyCustomer={checkoutHook.handleSearchLoyaltyCustomer}
        appliedVoucher={checkoutHook.appliedVoucher}
        setAppliedVoucher={checkoutHook.setAppliedVoucher}
        setVoucherCode={checkoutHook.setVoucherCode}
        onSelectCustomerVoucher={checkoutHook.handleSelectCustomerVoucher}
        showTimeSlots={checkoutHook.showTimeSlots}
        setShowTimeSlots={checkoutHook.setShowTimeSlots}
        paymentMethod={checkoutHook.paymentMethod}
        setPaymentMethod={checkoutHook.setPaymentMethod}
        cashReceived={checkoutHook.cashReceived}
        setCashReceived={checkoutHook.setCashReceived}
        onConfirmCheckout={checkoutHook.handleConfirmCheckout}
        saving={saving}
        loading={loading}
      />

      <PosReceiptModal
        open={checkoutHook.receiptModalVisible}
        onClose={() => {
          checkoutHook.setReceiptModalVisible(false);
          setSelectedTable(null);
          void loadTables();
        }}
        paidSummary={checkoutHook.paidSummary}
      />

      <PosWaitlistModal
        open={waitlistHook.waitlistModalVisible}
        onClose={() => waitlistHook.setWaitlistModalVisible(false)}
        waitlist={waitlistHook.waitlist}
        availableTables={availableTables}
        newWaitName={waitlistHook.newWaitName}
        setNewWaitName={waitlistHook.setNewWaitName}
        newWaitPhone={waitlistHook.newWaitPhone}
        setNewWaitPhone={waitlistHook.setNewWaitPhone}
        newWaitGuests={waitlistHook.newWaitGuests}
        setNewWaitGuests={waitlistHook.setNewWaitGuests}
        newWaitType={waitlistHook.newWaitType}
        setNewWaitType={waitlistHook.setNewWaitType}
        newWaitNote={waitlistHook.newWaitNote}
        setNewWaitNote={waitlistHook.setNewWaitNote}
        onAddWaitlist={waitlistHook.handleAddWaitlist}
        onAssignWaitlist={waitlistHook.handleAssignWaitlist}
        onRemoveWaitlist={waitlistHook.handleRemoveWaitlist}
        getTableOptionsForGuest={getTableOptionsForGuest}
      />
    </div>
  );
};

export default PosTableFloorPage;
