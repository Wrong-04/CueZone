import api from "./api";
import { type ApiResponse } from "../types";

export type TournamentStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "bracket_generated"
  | "in_progress"
  | "completed";

export interface TournamentPlayer {
  user: string;
  name: string;
  avatar?: string;
  phone?: string;
  seed?: number;
  feePaid: boolean;
  registrationStatus?: "pending" | "confirmed" | "cancelled";
  paymentReference?: string;
  registeredAt: string;
}

export interface TournamentItem {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxPlayers: number;
  registrationFee: number;
  prizePool?: string;
  firstPrize?: string;
  secondPrize?: string;
  thirdPrize?: string;
  status: TournamentStatus;
  rules?: string;
  format: string;
  raceToScore: number;
  assignedTables?: string[];
  players?: TournamentPlayer[];
  createdAt?: string;
  updatedAt?: string;
  paymentFinalizedAt?: string;
  paymentReconciliationRequired?: boolean;
}

export interface PendingTournamentFee {
  tournamentId: string;
  tournamentName: string;
  startDate: string;
  amount: number;
  player: Omit<TournamentPlayer, "user"> & {
    user: { _id: string; name: string; email: string; phone?: string };
  };
}

export interface CreateTournamentPayload {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxPlayers: number;
  registrationFee: number;
  prizePool?: string;
  firstPrize?: string;
  secondPrize?: string;
  thirdPrize?: string;
  rules?: string;
  format?: string;
  raceToScore?: number;
  assignedTables?: string[] | string;
}

export interface UpdateTournamentPayload extends Partial<CreateTournamentPayload> {}

export interface LeaderboardItem {
  id: string;
  rankIndex: number;
  name: string;
  avatar?: string;
  elo: number;
  rank: string;
  tournamentsJoined: number;
  tournamentsWon: number;
}

export interface MyTournamentHistoryItem {
  tournamentId: string;
  tournamentName: string;
  status: TournamentStatus;
  format: string;
  raceToScore: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  registrationFee: number;
  prizePool?: string;
  maxPlayers: number;
  registeredCount: number;
  remainingSlots: number;
  feePaid: boolean;
  registeredAt?: string;
  finalRank?: number;
  prizeAmount?: number;
  medal: "gold" | "silver" | "bronze" | "participant";
}

export interface TournamentPayment {
  state: "not_started" | "awaiting_payment" | "paid_pending" | "confirmed" | "refund_required" | "reconciliation_required";
  status?: string;
  reference?: string;
  amount?: number;
  createdAt?: string;
  deadline?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  qrUrl?: string | null;
  rank?: number | null;
  provisionalSeat?: boolean;
  receipts?: Array<{ providerId: string; amount: number; bankPaidAt: string }>;
  extraPayment?: boolean;
  zaloUrl: string | null;
  revision: number;
}

export interface TournamentPaymentSnapshot {
  revision: number;
  finalizedAt: string | null;
  reconciliationRequired: boolean;
  deadline: string;
  capacity: number;
  status: TournamentStatus;
  acknowledgedAt: string | null;
  candidates: Array<{ userId: string; name: string; reference: string; amount: number; createdAt?: string; status?: string; bankPaidAt: string; providerId: string; rank: number; provisionalSeat: boolean }>;
  receipts: Array<{ providerId: string; reference?: string; amount: number; bankPaidAt: string }>;
  zaloUrl: string | null;
}

export interface ClubBankInfo {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  qrTemplate: string;
}

export const tournamentService = {
  async getBankInfo(): Promise<ClubBankInfo> {
    const { data } = await api.get<ApiResponse<ClubBankInfo>>("/tournaments/bank-info");
    if (!data.success || !data.data) throw new Error(data.message || "Không thể tải thông tin ngân hàng CLB");
    return data.data;
  },

  async uploadReceipt(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("receipt", file);
    const { data } = await api.post<ApiResponse<{ url: string }>>("/tournaments/upload-receipt", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (!data.success || !data.data?.url) throw new Error(data.message || "Tải ảnh biên lai thất bại");
    return data.data.url;
  },

  async getMyHistory(): Promise<MyTournamentHistoryItem[]> {
    const { data } = await api.get<ApiResponse<MyTournamentHistoryItem[]>>(
      "/tournaments/my-history",
    );
    if (!data.success) throw new Error(data.message || "Không thể tải lịch sử giải đấu");
    return data.data || [];
  },
  async getLeaderboard(limit = 50): Promise<LeaderboardItem[]> {
    const { data } = await api.get<ApiResponse<LeaderboardItem[]>>("/tournaments/leaderboard", {
      params: { limit },
    });
    if (!data.success) throw new Error(data.message || "Không thể tải bảng xếp hạng");
    return data.data || [];
  },

  async getPublicTournaments(params?: { page?: number; limit?: number }) {
    const { data } = await api.get<ApiResponse<{ items: TournamentItem[]; total: number }>>(
      "/public/tournaments",
      { params },
    );
    if (!data.success) throw new Error(data.message || "Không thể tải danh sách giải đấu");
    return data.data || { items: [], total: 0 };
  },

  async getPendingFees(): Promise<PendingTournamentFee[]> {
    const { data } = await api.get<ApiResponse<PendingTournamentFee[]>>(
      "/tournaments/pending-fees",
    );
    if (!data.success) throw new Error(data.message || "Không thể tải lệ phí giải đấu đang chờ");
    return data.data || [];
  },

  async confirmPlayerFee(tournamentId: string, userId: string) {
    const { data } = await api.patch<ApiResponse<TournamentItem>>(
      `/tournaments/${tournamentId}/players/${userId}/fee`,
    );
    if (!data.success) throw new Error(data.message || "Không thể xác nhận lệ phí");
    return data.data!;
  },

  async getTournaments(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { data } = await api.get<ApiResponse<{ items: TournamentItem[]; total: number }>>(
      "/tournaments",
      {
        params,
      },
    );
    if (!data.success) throw new Error(data.message || "Không thể tải danh sách giải đấu");
    return data.data || { items: [], total: 0 };
  },

  async getTournamentById(id: string): Promise<TournamentItem> {
    const { data } = await api.get<ApiResponse<TournamentItem>>(`/tournaments/${id}`);
    if (!data.success) throw new Error(data.message || "Không thể tải chi tiết giải đấu");
    return data.data!;
  },

  async createTournament(payload: CreateTournamentPayload): Promise<TournamentItem> {
    const { data } = await api.post<ApiResponse<TournamentItem>>("/tournaments", payload);
    if (!data.success) throw new Error(data.message || "Không thể tạo giải đấu");
    return data.data!;
  },

  async updateTournament(id: string, payload: UpdateTournamentPayload): Promise<TournamentItem> {
    const { data } = await api.put<ApiResponse<TournamentItem>>(`/tournaments/${id}`, payload);
    if (!data.success) throw new Error(data.message || "Không thể cập nhật giải đấu");
    return data.data!;
  },

  async changeStatus(id: string, status: TournamentStatus): Promise<TournamentItem> {
    const { data } = await api.patch<ApiResponse<TournamentItem>>(`/tournaments/${id}/status`, {
      status,
    });
    if (!data.success) throw new Error(data.message || "Không thể thay đổi trạng thái giải đấu");
    return data.data!;
  },

  async deleteTournament(id: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/tournaments/${id}`);
    if (!data.success) throw new Error(data.message || "Không thể xóa giải đấu");
  },

  async getPayment(id: string): Promise<TournamentPayment> {
    const { data } = await api.get<ApiResponse<TournamentPayment>>(`/tournaments/${id}/payment`);
    if (!data.success || !data.data) throw new Error(data.message || "Không thể tải thanh toán");
    return data.data;
  },

  async getPayments(id: string): Promise<TournamentPaymentSnapshot> {
    const { data } = await api.get<ApiResponse<TournamentPaymentSnapshot>>(`/tournaments/${id}/payments`);
    if (!data.success || !data.data) throw new Error(data.message || "Không thể tải đối soát");
    return data.data;
  },

  async acknowledgePayments(id: string, revision: number): Promise<TournamentPaymentSnapshot> {
    const { data } = await api.post<ApiResponse<TournamentPaymentSnapshot>>(`/tournaments/${id}/payments/acknowledge`, { revision, reconciled: true }).catch(error => { throw new Error(error.response?.data?.message || "Không thể xác nhận đối soát. Vui lòng tải lại."); });
    if (!data.success || !data.data) throw new Error(data.message || "Không thể xác nhận đối soát");
    return data.data;
  },

  async registerPlayerAtCounter(
    tournamentId: string,
    counterData: { customerId: string; paymentMethod: "cash" | "bank_transfer"; note?: string },
  ): Promise<{ tournament: TournamentItem; customer: { id: string; name: string; phone?: string } }> {
    const { data } = await api.post<
      ApiResponse<{ tournament: TournamentItem; customer: { id: string; name: string; phone?: string } }>
    >(`/tournaments/${tournamentId}/players/counter`, counterData);
    if (!data.success || !data.data) {
      throw new Error(data.message || "Không thể ghi danh cơ thủ tại quầy");
    }
    return data.data;
  },

  async finalizePayments(id: string, revision: number): Promise<TournamentPaymentSnapshot> {
    const { data } = await api.post<ApiResponse<TournamentPaymentSnapshot>>(`/tournaments/${id}/payments/finalize`, { revision, reconciled: true }).catch(error => { throw new Error(error.response?.data?.message || "Không thể chốt. Vui lòng tải và đối soát lại."); });
    if (!data.success || !data.data) throw new Error(data.message || "Không thể chốt danh sách");
    return data.data;
  },

  async register(id: string): Promise<TournamentPayment> {
    const { data } = await api.post<ApiResponse<TournamentPayment>>(`/tournaments/${id}/register`, {
      paymentMethod: "bank_transfer",
    }).catch(error => { throw new Error(error.response?.data?.message || "Không thể tạo mã chuyển khoản. Vui lòng thử lại."); });
    if (!data.success || !data.data) throw new Error(data.message || "Không thể ghi danh giải đấu");
    return data.data;
  },
};
