import {
  Tournament,
  ITournament,
  TournamentStatus,
} from "./tournament.model";
import {
  CreateTournamentDTO,
  UpdateTournamentDTO,
  validateTournamentData,
} from "./dto/tournament.dto";
import mongoose from "mongoose";

export class TournamentService {
  /**
   * Tạo giải đấu mới ở trạng thái DRAFT
   */
  async createTournament(
    dto: CreateTournamentDTO,
    userId?: string
  ): Promise<ITournament> {
    const validation = validateTournamentData(dto, false);
    if (!validation.isValid) {
      throw new Error(validation.errors.join("; "));
    }

    let assignedTables: string[] = [];
    if (Array.isArray(dto.assignedTables)) {
      assignedTables = dto.assignedTables.map((t) => t.trim()).filter(Boolean);
    } else if (typeof dto.assignedTables === "string" && dto.assignedTables.trim()) {
      assignedTables = dto.assignedTables.split(",").map((t) => t.trim()).filter(Boolean);
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

  /**
   * Lấy danh sách giải đấu (hỗ trợ lọc status & tìm kiếm)
   */
  async getTournaments(query: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
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
      Tournament.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
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

  /**
   * Lấy chi tiết giải đấu theo ID
   */
  async getTournamentById(id: string): Promise<ITournament> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Mã giải đấu không hợp lệ");
    }

    const tournament = await Tournament.findById(id).populate(
      "createdBy",
      "name email avatar"
    );
    if (!tournament) {
      throw new Error("Không tìm thấy giải đấu");
    }
    return tournament;
  }

  /**
   * Cập nhật thông tin giải đấu
   */
  async updateTournament(
    id: string,
    dto: UpdateTournamentDTO
  ): Promise<ITournament> {
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

    // Nếu đã ở trạng thái sau registration_open thì không cho đổi maxPlayers hoặc ngày thi đấu quan trọng
    if (
      tournament.status !== TournamentStatus.DRAFT &&
      (dto.maxPlayers !== undefined && dto.maxPlayers !== tournament.maxPlayers)
    ) {
      throw new Error(
        "Không thể thay đổi quy mô giải đấu khi giải đấu đã mở đăng ký hoặc đang diễn ra"
      );
    }

    if (dto.name !== undefined) tournament.name = dto.name.trim();
    if (dto.description !== undefined) tournament.description = dto.description.trim();
    if (dto.startDate !== undefined) tournament.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) tournament.endDate = new Date(dto.endDate);
    if (dto.registrationDeadline !== undefined)
      tournament.registrationDeadline = new Date(dto.registrationDeadline);
    if (dto.maxPlayers !== undefined) tournament.maxPlayers = Number(dto.maxPlayers);
    if (dto.registrationFee !== undefined)
      tournament.registrationFee = Number(dto.registrationFee);
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

    // Kiểm tra tính hợp lệ của ngày tháng sau cập nhật
    if (tournament.endDate < tournament.startDate) {
      throw new Error("Ngày kết thúc thi đấu phải sau hoặc bằng ngày bắt đầu");
    }
    if (tournament.registrationDeadline > tournament.startDate) {
      throw new Error("Hạn đăng ký phải trước hoặc bằng ngày bắt đầu thi đấu");
    }

    await tournament.save();
    return tournament;
  }

  /**
   * Chuyển đổi trạng thái vòng đời giải đấu
   */
  async changeStatus(
    id: string,
    nextStatus: TournamentStatus
  ): Promise<ITournament> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Mã giải đấu không hợp lệ");
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      throw new Error("Không tìm thấy giải đấu");
    }

    const currentStatus = tournament.status;

    // Quy tắc chuyển trạng thái sang REGISTRATION_OPEN (SCRUM-152)
    if (nextStatus === TournamentStatus.REGISTRATION_OPEN) {
      if (currentStatus !== TournamentStatus.DRAFT) {
        throw new Error(
          `Chỉ giải đấu ở trạng thái Bản nháp (draft) mới có thể mở đăng ký. Trạng thái hiện tại: ${currentStatus}`
        );
      }

      const now = new Date();
      if (tournament.registrationDeadline < now) {
        throw new Error(
          "Hạn đăng ký giải đấu đã hết hạn, không thể mở đăng ký"
        );
      }
    }

    tournament.status = nextStatus;
    await tournament.save();
    return tournament;
  }
}
