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

export const membershipService = {
  async getOverview(): Promise<MembershipOverview> {
    const { data } = await api.get<ApiResponse<MembershipOverview>>("/customer/membership");
    return unwrap(data, "Không thể tải thông tin hội viên");
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
