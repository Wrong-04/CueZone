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
}

export interface PendingTournamentFee {
  tournamentId: string;
  tournamentName: string;
  startDate: string;
  amount: number;
  player: Omit<TournamentPlayer, "user"> & { user: { _id: string; name: string; email: string; phone?: string } };
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

export const tournamentService = {
  async getPublicTournaments(params?: { page?: number; limit?: number }) {
    const { data } = await api.get<ApiResponse<{ items: TournamentItem[]; total: number }>>("/public/tournaments", { params });
    if (!data.success) throw new Error(data.message || "Không thể tải danh sách giải đấu");
    return data.data || { items: [], total: 0 };
  },

  async getPendingFees(): Promise<PendingTournamentFee[]> {
    const { data } = await api.get<ApiResponse<PendingTournamentFee[]>>("/tournaments/pending-fees");
    if (!data.success) throw new Error(data.message || "Không thể tải lệ phí giải đấu đang chờ");
    return data.data || [];
  },

  async confirmPlayerFee(tournamentId: string, userId: string) {
    const { data } = await api.patch<ApiResponse<TournamentItem>>(`/tournaments/${tournamentId}/players/${userId}/fee`);
    if (!data.success) throw new Error(data.message || "Không thể xác nhận lệ phí");
    return data.data!;
  },

  async getTournaments(params?: { status?: string; search?: string; page?: number; limit?: number }) {
    const { data } = await api.get<ApiResponse<{ items: TournamentItem[]; total: number }>>("/tournaments", {
      params,
    });
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
    const { data } = await api.patch<ApiResponse<TournamentItem>>(`/tournaments/${id}/status`, { status });
    if (!data.success) throw new Error(data.message || "Không thể thay đổi trạng thái giải đấu");
    return data.data!;
  },

  async deleteTournament(id: string): Promise<void> {
    const { data } = await api.delete<ApiResponse>(`/tournaments/${id}`);
    if (!data.success) throw new Error(data.message || "Không thể xóa giải đấu");
  },

  async register(id: string, paymentMethod: "wallet" | "counter"): Promise<TournamentItem> {
    const { data } = await api.post<ApiResponse<TournamentItem>>(`/tournaments/${id}/register`, { paymentMethod });
    if (!data.success || !data.data) throw new Error(data.message || "Không thể ghi danh giải đấu");
    return data.data;
  },
};
