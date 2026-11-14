const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { Tournament, TournamentStatus } = require("../dist/modules/tournament/tournament.model");
const { TournamentTicketService } = require("../dist/modules/tournament/tournament-ticket.service");
const { TournamentPaymentService } = require("../dist/modules/tournament/tournament-payment.service");
const { TournamentPaymentIntent } = require("../dist/modules/tournament/tournament-payment.model");
const { User, UserRole } = require("../dist/modules/user/user.model");
const { Role } = require("../dist/modules/role/role.model");
const router = require("../dist/modules/tournament/tournament.routes").default;

async function main() {
  mongoose.set("bufferCommands", false);
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = require("node:crypto").randomBytes(32).toString("hex");
  const owner = new mongoose.Types.ObjectId();
  const staff = new mongoose.Types.ObjectId();
  const playerId = new mongoose.Types.ObjectId();
  const tournamentId = new mongoose.Types.ObjectId();
  let tournament = {
    _id: tournamentId, name: "Giải kiểm thử", startDate: new Date(), endDate: new Date(),
    status: TournamentStatus.REGISTRATION_CLOSED, registrationFee: 100000,
    format: "Single Elimination", raceToScore: 5, paymentReconciliationRequired: false,
    players: [
      { _id: new mongoose.Types.ObjectId(), user: new mongoose.Types.ObjectId(), name: "Cơ thủ khác", feePaid: true, registrationStatus: "confirmed" },
      { _id: playerId, user: owner, name: "Cơ thủ kiểm thử", phone: "0901234567", feePaid: true, registrationStatus: "confirmed" },
    ],
  };
  let writes = 0, lastFilter;
  const originalUserFind = User.findById;
  const originalRoleFind = Role.findOne;
  let currentRole = UserRole.CUSTOMER;
  User.findById = async () => ({ role: currentRole, isActive: true, isLocked: false });
  Role.findOne = () => ({ lean: async () => null });
  const originalFind = Tournament.findById;
  const originalUpdate = Tournament.findOneAndUpdate;
  Tournament.findById = async () => tournament;
  // Mô phỏng ràng buộc atomic trên cùng phần tử; không chứng minh concurrency MongoDB thật.
  Tournament.findOneAndUpdate = async (filter, update) => {
    lastFilter = filter;
    const match = filter.players.$elemMatch;
    const player = tournament.players.find((p) => String(p._id) === String(match._id));
    if (!player || player.checkedInAt || player.registrationStatus === "cancelled" || !player.feePaid) return null;
    writes++;
    player.checkedInAt = update.$set["players.$.checkedInAt"];
    player.checkedInBy = update.$set["players.$.checkedInBy"];
    return tournament;
  };
  try {
    for (const path of ["/:id/check-in/preview", "/:id/check-in"]) {
      const route = router.stack.find((layer) => layer.route?.path === path).route;
      assert(route.methods.post);
      assert.equal(route.stack.length, 2);
      for (const role of [UserRole.CUSTOMER, UserRole.WAREHOUSE, UserRole.STAFF, UserRole.ADMIN]) {
        currentRole = role;
        let passed = false, status;
        const response = { status(value) { status = value; return this; }, json() {} };
        await route.stack[0].handle({ user: { userId: String(staff) } }, response, () => { passed = true; });
        assert.equal(passed, role === UserRole.STAFF || role === UserRole.ADMIN);
        if (!passed) assert.equal(status, 403);
      }
    }
    const passRoute = router.stack.find((layer) => layer.route?.path === "/:id/epass").route;
    assert(passRoute.methods.get);
    for (const role of [UserRole.CUSTOMER, UserRole.ADMIN]) {
      currentRole = role;
      let passed = false;
      const response = { status() { return this; }, json() {} };
      await passRoute.stack[0].handle({ user: { userId: String(owner) } }, response, () => { passed = true; });
      assert.equal(passed, role === UserRole.CUSTOMER);
    }
    const service = new TournamentTicketService();
    const pass = await service.getMyPass(String(tournamentId), String(owner));
    assert(pass.ticket.startsWith("CZT1."));
    assert.equal(pass.athleteName, "Cơ thủ kiểm thử");
    assert.equal(pass.athletePhone, "0901234567");
    const preview = await service.preview(String(tournamentId), pass.ticket);
    assert.equal(preview.checkedInAt, null);
    assert.equal(preview.athletePhone, "******4567");
    assert.equal(writes, 0);
    await assert.rejects(service.getMyPass(String(tournamentId), String(staff)), /đăng ký|vé/);
    await assert.rejects(service.preview(String(new mongoose.Types.ObjectId()), pass.ticket), /giải/);
    await assert.rejects(service.preview(String(tournamentId), pass.ticket.replace(/.$/, "!")), /vé/);
    await assert.rejects(service.preview(String(tournamentId), JSON.stringify({ type: "TOURNAMENT_CHECKIN", tId: String(tournamentId) })), /vé/);
    const parts = pass.ticket.split(".");
    parts[2] = String(tournament.players[0]._id);
    await assert.rejects(service.preview(String(tournamentId), parts.join(".")), /vé/);

    // Mất hiệu lực sau preview phải bị chặn ở confirm.
    const player = tournament.players[1];
    player.registrationStatus = "cancelled";
    await assert.rejects(service.checkIn(String(tournamentId), pass.ticket, String(staff)), /hợp lệ|hủy/);
    assert.equal(writes, 0);
    player.registrationStatus = "confirmed";
    tournament.paymentReconciliationRequired = true;
    await assert.rejects(service.checkIn(String(tournamentId), pass.ticket, String(staff)), /đối soát/);
    tournament.paymentReconciliationRequired = false;
    tournament.status = TournamentStatus.COMPLETED;
    await assert.rejects(service.checkIn(String(tournamentId), pass.ticket, String(staff)), /điểm danh/);
    tournament.status = TournamentStatus.REGISTRATION_CLOSED;

    const first = await service.checkIn(String(tournamentId), pass.ticket, String(staff));
    const second = await service.checkIn(String(tournamentId), pass.ticket, String(owner));
    assert.equal(first.alreadyCheckedIn, false);
    assert.equal(second.alreadyCheckedIn, true);
    assert.equal(writes, 1);
    assert.equal(String(player.checkedInBy), String(staff));
    assert(!tournament.players[0].checkedInAt);
    assert.equal(String(lastFilter.players.$elemMatch._id), String(playerId));
    assert.equal(lastFilter.players.$elemMatch.checkedInAt, null);
    assert.equal(lastFilter.players.$elemMatch.registrationStatus.$ne, "cancelled");
    assert.equal(lastFilter.registrationFee, 100000);
    assert.equal(lastFilter.paymentReconciliationRequired.$ne, true);
    assert(lastFilter.status.$nin.includes(TournamentStatus.COMPLETED));

    // Yêu cầu đồng thời chỉ ghi một lần trong mô hình; kiểm tra DB thật còn chờ quyền.
    delete player.checkedInAt; delete player.checkedInBy; writes = 0;
    const concurrent = await Promise.all([
      service.checkIn(String(tournamentId), pass.ticket, String(staff)),
      service.checkIn(String(tournamentId), pass.ticket, String(owner)),
    ]);
    assert.equal(writes, 1);
    assert.equal(concurrent.filter((r) => !r.alreadyCheckedIn).length, 1);

    // Giải miễn phí dùng cùng predicate confirmedPlayer, không bắt buộc feePaid.
    tournament.registrationFee = 0; player.feePaid = false;
    assert(await service.preview(String(tournamentId), pass.ticket));
    player.registrationStatus = "pending";
    await assert.rejects(service.preview(String(tournamentId), pass.ticket), /hợp lệ/);
    player.registrationStatus = "confirmed";
    const transaction = mongoose.connection.transaction;
    const updateIntents = TournamentPaymentIntent.updateMany;
    try {
      mongoose.connection.transaction = async (callback) => callback({});
      TournamentPaymentIntent.updateMany = async () => ({});
      Tournament.findById = () => ({ session: async () => tournament });
      tournament.registrationFee = 100000;
      tournament.registrationDeadline = new Date(Date.now() - 1000);
      tournament.paymentRevision = 1;
      tournament.save = async () => tournament;
      player.feePaid = true;
      player.paymentReference = "test-reference";
      const checkedAt = player.checkedInAt;
      const payments = new TournamentPaymentService();
      payments.ranking = async () => ({ capacity: 1, candidates: [{ intent: {
        _id: new mongoose.Types.ObjectId(), user: owner, name: player.name,
        phone: player.phone, reference: player.paymentReference, createdAt: new Date(),
      } }] });
      payments.snapshot = async () => ({});
      await payments.finalize(String(tournamentId), 1, true);
      const retained = tournament.players.find((item) => String(item.user) === String(owner));
      assert.equal(String(retained._id), String(playerId));
      assert.equal(retained.checkedInAt, checkedAt);
      assert.equal(String(retained.checkedInBy), String(player.checkedInBy));
    } finally {
      mongoose.connection.transaction = transaction;
      TournamentPaymentIntent.updateMany = updateIntents;
      Tournament.findById = async () => tournament;
    }
    delete process.env.JWT_SECRET;
    await assert.rejects(service.getMyPass(String(tournamentId), String(owner)), /cấu hình|Cấu hình/);
    console.log("check-tournament-checkin: OK (vé ký, sai giải, vé giả, hủy sau preview, lặp, atomic filter; không kết nối DB)");
  } finally {
    User.findById = originalUserFind;
    Role.findOne = originalRoleFind;
    Tournament.findById = originalFind;
    Tournament.findOneAndUpdate = originalUpdate;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
