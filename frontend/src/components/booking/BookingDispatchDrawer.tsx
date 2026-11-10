import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  SwapOutlined,
  CloseCircleOutlined,
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
  SegmentedPillList,
  message,
} from "../../shared/ui";
import { bookingService, posService } from "../../services/pos.service";
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
  const [tabFilter, setTabFilter] = useState<"today" | "upcoming" | "holding" | "noshow" | "checked_in" | "all">("today");

  // Re-assign table modal state
  const [changeTableModalOpen, setChangeTableModalOpen] = useState(false);
  const [selectedBookingForChange, setSelectedBookingForChange] = useState<BookingRequest | null>(null);
  const [newTargetTableId, setNewTargetTableId] = useState("");
  const [savingAction, setSavingAction] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookingService.getAll();
      setBookings(data);
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

      if (b.date && b.time) {
        const timeParts = b.time.split(":");
        const bDate = new Date(`${b.date}T${timeParts[0]?.padStart(2, "0")}:${timeParts[1]?.padStart(2, "0")}:00+07:00`);
        const diffMs = bDate.getTime() - now;
        diffMinutes = Math.floor(diffMs / 60000);

        // Upcoming within 60 mins
        if (diffMinutes >= 0 && diffMinutes <= 60 && isToday) {
          isUpcoming = true;
        }
        // Holding slot: 15 mins before to 15 mins after
        if (diffMinutes > -15 && diffMinutes <= 15 && isToday) {
          isHolding = true;
        }
        // Overdue No-Show: > 15 mins late
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
      };
    });
  }, [bookings, todayIso]);

  // Tab counts
  const counts = useMemo(() => {
    const todayList = enrichedBookings.filter((b) => b.isToday);
    return {
      today: todayList.length,
      upcoming: todayList.filter((b) => b.isUpcoming && b.status !== "checked_in" && b.status !== "rejected").length,
      holding: todayList.filter((b) => b.isHolding && b.status !== "checked_in" && b.status !== "rejected").length,
      noshow: todayList.filter((b) => b.isOverdueNoShow).length,
      checked_in: todayList.filter((b) => b.status === "checked_in").length,
      all: bookings.length,
    };
  }, [enrichedBookings, bookings]);

  // Filtered List
  const displayBookings = useMemo(() => {
    return enrichedBookings.filter((b) => {
      // Tab filter
      if (tabFilter === "today" && !b.isToday) return false;
      if (tabFilter === "upcoming" && (!b.isUpcoming || b.status === "checked_in" || b.status === "rejected")) return false;
      if (tabFilter === "holding" && (!b.isHolding || b.status === "checked_in" || b.status === "rejected")) return false;
      if (tabFilter === "noshow" && !b.isOverdueNoShow) return false;
      if (tabFilter === "checked_in" && b.status !== "checked_in") return false;

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
  }, [enrichedBookings, tabFilter, searchQuery]);

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

  const handleCancelNoShow = (b: BookingRequest) => {
    Modal.confirm({
      title: `Hủy lịch giữ bàn do khách quá giờ hẹn?`,
      content: `Khách ${b.customerName} (${b.phone}) hẹn lúc ${b.time} tại ${b.tableName}. Bấm xác nhận để hủy lịch đặt và giải phóng bàn cho khách vãng lai.`,
      okText: "Hủy giữ bàn",
      okType: "danger",
      cancelText: "Bỏ qua",
      onOk: async () => {
        try {
          await bookingService.update(b.id, {
            status: "rejected",
            rejectionReason: "Khách quá hạn giữ bàn (No-show)",
          });
          if (b.tableId) {
            try {
              await posService.cancelBooking(b.tableId);
            } catch {
              // Bàn có thể đã đổi trạng thái, bỏ qua lỗi bàn
            }
          }
          message.success(`Đã hủy lịch giữ bàn thành công`);
          void fetchBookings();
          void onTablesReload();
        } catch (err: any) {
          message.error(err.message || "Không thể hủy giữ bàn");
        }
      },
    });
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
    { key: "today", label: `Hôm nay (${counts.today})` },
    { key: "upcoming", label: `Sắp đến (${counts.upcoming})` },
    { key: "holding", label: `Đang giữ (${counts.holding})` },
    {
      key: "noshow",
      label: `Quá hạn giữ bàn (${counts.noshow})`,
      dotClassName: counts.noshow > 0 ? "bg-rose-500 animate-ping" : undefined,
    },
    { key: "checked_in", label: `Đã nhận (${counts.checked_in})` },
    { key: "all", label: `Tất cả (${counts.all})` },
  ];

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        placement="right"
        width={560}
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
                  Tự động xác nhận 24/7 · Nhận bàn 1 chạm tại POS
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

          {/* Segmented Filter Pills */}
          <div className="overflow-x-auto pb-1">
            <SegmentedPillList
              items={filterTabs}
              activeKey={tabFilter}
              onSelect={(k) => setTabFilter(k as typeof tabFilter)}
              className="[&_button]:!text-xs [&_button]:!py-1 [&_button]:!px-2.5"
            />
          </div>

          {/* List of bookings */}
          {loading && displayBookings.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <SyncOutlined spin className="text-2xl text-emerald-600" />
              <p className="text-xs">Đang đồng bộ danh sách khách đặt bàn...</p>
            </div>
          ) : displayBookings.length === 0 ? (
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
              {displayBookings.map((b) => {
                const isCheckedIn = b.status === "checked_in";
                const isRejected = b.status === "rejected";

                return (
                  <div
                    key={b.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      b.isOverdueNoShow
                        ? "bg-rose-50/70 border-rose-300 ring-1 ring-rose-400/20"
                        : b.isHolding && !isCheckedIn
                          ? "bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/20"
                          : isCheckedIn
                            ? "bg-slate-50 border-slate-200 opacity-75"
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
                          <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0">
                            ĐÃ HỦY
                          </Tag>
                        ) : b.isOverdueNoShow ? (
                          <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0">
                            QUÁ HẠN GIỮ BÀN
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

                    {/* Bottom Actions */}
                    {!isCheckedIn && !isRejected && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenChangeTable(b)}
                            icon={<SwapOutlined />}
                            className="!h-7 !px-2.5 !text-xs !rounded-lg !border-slate-300 text-slate-700 font-medium"
                          >
                            Đổi bàn
                          </Button>
                          {b.isOverdueNoShow && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelNoShow(b)}
                              icon={<CloseCircleOutlined />}
                              className="!h-7 !px-2.5 !text-xs !rounded-lg !border-rose-300 !text-rose-700 hover:!bg-rose-50 font-bold"
                            >
                              Hủy Giữ Bàn
                            </Button>
                          )}
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleCheckIn(b)}
                          leftIcon={<PlayCircleOutlined />}
                          className="!h-7 !px-3.5 !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-0 font-bold !rounded-lg text-white shadow-2xs"
                        >
                          Nhận Bàn (Mở POS)
                        </Button>
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
