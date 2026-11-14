import api from "./api";
import type { ApiResponse } from "../types";

export interface MemberTier {
  key: string;
  name: string;
  minPoints: number;
  tableDiscountPercent: number;
  fnbDiscountPercent: number;
  benefits: string[];
}

export interface MembershipOverview {
  member: {
    id: string;
    name: string;
    email: string;
    phone: string;
    joinedAt: string;
  };
  points: number;
  earnPointsRate: number;
  currentTier: MemberTier;
  nextTier: MemberTier | null;
  pointsToNextTier: number;
  progressPercent: number;
  tiers: MemberTier[];
}

export interface PlayHistoryItem {
  id: string;
  sessionId: string;
  invoiceCode: string;
  tableCode?: string;
  tableName: string;
  sessionStart: string;
  sessionEnd: string;
  durationFormatted: string;
  durationMinutes: number;
  finalAmount: number;
  paymentMethod: string;
  pointsAwarded: number;
  createdAt: string;
  review: {
    tableRating: number;
    serviceRating: number;
    comment: string;
    createdAt: string;
  } | null;
}

export interface PlayHistoryPage {
  items: PlayHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function unwrap<T>(response: ApiResponse<T>, fallback: string): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message || fallback);
  }
  return response.data;
}

export function enrichMembershipOverview(raw: MembershipOverview): MembershipOverview {
  try {
    const saved = localStorage.getItem("cuezone_admin_settings");
    if (!saved) return raw;

    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") return raw;

    const earnPointsRate =
      typeof parsed.earnPointsRate === "number" && parsed.earnPointsRate > 0
        ? parsed.earnPointsRate
        : raw.earnPointsRate;

    if (!Array.isArray(parsed.memberTiers) || parsed.memberTiers.length === 0) {
      return {
        ...raw,
        earnPointsRate,
      };
    }

    const cleanTierName = (rawName: string): string => {
      let name = rawName.replace(/^Hội\s+Viên\s+/i, "");
      name = name.replace(/^Hạng\s+/i, "");
      name = name.replace(/\s*\(.*?\)/, "").trim();
      return name || rawName;
    };

    const tiers: MemberTier[] = parsed.memberTiers.map((t: any, index: number) => {
      const rawBenefits = typeof t.perks === "string" ? t.perks : "";
      const benefits = rawBenefits
        ? rawBenefits
            .split(/[,;\n]+/)
            .map((b: string) => b.trim())
            .filter(Boolean)
        : raw.tiers?.[index]?.benefits || [];

      return {
        key: t.tierKey || raw.tiers?.[index]?.key || `tier_${index}`,
        name: cleanTierName(t.tierName || raw.tiers?.[index]?.name || `Hạng ${index + 1}`),
        minPoints: typeof t.minPoints === "number" ? Math.max(0, t.minPoints) : 0,
        tableDiscountPercent:
          typeof t.tableDiscountPercent === "number" ? t.tableDiscountPercent : 0,
        fnbDiscountPercent:
          typeof t.fnbDiscountPercent === "number" ? t.fnbDiscountPercent : 0,
        benefits,
      };
    });

    // Sắp xếp các tier tăng dần theo minPoints
    tiers.sort((a, b) => a.minPoints - b.minPoints);

    // Tính toán lại hạng hiện tại và hạng kế tiếp dựa trên số điểm thực tế của hội viên
    const points = raw.points ?? 0;
    let tierIndex = 0;
    for (let i = 1; i < tiers.length; i += 1) {
      if (points < tiers[i].minPoints) break;
      tierIndex = i;
    }

    const currentTier = tiers[tierIndex] || raw.currentTier;
    const nextTier = tiers[tierIndex + 1] || null;
    const pointsToNextTier = nextTier ? Math.max(0, nextTier.minPoints - points) : 0;
    const denom = Math.max(1, (nextTier?.minPoints ?? 0) - currentTier.minPoints);
    const progressPercent = nextTier
      ? Math.min(
          100,
          Math.max(
            0,
            Math.floor(((points - currentTier.minPoints) / denom) * 100),
          ),
        )
      : 100;

    return {
      ...raw,
      points,
      earnPointsRate,
      currentTier,
      nextTier,
      pointsToNextTier,
      progressPercent,
      tiers,
    };
  } catch (e) {
    console.error("Failed to enrich membership overview with admin settings:", e);
    return raw;
  }
}

export const membershipService = {
  async getOverview(): Promise<MembershipOverview> {
    const { data } = await api.get<ApiResponse<MembershipOverview>>("/customer/membership");
    const raw = unwrap(data, "Không thể tải thông tin hội viên");
    return enrichMembershipOverview(raw);
  },

  async getPlayHistory(page: number): Promise<PlayHistoryPage> {
    const { data } = await api.get<ApiResponse<PlayHistoryPage>>("/customer/play-history", {
      params: { page },
    });
    return unwrap(data, "Không thể tải lịch sử chơi");
  },

  async submitPlayReview(input: {
    sessionId: string;
    tableRating: number;
    serviceRating: number;
    comment: string;
  }): Promise<void> {
    const { data } = await api.post<ApiResponse<unknown>>("/customer/reviews", input);
    if (!data.success) throw new Error(data.message || "Không thể gửi đánh giá");
  },
};
