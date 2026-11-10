const assert = require("node:assert/strict");
const { validateTournamentData } = require("../dist/modules/tournament/dto/tournament.dto");
const { Tournament, TournamentStatus } = require("../dist/modules/tournament/tournament.model");
const { TournamentService } = require("../dist/modules/tournament/tournament.service");

// Kiểm tra trong bộ nhớ, không kết nối hoặc ghi MongoDB.
async function main() {
  const data = {
    name: "Kiểm tra giải đấu",
    startDate: "2030-01-10T08:00:00Z",
    endDate: "2030-01-11T08:00:00Z",
    registrationDeadline: "2030-01-09T08:00:00Z",
    maxPlayers: 8,
    firstPrize: "10.000.000đ + Cúp Vàng",
    secondPrize: "5,000,000 VNĐ + Cờ lưu niệm",
    thirdPrize: "2.500.000đ x 2",
  };
  assert.equal(validateTournamentData(data).isValid, true);
  for (const prizes of [
    { secondPrize: "11000000" },
    { thirdPrize: "6000000" },
    { secondPrize: "", thirdPrize: "11000000" },
    { firstPrize: "-1000000" },
    { firstPrize: "1.5 triệu" },
    { firstPrize: "9007199254740992" },
    { firstPrize: 10000000 },
    { firstPrize: null },
  ]) {
    assert.equal(validateTournamentData({ ...data, ...prizes }).isValid, false, JSON.stringify(prizes));
  }
  assert.equal(validateTournamentData({ ...data, firstPrize: "0", secondPrize: "0", thirdPrize: "0" }).isValid, true);
  assert.equal(validateTournamentData({ ...data, firstPrize: "Cúp Vàng", secondPrize: "Cờ lưu niệm", thirdPrize: "Huy chương" }).isValid, true);
  assert.equal(validateTournamentData({ ...data, firstPrize: "", secondPrize: "", thirdPrize: "" }).isValid, true);

  const service = new TournamentService();
  await assert.rejects(service.createTournament({ ...data, thirdPrize: "20000000" }), error => error.httpCode === 400 && /Tiền giải/.test(error.message));
  const originalFindById = Tournament.findById;
  const originalFind = Tournament.find;
  const originalCount = Tournament.countDocuments;
  try {
    let saved = false;
    Tournament.findById = async () => ({
      ...data,
      status: TournamentStatus.DRAFT,
      save: async function () { saved = true; return this; },
    });
    await assert.rejects(service.updateTournament("507f1f77bcf86cd799439011", { thirdPrize: "6000000" }), error => error.httpCode === 400);
    await assert.rejects(service.updateTournament("507f1f77bcf86cd799439011", { firstPrize: "1000000" }), error => error.httpCode === 400);
    assert.equal(saved, false);
    await service.updateTournament("507f1f77bcf86cd799439011", { thirdPrize: "1000000" });
    assert.equal(saved, true);

    let findFilter;
    let countFilter;
    const calls = {};
    Tournament.find = filter => {
      findFilter = filter;
      return {
        sort(value) { calls.sort = value; return this; },
        skip(value) { calls.skip = value; return this; },
        limit(value) { calls.limit = value; return this; },
        lean: async () => [],
      };
    };
    Tournament.countDocuments = async filter => { countFilter = filter; return 0; };
    const before = Date.now();
    const result = await service.getPublicTournaments({ page: 2, limit: 10 });
    assert.strictEqual(findFilter, countFilter);
    assert.deepEqual(findFilter.status, { $nin: [TournamentStatus.DRAFT, TournamentStatus.COMPLETED] });
    const now = findFilter.endDate.$gt;
    assert(now instanceof Date && now.getTime() >= before && now.getTime() <= Date.now());
    assert.deepEqual(findFilter.$or, [
      { status: { $ne: TournamentStatus.REGISTRATION_OPEN } },
      { registrationDeadline: { $gt: now } },
    ]);
    assert.deepEqual(calls, { sort: { startDate: 1, _id: 1 }, skip: 10, limit: 10 });
    assert.deepEqual(result.items, []);
  } finally {
    Tournament.findById = originalFindById;
    Tournament.find = originalFind;
    Tournament.countDocuments = originalCount;
  }
  console.log("Đạt: tiền thưởng, cập nhật từng trường, lọc giải hết hạn và thứ tự phân trang; không dùng DB.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
