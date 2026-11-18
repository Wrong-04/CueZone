// ============================================================================
// 1. IMPORTS & TYPES
// ============================================================================
import type { BookingRequest, PosTable } from "../../types/pos";

export interface EnrichedBookingRequest extends BookingRequest {
  diffMinutes: number;
  isToday: boolean;
  isPast: boolean;
  isUpcoming: boolean;
  isHolding: boolean;
  isOverdueNoShow: boolean;
  isTableActuallyBooked: boolean;
}

export type BookingTabKey = "urgent" | "today" | "noshow" | "all";

export interface BookingTabCounts {
  urgent: number;
  today: number;
  noshow: number;
  checked_in: number;
  all: number;
}

// ============================================================================
// 2. HÀM ĐÁNH GIÁ TRẠNG THÁI, ĐẾM TAB VÀ SẮP XẾP LỊCH ĐẶT BÀN
// ============================================================================

/**
 * Đánh giá trạng thái thời gian thực cho từng lịch đặt bàn:
 * - isUpcoming: sắp đến trong vòng 60 phút tới
 * - isHolding: đang trong khung giữ bàn (-15 phút tới +15 phút quanh giờ hẹn)
 * - isOverdueNoShow: trễ quá 15 phút mà chưa check-in / chưa hủy
 */
export function enrichBookings(
  bookings: BookingRequest[],
  todayIso: string,
  tables: PosTable[],
): EnrichedBookingRequest[] {
  const now = Date.now();
  return bookings.map((b) => {
    const isToday = b.date === todayIso;
    let diffMinutes = 0;
    let isPast = false;
    let isUpcoming = false;
    let isHolding = false;
    let isOverdueNoShow = false;

    const targetTable = tables.find((t) => t.id === b.tableId || t.code === b.tableId);
    const isTableActuallyBooked = targetTable?.status === "booked";

    if (b.date && b.time) {
      const timeParts = b.time.split(":");
      const bDate = new Date(
        `${b.date}T${timeParts[0]?.padStart(2, "0")}:${timeParts[1]?.padStart(2, "0")}:00+07:00`,
      );
      const diffMs = bDate.getTime() - now;
      diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes >= 0 && diffMinutes <= 60 && isToday) {
        isUpcoming = true;
      }
      if (diffMinutes > -15 && diffMinutes <= 15 && isToday) {
        isHolding = true;
      }
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
}

/**
 * Thống kê số lượng lịch hẹn cho 4 tab lọc (chỉ tính từ hôm nay trở đi, bỏ qua lịch quá khứ)
 */
export function computeBookingCounts(
  enrichedBookings: EnrichedBookingRequest[],
  todayIso: string,
): BookingTabCounts {
  const todayList = enrichedBookings.filter((b) => b.isToday);
  const activeList = enrichedBookings.filter((b) => !b.date || b.date >= todayIso);
  const urgentList = todayList.filter(
    (b) =>
      b.status !== "checked_in" &&
      b.status !== "rejected" &&
      !b.isOverdueNoShow &&
      (b.isHolding || b.isUpcoming),
  );
  const noshowList = todayList.filter(
    (b) => b.isOverdueNoShow && b.status !== "checked_in" && b.status !== "rejected",
  );

  return {
    urgent: urgentList.length,
    today: todayList.length,
    noshow: noshowList.length,
    checked_in: todayList.filter((b) => b.status === "checked_in").length,
    all: activeList.length,
  };
}

/**
 * Lọc theo tab + từ khóa và sắp xếp thứ tự ưu tiên hiển thị:
 * 1. Đang giữ bàn -> 2. Sắp đến -> 3. Quá hạn nhưng bàn vẫn khóa -> 4. Giờ hẹn tăng dần -> 5. Đã xong/Hủy
 */
export function filterAndSortBookings(
  enrichedBookings: EnrichedBookingRequest[],
  tabFilter: BookingTabKey,
  searchQuery: string,
  todayIso: string,
): EnrichedBookingRequest[] {
  const q = searchQuery.toLowerCase().trim();

  const filtered = enrichedBookings.filter((b) => {
    if (b.date && b.date < todayIso) return false;

    if (tabFilter === "urgent") {
      if (b.status === "checked_in" || b.status === "rejected" || b.isOverdueNoShow) return false;
      if (!b.isToday) return false;
      return b.isHolding || b.isUpcoming;
    }
    if (tabFilter === "today" && !b.isToday) return false;
    if (tabFilter === "noshow" && (!b.isOverdueNoShow || !b.isToday)) return false;

    if (q) {
      const matchName = b.customerName.toLowerCase().includes(q);
      const matchPhone = b.phone.includes(q);
      const matchTable = (b.tableName || "").toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchTable) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
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
}
