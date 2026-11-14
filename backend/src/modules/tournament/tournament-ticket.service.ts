import { createHmac, timingSafeEqual } from "crypto";
import mongoose from "mongoose";
import { Tournament, ITournament, ITournamentPlayer, TournamentStatus } from "./tournament.model";
import { confirmedPlayer } from "./sepay";

const ticketError = (message: string, httpCode = 400) => Object.assign(new Error(message), { httpCode });
const excludedStatuses = [TournamentStatus.DRAFT, TournamentStatus.COMPLETED];

function signature(value: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw ticketError("Cấu hình ký vé chưa sẵn sàng. Vui lòng liên hệ quản trị viên.", 503);
  const key = createHmac("sha256", secret).update("CueZone:tournament-ticket:v1").digest();
  return createHmac("sha256", key).update(value).digest("hex");
}

export class TournamentTicketService {
  private async tournament(id: string): Promise<ITournament> {
    if (!mongoose.isValidObjectId(id)) throw ticketError("Mã giải đấu không hợp lệ");
    const tournament = await Tournament.findById(id);
    if (!tournament) throw ticketError("Không tìm thấy giải đấu", 404);
    return tournament;
  }

  private assertEligible(tournament: ITournament, player?: ITournamentPlayer): asserts player is ITournamentPlayer {
    if (excludedStatuses.includes(tournament.status)) {
      throw ticketError("Giải đấu chưa sẵn sàng hoặc đã kết thúc, không thể điểm danh", 409);
    }
    if (tournament.paymentReconciliationRequired) {
      throw ticketError("Giải đấu đang cần đối soát lại lệ phí", 409);
    }
    if (!player || !confirmedPlayer(player, tournament.registrationFee)) {
      throw ticketError("Vé không còn hợp lệ hoặc chưa được xác nhận đăng ký", 409);
    }
  }

  private parseTicket(tournamentId: string, ticket: unknown): string {
    if (typeof ticket !== "string" || ticket.length > 160) throw ticketError("Mã vé không hợp lệ");
    const match = /^CZT1\.([a-f0-9]{24})\.([a-f0-9]{24})\.([a-f0-9]{64})$/.exec(ticket.trim());
    if (!match) throw ticketError("Mã vé không hợp lệ. Vui lòng mở lại E-Pass để lấy vé mới.");
    const [, id, registrationId, supplied] = match;
    const expected = signature(`CZT1.${id}.${registrationId}`);
    if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"))) {
      throw ticketError("Chữ ký vé không hợp lệ");
    }
    if (id !== tournamentId) throw ticketError("Vé không thuộc giải đấu đang chọn");
    return registrationId;
  }

  private result(tournament: ITournament, player: ITournamentPlayer, alreadyCheckedIn: boolean) {
    return {
      tournamentId: String(tournament._id),
      tournamentName: tournament.name,
      registrationId: String(player._id),
      athleteName: player.name,
      athletePhone: player.phone ? `${"*".repeat(Math.max(0, player.phone.length - 4))}${player.phone.slice(-4)}` : "",
      checkedInAt: player.checkedInAt ?? null,
      alreadyCheckedIn,
    };
  }

  async getMyPass(id: string, userId: string) {
    const tournament = await this.tournament(id);
    const player = tournament.players.find((item) => String(item.user) === userId);
    this.assertEligible(tournament, player);
    const body = `CZT1.${String(tournament._id)}.${String(player._id)}`;
    return {
      tournamentId: String(tournament._id),
      tournamentName: tournament.name,
      format: tournament.format,
      raceToScore: tournament.raceToScore,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      athleteName: player.name,
      athletePhone: player.phone ?? "",
      athleteCode: `CZ-${String(player._id).toUpperCase()}`,
      feeAmount: tournament.registrationFee,
      checkedInAt: player.checkedInAt ?? null,
      ticket: `${body}.${signature(body)}`,
    };
  }

  async preview(id: string, ticket: unknown) {
    const registrationId = this.parseTicket(id, ticket);
    const tournament = await this.tournament(id);
    const player = tournament.players.find((item) => String(item._id) === registrationId);
    this.assertEligible(tournament, player);
    return this.result(tournament, player, Boolean(player.checkedInAt));
  }

  async checkIn(id: string, ticket: unknown, staffId: string) {
    if (!mongoose.isValidObjectId(staffId)) throw ticketError("Nhân viên không hợp lệ", 401);
    const registrationId = this.parseTicket(id, ticket);
    const tournament = await this.tournament(id);
    const player = tournament.players.find((item) => String(item._id) === registrationId);
    this.assertEligible(tournament, player);
    if (player.checkedInAt) return this.result(tournament, player, true);

    const updated = await Tournament.findOneAndUpdate(
      {
        _id: tournament._id,
        status: { $nin: excludedStatuses },
        paymentReconciliationRequired: { $ne: true },
        registrationFee: tournament.registrationFee,
        players: {
          $elemMatch: {
            _id: player._id,
            registrationStatus: { $ne: "cancelled" },
            ...(tournament.registrationFee === 0
              ? { $or: [{ feePaid: true }, { registrationStatus: "confirmed" }] }
              : { feePaid: true }),
            checkedInAt: null,
          },
        },
      },
      {
        $set: {
          "players.$.checkedInAt": new Date(),
          "players.$.checkedInBy": new mongoose.Types.ObjectId(staffId),
        },
        // Giữ tương thích với các thao tác save() optimistic concurrency hiện có.
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true },
    );
    if (!updated) {
      const latest = await this.preview(id, ticket);
      if (latest.checkedInAt) return { ...latest, alreadyCheckedIn: true };
      throw ticketError("Danh sách giải đã thay đổi. Vui lòng kiểm tra vé lại.", 409);
    }
    const checked = updated.players.find((item: ITournamentPlayer) => String(item._id) === registrationId)!;
    return this.result(updated, checked, false);
  }
}
