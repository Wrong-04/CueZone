import { Tournament, ITournament, TournamentStatus } from "./tournament.model";
import {
  CreateTournamentDTO,
  UpdateTournamentDTO,
  validateTournamentData,
} from "./dto/tournament.dto";
import mongoose from "mongoose";
import { User, UserRole } from "../user/user.model";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";
import { WalletService } from "../wallet/wallet.service";

const notifications = new NotificationService();
const walletService = new WalletService();

export class TournamentService {
  async getPublicTournaments(query: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const filter = { status: { $ne: TournamentStatus.DRAFT } };
    const [items, total] = await Promise.all([
      Tournament.find(filter)
        .sort({ startDate: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Tournament.countDocuments(filter),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async registerPlayer(id: string, userId: string, paymentMethod: "wallet" | "counter") {
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) {
      throw Object.assign(new Error("Mã giải đấu hoặc tài khoản không hợp lệ"), { httpCode: 400 });
    }
    if (paymentMethod !== "wallet" && paymentMethod !== "counter") {
      throw Object.assign(new Error("Phương thức thanh toán không hợp lệ"), { httpCode: 400 });
    }

    const result = await mongoose.connection.transaction(async (session) => {
      const user = await User.findOne({
        _id: userId,
        role: UserRole.CUSTOMER,
        isActive: true,
        isLocked: false,
      }).session(session);
      if (!user)
        throw Object.assign(new Error("Chỉ hội viên đang hoạt động mới được ghi danh"), {
          httpCode: 403,
        });
      const tournament = await Tournament.findById(id).session(session);
      if (!tournament) throw Object.assign(new Error("Không tìm thấy giải đấu"), { httpCode: 404 });
      if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
        throw Object.assign(new Error("Giải đấu hiện không mở ghi danh"), { httpCode: 400 });
      }
      if (tournament.registrationDeadline.getTime() < Date.now()) {
        throw Object.assign(new Error("Đã hết hạn ghi danh giải đấu"), { httpCode: 400 });
      }
      if (
        tournament.players.some(
          (player: { user: mongoose.Types.ObjectId }) => String(player.user) === userId,
        )
      ) {
        throw Object.assign(new Error("Bạn đã ghi danh giải đấu này"), { httpCode: 409 });
      }
      if (tournament.players.length >= tournament.maxPlayers) {
        throw Object.assign(new Error("Giải đấu đã đủ số lượng cơ thủ"), { httpCode: 409 });
      }

      const feePaid = tournament.registrationFee <= 0 || paymentMethod === "wallet";
      if (paymentMethod === "wallet" && tournament.registrationFee > 0) {
        await walletService.chargeForTournament(
          userId,
          tournament.registrationFee,
          tournament.name,
          session,
        );
      }
      tournament.players.push({
        user: user._id,
        name: user.name,
        avatar: user.avatar,
        phone: user.phone,
        feePaid,
        registeredAt: new Date(),
      });
      await tournament.save({ session });
      return { tournament, user, feePaid };
    });

    const feeText = result.feePaid
      ? `Lệ phí ${result.tournament.registrationFee.toLocaleString("vi-VN")}đ đã được ghi nhận.`
      : `Ghi danh đã được tiếp nhận. Vui lòng thanh toán ${result.tournament.registrationFee.toLocaleString("vi-VN")}đ tại quầy trước hạn.`;
    await Promise.all([
      notifications
        .createForUser(userId, {
          title: "Ghi danh giải đấu thành công",
          content: `Bạn đã ghi danh giải ${result.tournament.name}. ${feeText}`,
          type: NotificationType.TOURNAMENT,
        })
        .catch(() => undefined),
      notifications
        .create({
          title: "Có cơ thủ ghi danh giải đấu",
          content: `${result.user.name} đã ghi danh giải ${result.tournament.name}.`,
          type: NotificationType.TOURNAMENT,
        })
        .catch(() => undefined),
    ]);
    return result.tournament;
  }

  async getPendingFees() {
    const tournaments = await Tournament.find({
      registrationFee: { $gt: 0 },
      "players.feePaid": false,
    })
      .populate("players.user", "name email phone")
      .sort({ startDate: 1 });
    return tournaments.flatMap((tournament: any) =>
      tournament.players
        .filter((player: any) => !player.feePaid)
        .map((player: any) => ({
          tournamentId: String(tournament._id),
          tournamentName: tournament.name,
          startDate: tournament.startDate,
          amount: tournament.registrationFee,
          player,
        })),
    );
  }

  async confirmPlayerFee(id: string, userId: string, reviewerId: string) {
    if (![id, userId, reviewerId].every((value) => mongoose.isValidObjectId(value))) {
      throw Object.assign(new Error("Mã giải đấu hoặc tài khoản không hợp lệ"), { httpCode: 400 });
    }
    const result = await mongoose.connection.transaction(async (session) => {
      const tournament = await Tournament.findById(id).session(session);
      if (!tournament) throw Object.assign(new Error("Không tìm thấy giải đấu"), { httpCode: 404 });
      const player = tournament.players.find(
        (entry: { user: mongoose.Types.ObjectId }) => String(entry.user) === userId,
      );
      if (!player)
        throw Object.assign(new Error("Cơ thủ chưa ghi danh giải này"), { httpCode: 404 });
      if (player.feePaid) return { tournament, player, changed: false };
      player.feePaid = true;
      await tournament.save({ session });
      return { tournament, player, changed: true };
    });

    if (result.changed) {
      await notifications
        .createForUser(userId, {
          title: "Đã xác nhận lệ phí giải đấu",
          content: `Nhân viên đã ghi nhận khoản thanh toán ${result.tournament.registrationFee.toLocaleString("vi-VN")}đ cho giải ${result.tournament.name}.`,
          type: NotificationType.TOURNAMENT,
        })
        .catch(() => undefined);
    }
    return result.tournament;
  }

  async createTournament(dto: CreateTournamentDTO, userId?: string): Promise<ITournament> {
    const validation = validateTournamentData(dto, false);
    if (!validation.isValid) {
      throw new Error(validation.errors.join("; "));
    }

    let assignedTables: string[] = [];
    if (Array.isArray(dto.assignedTables)) {
      assignedTables = dto.assignedTables.map((t) => t.trim()).filter(Boolean);
    } else if (typeof dto.assignedTables === "string" && dto.assignedTables.trim()) {
      assignedTables = dto.assignedTables
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const tournament = new Tournament({
      name: dto.name.trim(),
      description: dto.description?.trim(),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      registrationDeadline: new Date(dto.registrationDeadline),
      maxPlayers: Number(dto.maxPlayers) || 16,
      registrationFee: Number(dto.registrationFee) || 0,
      prizePool: dto.prizePool?.trim(),
      firstPrize: dto.firstPrize?.trim(),
      secondPrize: dto.secondPrize?.trim(),
      thirdPrize: dto.thirdPrize?.trim(),
      rules: dto.rules?.trim(),
      format: dto.format || "Single Elimination",
      raceToScore: Number(dto.raceToScore) || 5,
      assignedTables,
      status: TournamentStatus.DRAFT,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      players: [],
    });

    await tournament.save();
    return tournament;
  }

  async getTournaments(query: { status?: string; search?: string; page?: number; limit?: number }) {
    const filter: Record<string, any> = {};

    if (query.status && query.status !== "all") {
      filter.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), "i");
      filter.$or = [{ name: searchRegex }, { format: searchRegex }];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 50);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Tournament.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Tournament.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTournamentById(id: string): Promise<ITournament> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Mã giải đấu không hợp lệ");
    }

    const tournament = await Tournament.findById(id).populate("createdBy", "name email avatar");
    if (!tournament) {
      throw new Error("Không tìm thấy giải đấu");
    }
    return tournament;
  }

  async updateTournament(id: string, dto: UpdateTournamentDTO): Promise<ITournament> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Mã giải đấu không hợp lệ");
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      throw new Error("Không tìm thấy giải đấu");
    }

    const validation = validateTournamentData(dto, true);
    if (!validation.isValid) {
      throw new Error(validation.errors.join("; "));
    }

    if (
      tournament.status !== TournamentStatus.DRAFT &&
      dto.maxPlayers !== undefined &&
      dto.maxPlayers !== tournament.maxPlayers
    ) {
      throw new Error(
        "Không thể thay đổi quy mô giải đấu khi giải đấu đã mở đăng ký hoặc đang diễn ra",
      );
    }

    if (dto.name !== undefined) tournament.name = dto.name.trim();
    if (dto.description !== undefined) tournament.description = dto.description.trim();
    if (dto.startDate !== undefined) tournament.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) tournament.endDate = new Date(dto.endDate);
    if (dto.registrationDeadline !== undefined)
      tournament.registrationDeadline = new Date(dto.registrationDeadline);
    if (dto.maxPlayers !== undefined) tournament.maxPlayers = Number(dto.maxPlayers);
    if (dto.registrationFee !== undefined) tournament.registrationFee = Number(dto.registrationFee);
    if (dto.prizePool !== undefined) tournament.prizePool = dto.prizePool.trim();
    if (dto.firstPrize !== undefined) tournament.firstPrize = dto.firstPrize.trim();
    if (dto.secondPrize !== undefined) tournament.secondPrize = dto.secondPrize.trim();
    if (dto.thirdPrize !== undefined) tournament.thirdPrize = dto.thirdPrize.trim();
    if (dto.rules !== undefined) tournament.rules = dto.rules.trim();
    if (dto.format !== undefined) tournament.format = dto.format;
    if (dto.raceToScore !== undefined) tournament.raceToScore = Number(dto.raceToScore);

    if (dto.assignedTables !== undefined) {
      if (Array.isArray(dto.assignedTables)) {
        tournament.assignedTables = dto.assignedTables.map((t) => t.trim()).filter(Boolean);
      } else if (typeof dto.assignedTables === "string") {
        tournament.assignedTables = dto.assignedTables
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    if (tournament.endDate < tournament.startDate) {
      throw new Error("Ngày kết thúc thi đấu phải sau hoặc bằng ngày bắt đầu");
    }
    if (tournament.registrationDeadline > tournament.startDate) {
      throw new Error("Hạn đăng ký phải trước hoặc bằng ngày bắt đầu thi đấu");
    }

    await tournament.save();
    return tournament;
  }

  async changeStatus(id: string, nextStatus: TournamentStatus): Promise<ITournament> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Mã giải đấu không hợp lệ");
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      throw new Error("Không tìm thấy giải đấu");
    }

    const currentStatus = tournament.status;

    if (nextStatus === TournamentStatus.REGISTRATION_OPEN) {
      if (currentStatus !== TournamentStatus.DRAFT) {
        throw new Error(
          `Chỉ giải đấu ở trạng thái Bản nháp (draft) mới có thể mở đăng ký. Trạng thái hiện tại: ${currentStatus}`,
        );
      }

      const now = new Date();
      if (tournament.registrationDeadline < now) {
        throw new Error("Hạn đăng ký giải đấu đã hết hạn, không thể mở đăng ký");
      }
    }

    tournament.status = nextStatus;
    await tournament.save();
    if (currentStatus !== nextStatus && tournament.players.length > 0) {
      const statusLabels: Record<TournamentStatus, string> = {
        [TournamentStatus.DRAFT]: "bản nháp",
        [TournamentStatus.REGISTRATION_OPEN]: "mở ghi danh",
        [TournamentStatus.REGISTRATION_CLOSED]: "đóng ghi danh",
        [TournamentStatus.BRACKET_GENERATED]: "đã tạo nhánh đấu",
        [TournamentStatus.IN_PROGRESS]: "đang diễn ra",
        [TournamentStatus.COMPLETED]: "đã kết thúc",
      };
      await Promise.all(
        tournament.players.map((player: { user: mongoose.Types.ObjectId }) =>
          notifications
            .createForUser(String(player.user), {
              title: "Cập nhật giải đấu",
              content: `Giải ${tournament.name} đã chuyển sang trạng thái ${statusLabels[nextStatus]}.`,
              type: NotificationType.TOURNAMENT,
            })
            .catch(() => undefined),
        ),
      );
    }
    return tournament;
  }

  async deleteTournament(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Mã giải đấu không hợp lệ");
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      throw new Error("Không tìm thấy giải đấu");
    }

    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new Error("Chỉ có thể xóa giải đấu khi ở trạng thái Bản nháp (DRAFT)");
    }

    await Tournament.findByIdAndDelete(id);
  }
}
