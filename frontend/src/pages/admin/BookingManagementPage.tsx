import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { bookingService, posService } from "../../services/pos.service";
import type { BookingRequest, PosTable } from "../../types/pos";
import { useNavigate } from "react-router-dom";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  UserOutlined,
  SwapOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  DollarOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Input,
  Select,
  Typography,
  Table,
  Modal,
  Space,
  SegmentedPillList,
  SearchFilterInput,
  message,
} from "../../shared/ui";

const { Title, Text } = Typography;

export const BookingManagementPage: React.FC = () => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [tables, setTables] = useState<PosTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

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

  useEffect(() => { void loadData(); }, [loadData]);

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

  // View mode: 'cards' | 'table'
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal 1: Approve & Assign Table Modal
  const [approveModalVisible, setApproveModalVisible] = useState<boolean>(false);
  const [bookingToApprove, setBookingToApprove] = useState<BookingRequest | null>(null);
  const [assignedTableId, setAssignedTableId] = useState<string>("");

  // Modal 2: Reject Modal
  const [rejectModalVisible, setRejectModalVisible] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Modal 3: Create Booking (Hotline / Phone reservation)
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newPhone, setNewPhone] = useState<string>("");
  const [newTableId, setNewTableId] = useState<string>("");
  const [newDate, setNewDate] = useState<string>(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [newTime, setNewTime] = useState<string>("19:00");
  const [newDuration, setNewDuration] = useState<number>(2);
  const [newDeposit, setNewDeposit] = useState<number>(0);
  const [newNote, setNewNote] = useState<string>("");

  // Metrics
  const metrics = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const approved = bookings.filter((b) => b.status === "approved").length;
    const rejected = bookings.filter((b) => b.status === "rejected").length;
    const checkedIn = bookings.filter((b) => b.status === "checked_in").length;
    return { total, pending, approved, rejected, checkedIn };
  }, [bookings]);

  // Segmented Pill items with live counts
  const statusPillItems = [
    { key: "all", label: "Tất cả yêu cầu", badge: metrics.total },
    { key: "pending", label: "Chờ duyệt", badge: metrics.pending, dotClassName: "bg-amber-500" },
    { key: "approved", label: "Đã phê duyệt", badge: metrics.approved, dotClassName: "bg-emerald-500" },
    { key: "rejected", label: "Đã từ chối", badge: metrics.rejected, dotClassName: "bg-rose-500" },
    { key: "checked_in", label: "Đã nhận bàn", badge: metrics.checkedIn },
  ];

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      const matchQuery =
        !searchQuery ||
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.phone.includes(searchQuery) ||
        b.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchQuery;
    });
  }, [bookings, statusFilter, searchQuery]);

  // ── Handler: Open Approve Modal ─────────────────────────────────────────────
  const handleOpenApprove = (booking: BookingRequest) => {
    setBookingToApprove(booking);
    setAssignedTableId(booking.tableId);
    setApproveModalVisible(true);
  };

  const handleConfirmApprove = async () => {
    if (!bookingToApprove) return;

    const targetTable = tables.find((t) => t.id === assignedTableId);
    const targetTableName = targetTable ? `${targetTable.name} (${targetTable.typeName})` : bookingToApprove.tableName;

    if (!await save(() => bookingService.update(bookingToApprove.id, { status: "approved", tableId: assignedTableId }))) return;

    message.success(
      `Đã phê duyệt đơn đặt bàn ${bookingToApprove.id} và giữ ${targetTableName} cho khách ${bookingToApprove.customerName}!`
    );
    setApproveModalVisible(false);
    setBookingToApprove(null);
  };

  // ── Handler: Reject Booking ─────────────────────────────────────────────────
  const handleOpenReject = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setRejectionReason("");
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedBooking) return;
    if (!rejectionReason.trim()) {
      message.warning("Vui lòng nhập lý do từ chối đơn đặt bàn!");
      return;
    }

    if (!await save(() => bookingService.update(selectedBooking.id, { status: "rejected", rejectionReason: rejectionReason.trim() }))) return;
    message.info(`Đã từ chối đơn đặt bàn ${selectedBooking.id}.`);
    setRejectModalVisible(false);
    setSelectedBooking(null);
    setRejectionReason("");
  };

  // ── Handler: Reconsider / Re-open Rejected Booking ──────────────────────────
  const handleReconsider = async (booking: BookingRequest) => {
    if (await save(() => bookingService.update(booking.id, { status: "pending" }))) {
      message.success(`Đã khôi phục đơn đặt bàn ${booking.id} về trạng thái Chờ duyệt!`);
    }
  };

  // ── Handler: Direct Check-in to POS ─────────────────────────────────────────
  const handleCheckInNow = (booking: BookingRequest) => {
    navigate(`/admin/pos?tableId=${encodeURIComponent(booking.tableId)}`);
  };

  // ── Handler: Create Booking via Hotline ─────────────────────────────────────
  const handleCreateBooking = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      message.warning("Vui lòng nhập họ tên và số điện thoại khách!");
      return;
    }

    const chosenTable = tables.find((t) => t.id === newTableId);
    if (!chosenTable || chosenTable.status !== "available") {
      message.warning("Vui lòng chọn bàn đang trống!");
      return;
    }
    if (!await save(() => bookingService.create({ customerName: newName.trim(), phone: newPhone.trim(),
      tableId: newTableId, date: newDate, time: newTime, duration: newDuration, deposit: newDeposit, note: newNote.trim() }))) return;
    message.success(`Đã lưu lịch đặt bàn cho khách ${newName} tại ${chosenTable.name}!`);
    setCreateModalVisible(false);
    setNewName("");
    setNewPhone("");
    setNewNote("");
    setNewDeposit(0);
    setNewTableId("");
  };

  // ── Table View Columns ──────────────────────────────────────────────────────
  const tableColumns = [
    {
      title: "Mã Đơn & Khách Hàng",
      key: "customer",
      render: (_: any, record: BookingRequest) => (
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {record.id}
            </span>
            <strong className="text-slate-900 text-sm">{record.customerName}</strong>
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
            <PhoneOutlined className="text-slate-400 text-[11px]" />
            {record.phone}
          </span>
        </div>
      ),
    },
    {
      title: "Bàn Yêu Cầu",
      key: "table",
      render: (_: any, record: BookingRequest) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">{record.tableName}</span>
          <span className="text-[11px] text-slate-400">Thời lượng: {record.duration} giờ</span>
        </div>
      ),
    },
    {
      title: "Khung Giờ Hẹn",
      key: "time",
      render: (_: any, record: BookingRequest) => (
        <div>
          <span className="font-mono font-bold text-emerald-800 text-xs block">
            {record.time} ({record.date})
          </span>
          <span className="text-[11px] text-slate-400">Gửi lúc: {new Date(record.createdAt).toLocaleString("vi-VN")}</span>
        </div>
      ),
    },
    {
      title: "Chi Phí Tạm Tính",
      key: "cost",
      render: (_: any, record: BookingRequest) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          {record.estimatedCost.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: "Trạng Thái",
      key: "status",
      render: (_: any, record: BookingRequest) => (
        <div>
          {record.status === "pending" && (
            <Tag color="warning" className="!rounded-full !px-2.5 !py-0.5 !font-bold inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              CHỜ DUYỆT
            </Tag>
          )}
          {record.status === "approved" && (
            <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !font-bold inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              ĐÃ PHÊ DUYỆT
            </Tag>
          )}
          {record.status === "checked_in" && <Tag color="green">ĐÃ NHẬN BÀN</Tag>}
          {record.status === "rejected" && (
            <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !font-bold">
              ĐÃ TỪ CHỐI
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Thao Tác",
      key: "actions",
      align: "right" as const,
      render: (_: any, record: BookingRequest) => (
        <Space size={4}>
          {record.status === "pending" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenReject(record)}
                className="!h-7 !px-2 !rounded-lg !text-xs !border-rose-300 !text-rose-700 hover:!bg-rose-50"
              >
                Từ Chối
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenApprove(record)}
                className="!h-7 !px-3 !rounded-lg !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold"
              >
                Duyệt
              </Button>
            </>
          )}

          {record.status === "approved" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleCheckInNow(record)}
              leftIcon={<PlayCircleOutlined />}
              className="!h-7 !px-3 !rounded-lg !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold"
            >
              Mở Bàn POS
            </Button>
          )}

          {record.status === "rejected" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReconsider(record)}
              className="!h-7 !px-2.5 !rounded-lg !text-xs !border-slate-300"
            >
              Khôi Phục
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. UNIFIED DISPATCH COMMAND BAR ─────────────────────────────────── */}
      <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden">
        {/* Row 1: Header, Pending notification & Quick Actions */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-white">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <CalendarOutlined className="text-emerald-600 text-xl" />
              <Title level={3} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                Duyệt & Quản Lý Đặt Bàn Trực Tuyến
              </Title>
              {metrics.pending > 0 && (
                <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {metrics.pending} ĐƠN CẦN DUYỆT GẤP
                </Tag>
              )}
            </div>
            <Text className="!text-xs !text-slate-500 block">
              Lịch đặt được lưu trên máy chủ và đồng bộ sang POS. Mỗi bàn giữ một lịch đặt cho đến khi nhận bàn hoặc hủy.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <Button variant="outline" size="sm" onClick={loadData} loading={loading} disabled={saving}>Tải lại</Button>
            {/* Direct POS Link */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/pos")}
              leftIcon={<ThunderboltOutlined />}
              className="!h-9 !rounded-xl !border-slate-300 !text-slate-700 hover:!border-emerald-600 font-medium !text-xs"
            >
              Sơ Đồ Bàn POS
            </Button>

            {/* Hotline Create Booking Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateModalVisible(true)}
              leftIcon={<PlusOutlined />}
              className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white shadow-2xs"
            >
              Tạo Lịch Đặt (Hotline)
            </Button>
          </div>
        </div>

        {/* Row 2: Status Pills, View Switcher & Search Bar */}
        <div className="p-3 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="overflow-x-auto pb-1 lg:pb-0">
            <SegmentedPillList
              items={statusPillItems}
              activeKey={statusFilter}
              onSelect={(key) => setStatusFilter(key)}
            />
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <Button
                variant={viewMode === "cards" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                leftIcon={<AppstoreOutlined />}
                className={`!h-8 !px-2.5 !rounded-md !text-xs ${
                  viewMode === "cards"
                    ? "!bg-emerald-600 !text-white !border-0 font-bold"
                    : "!text-slate-600 hover:!bg-slate-100"
                }`}
              >
                Dạng Thẻ
              </Button>
              <Button
                variant={viewMode === "table" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                leftIcon={<UnorderedListOutlined />}
                className={`!h-8 !px-2.5 !rounded-md !text-xs ${
                  viewMode === "table"
                    ? "!bg-emerald-600 !text-white !border-0 font-bold"
                    : "!text-slate-600 hover:!bg-slate-100"
                }`}
              >
                Dạng Bảng
              </Button>
            </div>

            {/* Shared UI Search Filter Input */}
            <SearchFilterInput
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder="Tìm khách, SĐT, mã đơn..."
              width={240}
            />
          </div>
        </div>
      </Card>

      {loadError && <Card><Text type="danger">{loadError}</Text><Button variant="link" onClick={loadData}>Thử lại</Button></Card>}
      {loading && <Text>Đang tải lịch đặt bàn từ máy chủ...</Text>}
      {/* ── 2. MAIN CONTENT (CARDS GRID OR TABLE VIEW) ──────────────────────── */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBookings.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <Text>{loading ? "Đang tải..." : loadError ? "Chưa thể tải lịch đặt bàn." : "Không tìm thấy yêu cầu đặt bàn nào phù hợp với bộ lọc."}</Text>
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const isPending = booking.status === "pending";
              const isApproved = booking.status === "approved";
              const isRejected = booking.status === "rejected";

              return (
                <Card
                  key={booking.id}
                  styles={{ body: { padding: 0 } }}
                  className={`!rounded-2xl transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-sm flex flex-col justify-between ${
                    isPending
                      ? "!border-amber-400 !bg-white ring-1 ring-amber-400/20"
                      : isApproved
                      ? "!border-emerald-500 !bg-white ring-1 ring-emerald-500/20"
                      : "!border-slate-200 !bg-white opacity-80"
                  }`}
                >
                  {/* Card Header: Code, Guest, Status */}
                  <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {booking.id}
                      </span>
                      <strong className="text-sm text-slate-900 truncate">{booking.customerName}</strong>
                    </div>

                    <div>
                      {isPending && (
                        <Tag color="warning" className="!rounded-full !px-2 !py-0.5 !text-[10.5px] !font-bold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          CHỜ DUYỆT
                        </Tag>
                      )}
                      {isApproved && (
                        <Tag color="green" className="!rounded-full !px-2 !py-0.5 !text-[10.5px] !font-bold inline-flex items-center gap-1">
                          <CheckCircleOutlined />
                          ĐÃ DUYỆT
                        </Tag>
                      )}
                      {booking.status === "checked_in" && <Tag color="green">ĐÃ NHẬN BÀN</Tag>}
                      {isRejected && (
                        <Tag color="error" className="!rounded-full !px-2 !py-0.5 !text-[10.5px] !font-bold">
                          ĐÃ TỪ CHỐI
                        </Tag>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Details */}
                  <div className="p-4 flex-1 space-y-3">
                    {/* Time & Table strip */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1">
                          <ClockCircleOutlined className="text-emerald-600" />
                          Khung giờ hẹn:
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {booking.time} ({booking.date})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1">
                          <AppstoreOutlined className="text-emerald-600" />
                          Bàn yêu cầu:
                        </span>
                        <span className="font-bold text-emerald-800">{booking.tableName}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                        <span className="text-slate-500">Thời lượng chơi:</span>
                        <span className="font-bold text-slate-800">{booking.duration} Giờ</span>
                      </div>
                    </div>

                    {/* Customer contact & Financials */}
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-500">
                          <PhoneOutlined className="text-slate-400" /> SĐT liên hệ:
                        </span>
                        <span className="font-mono font-bold text-slate-900">{booking.phone}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tạm tính dự kiến:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {booking.estimatedCost.toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200">
                        <span className="text-slate-500">Tiền cọc giữ bàn:</span>
                        <Text strong>{booking.deposit.toLocaleString("vi-VN")}đ</Text>
                      </div>
                    </div>

                    {/* Rejection reason if any */}
                    {booking.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                        <span className="font-bold block mb-0.5">Lý do từ chối:</span>
                        <span>{booking.rejectionReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Action Buttons */}
                  <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    {isPending && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReject(booking)}
                          leftIcon={<CloseCircleOutlined />}
                          className="!flex-1 !h-8 !rounded-xl !text-xs !border-rose-300 !text-rose-700 hover:!bg-rose-50"
                        >
                          Từ Chối
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenApprove(booking)}
                          leftIcon={<CheckCircleOutlined />}
                          className="!flex-1 !h-8 !rounded-xl !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold text-white shadow-2xs"
                        >
                          Phê Duyệt
                        </Button>
                      </>
                    )}

                    {isApproved && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenApprove(booking)}
                          leftIcon={<SwapOutlined />}
                          className="!h-8 !px-3 !rounded-xl !text-xs !border-slate-300 text-slate-700"
                        >
                          Đổi Bàn
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleCheckInNow(booking)}
                          leftIcon={<PlayCircleOutlined />}
                          className="!flex-1 !h-8 !rounded-xl !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold text-white shadow-2xs"
                        >
                          Khách Đến (Mở Bàn POS)
                        </Button>
                      </>
                    )}

                    {isRejected && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReconsider(booking)}
                        className="!w-full !h-8 !rounded-xl !text-xs !border-slate-300 text-slate-700 hover:!border-emerald-600"
                      >
                        Khôi Phục Yêu Cầu Này
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table
              dataSource={filteredBookings.map((b) => ({ ...b, key: b.id }))}
              columns={tableColumns}
              pagination={{ pageSize: 8, showTotal: (total) => `Tổng cộng ${total} đơn đặt bàn` }}
              className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-tbody_td]:!py-3.5"
            />
          </div>
        </Card>
      )}

      {/* ── MODAL 1: DUYỆT ĐẶT BÀN & CHỈ ĐỊNH BÀN (Approve & Assign Table) ────── */}
      <Modal
        open={approveModalVisible}
        onCancel={() => setApproveModalVisible(false)}
        footer={null}
        title={
          <Space align="center" size={8}>
            <CheckCircleOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Phê Duyệt Đơn Đặt Bàn ({bookingToApprove?.id})
            </span>
          </Space>
        }
      >
        <div className="py-2 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Khách hàng:</span>
              <strong className="text-slate-900">{bookingToApprove?.customerName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số điện thoại:</span>
              <span className="font-mono font-bold text-slate-800">{bookingToApprove?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Khung giờ hẹn:</span>
              <span className="font-mono font-bold text-emerald-800">
                {bookingToApprove?.time} ({bookingToApprove?.date}) - {bookingToApprove?.duration} giờ
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Xác nhận hoặc chuyển bàn chỉ định:
            </label>
            <Select
              value={assignedTableId}
              onChange={(val) => setAssignedTableId(val)}
              className="!w-full !rounded-xl"
              options={tables.filter(t => t.status === "available" || t.bookedInfo?.bookingId === bookingToApprove?.id).map((t) => ({
                value: t.id,
                label: `${t.name} (${t.typeName}) - ${t.pricePerHour.toLocaleString()}đ/h [${
                  t.status === "available"
                    ? "Đang trống"
                    : t.status === "booked"
                    ? "Đang có lịch hẹn"
                    : "Đang có khách chơi"
                }]`,
              }))}
            />
            <Text type="secondary">Bàn được giữ trên POS cho đến khi khách nhận bàn hoặc lịch bị từ chối.</Text>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
            <MessageOutlined className="text-emerald-600 text-base flex-shrink-0" />
            <span>
              Lịch đặt được lưu vào database. SMS, Zalo và mã QR chưa được tích hợp.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setApproveModalVisible(false)} className="!rounded-xl">
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmApprove}
              loading={saving}
              disabled={loading || !!loadError}
              leftIcon={<CheckCircleOutlined />}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              Xác Nhận Giữ Bàn Cho Khách
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 2: TỪ CHỐI ĐẶT BÀN KÈM LÝ DO (Reject Booking) ──────────────── */}
      <Modal
        open={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        footer={null}
        title={
          <Space align="center" size={8}>
            <ExclamationCircleOutlined className="text-rose-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Từ Chối Yêu Cầu Đặt Bàn ({selectedBooking?.id})
            </span>
          </Space>
        }
      >
        <div className="py-2 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed mb-0">
            Vui lòng chọn hoặc nhập lý do từ chối để hệ thống gửi tin nhắn thông báo giải thích cho khách hàng{" "}
            <strong>{selectedBooking?.customerName}</strong> ({selectedBooking?.phone}).
          </p>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Lý do mẫu nhanh:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Trùng khung giờ thi đấu giải nội bộ CLB",
                "Bàn yêu cầu đang trong lịch bảo trì vải nỉ",
                "Quá tải giờ cao điểm, đã kín toàn bộ bàn",
                "Không liên lạc được với khách để xác nhận",
              ].map((reason, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectionReason(reason)}
                  className="!h-auto !py-1 !px-2.5 !text-[11px] !rounded-lg !border-slate-200 !bg-slate-50 hover:!bg-emerald-50 hover:!border-emerald-300 !text-slate-700 font-normal"
                >
                  {reason}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Nội dung phản hồi:</label>
            <Input.TextArea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nhập lý do gửi đến khách..."
              className="!rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRejectModalVisible(false)} className="!rounded-xl">
              Hủy
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmReject}
              loading={saving}
              disabled={loading || !!loadError}
              className="!rounded-xl font-bold px-4"
            >
              Xác Nhận Từ Chối
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 3: TẠO ĐẶT BÀN QUA HOTLINE / ĐIỆN THOẠI (Hotline Booking) ──── */}
      <Modal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        title={
          <Space align="center" size={8}>
            <PhoneOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">Tạo Lịch Đặt Bàn (Hotline / Khách Quen)</span>
          </Space>
        }
      >
        <div className="py-2 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Họ tên khách hàng:</label>
              <Input
                placeholder="Nguyễn Văn A..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                prefix={<UserOutlined className="text-slate-400" />}
                className="!h-9 !rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số điện thoại:</label>
              <Input
                placeholder="0912 345 678..."
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                prefix={<PhoneOutlined className="text-slate-400" />}
                className="!h-9 !rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Chọn bàn bida:</label>
              <Select
                value={newTableId}
                onChange={(val) => setNewTableId(val)}
                className="!w-full !rounded-xl"
                options={tables.filter(t => t.status === "available").map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.typeName}) - ${t.pricePerHour.toLocaleString()}đ/h`,
                }))}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ngày hẹn:</label>
              <Input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Giờ bắt đầu:</label>
              <Input
                placeholder="19:00"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="!h-9 !rounded-xl font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Thời lượng (giờ):</label>
              <Select
                value={newDuration}
                onChange={(val) => setNewDuration(Number(val))}
                className="!w-full !rounded-xl"
                options={[
                  { value: 1, label: "1 Giờ" },
                  { value: 2, label: "2 Giờ" },
                  { value: 3, label: "3 Giờ" },
                  { value: 4, label: "4 Giờ" },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Tiền cọc thực tế đã nhận (VNĐ):</label>
            <Input
              type="number"
              value={newDeposit}
              onChange={(e) => setNewDeposit(Number(e.target.value))}
              prefix={<DollarOutlined className="text-emerald-600" />}
              className="!h-9 !rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Ghi chú yêu cầu của khách:</label>
            <Input.TextArea
              rows={2}
              placeholder="Yêu cầu cơ riêng, phòng lạnh, chuẩn bị đồ uống trước..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="!rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setCreateModalVisible(false)} className="!rounded-xl">
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateBooking}
              loading={saving}
              disabled={loading || !!loadError}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              Tạo & Giữ Bàn Ngay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookingManagementPage;
