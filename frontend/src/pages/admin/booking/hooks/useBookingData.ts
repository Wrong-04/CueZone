import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dayjs from "dayjs";
import { message } from "../../../../shared/ui";
import { bookingService, posService } from "../../../../services/pos.service";
import { getSocket } from "../../../../services/socket.service";
import type { BookingRequest, PosTable } from "../../../../types/pos";

/**
 * Custom Hook: useBookingData
 * Quản lý toàn bộ dữ liệu và hành động nghiệp vụ cho màn hình Quản Lý Đặt Bàn:
 * 1. Gọi API nạp danh sách đơn đặt bàn và danh mục bàn bida hiện tại.
 * 2. Lắng nghe WebSocket thời gian thực khi khách hàng đặt chỗ từ website.
 * 3. Tính toán các chỉ số thống kê (KPI đơn đặt) và phân loại theo trạng thái/ngày.
 * 4. Phê duyệt & xếp bàn, từ chối kèm lý do, hoặc tạo đơn đặt nhanh từ hotline.
 */
export function useBookingData() {
  // ── 1. State: Dữ liệu chính từ máy chủ ────────────────────────────────────
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [tables, setTables] = useState<PosTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  // ── 2. State: Chế độ xem & Bộ lọc tìm kiếm ────────────────────────────────
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ── 3. State: Form Modal Phê Duyệt & Xếp Bàn ──────────────────────────────
  const [approveModalVisible, setApproveModalVisible] = useState<boolean>(false);
  const [bookingToApprove, setBookingToApprove] = useState<BookingRequest | null>(null);
  const [assignedTableId, setAssignedTableId] = useState<string>("");

  // ── 4. State: Form Modal Từ Chối Đơn Đặt ──────────────────────────────────
  const [rejectModalVisible, setRejectModalVisible] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // ── 5. State: Form Modal Đặt Bàn Nhanh Qua Hotline ─────────────────────────
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTableId, setNewTableId] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTime, setNewTime] = useState("19:00");
  const [newDuration, setNewDuration] = useState(2);
  const [newDeposit, setNewDeposit] = useState(0);
  const [newNote, setNewNote] = useState("");

  // ── 6. Derived State (useMemo): Thống kê KPI & Bộ lọc danh sách ───────────
  // Thống kê số lượng đơn đặt theo trạng thái
  const metrics = useMemo(() => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      approved: bookings.filter((b) => b.status === "approved").length,
      completed: bookings.filter(
        (b) => b.status === "checked_in" || (b.status as string) === "completed",
      ).length,
      rejected: bookings.filter((b) => b.status === "rejected").length,
    };
  }, [bookings]);

  // Cấu hình các thẻ con nhộng (Pills) lọc trạng thái kèm đếm số lượng
  const statusPillItems = useMemo(() => {
    return [
      { key: "all", label: "Tất cả", count: metrics.total },
      { key: "pending", label: "Chờ duyệt", count: metrics.pending, color: "gold" },
      { key: "approved", label: "Đã duyệt & giữ bàn", count: metrics.approved, color: "green" },
      { key: "completed", label: "Đã nhận bàn", count: metrics.completed, color: "blue" },
      { key: "rejected", label: "Từ chối", count: metrics.rejected, color: "red" },
    ];
  }, [metrics]);

  // Danh sách đơn đặt sau khi lọc theo trạng thái, ngày và từ khóa tìm kiếm
  const filteredBookings = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
    const in3Days = dayjs().add(3, "day").format("YYYY-MM-DD");

    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "all" ||
        booking.status === statusFilter ||
        (statusFilter === "completed" && booking.status === "checked_in");

      let matchesDate = true;
      if (dateFilter === "today") {
        matchesDate = booking.date === today;
      } else if (dateFilter === "tomorrow") {
        matchesDate = booking.date === tomorrow;
      } else if (dateFilter === "upcoming") {
        matchesDate = booking.date >= today && booking.date <= in3Days;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        booking.customerName.toLowerCase().includes(q) ||
        booking.phone.toLowerCase().includes(q) ||
        (booking.tableName && booking.tableName.toLowerCase().includes(q));

      return matchesStatus && matchesDate && matchesQuery;
    });
  }, [bookings, statusFilter, dateFilter, searchQuery]);

  // ── 7. Gọi API nạp dữ liệu từ máy chủ ─────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [records, floor] = await Promise.all([bookingService.getAll(), posService.getTables()]);
      setBookings(records);
      setTables(floor);
      setLoadError("");
    } catch (error: any) {
      setLoadError(error.response?.data?.message || error.message || "Không thể tải lịch đặt bàn");
    } finally {
      setLoading(false);
    }
  }, []);

  // Lắng nghe WebSocket thời gian thực khi có khách đặt bàn mới từ website
  useEffect(() => {
    void loadData();

    const socket = getSocket();
    if (socket) {
      const handleRealtimeUpdate = () => {
        void loadData();
      };
      socket.on("booking:created", handleRealtimeUpdate);
      socket.on("booking:status-changed", handleRealtimeUpdate);
      socket.on("table:status-changed", handleRealtimeUpdate);

      return () => {
        socket.off("booking:created", handleRealtimeUpdate);
        socket.off("booking:status-changed", handleRealtimeUpdate);
        socket.off("table:status-changed", handleRealtimeUpdate);
      };
    }
  }, [loadData]);

  // ── 8. Hàm tiện ích bảo vệ chống submit liên tục (Debounce Guard) ─────────
  const save = async (action: () => Promise<unknown>) => {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    try {
      await action();
      await loadData();
      return true;
    } catch (error: any) {
      message.error(error.response?.data?.message || error.message || "Không thể lưu lịch đặt bàn");
      await loadData();
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  // ── 9. Handlers: Các hành động xử lý đơn đặt ──────────────────────────────
  // Mở modal duyệt đơn và xếp bàn
  const handleOpenApprove = (booking: BookingRequest) => {
    setBookingToApprove(booking);
    setAssignedTableId(booking.tableId || "");
    setApproveModalVisible(true);
  };

  // Xác nhận phê duyệt đơn đặt
  const handleConfirmApprove = async () => {
    if (!bookingToApprove) return;
    const ok = await save(() =>
      bookingService.update(bookingToApprove.id, {
        status: "approved",
        tableId: assignedTableId,
      }),
    );
    if (!ok) return;
    message.success(`Đã phê duyệt và giữ chỗ cho khách ${bookingToApprove.customerName}`);
    setApproveModalVisible(false);
    setBookingToApprove(null);
  };

  // Mở modal từ chối đơn
  const handleOpenReject = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setRejectionReason("");
    setRejectModalVisible(true);
  };

  // Xác nhận từ chối đơn kèm lý do
  const handleConfirmReject = async () => {
    if (!selectedBooking) return;
    const ok = await save(() =>
      bookingService.update(selectedBooking.id, {
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
      }),
    );
    if (!ok) return;
    message.success(`Đã từ chối đơn đặt bàn của khách ${selectedBooking.customerName}`);
    setRejectModalVisible(false);
    setSelectedBooking(null);
  };

  // Khôi phục đơn từ chối về trạng thái chờ duyệt
  const handleReconsider = async (booking: BookingRequest) => {
    const ok = await save(() =>
      bookingService.update(booking.id, { status: "pending" }),
    );
    if (!ok) return;
    message.success(`Đã khôi phục trạng thái chờ duyệt cho đơn của ${booking.customerName}`);
  };

  // Tạo đơn đặt bàn nhanh từ cuộc gọi hotline
  const handleCreateBooking = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      message.warning("Vui lòng điền họ tên và số điện thoại khách hàng");
      return;
    }
    if (!newTableId) {
      message.warning("Vui lòng chọn bàn bida muốn giữ");
      return;
    }
    const ok = await save(() =>
      bookingService.create({
        customerName: newName.trim(),
        phone: newPhone.trim(),
        tableId: newTableId,
        date: newDate,
        time: newTime,
        duration: newDuration,
        deposit: newDeposit,
        note: newNote.trim(),
      }),
    );
    if (!ok) return;
    message.success(`Đã tạo lịch đặt bàn mới cho khách ${newName.trim()}`);
    setCreateModalVisible(false);
    setNewName("");
    setNewPhone("");
    setNewTableId("");
    setNewNote("");
    setNewDeposit(0);
  };

  // ── 10. Trả về toàn bộ dữ liệu & hàm điều khiển cho BookingManagementPage ──
  return {
    bookings,
    tables,
    loading,
    loadError,
    saving,
    viewMode,
    setViewMode,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    searchQuery,
    setSearchQuery,
    approveModalVisible,
    setApproveModalVisible,
    bookingToApprove,
    assignedTableId,
    setAssignedTableId,
    rejectModalVisible,
    setRejectModalVisible,
    selectedBooking,
    rejectionReason,
    setRejectionReason,
    createModalVisible,
    setCreateModalVisible,
    newName,
    setNewName,
    newPhone,
    setNewPhone,
    newTableId,
    setNewTableId,
    newDate,
    setNewDate,
    newTime,
    setNewTime,
    newDuration,
    setNewDuration,
    newDeposit,
    setNewDeposit,
    newNote,
    setNewNote,
    metrics,
    statusPillItems,
    filteredBookings,
    loadData,
    handleOpenApprove,
    handleConfirmApprove,
    handleOpenReject,
    handleConfirmReject,
    handleReconsider,
    handleCreateBooking,
  };
}
