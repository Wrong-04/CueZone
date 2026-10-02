import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  SearchOutlined,
  PlayCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Tag,
  Input,
  Select,
  Typography,
  message,
  Modal,
} from "../../shared/ui";
import {
  INITIAL_BOOKING_REQUESTS,
  type BookingRequest,
  type PosTable,
} from "../../mock/posData";

const { Title, Text } = Typography;

export const BookingManagementPage: React.FC = () => {
  const navigate = useNavigate();

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

  useEffect(() => {
    localStorage.setItem("cuezone_bookings", JSON.stringify(bookings));
  }, [bookings]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Reject Modal
  const [rejectModalVisible, setRejectModalVisible] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Approve action
  const handleApprove = (booking: BookingRequest) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, status: "approved" as const } : b))
    );

    // Sync to POS floor: mark target table as booked
    const savedTables = localStorage.getItem("cuezone_pos_tables");
    if (savedTables) {
      try {
        const tables: PosTable[] = JSON.parse(savedTables);
        const updated = tables.map((t) => {
          if (t.id === booking.tableId && t.status === "available") {
            return {
              ...t,
              status: "booked" as const,
              bookedInfo: {
                customerName: booking.customerName,
                phone: booking.phone,
                time: `${booking.time} (${booking.date})`,
                bookingId: booking.id,
              },
            };
          }
          return t;
        });
        localStorage.setItem("cuezone_pos_tables", JSON.stringify(updated));
      } catch {
        // noop
      }
    }

    message.success(`Đã phê duyệt đơn đặt bàn ${booking.id} của khách ${booking.customerName}!`);
  };

  // Reject action
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

    message.info(`Đã từ chối đơn đặt bàn ${selectedBooking.id} kèm lý do phản hồi cho khách.`);
    setRejectModalVisible(false);
    setSelectedBooking(null);
    setRejectionReason("");
  };

  // Direct check-in to POS
  const handleCheckInNow = (booking: BookingRequest) => {
    message.loading(`Đang chuyển sang màn hình POS để mở bàn đón ${booking.customerName}...`);
    setTimeout(() => {
      navigate("/admin/pos");
    }, 400);
  };

  // Filtered bookings
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

  // Metrics
  const metrics = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const approved = bookings.filter((b) => b.status === "approved").length;
    const rejected = bookings.filter((b) => b.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* ── HEADER & METRICS ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarOutlined className="text-emerald-600 text-xl" />
              <Title level={2} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                Quản Lý & Phê Duyệt Đặt Bàn
              </Title>
              {metrics.pending > 0 && (
                <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !text-xs !font-bold">
                  {metrics.pending} ĐƠN CHỜ DUYỆT
                </Tag>
              )}
            </div>
            <Text className="!text-xs !text-slate-500">
              Tiếp nhận, phê duyệt giữ bàn hoặc từ chối đơn đặt bàn online từ Cổng Khách hàng
            </Text>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/pos")}
            leftIcon={<PlayCircleOutlined />}
            className="!text-xs !rounded-xl !border-slate-300"
          >
            Xem Sơ Đồ Bàn POS
          </Button>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500 block mb-0.5 font-medium">Tổng yêu cầu</span>
            <span className="text-2xl font-black text-slate-900">{metrics.total}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80">
            <span className="text-xs text-amber-700 block mb-0.5 font-medium">Chờ nhân viên duyệt</span>
            <span className="text-2xl font-black text-amber-800">{metrics.pending}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
            <span className="text-xs text-emerald-700 block mb-0.5 font-medium">Đã phê duyệt</span>
            <span className="text-2xl font-black text-emerald-800">{metrics.approved}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80">
            <span className="text-xs text-rose-700 block mb-0.5 font-medium">Đã từ chối</span>
            <span className="text-2xl font-black text-rose-800">{metrics.rejected}</span>
          </div>
        </div>
      </div>

      {/* ── BỘ LỌC VÀ TÌM KIẾM ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            className="!w-44 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "pending", label: "Chờ duyệt (Pending)" },
              { value: "approved", label: "Đã duyệt (Approved)" },
              { value: "rejected", label: "Đã từ chối (Rejected)" },
            ]}
          />
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Tìm tên khách, SĐT, mã đơn..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            className="!rounded-xl"
          />
        </div>
      </div>

      {/* ── DANH SÁCH YÊU CẦU ĐẶT BÀN ────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
            Không tìm thấy yêu cầu đặt bàn nào phù hợp.
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const isPending = booking.status === "pending";
            const isApproved = booking.status === "approved";
            const isRejected = booking.status === "rejected";

            return (
              <div
                key={booking.id}
                className={`p-4 rounded-2xl border transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs hover:shadow-sm ${
                  isPending
                    ? "border-amber-300 ring-1 ring-amber-300/30 bg-amber-50/20"
                    : isApproved
                    ? "border-emerald-200"
                    : "border-slate-200 opacity-75"
                }`}
              >
                {/* Thông tin đơn */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{booking.id}</span>
                    <Text strong className="!text-base !text-slate-900">
                      {booking.customerName}
                    </Text>
                    {isPending && (
                      <Tag color="warning" className="!font-bold !text-[11px] !rounded-full">
                        CHỜ DUYỆT
                      </Tag>
                    )}
                    {isApproved && (
                      <Tag color="green" className="!font-bold !text-[11px] !rounded-full">
                        ĐÃ DUYỆT
                      </Tag>
                    )}
                    {isRejected && (
                      <Tag color="error" className="!font-bold !text-[11px] !rounded-full">
                        ĐÃ TỪ CHỐI
                      </Tag>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <PhoneOutlined className="text-slate-400" />
                      <strong>{booking.phone}</strong>
                    </span>
                    <span>
                      Bàn yêu cầu: <strong className="text-emerald-700">{booking.tableName}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <ClockCircleOutlined className="text-slate-400" />
                      <span>{booking.time} ({booking.date}) - Thời lượng: <strong>{booking.duration}h</strong></span>
                    </span>
                    <span>
                      Tạm tính: <strong className="text-slate-900">{booking.estimatedCost.toLocaleString("vi-VN")}đ</strong>
                    </span>
                  </div>

                  {booking.rejectionReason && (
                    <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 inline-block mt-1">
                      Lý do từ chối: {booking.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Các nút hành động */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {isPending && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReject(booking)}
                        leftIcon={<CloseCircleOutlined />}
                        className="!text-xs !h-9 !px-3 !rounded-xl !border-rose-300 !text-rose-700 hover:!bg-rose-50"
                      >
                        Từ Chối
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApprove(booking)}
                        leftIcon={<CheckCircleOutlined />}
                        className="!text-xs !h-9 !px-4 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold"
                      >
                        Phê Duyệt Đặt Bàn
                      </Button>
                    </>
                  )}

                  {isApproved && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleCheckInNow(booking)}
                      leftIcon={<PlayCircleOutlined />}
                      className="!text-xs !h-9 !px-4 !rounded-xl !bg-emerald-700 hover:!bg-emerald-800 !border-emerald-700 font-bold"
                    >
                      Khách Đến (Mở Bàn Ngay)
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL: TỪ CHỐI ĐẶT BÀN KÈM LÝ DO (Reject Booking with Reason) ── */}
      <Modal
        open={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2 text-rose-600">
            <ExclamationCircleOutlined className="text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Từ Chối Yêu Cầu Đặt Bàn ({selectedBooking?.id})
            </span>
          </div>
        }
      >
        <div className="py-3 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed mb-0">
            Vui lòng chọn hoặc nhập lý do từ chối để hệ thống phản hồi và thông báo cho khách hàng{" "}
            <strong>{selectedBooking?.customerName}</strong> qua SĐT: {selectedBooking?.phone}.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Lý do mẫu nhanh:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Trùng khung giờ thi đấu giải nội bộ CLB",
                "Bàn yêu cầu đang trong lịch bảo trì vải nỉ",
                "Quá tải giờ cao điểm, đã kín bàn",
                "Không liên lạc được với khách để xác nhận",
              ].map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 transition-all text-left"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nội dung lý do từ chối:
            </label>
            <Input.TextArea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nhập lý do gửi đến khách..."
              className="!rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalVisible(false)}
              className="!rounded-xl"
            >
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
    </div>
  );
};

export default BookingManagementPage;
