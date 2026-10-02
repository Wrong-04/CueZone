import React, { useState, useEffect, useMemo } from "react";
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
import {
  INITIAL_BOOKING_REQUESTS,
  INITIAL_POS_TABLES,
  type BookingRequest,
  type PosTable,
} from "../../mock/posData";

const { Title, Text } = Typography;

export const BookingManagementPage: React.FC = () => {
  const navigate = useNavigate();

  // Load Bookings from localStorage or initial mock
  const [bookings, setBookings] = useState<BookingRequest[]>(() => {
    const saved = localStorage.getItem("cuezone_bookings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_BOOKING_REQUESTS;
  });

  // Load POS Tables for table assignment & status checking
  const [tables, setTables] = useState<PosTable[]>(() => {
    const saved = localStorage.getItem("cuezone_pos_tables");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_POS_TABLES;
  });

  // Save changes
  useEffect(() => {
    localStorage.setItem("cuezone_bookings", JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem("cuezone_pos_tables", JSON.stringify(tables));
  }, [tables]);

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
  const [newTableId, setNewTableId] = useState<string>("TB-02");
  const [newDate, setNewDate] = useState<string>("Hôm nay");
  const [newTime, setNewTime] = useState<string>("19:00");
  const [newDuration, setNewDuration] = useState<number>(2);
  const [newDeposit, setNewDeposit] = useState<number>(100000);
  const [newNote, setNewNote] = useState<string>("");

  // Metrics
  const metrics = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const approved = bookings.filter((b) => b.status === "approved").length;
    const rejected = bookings.filter((b) => b.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [bookings]);

  // Segmented Pill items with live counts
  const statusPillItems = [
    { key: "all", label: "Tất cả yêu cầu", badge: metrics.total },
    { key: "pending", label: "Chờ duyệt", badge: metrics.pending, dotClassName: "bg-amber-500" },
    { key: "approved", label: "Đã phê duyệt", badge: metrics.approved, dotClassName: "bg-emerald-500" },
    { key: "rejected", label: "Đã từ chối", badge: metrics.rejected, dotClassName: "bg-rose-500" },
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

  const handleConfirmApprove = () => {
    if (!bookingToApprove) return;

    const targetTable = tables.find((t) => t.id === assignedTableId);
    const targetTableName = targetTable ? `${targetTable.name} (${targetTable.typeName})` : bookingToApprove.tableName;

    // Update booking state
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingToApprove.id
          ? {
              ...b,
              tableId: assignedTableId,
              tableName: targetTableName,
              status: "approved" as const,
            }
          : b
      )
    );

    // Sync to POS floor: mark table as booked
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === assignedTableId) {
          return {
            ...t,
            status: "booked" as const,
            bookedInfo: {
              customerName: bookingToApprove.customerName,
              phone: bookingToApprove.phone,
              time: `${bookingToApprove.time} (${bookingToApprove.date})`,
              bookingId: bookingToApprove.id,
            },
          };
        }
        return t;
      })
    );

    message.success(
      `Đã phê duyệt đơn đặt bàn ${bookingToApprove.id} và giữ ${targetTableName} cho khách ${bookingToApprove.customerName}!`
    );
    setApproveModalVisible(false);
    setBookingToApprove(null);
  };

  // ── Handler: Reject Booking ─────────────────────────────────────────────────
  const handleOpenReject = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setRejectionReason("Trùng khung giờ thi đấu giải nội bộ CLB");
    setRejectModalVisible(true);
  };

  const handleConfirmReject = () => {
    if (!selectedBooking) return;
    if (!rejectionReason.trim()) {
      message.warning("Vui lòng nhập lý do từ chối đơn đặt bàn!");
      return;
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedBooking.id
          ? {
              ...b,
              status: "rejected" as const,
              rejectionReason: rejectionReason.trim(),
            }
          : b
      )
    );

    // If the table was previously marked booked by this booking, free it
    setTables((prev) =>
      prev.map((t) => {
        if (t.bookedInfo?.bookingId === selectedBooking.id) {
          return { ...t, status: "available" as const, bookedInfo: undefined };
        }
        return t;
      })
    );

    message.info(`Đã từ chối đơn đặt bàn ${selectedBooking.id} và gửi tin nhắn giải thích tới khách.`);
    setRejectModalVisible(false);
    setSelectedBooking(null);
    setRejectionReason("");
  };

  // ── Handler: Reconsider / Re-open Rejected Booking ──────────────────────────
  const handleReconsider = (booking: BookingRequest) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, status: "pending" as const, rejectionReason: undefined } : b))
    );
    message.success(`Đã khôi phục đơn đặt bàn ${booking.id} về trạng thái Chờ duyệt!`);
  };

  // ── Handler: Direct Check-in to POS ─────────────────────────────────────────
  const handleCheckInNow = (booking: BookingRequest) => {
    message.loading(`Đang chuyển sang màn hình POS để mở ${booking.tableName} cho ${booking.customerName}...`);
    setTimeout(() => {
      navigate("/admin/pos");
    }, 350);
  };

  // ── Handler: Create Booking via Hotline ─────────────────────────────────────
  const handleCreateBooking = () => {
    if (!newName.trim() || !newPhone.trim()) {
      message.warning("Vui lòng nhập họ tên và số điện thoại khách!");
      return;
    }

    const chosenTable = tables.find((t) => t.id === newTableId);
    const chosenTableName = chosenTable ? `${chosenTable.name} (${chosenTable.typeName})` : "Bàn 02 (Bàn Thường 9FT)";
    const rate = chosenTable?.pricePerHour || 50000;
    const estCost = rate * newDuration;

    const newBooking: BookingRequest = {
      id: `BK-${Math.floor(100 + Math.random() * 900)}`,
      customerName: newName.trim(),
      phone: newPhone.trim(),
      tableId: newTableId,
      tableName: chosenTableName,
      date: newDate,
      time: newTime,
      duration: newDuration,
      estimatedCost: estCost,
      status: "approved",
      createdAt: "Vừa xong",
    };

    setBookings((prev) => [newBooking, ...prev]);

    // Keep table reserved on POS floor
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === newTableId) {
          return {
            ...t,
            status: "booked" as const,
            bookedInfo: {
              customerName: newName.trim(),
              phone: newPhone.trim(),
              time: `${newTime} (${newDate})`,
              bookingId: newBooking.id,
            },
          };
        }
        return t;
      })
    );

    message.success(`Đã tạo lịch đặt bàn thành công cho khách ${newName} tại ${chosenTableName}!`);
    setCreateModalVisible(false);
    setNewName("");
    setNewPhone("");
    setNewNote("");
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
          <span className="text-[11px] text-slate-400">Gửi lúc: {record.createdAt}</span>
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
              Tiếp nhận, kiểm tra xung đột khung giờ và phê duyệt giữ bàn online tự động đồng bộ sang sơ đồ POS
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
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

      {/* ── 2. MAIN CONTENT (CARDS GRID OR TABLE VIEW) ──────────────────────── */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBookings.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              Không tìm thấy yêu cầu đặt bàn nào phù hợp với bộ lọc.
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
                        <span className="font-mono font-bold text-emerald-700">100.000đ (Đã nhận)</span>
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
              options={tables.map((t) => ({
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
            <span className="text-[11px] text-slate-400 block mt-1">
              Hệ thống sẽ giữ bàn này trên sơ đồ POS và từ chối các phiên mở bàn trùng giờ.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
            <MessageOutlined className="text-emerald-600 text-base flex-shrink-0" />
            <span>
              Tin nhắn SMS & Zalo xác nhận sẽ được gửi tự động tới SĐT <strong>{bookingToApprove?.phone}</strong> kèm mã QR nhận bàn.
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
                options={tables.map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.typeName}) - ${t.pricePerHour.toLocaleString()}đ/h`,
                }))}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ngày hẹn:</label>
              <Select
                value={newDate}
                onChange={(val) => setNewDate(val)}
                className="!w-full !rounded-xl"
                options={[
                  { value: "Hôm nay", label: "Hôm nay" },
                  { value: "Ngày mai", label: "Ngày mai" },
                  { value: "Cuối tuần", label: "Thứ 7 tuần này" },
                ]}
              />
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
            <label className="block text-slate-700 font-semibold mb-1">Tiền cọc giữ bàn (VNĐ):</label>
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
