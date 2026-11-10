import { randomBytes } from "crypto";
import mongoose, { ClientSession } from "mongoose";
import { Tournament, TournamentStatus } from "./tournament.model";
import { TournamentPaymentIntent as Intent, TournamentPaymentReceipt as Receipt } from "./tournament-payment.model";
import { User, UserRole } from "../user/user.model";
import { comparePayments, confirmedPlayer, paymentError, refundContact, sepayConfig, sepayReceipt, verifySepayAuthorization } from "./sepay";
import { emitTournamentPaymentUpdated } from "../../utils/socketHolder";

export class TournamentPaymentService {
  private validId(id: string) {
    if (!mongoose.isValidObjectId(id)) throw paymentError("Mã giải đấu không hợp lệ");
  }

  async create(id: string, userId: string, method: unknown) {
    this.validId(id);
    if (method !== "bank_transfer") throw paymentError("Web chỉ hỗ trợ chuyển khoản SePay");
    try {
      await mongoose.connection.transaction(async session => {
        const user = await User.findOne({ _id: userId, role: UserRole.CUSTOMER, isActive: true, isLocked: false }).session(session);
        if (!user) throw paymentError("Chỉ hội viên đang hoạt động mới được ghi danh", 403);
        const tournament = await Tournament.findById(id).session(session);
        if (!tournament) throw paymentError("Không tìm thấy giải đấu", 404);
        if (await Intent.exists({ tournament: id, user: userId }).session(session)) return;
        if (tournament.status !== TournamentStatus.REGISTRATION_OPEN || tournament.registrationDeadline.getTime() <= Date.now() || tournament.paymentFinalizedAt) throw paymentError("Giải đấu hiện không mở ghi danh", 409);
        const confirmed = tournament.players.filter((p: any) => confirmedPlayer(p, tournament.registrationFee));
        if (confirmed.some((p: any) => String(p.user) === userId)) throw paymentError("Bạn đã được xác nhận tham gia giải đấu", 409);
        if (confirmed.length >= tournament.maxPlayers) throw paymentError("Giải đấu đã đủ cơ thủ", 409);
        if (!Number.isSafeInteger(tournament.registrationFee) || tournament.registrationFee < 0) throw paymentError("Lệ phí giải đấu không hợp lệ");
        const config = tournament.registrationFee > 0 ? sepayConfig() : { accountNumber: undefined, bankCode: undefined, accountName: undefined };
        const initialStatus = tournament.registrationFee === 0 ? "confirmed" : "awaiting_payment";
        const [intent] = await Intent.create([{
          tournament: id, user: userId, reference: `CZ${randomBytes(12).toString("hex").toUpperCase()}`,
          amount: tournament.registrationFee, deadline: tournament.registrationDeadline,
          accountNumber: config.accountNumber, bankCode: config.bankCode, accountName: config.accountName,
          name: user.name, avatar: user.avatar, phone: user.phone,
          status: initialStatus,
        }], { session });
        if (intent.amount === 0) {
          const old = tournament.players.find((p: any) => String(p.user) === userId);
          const player = { user: user._id, name: user.name, avatar: user.avatar, phone: user.phone, feePaid: true, paymentMethod: "bank_transfer", registrationStatus: "confirmed", registeredAt: new Date() };
          if (old) Object.assign(old, player); else tournament.players.push(player);
        }
        tournament.paymentRevision = (tournament.paymentRevision || 0) + 1;
        await tournament.save({ session });
      });
    } catch (error: any) {
      if (error.code !== 11000 || !await Intent.exists({ tournament: id, user: userId })) throw error;
    }
    return this.status(id, userId);
  }

  private async ranking(tournament: any, session?: ClientSession) {
    const intents: any[] = await Intent.find({ tournament: tournament._id }).session(session || null).lean();
    const receipts: any[] = await Receipt.find({ tournament: tournament._id }).session(session || null).lean();
    const legacy = tournament.players.filter((p: any) => !p.paymentReference && confirmedPlayer(p, tournament.registrationFee));
    const legacyUsers = new Set(legacy.map((p: any) => String(p.user)));
    const candidates = intents.flatMap(intent => {
      if (intent.amount === 0 || legacyUsers.has(String(intent.user))) return [];
      const paid = receipts.filter(r => String(r.intent) === String(intent._id) && r.amount === intent.amount && r.bankPaidAt <= intent.deadline).sort(comparePayments);
      return paid.length ? [{ intent, receipt: paid[0] }] : [];
    }).sort((a, b) => comparePayments(a.receipt, b.receipt));
    return { intents, receipts, legacy, candidates, capacity: Math.max(0, tournament.maxPlayers - legacy.length) };
  }

  async webhook(header: string | undefined, body: unknown) {
    verifySepayAuthorization(header);
    const parsed = sepayReceipt(body);
    if (!parsed.incoming) return;
    const { incoming, ...receipt } = parsed;
    let updatedIntent: any = null;
    try {
      await mongoose.connection.transaction(async session => {
        const previous = await Receipt.findOne({ providerId: receipt.providerId }).session(session);
        if (previous) {
          if (previous.amount !== receipt.amount || previous.accountNumber !== receipt.accountNumber || previous.reference !== receipt.reference || previous.bankPaidAt.getTime() !== receipt.bankPaidAt.getTime()) throw paymentError("ID giao dịch SePay đã tồn tại với dữ liệu khác", 409);
          return;
        }
        const intent = receipt.reference ? await Intent.findOne({ reference: receipt.reference, accountNumber: receipt.accountNumber }).session(session) : null;
        await Receipt.create([{ ...receipt, intent: intent?._id, tournament: intent?.tournament }], { session });
        if (intent) {
          await Intent.updateOne({ _id: intent._id }, { $set: { status: "paid_pending" } }, { session });
          await Tournament.updateOne({ _id: intent.tournament }, { $inc: { paymentRevision: 1, __v: 1 }, $set: { paymentReconciliationRequired: true } }, { session });
          updatedIntent = intent;
        }
      });
      if (updatedIntent) {
        emitTournamentPaymentUpdated({
          tournamentId: String(updatedIntent.tournament),
          userId: String(updatedIntent.user),
          status: "paid_pending",
          reference: updatedIntent.reference,
        });
      }
    } catch (error: any) {
      if (error.code !== 11000) throw error;
      const previous = await Receipt.findOne({ providerId: receipt.providerId });
      if (!previous || previous.amount !== receipt.amount || previous.accountNumber !== receipt.accountNumber || previous.reference !== receipt.reference || previous.bankPaidAt.getTime() !== receipt.bankPaidAt.getTime()) throw paymentError("Giao dịch trùng không khớp dữ liệu", 409);
    }
  }

  async status(id: string, userId: string) {
    this.validId(id);
    return mongoose.connection.transaction(async session => {
      const tournament = await Tournament.findById(id).session(session);
      if (!tournament) throw paymentError("Không tìm thấy giải đấu", 404);
      const ranked = await this.ranking(tournament, session);
      const intent = ranked.intents.find(i => String(i.user) === userId);
      if (!intent) {
        const legacy = ranked.legacy.some((p: any) => String(p.user) === userId);
        return { state: legacy ? "confirmed" : "not_started", status: legacy ? "confirmed" : "not_started", zaloUrl: refundContact(), revision: tournament.paymentRevision || 0 };
      }
      const index = ranked.candidates.findIndex(c => String(c.intent._id) === String(intent._id));
      const ownReceipts = ranked.receipts.filter(r => String(r.intent) === String(intent._id));
      const player = tournament.players.find((p: any) => String(p.user) === userId && confirmedPlayer(p, tournament.registrationFee));
      const settled = !!tournament.paymentFinalizedAt && !tournament.paymentReconciliationRequired;
      const state = intent.amount === 0 && player ? "confirmed" : tournament.paymentFinalizedAt && tournament.paymentReconciliationRequired ? "reconciliation_required" : index >= 0 ? settled ? player ? "confirmed" : "refund_required" : "paid_pending" : ownReceipts.length ? "refund_required" : "awaiting_payment";
      if (intent.status !== state) {
        await Intent.updateOne({ _id: intent._id }, { $set: { status: state } }).session(session);
      }
      const qr = new URL("https://vietqr.app/img");
      for (const [key, value] of Object.entries({ acc: intent.accountNumber, bank: intent.bankCode, amount: String(intent.amount), des: intent.reference, template: "compact" })) qr.searchParams.set(key, value || "");
      return { state, status: state, reference: intent.reference, amount: intent.amount, createdAt: intent.createdAt, deadline: intent.deadline, bankCode: intent.bankCode, accountNumber: intent.accountNumber, accountName: intent.accountName, qrUrl: state === "awaiting_payment" && tournament.status === TournamentStatus.REGISTRATION_OPEN && new Date(intent.deadline).getTime() > Date.now() ? qr.toString() : null, rank: index >= 0 ? index + 1 : null, provisionalSeat: index >= 0 && index < ranked.capacity, receipts: ownReceipts.map(r => ({ providerId: r.providerId, amount: r.amount, bankPaidAt: r.bankPaidAt })), zaloUrl: refundContact(), extraPayment: ownReceipts.length > (index >= 0 ? 1 : 0), revision: tournament.paymentRevision || 0 };
    });
  }

  async snapshot(id: string) {
    this.validId(id);
    return mongoose.connection.transaction(async session => {
      const tournament = await Tournament.findById(id).session(session);
      if (!tournament) throw paymentError("Không tìm thấy giải đấu", 404);
      const ranked = await this.ranking(tournament, session);
      return { revision: tournament.paymentRevision || 0, finalizedAt: tournament.paymentFinalizedAt || null, reconciliationRequired: !!tournament.paymentReconciliationRequired, deadline: tournament.registrationDeadline, status: tournament.status, acknowledgedAt: tournament.paymentAcknowledgedAt || null, capacity: ranked.capacity, zaloUrl: refundContact(), candidates: ranked.candidates.map((c, index) => ({ userId: String(c.intent.user), name: c.intent.name, reference: c.intent.reference, amount: c.receipt.amount, createdAt: c.intent.createdAt, status: c.intent.status || (index < ranked.capacity ? "paid_pending" : "refund_required"), bankPaidAt: c.receipt.bankPaidAt, providerId: c.receipt.providerId, rank: index + 1, provisionalSeat: index < ranked.capacity })), receipts: ranked.receipts.map(r => ({ providerId: r.providerId, reference: r.reference, amount: r.amount, bankPaidAt: r.bankPaidAt })) };
    });
  }

  async acknowledge(id: string, revision: unknown, reconciled: unknown, staffId: string) {
    this.validId(id);
    if (reconciled !== true || !Number.isSafeInteger(revision)) throw paymentError("Cần xác nhận đã đối soát snapshot hiện hành");
    const result = await Tournament.updateOne({
      _id: id, paymentRevision: revision, paymentReconciliationRequired: true,
      paymentFinalizedAt: { $ne: null },
      status: { $in: [TournamentStatus.BRACKET_GENERATED, TournamentStatus.IN_PROGRESS, TournamentStatus.COMPLETED] },
    }, {
      $set: { paymentReconciliationRequired: false, paymentAcknowledgedAt: new Date(), paymentAcknowledgedBy: staffId },
      $inc: { paymentRevision: 1, __v: 1 },
    });
    if (result.modifiedCount !== 1) throw paymentError("Trạng thái hoặc snapshot đã thay đổi; tải và đối soát lại. Thao tác này chỉ dùng sau khi giải đã vận hành", 409);
    return this.snapshot(id);
  }

  async finalize(id: string, revision: unknown, reconciled: unknown) {
    this.validId(id);
    if (reconciled !== true || !Number.isSafeInteger(revision)) throw paymentError("Cần xác nhận đã đối soát sao kê/SePay và tải danh sách hiện hành");
    await mongoose.connection.transaction(async session => {
      const tournament = await Tournament.findById(id).session(session);
      if (!tournament) throw paymentError("Không tìm thấy giải đấu", 404);
      if (tournament.registrationDeadline.getTime() > Date.now()) throw paymentError("Chỉ chốt danh sách sau hạn đăng ký", 409);
      if (![TournamentStatus.REGISTRATION_OPEN, TournamentStatus.REGISTRATION_CLOSED].includes(tournament.status)) throw paymentError("Không thể chốt lại khi giải đã chuyển sang vận hành; cần nhân viên xử lý sai lệch", 409);
      if ((tournament.paymentRevision || 0) !== revision) throw paymentError("Danh sách thanh toán đã thay đổi. Vui lòng tải và đối soát lại", 409);
      const ranked = await this.ranking(tournament, session);
      const winners = ranked.candidates.slice(0, ranked.capacity);
      tournament.players = tournament.players.filter((p: any) => !p.paymentReference);
      for (const { intent } of winners) {
        const player = { user: intent.user, name: intent.name, avatar: intent.avatar, phone: intent.phone, feePaid: true, paymentMethod: "bank_transfer", registrationStatus: "confirmed", paymentReference: intent.reference, registeredAt: intent.createdAt };
        const old = tournament.players.find((p: any) => String(p.user) === String(intent.user));
        if (old) Object.assign(old, player); else tournament.players.push(player);
      }
      const winnerIds = winners.map(({ intent }) => intent._id);
      const remainingCandidateIds = ranked.candidates.slice(ranked.capacity).map(({ intent }) => intent._id);
      if (winnerIds.length) {
        await Intent.updateMany({ _id: { $in: winnerIds } }, { $set: { status: "confirmed" } }, { session });
      }
      if (remainingCandidateIds.length) {
        await Intent.updateMany({ _id: { $in: remainingCandidateIds } }, { $set: { status: "refund_required" } }, { session });
      }
      tournament.paymentFinalizedAt = new Date();
      tournament.paymentReconciliationRequired = false;
      tournament.paymentRevision = (tournament.paymentRevision || 0) + 1;
      tournament.status = TournamentStatus.REGISTRATION_CLOSED;
      await tournament.save({ session });
    });
    return this.snapshot(id);
  }
}
