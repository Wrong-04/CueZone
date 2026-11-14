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
import { TournamentPaymentService } from "./tournament-payment.service";
import { TournamentPaymentIntent } from "./tournament-payment.model";
import { confirmedPlayer, paymentError } from "./sepay";
import { emitTournamentPaymentUpdated } from "../../utils/socketHolder";

const notifications = new NotificationService();


export class TournamentService {
  async getPublicTournaments(query: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const filter = { status: { $ne: TournamentStatus.DRAFT } };
    const [rawItems, total] = await Promise.all([
      Tournament.find(filter)
        .sort({ startDate: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Tournament.countDocuments(filter),
    ]);
    const items = rawItems.map((t: any) => ({
      ...t,
      players: (t.players || []).filter((p: any) => confirmedPlayer(p, t.registrationFee)).map((p: any) => ({ user: p.user, name: p.name, avatar: p.avatar, registrationStatus: "confirmed", registeredAt: p.registeredAt })),
      registeredCount: (t.players || []).filter((p: any) => confirmedPlayer(p, t.registrationFee)).length,
    }));
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Tra cứu lịch sử các giải đấu của cơ thủ cá nhân (SCRUM-916) */
  async getMyTournamentHistory(userId: string) {
    if (!mongoose.isValidObjectId(userId)) {
      throw Object.assign(new Error("Mã tài khoản không hợp lệ"), { httpCode: 400 });
    }

    const tournaments = await Tournament.find({
      "players.user": new mongoose.Types.ObjectId(userId),
    })
      .sort({ startDate: -1 })
      .lean();

    return tournaments.map((t: any) => {
      const playerRecord = t.players?.find(
        (p: any) => String(p.user) === String(userId),
      );

      const finalRank = playerRecord?.result?.finalRank;
      const prizeAmount = playerRecord?.result?.prizeAmount;

      let medal: "gold" | "silver" | "bronze" | "participant" = "participant";
      if (finalRank === 1) medal = "gold";
      else if (finalRank === 2) medal = "silver";
      else if (finalRank === 3) medal = "bronze";

      const registeredCount = (t.players || []).filter((p: any) => confirmedPlayer(p, t.registrationFee)).length;
      const remainingSlots = Math.max(0, (t.maxPlayers || 16) - registeredCount);

      return {
        tournamentId: String(t._id),
        tournamentName: t.name,
        status: t.status,
        format: t.format,
        raceToScore: t.raceToScore,
        startDate: t.startDate,
        endDate: t.endDate,
        registrationDeadline: t.registrationDeadline,
        registrationFee: t.registrationFee || 0,
        prizePool: t.prizePool,
        maxPlayers: t.maxPlayers,
        registeredCount,
        remainingSlots,
        feePaid: Boolean(playerRecord?.feePaid),
        registeredAt: playerRecord?.registeredAt,
        finalRank,
        prizeAmount,
        medal,
      };
    });
  }

  /** Bảng xếp hạng theo ELO; chỉ gồm hội viên đã xác nhận ghi danh ít nhất một giải công bố. */
  async getLeaderboard(limit = 50) {
    const tournaments = await Tournament.find({
      status: { $ne: TournamentStatus.DRAFT },
      "players.0": { $exists: true },
    })
      .select("registrationFee players.user players.feePaid players.registrationStatus players.result")
      .lean();
    const stats = new Map<string, { joined: number; won: number }>();
    for (const tournament of tournaments) {
      const fee = tournament.registrationFee ?? 0;
      for (const player of tournament.players as Array<{
        user: mongoose.Types.ObjectId;
        feePaid?: boolean;
        registrationStatus?: string;
        result?: { finalRank?: number };
      }>) {
        if (!confirmedPlayer(player, fee)) continue;
        const key = String(player.user);
        const entry = stats.get(key) || { joined: 0, won: 0 };
        entry.joined += 1;
        if (player.result?.finalRank === 1) entry.won += 1;
        stats.set(key, entry);
      }
    }

    const users = await User.find({
      _id: { $in: [...stats.keys()] },
      role: UserRole.CUSTOMER,
      isActive: true,
      isLocked: false,
    })
      .sort({ elo: -1, createdAt: 1 })
      .limit(Math.min(100, Math.max(1, limit)))
      .select("name avatar elo rank")
      .lean();

    return users.map((user, index) => ({
      id: String(user._id),
      rankIndex: index + 1,
      name: user.name,
      avatar: user.avatar,
      elo: user.elo ?? 1000,
      rank: user.rank ?? "K",
      tournamentsJoined: stats.get(String(user._id))?.joined ?? 0,
      tournamentsWon: stats.get(String(user._id))?.won ?? 0,
    }));
  }

  async registerPlayer(id: string, userId: string, paymentMethod: unknown) {
    return new TournamentPaymentService().create(id, userId, paymentMethod);
  }

  /**
   * Ghi danh trực tiếp tại quầy bởi Nhân viên / Thu ngân / Admin (SCRUM-924)
   * Thu tiền mặt hoặc chuyển khoản tại quầy, ghi nhận trực tiếp cơ thủ vào danh sách thi đấu
   */
  async registerPlayerAtCounter(
    tournamentId: string,
    customerId: string,
    paymentMethod: "cash" | "bank_transfer",
    staffId: string,
    note?: string,
  ) {
    if (!mongoose.isValidObjectId(tournamentId) || !mongoose.isValidObjectId(customerId)) {
      throw paymentError("Mã giải đấu hoặc tài khoản khách hàng không hợp lệ", 400);
    }
    if (!["cash", "bank_transfer"].includes(paymentMethod)) {
      throw paymentError("Phương thức thanh toán tại quầy chỉ chấp nhận tiền mặt hoặc chuyển khoản", 400);
    }

    let savedTournament: any;
    let registeredCustomer: any;

    await mongoose.connection.transaction(async (session) => {
      const customer = await User.findOne({
        _id: customerId,
        role: UserRole.CUSTOMER,
        isActive: true,
        isLocked: false,
      }).session(session);

      if (!customer) {
        throw paymentError("Không tìm thấy hội viên hoặc tài khoản đang bị khóa", 404);
      }

      const tournament = await Tournament.findById(tournamentId).session(session);
      if (!tournament) {
        throw paymentError("Không tìm thấy giải đấu", 404);
      }

      if (
        tournament.status !== TournamentStatus.REGISTRATION_OPEN ||
        tournament.registrationDeadline.getTime() <= Date.now() ||
        tournament.paymentFinalizedAt
      ) {
        throw paymentError("Giải đấu hiện không mở ghi danh hoặc đã hết hạn đăng ký", 409);
      }

      const isAlreadyRegistered = (tournament.players || []).some(
        (p: any) => String(p.user) === customerId && confirmedPlayer(p, tournament.registrationFee),
      );
      if (isAlreadyRegistered) {
        throw paymentError(`Cơ thủ ${customer.name} đã được xác nhận tham gia giải đấu này`, 409);
      }

      const confirmedCount = (tournament.players || []).filter((p: any) =>
        confirmedPlayer(p, tournament.registrationFee),
      ).length;
      if (confirmedCount >= tournament.maxPlayers) {
        throw paymentError("Giải đấu đã đủ số lượng cơ thủ tối đa", 409);
      }

      const oldPlayerIdx = (tournament.players || []).findIndex(
        (p: any) => String(p.user) === customerId,
      );

      const newPlayerData: any = {
        user: customer._id,
        name: customer.name,
        avatar: customer.avatar,
        phone: customer.phone,
        feePaid: true,
        paymentMethod: paymentMethod === "cash" ? "cash" : "counter",
        registrationStatus: "confirmed",
        registeredAt: new Date(),
      };

      if (oldPlayerIdx >= 0) {
        Object.assign(tournament.players[oldPlayerIdx], newPlayerData);
      } else {
        tournament.players.push(newPlayerData);
      }

      await TournamentPaymentIntent.updateOne(
        { tournament: tournamentId, user: customerId },
        { $set: { status: "confirmed" } },
        { session },
      );

      tournament.paymentRevision = (tournament.paymentRevision || 0) + 1;
      await tournament.save({ session });

      savedTournament = tournament;
      registeredCustomer = customer;
    });

    notifications
      .createForUser(customerId, {
        title: "Xác nhận đăng ký giải đấu tại quầy",
        content: `Bạn đã được nhân viên ghi danh tham gia giải "${savedTournament.name}". Lệ phí: ${
          savedTournament.registrationFee > 0
            ? `${savedTournament.registrationFee.toLocaleString("vi-VN")}đ (${paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản tại quầy"})`
            : "Miễn phí"
        }.`,
        type: NotificationType.TOURNAMENT,
      })
      .catch(() => undefined);

    emitTournamentPaymentUpdated({
      tournamentId: String(savedTournament._id),
      userId: customerId,
      status: "confirmed",
    });

    return {
      tournament: savedTournament,
      customer: {
        id: registeredCustomer._id,
        name: registeredCustomer.name,
        phone: registeredCustomer.phone,
      },
    };
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

  async confirmPlayerFee(_id: string, _userId: string, _reviewerId: string) {
    throw paymentError("Không xác nhận lệ phí thủ công; dùng đối soát và chốt SePay theo thời gian ngân hàng", 409);
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

    if (((dto.registrationFee !== undefined && Number(dto.registrationFee) !== tournament.registrationFee) || (dto.registrationDeadline !== undefined && new Date(dto.registrationDeadline).getTime() !== tournament.registrationDeadline.getTime()) || (dto.maxPlayers !== undefined && Number(dto.maxPlayers) !== tournament.maxPlayers)) && await TournamentPaymentIntent.exists({ tournament: id })) {
      throw paymentError("Không thể đổi lệ phí, hạn đăng ký hoặc quy mô sau khi đã tạo mã chuyển khoản", 409);
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
    if (tournament.registrationDeadline >= tournament.startDate) {
      throw new Error("Hạn đăng ký bắt buộc phải diễn ra trước ngày khai mạc giải đấu");
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

    if (nextStatus === TournamentStatus.DRAFT && currentStatus !== TournamentStatus.DRAFT) {
      throw new Error("Không thể chuyển ngược giải đấu đã công bố về trạng thái Bản nháp (DRAFT)");
    }

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

    if (tournament.registrationFee > 0 && [TournamentStatus.BRACKET_GENERATED, TournamentStatus.IN_PROGRESS, TournamentStatus.COMPLETED].includes(nextStatus) && await TournamentPaymentIntent.exists({ tournament: id })) {
      if (!tournament.paymentFinalizedAt || tournament.paymentReconciliationRequired) throw paymentError("Cần đối soát và chốt danh sách thanh toán trước khi vận hành giải", 409);
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
