import mongoose from "mongoose";
import { Match, MatchFrame } from "./match.model";
import { Tournament, TournamentStatus, type ITournamentPlayer } from "./tournament.model";
import { confirmedPlayer } from "./sepay";
import { User } from "../user/user.model";
import {
  emitNotification,
  emitTournamentScoreUpdated,
  emitTournamentMatchCompleted,
  emitTournamentBracketUpdated,
} from "../../utils/socketHolder";

export interface BracketMatchParticipant {
  slot: 1 | 2;
  registrationId?: string;
  user?: {
    _id: string;
    name: string;
    avatar?: string;
    phone?: string;
  };
  seed?: number;
  score: number;
  isWinner: boolean | null;
}

export interface BracketMatchDto {
  _id: string;
  tournamentId: string;
  round: number;
  roundName: string;
  matchNumber: number;
  code: string;
  status: "scheduled" | "in_progress" | "completed" | "walkover" | "bye" | "cancelled";
  table?: {
    _id: string;
    name: string;
    code?: string;
  };
  winnerRegistrationId?: string;
  nextMatchId?: string;
  nextMatchSlot?: 1 | 2;
  scheduledAt?: string;
  participants: BracketMatchParticipant[];
}

export interface BracketStructureDto {
  tournament: {
    _id: string;
    name: string;
    status: TournamentStatus;
    format: string;
    raceToScore: number;
    bracketSize: number;
    totalRounds: number;
    totalMatches: number;
  };
  rounds: {
    round: number;
    roundName: string;
    raceTo: number;
    matches: BracketMatchDto[];
  }[];
}

export function getStandardSeedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const nextOrder: number[] = [];
    const currentLength = order.length * 2 + 1;
    for (const seed of order) {
      nextOrder.push(seed);
      nextOrder.push(currentLength - seed);
    }
    order = nextOrder;
  }
  return order;
}

export function getRoundName(round: number, totalRounds: number): string {
  const diff = totalRounds - round;
  if (diff === 0) return "Chung kết";
  if (diff === 1) return "Bán kết";
  if (diff === 2) return "Tứ kết";
  if (diff === 3) return "Vòng 1/8";
  return `Vòng ${round}`;
}

export class TournamentBracketService {
  async validateForBracketGeneration(tournamentId: string) {
    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      throw new Error("Mã giải đấu không hợp lệ");
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error("Không tìm thấy giải đấu");
    }

    const allowedStatuses: TournamentStatus[] = [
      TournamentStatus.REGISTRATION_CLOSED,
      TournamentStatus.REGISTRATION_OPEN,
      TournamentStatus.BRACKET_GENERATED,
    ];
    if (!allowedStatuses.includes(tournament.status)) {
      throw new Error(
        `Không thể sinh nhánh đấu cho giải ở trạng thái "${tournament.status}". Giải cần ở trạng thái Đóng ghi danh hoặc Đang mở ghi danh.`,
      );
    }

    if (tournament.status === TournamentStatus.BRACKET_GENERATED) {
      const hasActiveMatches = await Match.exists({
        tournament: tournament._id,
        status: { $in: ["in_progress", "completed", "walkover"] },
      });
      if (hasActiveMatches) {
        throw new Error("Không thể sinh lại nhánh đấu khi giải đã có trận đấu đang diễn ra hoặc đã kết thúc");
      }
    }

    const validPlayers = (tournament.players || []).filter((p: any) =>
      confirmedPlayer(p, tournament.registrationFee),
    );

    if (validPlayers.length < 2) {
      throw new Error("Cần tối thiểu 2 cơ thủ đã xác nhận tham gia để sinh nhánh đấu");
    }

    if (tournament.registrationFee > 0 && tournament.paymentReconciliationRequired) {
      throw new Error("Cần hoàn tất đối soát lệ phí trước khi sinh nhánh đấu");
    }

    return { tournament, validPlayers };
  }

  async generateSingleEliminationBracket(tournamentId: string) {
    const { tournament, validPlayers } = await this.validateForBracketGeneration(tournamentId);

    let bracketSize = 4;
    while (bracketSize < validPlayers.length) {
      bracketSize *= 2;
    }

    if (bracketSize > 64) {
      throw new Error("Hệ thống hiện tại hỗ trợ cây nhánh đấu tối đa 64 cơ thủ");
    }

    const totalRounds = Math.log2(bracketSize);

    const allMatchesToSave: any[] = [];

    await mongoose.connection.transaction(async (session) => {
      await Match.deleteMany({ tournament: tournament._id }).session(session);

      const roundsInfo: { _id: mongoose.Types.ObjectId; roundNo: number; name: string; stage: string; raceTo: number }[] = [];
      for (let r = 1; r <= totalRounds; r++) {
        roundsInfo.push({
          _id: new mongoose.Types.ObjectId(),
          roundNo: r,
          name: getRoundName(r, totalRounds),
          stage: "knockout",
          raceTo: tournament.raceToScore || 5,
        });
      }

      tournament.rounds = roundsInfo;

      const sortedPlayers = [...validPlayers].sort((a, b) => {
        const seedA = a.seed || 9999;
        const seedB = b.seed || 9999;
        if (seedA !== seedB) return seedA - seedB;
        return new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
      });

      sortedPlayers.forEach((p, idx) => {
        p.seed = idx + 1;
      });
      (tournament as any).markModified("players");

      const playerBySeed = new Map<number, ITournamentPlayer>();
      sortedPlayers.forEach((p) => {
        if (p.seed) playerBySeed.set(p.seed, p);
      });

      const seedOrder = getStandardSeedOrder(bracketSize);

      const matchGrid = new Map<number, Map<number, any>>();

      for (let r = 1; r <= totalRounds; r++) {
        matchGrid.set(r, new Map());
        const matchesInRound = bracketSize / Math.pow(2, r);
        const roundMeta = roundsInfo.find((ro) => ro.roundNo === r)!;

        for (let m = 1; m <= matchesInRound; m++) {
          const matchDoc = new Match({
            _id: new mongoose.Types.ObjectId(),
            tournament: tournament._id,
            roundId: roundMeta._id,
            round: r,
            matchNumber: m,
            code: `M-R${r}-${m}`,
            status: "scheduled",
            participants: [],
          });
          matchGrid.get(r)!.set(m, matchDoc);
        }
      }

      for (let r = 1; r < totalRounds; r++) {
        const currentRoundMatches = matchGrid.get(r)!;
        const nextRoundMatches = matchGrid.get(r + 1)!;

        for (const [matchNum, matchDoc] of currentRoundMatches.entries()) {
          const nextMatchNum = Math.ceil(matchNum / 2);
          const nextSlot = (matchNum % 2 === 1 ? 1 : 2) as 1 | 2;
          const targetNextMatch = nextRoundMatches.get(nextMatchNum);

          if (targetNextMatch) {
            matchDoc.nextMatchId = targetNextMatch._id;
            matchDoc.nextMatchSlot = nextSlot;
          }
        }
      }

      const round1Matches = matchGrid.get(1)!;
      const matchesInRound1 = bracketSize / 2;

      for (let m = 1; m <= matchesInRound1; m++) {
        const matchDoc = round1Matches.get(m)!;
        const seedSlot1 = seedOrder[(m - 1) * 2];
        const seedSlot2 = seedOrder[(m - 1) * 2 + 1];

        const player1 = playerBySeed.get(seedSlot1);
        const player2 = playerBySeed.get(seedSlot2);

        const participants: any[] = [];

        if (player1) {
          participants.push({
            matchId: matchDoc._id,
            registrationId: player1._id,
            slot: 1,
            score: 0,
            isWinner: null,
          });
          matchDoc.player1 = player1.user;
        }

        if (player2) {
          participants.push({
            matchId: matchDoc._id,
            registrationId: player2._id,
            slot: 2,
            score: 0,
            isWinner: null,
          });
          matchDoc.player2 = player2.user;
        }

        matchDoc.participants = participants;

        if (player1 && !player2) {
          matchDoc.status = "bye";
          matchDoc.winnerRegistrationId = player1._id;
          matchDoc.winner = player1.user;
          matchDoc.completedAt = new Date();
          participants[0].isWinner = true;

          if (matchDoc.nextMatchId && matchDoc.nextMatchSlot) {
            const nextMatch = matchGrid.get(2)?.get(Math.ceil(m / 2));
            if (nextMatch) {
              nextMatch.participants.push({
                matchId: nextMatch._id,
                registrationId: player1._id,
                slot: matchDoc.nextMatchSlot,
                score: 0,
                isWinner: null,
              });
              if (matchDoc.nextMatchSlot === 1) nextMatch.player1 = player1.user;
              else nextMatch.player2 = player1.user;
            }
          }
        } else if (!player1 && player2) {
          matchDoc.status = "bye";
          matchDoc.winnerRegistrationId = player2._id;
          matchDoc.winner = player2.user;
          matchDoc.completedAt = new Date();
          participants[0].isWinner = true;

          if (matchDoc.nextMatchId && matchDoc.nextMatchSlot) {
            const nextMatch = matchGrid.get(2)?.get(Math.ceil(m / 2));
            if (nextMatch) {
              nextMatch.participants.push({
                matchId: nextMatch._id,
                registrationId: player2._id,
                slot: matchDoc.nextMatchSlot,
                score: 0,
                isWinner: null,
              });
              if (matchDoc.nextMatchSlot === 1) nextMatch.player1 = player2.user;
              else nextMatch.player2 = player2.user;
            }
          }
        }
      }

      for (let r = 1; r <= totalRounds; r++) {
        for (const mDoc of matchGrid.get(r)!.values()) {
          allMatchesToSave.push(mDoc);
        }
      }

      await Match.insertMany(allMatchesToSave, { session });

      tournament.status = TournamentStatus.BRACKET_GENERATED;
      await tournament.save({ session });
    });

    emitTournamentBracketUpdated({
      tournamentId: String(tournament._id),
      bracketSize,
      totalMatches: allMatchesToSave.length,
    });

    emitNotification("tournament:bracket_generated", {
      tournamentId: String(tournament._id),
      totalMatches: allMatchesToSave.length,
      bracketSize,
    });

    return this.getBracketStructure(String(tournament._id));
  }

  async getBracketStructure(tournamentId: string): Promise<BracketStructureDto> {
    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      throw new Error("Mã giải đấu không hợp lệ");
    }

    const tournament = await Tournament.findById(tournamentId).populate(
      "players.user",
      "name avatar phone",
    );
    if (!tournament) {
      throw new Error("Không tìm thấy giải đấu");
    }

    const matches = await Match.find({ tournament: tournament._id })
      .populate("table", "name code")
      .populate("player1", "name avatar phone")
      .populate("player2", "name avatar phone")
      .sort({ round: 1, matchNumber: 1 })
      .lean();

    const playerMap = new Map<string, ITournamentPlayer>();
    (tournament.players || []).forEach((p: any) => {
      playerMap.set(String(p._id), p);
    });

    const totalRounds = tournament.rounds?.length || Math.max(...matches.map((m) => m.round), 1);
    const bracketSize = Math.pow(2, totalRounds);

    if (matches.length === 0) {
      return {
        tournament: {
          _id: String(tournament._id),
          name: tournament.name,
          status: tournament.status,
          format: tournament.format,
          raceToScore: tournament.raceToScore,
          bracketSize: 0,
          totalRounds: 0,
          totalMatches: 0,
        },
        rounds: [],
      };
    }

    const roundsMap = new Map<number, BracketMatchDto[]>();
    for (let r = 1; r <= totalRounds; r++) {
      roundsMap.set(r, []);
    }

    for (const m of matches) {
      const participantsDto: BracketMatchParticipant[] = [];

      for (const slotNum of [1, 2] as const) {
        const participant = m.participants?.find((p: any) => p.slot === slotNum);
        if (participant) {
          const registeredPlayer = playerMap.get(String(participant.registrationId));
          const userInfo = (registeredPlayer?.user as any) || (slotNum === 1 ? m.player1 : m.player2);

          participantsDto.push({
            slot: slotNum,
            registrationId: String(participant.registrationId),
            user: userInfo
              ? {
                  _id: String(userInfo._id || userInfo.id || ""),
                  name: userInfo.name || registeredPlayer?.name || `Cơ thủ ${slotNum}`,
                  avatar: userInfo.avatar || registeredPlayer?.avatar,
                  phone: userInfo.phone || registeredPlayer?.phone,
                }
              : undefined,
            seed: registeredPlayer?.seed,
            score: participant.score || 0,
            isWinner: participant.isWinner ?? (m.winnerRegistrationId ? String(m.winnerRegistrationId) === String(participant.registrationId) : null),
          });
        }
      }

      const matchDto: BracketMatchDto = {
        _id: String(m._id),
        tournamentId: String(tournament._id),
        round: m.round,
        roundName: getRoundName(m.round, totalRounds),
        matchNumber: m.matchNumber,
        code: m.code || `M-R${m.round}-${m.matchNumber}`,
        status: m.status as any,
        table: m.table
          ? {
              _id: String((m.table as any)._id),
              name: (m.table as any).name,
              code: (m.table as any).code,
            }
          : undefined,
        winnerRegistrationId: m.winnerRegistrationId ? String(m.winnerRegistrationId) : undefined,
        nextMatchId: m.nextMatchId ? String(m.nextMatchId) : undefined,
        nextMatchSlot: m.nextMatchSlot as any,
        scheduledAt: m.scheduledAt ? new Date(m.scheduledAt).toISOString() : undefined,
        participants: participantsDto,
      };

      if (!roundsMap.has(m.round)) {
        roundsMap.set(m.round, []);
      }
      roundsMap.get(m.round)!.push(matchDto);
    }

    const rounds = Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNum, roundMatches]) => {
        const roundMeta = (tournament.rounds || []).find((ro: any) => ro.roundNo === roundNum);
        return {
          round: roundNum,
          roundName: getRoundName(roundNum, totalRounds),
          raceTo: roundMeta?.raceTo || tournament.raceToScore || 5,
          matches: roundMatches,
        };
      });

    return {
      tournament: {
        _id: String(tournament._id),
        name: tournament.name,
        status: tournament.status,
        format: tournament.format,
        raceToScore: tournament.raceToScore,
        bracketSize,
        totalRounds,
        totalMatches: matches.length,
      },
      rounds,
    };
  }

  async updateMatchScore(
    matchId: string,
    data: {
      score1?: number;
      score2?: number;
      winnerRegistrationId?: string;
      status?: "in_progress" | "completed" | "walkover";
      tableId?: string;
    },
  ) {
    let updatedMatch: any;
    let nextMatchDoc: any;
    let eloUpdated = false;

    await mongoose.connection.transaction(async (session) => {
      const match = await Match.findById(matchId).session(session);
      if (!match) throw new Error("Không tìm thấy trận đấu");

      const p1 = match.participants.find((p: any) => p.slot === 1);
      const p2 = match.participants.find((p: any) => p.slot === 2);
      if (data.score1 !== undefined && p1) {
        p1.score = data.score1;
        match.score1 = data.score1;
      }
      if (data.score2 !== undefined && p2) {
        p2.score = data.score2;
        match.score2 = data.score2;
      }
      if (data.tableId) {
        match.table = new mongoose.Types.ObjectId(data.tableId);
      }
      if (data.status) {
        match.status = data.status;
      }

      if (data.winnerRegistrationId) {
        if (match.status !== "bye" && match.participants.length < 2) {
          throw new Error("Không thể chốt kết quả trận đấu khi chưa đủ hai cơ thủ");
        }

        const winnerPart = match.participants.find(
          (p) => String(p.registrationId) === String(data.winnerRegistrationId),
        );
        if (!winnerPart) {
          throw new Error("Người thắng phải là một trong hai cơ thủ tham gia trận đấu");
        }

        if (match.nextMatchId) {
          const nextMatch = await Match.findById(match.nextMatchId).session(session);
          if (nextMatch && nextMatch.status !== "scheduled") {
            throw new Error("Trận đấu ở vòng tiếp theo đã diễn ra hoặc kết thúc, không thể đổi kết quả");
          }
        }

        match.winnerRegistrationId = new mongoose.Types.ObjectId(data.winnerRegistrationId);
        if (data.status === "walkover") {
          match.status = "walkover";
        } else {
          match.status = "completed";
        }
        match.completedAt = new Date();
        const winnerUser = winnerPart.slot === 1 ? match.player1 : match.player2;
        if (winnerUser) match.winner = winnerUser;

        if (match.nextMatchId && match.nextMatchSlot) {
          nextMatchDoc = await Match.findById(match.nextMatchId).session(session);
          if (nextMatchDoc) {
            const remainingParticipants = nextMatchDoc.participants.filter(
              (p: any) => p.slot !== match.nextMatchSlot,
            );
            nextMatchDoc.set("participants", [
              ...remainingParticipants,
              {
                matchId: nextMatchDoc._id,
                registrationId: winnerPart.registrationId,
                slot: match.nextMatchSlot,
                score: 0,
                isWinner: null,
              },
            ]);

            if (match.nextMatchSlot === 1) nextMatchDoc.player1 = winnerUser;
            else nextMatchDoc.player2 = winnerUser;

            await nextMatchDoc.save({ session });
          }
        } else {
          const tournamentDoc = await Tournament.findById(match.tournament).session(session);
          if (tournamentDoc) {
            const loserPart = match.participants.find(
              (p: any) => String(p.registrationId) !== String(data.winnerRegistrationId),
            );
            const winnerPlayer = tournamentDoc.players?.find(
              (p: any) => String(p._id) === String(winnerPart.registrationId),
            );
            const loserPlayer = tournamentDoc.players?.find(
              (p: any) => String(p._id) === String(loserPart?.registrationId),
            );
            if (winnerPlayer) {
              winnerPlayer.result = {
                _id: new mongoose.Types.ObjectId(),
                tournamentId: tournamentDoc._id,
                registrationId: winnerPlayer._id,
                finalRank: 1,
              };
            }
            if (loserPlayer) {
              loserPlayer.result = {
                _id: new mongoose.Types.ObjectId(),
                tournamentId: tournamentDoc._id,
                registrationId: loserPlayer._id,
                finalRank: 2,
              };
            }

            // Tự động vinh danh Đồng hạng 3 (Top 3-4) cho 2 cơ thủ dừng bước ở Bán kết
            const semiFinalMatches = await Match.find({
              tournament: match.tournament,
              round: match.round - 1,
              status: "completed",
            }).session(session);

            for (const sfMatch of semiFinalMatches) {
              const sfLoserPart = sfMatch.participants.find(
                (p: any) => String(p.registrationId) !== String(sfMatch.winnerRegistrationId),
              );
              if (sfLoserPart) {
                const sfLoserPlayer = tournamentDoc.players?.find(
                  (p: any) => String(p._id) === String(sfLoserPart.registrationId),
                );
                if (sfLoserPlayer && !sfLoserPlayer.result) {
                  sfLoserPlayer.result = {
                    _id: new mongoose.Types.ObjectId(),
                    tournamentId: tournamentDoc._id,
                    registrationId: sfLoserPlayer._id,
                    finalRank: 3,
                  };
                }
              }
            }

            tournamentDoc.status = TournamentStatus.COMPLETED;
            tournamentDoc.markModified("players");
            await tournamentDoc.save({ session });
          }
        }

        if (!match.eloApplied && match.player1 && match.player2 && match.status !== "walkover") {
          await this.calculateAndApplyEloInSession(match, session);
          match.eloApplied = true;
          eloUpdated = true;
        }
      }

      await match.save({ session });
      updatedMatch = match;
    });

    const p1Final = updatedMatch.participants.find((p: any) => p.slot === 1);
    const p2Final = updatedMatch.participants.find((p: any) => p.slot === 2);

    if (updatedMatch.status === "completed" && updatedMatch.winnerRegistrationId) {
      let winnerUserData: { _id: string; name: string; avatar?: string; phone?: string; seed?: number } | undefined;
      const winnerUserId = updatedMatch.winner;
      if (winnerUserId) {
        const u = await User.findById(winnerUserId).select("name avatar phone").lean();
        if (u) {
          winnerUserData = {
            _id: String(u._id),
            name: u.name,
            avatar: u.avatar,
            phone: u.phone,
          };
        }
      }

      emitTournamentMatchCompleted({
        tournamentId: String(updatedMatch.tournament),
        matchId: String(updatedMatch._id),
        winnerRegistrationId: String(updatedMatch.winnerRegistrationId),
        nextMatchId: updatedMatch.nextMatchId ? String(updatedMatch.nextMatchId) : undefined,
        nextMatchSlot: updatedMatch.nextMatchSlot ?? undefined,
        winnerUser: winnerUserData,
      });
    }

    emitTournamentScoreUpdated({
      tournamentId: String(updatedMatch.tournament),
      matchId: String(updatedMatch._id),
      score1: p1Final?.score,
      score2: p2Final?.score,
      status: updatedMatch.status,
      winnerRegistrationId: updatedMatch.winnerRegistrationId ? String(updatedMatch.winnerRegistrationId) : undefined,
    });

    emitNotification("tournament:match_updated", {
      matchId: String(updatedMatch._id),
      tournamentId: String(updatedMatch.tournament),
      status: updatedMatch.status,
    });

    return updatedMatch;
  }

  async calculateAndApplyEloInSession(match: any, session: mongoose.ClientSession) {
    if (!match.player1 || !match.player2) return;

    const [user1, user2] = await Promise.all([
      User.findById(match.player1).session(session),
      User.findById(match.player2).session(session),
    ]);

    if (!user1 || !user2) return;

    const rA = user1.elo ?? 1000;
    const rB = user2.elo ?? 1000;

    const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
    const eB = 1 / (1 + Math.pow(10, (rA - rB) / 400));

    const isUser1Winner =
      match.participants.find((p: any) => String(p.registrationId) === String(match.winnerRegistrationId))
        ?.slot === 1;

    const sA = isUser1Winner ? 1 : 0;
    const sB = isUser1Winner ? 0 : 1;

    const K = 32;
    const newEloA = Math.max(1000, Math.round(rA + K * (sA - eA)));
    const newEloB = Math.max(1000, Math.round(rB + K * (sB - eB)));

    user1.elo = newEloA;
    user2.elo = newEloB;

    await Promise.all([user1.save({ session }), user2.save({ session })]);
  }
}

