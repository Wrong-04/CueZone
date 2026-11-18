// ============================================================================
// 1. IMPORTS & TYPES
// ============================================================================
import type { PricingTier } from "../../../../types";
import { parseTimeToMinutes } from "../types/tables.types";

export interface TimelineSegment {
  name: string;
  startTime: string;
  endTime: string;
  widthPercent: number;
  isCurrent: boolean;
  isFallback: boolean;
  bgColor: string;
  tier?: PricingTier;
}

/**
 * Tiện ích tính toán các phân đoạn thời gian (Timeline Segments) trong 24 giờ
 * để vẽ biểu đồ trực quan khung giờ bảng giá (Sáng, Chiều, Cao điểm, Đêm)
 */
export function generateTimelineSegments(
  pricingTiers: PricingTier[],
  currentTime: number,
  timelineDayFilter: "today" | "weekday" | "weekend",
  activePricingTier: PricingTier | null,
): TimelineSegment[] {
  const todayDay = new Date(currentTime).getDay();
  const targetDays =
    timelineDayFilter === "today"
      ? [todayDay]
      : timelineDayFilter === "weekday"
        ? [1, 2, 3, 4, 5]
        : [0, 6];

  const activeTiersForDay = pricingTiers
    .filter((t) => {
      if (t.isActive === false) return false;
      if (!t.daysOfWeek || t.daysOfWeek.length === 0) return true;
      return t.daysOfWeek.some((d) => targetDays.includes(d));
    })
    .map((t) => {
      const startM = parseTimeToMinutes(t.startTime);
      let endM = parseTimeToMinutes(t.endTime);
      if (endM <= startM) endM = 1440;
      return { tier: t, startM, endM };
    })
    .sort((a, b) => a.startM - b.startM);

  const nowM = (() => {
    const date = new Date(currentTime);
    const vnTimeStr = date.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    const [h, m] = vnTimeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  })();

  if (activeTiersForDay.length === 0) {
    return [
      {
        name: "Biểu giá chuẩn bàn",
        startTime: "00:00",
        endTime: "24:00",
        widthPercent: 100,
        isCurrent: timelineDayFilter === "today",
        isFallback: true,
        bgColor: "bg-slate-400",
      },
    ];
  }

  const segments: TimelineSegment[] = [];
  let currentPointer = 0;

  activeTiersForDay.forEach(({ tier, startM, endM }) => {
    if (startM > currentPointer) {
      const gapM = startM - currentPointer;
      const startStr = `${String(Math.floor(currentPointer / 60)).padStart(2, "0")}:${String(currentPointer % 60).padStart(2, "0")}`;
      const endStr = `${String(Math.floor(startM / 60)).padStart(2, "0")}:${String(startM % 60).padStart(2, "0")}`;
      const isCurrentGap =
        timelineDayFilter === "today" &&
        !activePricingTier &&
        nowM >= currentPointer &&
        nowM < startM;
      segments.push({
        name: "Biểu giá chuẩn bàn",
        startTime: startStr,
        endTime: endStr,
        widthPercent: (gapM / 1440) * 100,
        isCurrent: isCurrentGap,
        isFallback: true,
        bgColor: isCurrentGap ? "bg-slate-400 text-slate-800" : "bg-slate-300 text-slate-700",
      });
      currentPointer = startM;
    }

    const durationM = Math.max(0, endM - currentPointer);
    if (durationM > 0) {
      const isCurrent = tier._id === activePricingTier?._id && timelineDayFilter === "today";
      let bg = "bg-teal-600/90";
      if (startM < 480) {
        bg = "bg-indigo-600/90";
      } else if (startM >= 1020) {
        bg = "bg-amber-600/90";
      } else {
        bg = "bg-emerald-600/90";
      }

      segments.push({
        name: tier.name,
        startTime: tier.startTime,
        endTime: tier.endTime,
        widthPercent: (durationM / 1440) * 100,
        isCurrent,
        isFallback: false,
        bgColor: bg,
        tier,
      });
      currentPointer = endM;
    }
  });

  if (currentPointer < 1440) {
    const gapM = 1440 - currentPointer;
    const startStr = `${String(Math.floor(currentPointer / 60)).padStart(2, "0")}:${String(currentPointer % 60).padStart(2, "0")}`;
    const isCurrentGap =
      timelineDayFilter === "today" &&
      !activePricingTier &&
      nowM >= currentPointer &&
      nowM < 1440;
    segments.push({
      name: "Biểu giá chuẩn bàn",
      startTime: startStr,
      endTime: "24:00",
      widthPercent: (gapM / 1440) * 100,
      isCurrent: isCurrentGap,
      isFallback: true,
      bgColor: isCurrentGap ? "bg-slate-400 text-slate-800" : "bg-slate-300 text-slate-700",
    });
  }

  return segments;
}
