import type { PricingTier, TableType } from "../../../../types";

export interface TablesStats {
  total: number;
  pool: number;
  carom: number;
  snooker: number;
  maintenance: number;
  playing: number;
  paused: number;
  booked: number;
  available: number;
  floorBreakdown: Array<{ floor: number; count: number }>;
}

export const TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => {
  const totalMinutes = i * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return { value: timeStr, label: timeStr };
});

export function getTableTypeLabel(type: TableType | string): string {
  if (type === "carom") return "Bàn Bida Carom (Phăng)";
  if (type === "snooker") return "Bàn Bida Snooker";
  return "Bàn Bida Lỗ (Pool)";
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  if (timeStr === "24:00") return 1440;
  const parts = timeStr.trim().split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1] || "0", 10) || 0;
  return h * 60 + m;
}

export function getActivePricingTier(
  pricingTiers: PricingTier[],
  now = Date.now(),
): PricingTier | null {
  if (!pricingTiers || pricingTiers.length === 0) return null;
  const date = new Date(now);
  const vnTimeStr = date.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [hStr, mStr] = vnTimeStr.split(":");
  const currentMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
  const vnDateStr = date.toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const dayOfWeek = new Date(vnDateStr).getDay();

  for (const tier of pricingTiers) {
    if (tier.isActive === false) continue;
    if (tier.daysOfWeek && tier.daysOfWeek.length > 0 && !tier.daysOfWeek.includes(dayOfWeek))
      continue;

    const [startH, startM] = tier.startTime.split(":").map(Number);
    const [endH, endM] = tier.endTime === "24:00" ? [24, 0] : tier.endTime.split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal <= endTotal) {
      if (currentMins >= startTotal && currentMins < endTotal) {
        return tier;
      }
    } else {
      if (currentMins >= startTotal || currentMins < endTotal) {
        return tier;
      }
    }
  }

  const activeOnly = pricingTiers.filter((t) => t.isActive !== false);
  return activeOnly.find((t) => t.isCurrentlyActive) || null;
}

export function formatActivePricingLabel(tier: PricingTier | null): string {
  if (!tier) return "Biểu giá chuẩn bàn";
  const cleanName = tier.name.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  return `${cleanName} (${tier.startTime} – ${tier.endTime})`;
}

export function formatDaysOfWeek(tier: PricingTier): string {
  if (tier.dayType === "all" || (tier.daysOfWeek && tier.daysOfWeek.length === 7)) {
    return "Áp dụng: Tất cả các ngày trong tuần";
  }
  if (
    tier.dayType === "weekend" ||
    (tier.daysOfWeek &&
      tier.daysOfWeek.length === 2 &&
      tier.daysOfWeek.includes(0) &&
      tier.daysOfWeek.includes(6))
  ) {
    return "Áp dụng: Thứ 7 & Chủ Nhật hàng tuần";
  }
  if (
    tier.dayType === "weekday" ||
    (tier.daysOfWeek &&
      tier.daysOfWeek.length === 5 &&
      !tier.daysOfWeek.includes(0) &&
      !tier.daysOfWeek.includes(6))
  ) {
    return "Áp dụng: Thứ 2 đến Thứ 6 hàng tuần";
  }
  return "Áp dụng: Theo lịch";
}
