const assert = require("node:assert/strict");
const {
  getStandardSeedOrder,
  getRoundName,
  shufflePlayers,
  isDueForAutoBracket,
} = require("../dist/modules/tournament/bracket.service");

assert.deepEqual(getStandardSeedOrder(4), [1, 4, 2, 3]);
assert.deepEqual(getStandardSeedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
assert.deepEqual(getStandardSeedOrder(16), [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]);

// Hạt giống 1 và 2 ở hai nửa đối diện: chỉ gặp nhau ở Chung kết.
for (const size of [4, 8, 16, 32, 64]) {
  const order = getStandardSeedOrder(size);
  assert.equal(order.length, size);
  assert.equal(new Set(order).size, size);
  assert.ok(order.indexOf(1) < size / 2 && order.indexOf(2) >= size / 2, `size ${size}`);
}

assert.deepEqual([1, 2, 3].map((r) => getRoundName(r, 3)), ["Tứ kết", "Bán kết", "Chung kết"]);
assert.deepEqual([1, 2, 3, 4].map((r) => getRoundName(r, 4)), ["Vòng 1/8", "Tứ kết", "Bán kết", "Chung kết"]);
assert.equal(getRoundName(1, 6), "Vòng 1");

// Xáo trộn: hoán vị đầy đủ, không đổi mảng gốc, tất định với RNG cố định.
const players = Array.from({ length: 9 }, (_, i) => i + 1);
const copy = [...players];
const lcg = (seed) => () => { // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const shuffled = shufflePlayers(players, lcg(42));
assert.deepEqual(players, copy);
assert.deepEqual([...shuffled].sort((a, b) => a - b), copy);
assert.deepEqual(shuffled, shufflePlayers(players, lcg(42)));
assert.notDeepEqual(shuffled, copy);
assert.deepEqual(shufflePlayers([], lcg(1)), []);
assert.deepEqual(shufflePlayers([7], lcg(1)), [7]);
// Mọi vị trí đều có thể xuất hiện (không thiên vị cố định): thử nhiều seed RNG.
const firstCounts = new Map();
for (let s = 1; s <= 900; s++) {
  const first = shufflePlayers(players, lcg(s))[0];
  firstCounts.set(first, (firstCounts.get(first) || 0) + 1);
}
assert.equal(firstCounts.size, 9);
for (const count of firstCounts.values()) assert.ok(count > 50 && count < 150, `lệch phân phối: ${count}`);

// Điều kiện tự sinh nhánh.
const now = new Date("2026-11-13T12:00:00Z");
const past = new Date("2026-11-13T11:00:00Z");
const future = new Date("2026-11-13T13:00:00Z");
const base = { status: "registration_open", registrationDeadline: past, format: "Single Elimination", registrationFee: 0 };
assert.equal(isDueForAutoBracket(base, now), true);
assert.equal(isDueForAutoBracket({ ...base, status: "registration_closed" }, now), true);
assert.equal(isDueForAutoBracket({ ...base, registrationDeadline: now }, now), true);
assert.equal(isDueForAutoBracket({ ...base, registrationDeadline: future }, now), false);
for (const status of ["draft", "bracket_generated", "in_progress", "completed", "cancelled"]) {
  assert.equal(isDueForAutoBracket({ ...base, status }, now), false, status);
}
assert.equal(isDueForAutoBracket({ ...base, format: "Round Robin" }, now), false);
const paid = { ...base, registrationFee: 100000 };
assert.equal(isDueForAutoBracket(paid, now), false);
assert.equal(isDueForAutoBracket({ ...paid, paymentFinalizedAt: past }, now), true);
assert.equal(isDueForAutoBracket({ ...paid, paymentFinalizedAt: past, paymentReconciliationRequired: true }, now), false);

console.log("check-bracket: OK");
