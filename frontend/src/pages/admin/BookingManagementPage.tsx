// ============================================================================
// 1. IMPORTS
// ============================================================================
// 1.1 Thư viện bên ngoài & Icon hệ thống
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

// 1.2 UI Components & Design System
import {
  Button,
  Card,
  Tag,
  Typography,
  Select,
  SegmentedPillList,
  SearchFilterInput,
} from "../../shared/ui";

// 1.3 Components & Modals nghiệp vụ
import { BookingKpiCards } from "./booking/components/BookingKpiCards";
import { BookingCardView } from "./booking/components/BookingCardView";
import { BookingTableView } from "./booking/components/BookingTableView";
import { BookingApproveModal } from "./booking/modals/BookingApproveModal";
import { BookingRejectModal } from "./booking/modals/BookingRejectModal";
import { BookingCreateModal } from "./booking/modals/BookingCreateModal";

// 1.4 Custom Hook nghiệp vụ
import { useBookingData } from "./booking/hooks/useBookingData";

// ============================================================================
// 3. CONSTANTS & ALIASES
// ============================================================================
const { Title, Text } = Typography;

// ============================================================================
// 4. MAIN COMPONENT: QUẢN LÝ ĐẶT BÀN & ĐIỀU PHỐI (BOOKING DISPATCH)
// ============================================================================
export const BookingManagementPage: React.FC = () => {
  const navigate = useNavigate();

  // Khởi tạo Custom Hook gom toàn bộ state, data fetch, socket và handlers
  const {
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
  } = useBookingData();

  // Điều hướng nhanh sang màn hình thu ngân POS để mở bàn
  const handleCheckInNow = (booking: { id: string }) => {
    navigate(`/pos?bookingId=${booking.id}`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* ── 1. CỤM 4 THẺ KPI CHỈ SỐ ĐẶT BÀN CHUẨN DESIGN SYSTEM ───────────── */}
      <BookingKpiCards metrics={metrics} />

      {/* ── 2. THANH CÔNG CỤ ĐIỀU PHỐI & TÌM KIẾM ĐƠN ĐẶT ─────────────────── */}
      <Card
        styles={{ body: { padding: 0 } }}
        className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
      >
        {/* Hàng trên: Tiêu đề trang, tag cảnh báo và cụm nút thao tác nhanh */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-white">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <CalendarOutlined className="text-emerald-600 text-xl" />
              <Title
                level={3}
                className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight"
              >
                Quản Lý Đặt Bàn
              </Title>
              {metrics.pending > 0 && (
                <Tag
                  color="warning"
                  className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1.5 whitespace-nowrap !bg-amber-50 !border-amber-200 !text-amber-800"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {metrics.pending} đơn chờ xác nhận
                </Tag>
              )}
            </div>
            <Text className="!text-xs !text-slate-500 block">
              Tiếp nhận đơn khách đặt trước và mở bàn nhanh khi khách đến quán.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              loading={loading}
              disabled={saving}
              className="!h-9 !rounded-xl !border-slate-300 !text-slate-700 hover:!border-emerald-600 font-medium !text-xs whitespace-nowrap"
            >
              Làm mới
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/pos")}
              leftIcon={<ThunderboltOutlined />}
              className="!h-9 !rounded-xl !border-slate-300 !text-slate-700 hover:!border-emerald-600 font-medium !text-xs whitespace-nowrap"
            >
              Xem Sơ Đồ Bàn
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateModalVisible(true)}
              leftIcon={<PlusOutlined />}
              className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white shadow-2xs whitespace-nowrap"
            >
              + Đặt Bàn Mới
            </Button>
          </div>
        </div>

        {/* Hàng dưới: Lọc trạng thái, lọc ngày, chọn xem lưới/bảng & ô tìm kiếm */}
        <div className="p-3 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="overflow-x-auto pb-1 lg:pb-0">
            <SegmentedPillList
              items={statusPillItems}
              activeKey={statusFilter}
              onSelect={(key) => setStatusFilter(key)}
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
              <span>Ngày hẹn:</span>
              <Select
                value={dateFilter}
                onChange={(val) => setDateFilter(val)}
                className="!w-32 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả ngày" },
                  { value: "today", label: "Hôm nay" },
                  { value: "tomorrow", label: "Ngày mai" },
                  { value: "upcoming", label: "3 ngày tới" },
                ]}
              />
            </div>

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

            <SearchFilterInput
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder="Tìm khách, SĐT, mã đơn..."
              width={240}
            />
          </div>
        </div>
      </Card>

      {/* Thông báo lỗi khi tải dữ liệu thất bại */}
      {loadError && (
        <Card className="!rounded-2xl border-rose-200 bg-rose-50/50 p-4">
          <Text type="danger">{loadError}</Text>
          <Button variant="link" onClick={loadData} className="ml-2">
            Thử lại
          </Button>
        </Card>
      )}

      {/* ── 3. DANH SÁCH ĐƠN ĐẶT BÀN (CHẾ ĐỘ THẺ HOẶC BẢNG) ───────────────── */}
      {viewMode === "cards" ? (
        <BookingCardView
          bookings={filteredBookings}
          onOpenApprove={handleOpenApprove}
          onOpenReject={handleOpenReject}
          onCheckInNow={handleCheckInNow}
          onReconsider={handleReconsider}
        />
      ) : (
        <BookingTableView
          bookings={filteredBookings}
          onOpenApprove={handleOpenApprove}
          onOpenReject={handleOpenReject}
          onCheckInNow={handleCheckInNow}
          onReconsider={handleReconsider}
        />
      )}

      {/* ── 4. CÁC MODAL NGHIỆP VỤ (PHÊ DUYỆT / TỪ CHỐI / TẠO MỚI) ────────── */}
      {/* Modal 1: Duyệt & gán bàn bida */}
      <BookingApproveModal
        open={approveModalVisible}
        booking={bookingToApprove}
        tables={tables}
        assignedTableId={assignedTableId}
        saving={saving}
        loading={loading}
        loadError={loadError}
        onClose={() => setApproveModalVisible(false)}
        setAssignedTableId={setAssignedTableId}
        onConfirmApprove={handleConfirmApprove}
      />

      {/* Modal 2: Từ chối yêu cầu đặt bàn kèm lý do */}
      <BookingRejectModal
        open={rejectModalVisible}
        booking={selectedBooking}
        rejectionReason={rejectionReason}
        saving={saving}
        loading={loading}
        loadError={loadError}
        onClose={() => setRejectModalVisible(false)}
        setRejectionReason={setRejectionReason}
        onConfirmReject={handleConfirmReject}
      />

      {/* Modal 3: Tạo lịch đặt bàn nhanh qua điện thoại/hotline */}
      <BookingCreateModal
        open={createModalVisible}
        tables={tables}
        newName={newName}
        setNewName={setNewName}
        newPhone={newPhone}
        setNewPhone={setNewPhone}
        newTableId={newTableId}
        setNewTableId={setNewTableId}
        newDate={newDate}
        setNewDate={setNewDate}
        newTime={newTime}
        setNewTime={setNewTime}
        newDuration={newDuration}
        setNewDuration={setNewDuration}
        newDeposit={newDeposit}
        setNewDeposit={setNewDeposit}
        newNote={newNote}
        setNewNote={setNewNote}
        saving={saving}
        loading={loading}
        loadError={loadError}
        onClose={() => setCreateModalVisible(false)}
        onCreateBooking={handleCreateBooking}
      />
    </div>
  );
};

export default BookingManagementPage;
