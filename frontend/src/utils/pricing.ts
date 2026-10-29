import type { PricingTier } from "../types";
import type { PosTable, SplitTimeSlot } from "../types/pos";

export interface SplitPlayingDetails {
  minutes: number;
  cost: number;
  formattedTime: string;
  timeSlots: SplitTimeSlot[];
  currentRate: number;
  currentTierName: string;
  isCrossed: boolean;
}

export const defaultPricingTiers: PricingTier[] = [
  {
    _id: "default-tier-1",
    name: "Khung Giờ Tiêu Chuẩn (Ban Ngày T2–T6)",
    dayType: "weekday",
    startTime: "08:00",
    endTime: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    prices: { standard: 60000, vip: 120000, match: 100000 },
    isActive: true,
    isCurrentlyActive: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    _id: "default-tier-2",
    name: "Khung Giờ Cao Điểm / Tối (T2–T6)",
    dayType: "peak",
    startTime: "17:00",
    endTime: "24:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    prices: { standard: 80000, vip: 140000, match: 120000 },
    isActive: true,
    isCurrentlyActive: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    _id: "default-tier-3",
    name: "Khung Giờ Cuối Tuần (T7 & CN)",
    dayType: "weekend",
    startTime: "08:00",
    endTime: "24:00",
    daysOfWeek: [0, 6],
    prices: { standard: 90000, vip: 150000, match: 130000 },
    isActive: true,
    isCurrentlyActive: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    _id: "default-tier-4",
    name: "Khung Giờ Đêm Khuya (Sau 00:00)",
    dayType: "weekday",
    startTime: "00:00",
    endTime: "08:00",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    prices: { standard: 70000, vip: 130000, match: 110000 },
    isActive: true,
    isCurrentlyActive: false,
    createdAt: "",
    updatedAt: "",
  },
];

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

interface CachedSlotsResult {
  totalMinutes: number;
  cost: number;
  timeSlots: SplitTimeSlot[];
  currentRate: number;
  currentTierName: string;
  isCrossed: boolean;
}

const slotsCache = new Map<string, CachedSlotsResult>();

const formatHMFromMins = (totalMins: number): string => {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export function calculateSplitPlayingDetails(
  table: PosTable,
  pricingTiers: PricingTier[] = defaultPricingTiers,
  currentTime = Date.now(),
): SplitPlayingDetails {
  if (!table.currentSession) {
    if (table.status === "playing" || table.status === "paused") {
      const defaultMinutes = 45;
      const hours = Math.floor(defaultMinutes / 60);
      const mins = defaultMinutes % 60;
      const rawCost = (defaultMinutes / 60) * table.pricePerHour;
      const playingCost = Math.round(rawCost / 1000) * 1000;
      return {
        minutes: defaultMinutes,
        cost: playingCost,
        formattedTime: `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`,
        timeSlots: [],
        currentRate: table.pricePerHour,
        currentTierName: "Biểu giá tiêu chuẩn",
        isCrossed: false,
      };
    }
    return {
      minutes: 0,
      cost: 0,
      formattedTime: "00:00:00",
      timeSlots: [],
      currentRate: table.pricePerHour,
      currentTierName: "Biểu giá tiêu chuẩn",
      isCrossed: false,
    };
  }

  const session = table.currentSession;
  const effectiveNow = session.isPaused && session.pausedAt ? session.pausedAt : currentTime;
  const totalElapsedMs = Math.max(
    0,
    effectiveNow - session.startedAt - (session.totalPausedMs || 0),
  );
  const totalMinutes = Math.max(1, Math.round(totalElapsedMs / 60000));

  const hours = Math.floor(totalElapsedMs / 3600000);
  const mins = Math.floor((totalElapsedMs % 3600000) / 60000);
  const secs = Math.floor((totalElapsedMs % 60000) / 1000);
  const formattedTime = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const activeTiers = pricingTiers && pricingTiers.length > 0 ? pricingTiers : defaultPricingTiers;
  const isVip = Boolean(table.code?.startsWith("VIP") || table.area?.toLowerCase().includes("vip"));
  const isMatch = Boolean(
    table.code?.startsWith("MTCH") || table.area?.toLowerCase().includes("thi đấu"),
  );

  const cacheKey = `${table.id}-${session.sessionId || session.startedAt}-${totalMinutes}-${table.pricePerHour}-${session.pricePerHour || ""}-${isVip ? 1 : 0}-${isMatch ? 1 : 0}-${activeTiers.length}`;
  const cached = slotsCache.get(cacheKey);

  if (cached) {
    return {
      minutes: totalMinutes,
      cost: cached.cost,
      formattedTime,
      timeSlots: cached.timeSlots,
      currentRate: cached.currentRate,
      currentTierName: cached.currentTierName,
      isCrossed: cached.isCrossed,
    };
  }

  const parsedTiers = activeTiers.map((tier) => {
    const [startH, startM] = tier.startTime.split(":").map(Number);
    const [endH, endM] = tier.endTime === "24:00" ? [24, 0] : tier.endTime.split(":").map(Number);
    return {
      tier,
      startTotal: startH * 60 + startM,
      endTotal: endH * 60 + endM,
      daysOfWeek: tier.daysOfWeek || [],
      isActive: tier.isActive !== false,
    };
  });

  const slots: SplitTimeSlot[] = [];
  let currentSlot: SplitTimeSlot | null = null;

  for (let m = 0; m < totalMinutes; m++) {
    const minuteTimestamp =
      session.startedAt +
      (totalMinutes > 1 ? Math.round((m * (effectiveNow - session.startedAt)) / totalMinutes) : 0);
    const vnDate = new Date(minuteTimestamp + VN_OFFSET_MS);
    const currentMins = vnDate.getUTCHours() * 60 + vnDate.getUTCMinutes();
    const dayOfWeek = vnDate.getUTCDay();

    let matchedTier: PricingTier | undefined;
    for (let i = 0; i < parsedTiers.length; i++) {
      const pt = parsedTiers[i];
      if (!pt.isActive) continue;
      if (pt.daysOfWeek.length > 0 && !pt.daysOfWeek.includes(dayOfWeek)) continue;

      if (pt.startTotal <= pt.endTotal) {
        if (currentMins >= pt.startTotal && currentMins < pt.endTotal) {
          matchedTier = pt.tier;
          break;
        }
      } else {
        if (currentMins >= pt.startTotal || currentMins < pt.endTotal) {
          matchedTier = pt.tier;
          break;
        }
      }
    }

    const tierName = matchedTier ? matchedTier.name : "Khung Giờ Tiêu Chuẩn";
    let tierPrice = session.pricePerHour ?? table.pricePerHour;
    if (matchedTier) {
      if (isVip) {
        tierPrice = matchedTier.prices.vip;
      } else if (isMatch) {
        tierPrice =
          matchedTier.prices.match || Math.round((matchedTier.prices.standard * 1.5) / 1000) * 1000;
      } else {
        tierPrice = matchedTier.prices.standard;
      }
    }

    const timeStr = formatHMFromMins(currentMins);

    if (!currentSlot) {
      currentSlot = {
        tierName,
        startTime: timeStr,
        endTime: timeStr,
        minutes: 1,
        pricePerHour: tierPrice,
        cost: 0,
      };
    } else if (currentSlot.tierName === tierName && currentSlot.pricePerHour === tierPrice) {
      currentSlot.minutes += 1;
      currentSlot.endTime = timeStr;
    } else {
      currentSlot.cost =
        Math.round((currentSlot.minutes * currentSlot.pricePerHour) / 60 / 1000) * 1000;
      slots.push(currentSlot);
      currentSlot = {
        tierName,
        startTime: timeStr,
        endTime: timeStr,
        minutes: 1,
        pricePerHour: tierPrice,
        cost: 0,
      };
    }
  }

  if (currentSlot) {
    currentSlot.cost =
      Math.round((currentSlot.minutes * currentSlot.pricePerHour) / 60 / 1000) * 1000;
    const endVnDate = new Date(effectiveNow + VN_OFFSET_MS);
    currentSlot.endTime = formatHMFromMins(
      endVnDate.getUTCHours() * 60 + endVnDate.getUTCMinutes(),
    );
    slots.push(currentSlot);
  }

  const rawCost = slots.reduce((sum, s) => sum + s.cost, 0);
  const cost = rawCost + (session.carriedCost || 0);
  const currentRate =
    slots.length > 0
      ? slots[slots.length - 1].pricePerHour
      : (session.pricePerHour ?? table.pricePerHour);
  const currentTierName =
    slots.length > 0 ? slots[slots.length - 1].tierName : "Biểu giá tiêu chuẩn";
  const isCrossed = slots.length > 1;

  if (slotsCache.size > 300) slotsCache.clear();
  slotsCache.set(cacheKey, {
    totalMinutes,
    cost,
    timeSlots: slots,
    currentRate,
    currentTierName,
    isCrossed,
  });

  return {
    minutes: totalMinutes,
    cost,
    formattedTime,
    timeSlots: slots,
    currentRate,
    currentTierName,
    isCrossed,
  };
}
