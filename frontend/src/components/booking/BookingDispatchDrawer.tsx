import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  SwapOutlined,
  PlusOutlined,
  SyncOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import {
  Drawer,
  Button,
  Tag,
  Input,
  Select,
  Modal,
  Tooltip,
  message,
} from "../../shared/ui";
import { bookingService } from "../../services/pos.service";
import type { BookingRequest, PosTable } from "../../types/pos";
import { getSocket } from "../../services/socket.service";

interface Props {
  open: boolean;
  onClose: () => void;
  tables: PosTable[];
  onCheckInTable: (tableId: string, booking: BookingRequest) => void;
  onTablesReload: () => Promise<void>;
  onOpenCreateBookingModal?: () => void;
}

export const BookingDispatchDrawer: React.FC<Props> = ({
  open,
  onClose,
  tables,
  onCheckInTable,
  onTablesReload,
  onOpenCreateBookingModal,
}) => {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabFilter, setTabFilter] = useState<"urgent" | "today" | "noshow" | "all">("today");

  // Re-assign table modal state
  const [changeTableModalOpen, setChangeTableModalOpen] = useState(false);
  const [selectedBookingForChange, setSelectedBookingForChange] = useState<BookingRequest | null>(null);
  const [newTargetTableId, setNewTargetTableId] = useState("");
  const [savingAction, setSavingAction] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookingService.getAll();
      // Deduplicate bookings: loại bỏ các bản ghi trùng lặp khách + bàn + giờ hẹn
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
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchBookings();
    }
  }, [open, fetchBookings]);

  // Realtime Socket listener
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

  const todayIso = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getTime() + 7 * 3600000);
    return d.toISOString().slice(0, 10);
  }, []);

  // Time & Status evaluation for each booking
  const enrichedBookings = useMemo(() => {
    const now = Date.now();
    return bookings.map((b) => {
      let isToday = b.date === todayIso;
      let diffMinutes = 0;
      let isPast = false;
      let isUpcoming = false;
      let isHolding = false;
      let isOverdueNoShow = false;

      // Kiểm tra xem bàn thực tế trên POS có đang bị khóa bởi lịch đặt này không
      const targetTable = tables.find((t) => t.id === b.tableId || t.code === b.tableId);
      const isTableActuallyBooked = targetTable?.status === "booked";

      if (b.date && b.time) {
        const timeParts = b.time.split(":");
        const bDate = new Date(`${b.date}T${timeParts[0]?.padStart(2, "0")}:${timeParts[1]?.padStart(2, "0")}:00+07:00`);
        const diffMs = bDate.getTime() - now;
        diffMinutes = Math.floor(diffMs / 60000);

        // Sắp đến: trong vòng 60 phút tới
        if (diffMinutes >= 0 && diffMinutes <= 60 && isToday) {
          isUpcoming = true;
        }
        // Đang giữ bàn: từ 15 phút trước tới 15 phút sau giờ hẹn
        if (diffMinutes > -15 && diffMinutes <= 15 && isToday) {
          isHolding = true;
        }
        // Quá hạn: trễ hơn 15 phút mà chưa check-in hoặc chưa hủy
        if (diffMinutes <= -15 && isToday && b.status !== "checked_in" && b.status !== "rejected") {
          isOverdueNoShow = true;
        }
        if (diffMinutes < 0) isPast = true;
      }

      return {
        ...b,
        diffMinutes,
        isToday,
        isPast,
        isUpcoming,
        isHolding,
        isOverdueNoShow,
        isTableActuallyBooked,
      };
    });
  }, [bookings, todayIso, tables]);

  // Tab counts (Chỉ đếm các lịch hẹn trong ngày hôm nay và tương lai, không tính lịch cũ quá khứ)
  const counts = useMemo(() => {
    const todayList = enrichedBookings.filter((b) => b.isToday);
    const activeList = enrichedBookings.filter((b) => !b.date || b.date >= todayIso);
    const urgentList = todayList.filter(
      (b) =>
        b.status !== "checked_in" &&
        b.status !== "rejected" &&
        !b.isOverdueNoShow &&
        (b.isHolding || b.isUpcoming),
    );
    const noshowList = todayList.filter((b) => b.isOverdueNoShow && b.status !== "checked_in" && b.status !== "rejected");
    return {
      urgent: urgentList.length,
      today: todayList.length,
      noshow: noshowList.length,
      checked_in: todayList.filter((b) => b.status === "checked_in").length,
      all: activeList.length,
    };
  }, [enrichedBookings, todayIso]);

  // Filtered List
  const displayBookings = useMemo(() => {
    return enrichedBookings.filter((b) => {
      // Bỏ qua các lịch hẹn của các ngày cũ trong quá khứ (không load rác vào Drawer POS)
      if (b.date && b.date < todayIso) return false;

      // Tab filter
      if (tabFilter === "urgent") {
        if (b.status === "checked_in" || b.status === "rejected" || b.isOverdueNoShow) return false;
        if (!b.isToday) return false;
        return b.isHolding || b.isUpcoming;
      }
      if (tabFilter === "today" && !b.isToday) return false;
      if (tabFilter === "noshow" && (!b.isOverdueNoShow || !b.isToday)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = b.customerName.toLowerCase().includes(q);
        const matchPhone = b.phone.includes(q);
        const matchTable = (b.tableName || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchTable) return false;
      }

      return true;
    });
  }, [enrichedBookings, tabFilter, searchQuery, todayIso]);

  // Sắp xếp thứ tự danh sách hiển thị thông minh:
  // 1. Khách đang giữ chỗ (Holding) ưu tiên số 1
  // 2. Khách sắp đến (Upcoming) ưu tiên số 2
  // 3. Khách đặt theo giờ hẹn tăng dần (sớm lên trước)
  // 4. Khách quá hạn nhưng bàn vẫn bị giữ (cần xả bàn)
  // 5. Khách quá hạn mà bàn đã xả (bàn trống) đưa xuống dưới
  // 6. Khách đã nhận bàn (checked_in) hoặc đã hủy (rejected) đưa xuống cuối cùng
  const sortedBookings = useMemo(() => {
    return [...displayBookings].sort((a, b) => {
      const aDone = a.status === "checked_in" || a.status === "rejected";
      const bDone = b.status === "checked_in" || b.status === "rejected";
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;

      if (a.isHolding && !b.isHolding) return -1;
      if (!a.isHolding && b.isHolding) return 1;

      if (a.isUpcoming && !b.isUpcoming) return -1;
      if (!a.isUpcoming && b.isUpcoming) return 1;

      const aOverdueHeld = a.isOverdueNoShow && a.isTableActuallyBooked;
      const bOverdueHeld = b.isOverdueNoShow && b.isTableActuallyBooked;
      if (aOverdueHeld && !bOverdueHeld) return -1;
      if (!aOverdueHeld && bOverdueHeld) return 1;

      if (a.isOverdueNoShow && !b.isOverdueNoShow) return 1;
      if (!a.isOverdueNoShow && b.isOverdueNoShow) return -1;

      return (a.time || "").localeCompare(b.time || "");
    });
  }, [displayBookings]);

  // Handlers
  const handleCheckIn = (b: BookingRequest) => {
    const target = tables.find((t) => t.id === b.tableId || t.code === b.tableId);
    if (target && (target.status === "playing" || target.status === "paused")) {
      Modal.confirm({
        title: `Bàn ${target.name} đang có khách chơi!`,
        content: `Bàn ${target.name} hiện chưa trống. Bạn có muốn chọn bàn bida trống khác để xếp cho khách ${b.customerName} không?`,
        okText: "Chọn bàn khác",
        cancelText: "Bỏ qua",
        onOk: () => {
          handleOpenChangeTable(b);
        },
      });
      return;
    }
    onClose();
    onCheckInTable(b.tableId, b);
  };

  const handleOpenChangeTable = (b: BookingRequest) => {
    setSelectedBookingForChange(b);
    setNewTargetTableId(b.tableId);
    setChangeTableModalOpen(true);
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

  const filterTabs = [
    { key: "urgent", label: `Cần đón (${counts.urgent})` },
    { key: "today", label: `Hôm nay (${counts.today})` },
    { key: "noshow", label: `Hết hạn (${counts.noshow})` },
    { key: "all", label: `Tất cả (${counts.all})` },
  ];

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
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
                <CalendarOutlined />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-sm block">
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
                  className="!h-8 !px-2.5 !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-0 font-bold !rounded-xl text-white shadow-2xs"
                >
                  Đặt Qua Hotline
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-3.5 pb-6">
          {/* Search filter input */}
          <div className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên khách, SĐT, số bàn..."
              allowClear
              className="!h-9 !rounded-xl !text-xs"
            />
          </div>

          {/* Filter Tabs: 4 tabs dàn đều 100%, không bị cuộn ngang tràn viền mất chữ */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl w-full">
            {filterTabs.map((tab) => {
              const isActive = tabFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTabFilter(tab.key as typeof tabFilter)}
                  className={`relative flex items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition-all text-center ${
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

          {/* List of bookings */}
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
                const isCheckedIn = b.status === "checked_in";
                const isRejected = b.status === "rejected";
                const targetTable = tables.find((t) => t.id === b.tableId || t.code === b.tableId);
                const isTablePlaying = targetTable?.status === "playing";

                return (
                  <div
                    key={b.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      b.isOverdueNoShow || isCheckedIn || isRejected
                        ? "bg-slate-50/70 border-slate-200 opacity-60"
                        : b.isHolding
                          ? "bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/20"
                          : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
                    }`}
                  >
                    {/* Top Row: Customer Name, Phone & Status Tag */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                      <div className="min-w-0">
                        <span className="font-extrabold text-sm text-slate-900 block truncate">
                          {b.customerName}
                        </span>
                        <a
                          href={`tel:${b.phone}`}
                          className="text-xs text-slate-500 font-mono hover:text-emerald-700 flex items-center gap-1 mt-0.5"
                        >
                          <PhoneOutlined className="text-slate-400 text-[10px]" />
                          {b.phone}
                        </a>
                      </div>

                      <div className="shrink-0 text-right">
                        {isCheckedIn ? (
                          <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0">
                            ĐÃ NHẬN BÀN
                          </Tag>
                        ) : isRejected ? (
                          <Tag color="default" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 !bg-slate-100 !text-slate-500 !border-slate-300">
                            ĐÃ HỦY
                          </Tag>
                        ) : b.isOverdueNoShow ? (
                          <Tag color="default" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 !bg-slate-100 !text-slate-500 !border-slate-300">
                            HẾT HẠN GIỮ CHỖ
                          </Tag>
                        ) : b.isHolding ? (
                          <Tag color="warning" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0">
                            ĐANG GIỮ BÀN (15P)
                          </Tag>
                        ) : b.isUpcoming ? (
                          <Tag color="blue" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0">
                            SẮP ĐẾN (CÒN {b.diffMinutes}P)
                          </Tag>
                        ) : (
                          <Tag color="default" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0">
                            HẸN {b.time}
                          </Tag>
                        )}
                      </div>
                    </div>

                    {/* Middle: Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-1">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <ClockCircleOutlined className="text-emerald-600 text-xs shrink-0" />
                        <span>Giờ hẹn:</span>
                        <strong className="font-mono text-slate-900 font-bold">{b.time}</strong>
                        <span className="text-[11px] text-slate-400">({b.date})</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600">
                        <AppstoreOutlined className="text-emerald-600 text-xs shrink-0" />
                        <span>Bàn:</span>
                        <strong className="text-emerald-900 font-extrabold truncate">{b.tableName}</strong>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        Thời lượng: <strong className="text-slate-800">{b.duration}h</strong>
                      </div>

                      <div className="text-[11px] text-slate-500 text-right">
                        Tạm tính: <strong className="font-mono text-slate-900">{(b.estimatedCost || 0).toLocaleString("vi-VN")}đ</strong>
                      </div>
                    </div>

                    {b.note && (
                      <div className="mt-1.5 text-[11px] bg-slate-50 p-1.5 rounded-lg text-slate-600 italic">
                        Ghi chú: {b.note}
                      </div>
                    )}

                    {/* Bottom Actions: Chỉ hiển thị nút thao tác cho các khách trong hạn, đã quá giờ giữ bàn thì không hiển thị */}
                    {!isCheckedIn && !isRejected && !b.isOverdueNoShow && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenChangeTable(b)}
                          icon={<SwapOutlined />}
                          className="!h-7.5 !px-2.5 !text-xs !rounded-lg !border-slate-300 text-slate-700 font-medium whitespace-nowrap shrink-0"
                        >
                          Đổi bàn
                        </Button>

                        <Tooltip
                          title={
                            isTablePlaying
                              ? `Bàn ${b.tableName} hiện đang có khách chơi!`
                              : ""
                          }
                        >
                          <span>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isTablePlaying}
                              onClick={() => handleCheckIn(b)}
                              leftIcon={<PlayCircleOutlined />}
                              className={`!h-7.5 !px-3.5 !text-xs font-bold !rounded-lg text-white shadow-2xs whitespace-nowrap shrink-0 ${
                                isTablePlaying
                                  ? "!bg-slate-300 !border-slate-300 !cursor-not-allowed"
                                  : "!bg-emerald-600 hover:!bg-emerald-700 !border-0"
                              }`}
                            >
                              Nhận Bàn (Mở POS)
                            </Button>
                          </span>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Drawer>

      {/* Modal: Change Table for booking */}
      <Modal
        open={changeTableModalOpen}
        onCancel={() => setChangeTableModalOpen(false)}
        title="Đổi Bàn Cho Lịch Hẹn Đặt Trước"
        footer={[
          <Button key="cancel" variant="outline" size="sm" onClick={() => setChangeTableModalOpen(false)}>
            Bỏ qua
          </Button>,
          <Button
            key="ok"
            variant="primary"
            size="sm"
            loading={savingAction}
            onClick={handleSaveChangeTable}
            className="!bg-emerald-600 !border-emerald-600 text-white font-bold"
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
