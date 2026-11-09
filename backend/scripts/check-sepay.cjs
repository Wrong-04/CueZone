// Chạy từ backend; chỉ tạo/xóa database dùng một lần, không ghi vào database ứng dụng.
require('dotenv/config');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { App } = require('../dist/app');
const { User } = require('../dist/modules/user/user.model');
const { Tournament } = require('../dist/modules/tournament/tournament.model');
const { TournamentPaymentIntent: Intent, TournamentPaymentReceipt: Receipt } = require('../dist/modules/tournament/tournament-payment.model');
const { bankDate, comparePayments } = require('../dist/modules/tournament/sepay');

async function main() {
  const dbName = `cz_check_sepay_${randomUUID().slice(0, 12)}`;
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cuezone_db', { dbName, serverSelectionTimeoutMS: 5000 });
    await Promise.all([User.init(), Tournament.init(), Intent.init(), Receipt.init()]);
    assert.throws(() => bankDate('2026-02-30 10:00:00'));
    assert.ok(comparePayments({ bankPaidAt: new Date(0), providerId: '9' }, { bankPaidAt: new Date(0), providerId: '10' }) < 0);
    server = new App().app.listen(process.argv.includes('--ui') ? 5598 : 0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    async function request(path, method = 'GET', body, token, authorization) {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch { result = { success: false, message: `HTTP ${response.status}: non-JSON response` }; }
      return { status: response.status, ...result };
    }
    const users = [];
    for (let i = 0; i < 4; i++) {
      const email = `sepay${i}@check.invalid`;
      const user = await User.create({ name: `Kiểm tra ${i}`, email, password: 'CheckPassword123', role: i === 3 ? 'staff' : 'customer' });
      const login = await request('/auth/login', 'POST', { email, password: 'CheckPassword123' });
      assert.equal(login.success, true, login.message);
      users.push({ user, token: login.data.accessToken });
    }
    const now = Date.now();
    const tournament = await Tournament.create({ name: 'Kiểm tra ưu tiên SePay', startDate: new Date(now + 86400000 * 2), endDate: new Date(now + 86400000 * 3), registrationDeadline: new Date(now + 3600000), registrationFee: 200000, maxPlayers: 8, status: 'registration_open', players: [] });
    const path = `/tournaments/${tournament.id}`;
    if (process.argv.includes('--ui')) {
      console.log('UI_TEST_READY disposable database, API 5598');
      await new Promise(resolve => { process.once('SIGTERM', resolve); process.once('SIGINT', resolve); });
      return;
    }
    const unsupported = await request(`${path}/register`, 'POST', { paymentMethod: 'wallet' }, users[0].token);
    assert.equal(unsupported.status, 400, 'Web phải từ chối ví trước khi gọi nghiệp vụ trừ ví');
    assert.match(unsupported.message, /SePay/);
    console.log('PASS: web chỉ chấp nhận chuyển khoản SePay');
    const missing = await request(`${path}/register`, 'POST', { paymentMethod: 'bank_transfer' }, users[0].token);
    assert.equal(missing.status, 503);
    Object.assign(process.env, { SEPAY_WEBHOOK_KEY: randomUUID(), SEPAY_BANK_CODE: 'MB', SEPAY_ACCOUNT_NUMBER: '0000000000', SEPAY_ACCOUNT_NAME: 'TEST ONLY', SEPAY_ZALO_URL: 'https://zalo.me/0000000000' });
    const create = user => request(`${path}/register`, 'POST', { paymentMethod: 'bank_transfer' }, user.token);
    const [a, duplicateA] = await Promise.all([create(users[0]), create(users[0])]);
    assert.equal(a.success, true, a.message);
    assert.equal(duplicateA.success, true, duplicateA.message);
    assert.equal(a.data.reference, duplicateA.data.reference);
    const b = await create(users[1]);
    assert.equal(b.success, true, b.message);
    assert.equal(await Intent.countDocuments({ tournament: tournament.id }), 2);
    const intentA = await Intent.findOne({ reference: a.data.reference });
    assert.equal(intentA.status, "awaiting_payment");
    assert.ok(a.data.createdAt);
    assert.equal((await Intent.findById(intentA._id)).status, "awaiting_payment");
    assert.equal((await Tournament.findById(tournament.id)).players.length, 0);
    const legacy = Array.from({ length: 7 }, (_, i) => ({ user: new mongoose.Types.ObjectId(), name: `Legacy ${i}`, feePaid: true, registrationStatus: 'confirmed', registeredAt: new Date() }));
    legacy.push({ user: new mongoose.Types.ObjectId(), name: 'Pending cũ', feePaid: false, registrationStatus: 'pending', registeredAt: new Date() });
    await Tournament.updateOne({ _id: tournament.id }, { $set: { players: legacy } });
    const earlier = new Date(Math.floor(Date.now() / 1000) * 1000);
    const later = new Date(earlier.getTime() + 1000);
    const date = d => new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 19).replace('T', ' ');
    const payload = (id, reference, paidAt, amount = 200000) => ({ id, accountNumber: process.env.SEPAY_ACCOUNT_NUMBER, transferType: 'in', transferAmount: amount, transactionDate: date(paidAt), content: reference, code: reference, subAccount: '' });
    const hook = body => request('/public/sepay/webhook', 'POST', body, undefined, `Apikey ${process.env.SEPAY_WEBHOOK_KEY}`);
    const wrongKey = await request('/public/sepay/webhook', 'POST', payload(1, a.data.reference, earlier), undefined, 'Apikey wrong');
    assert.equal(wrongKey.status, 401);
    assert.equal((await hook({ ...payload(1, a.data.reference, earlier), accountNumber: 'WRONG' })).status, 400);
    assert.equal((await hook({ ...payload(1, a.data.reference, earlier), transferAmount: 1.5 })).status, 400);
    assert.equal((await hook(payload(20, b.data.reference, later))).success, true);
    assert.equal((await hook(payload(10, a.data.reference, earlier))).success, true);
    const duplicates = await Promise.all([hook(payload(10, a.data.reference, earlier)), hook(payload(10, a.data.reference, earlier))]);
    assert.ok(duplicates.every(r => r.success));
    assert.equal(await Receipt.countDocuments(), 2);
    assert.equal((await Intent.findOne({ reference: a.data.reference })).status, "paid_pending");
    const statusA = await request(`${path}/payment`, 'GET', undefined, users[0].token);
    const statusB = await request(`${path}/payment`, 'GET', undefined, users[1].token);
    assert.equal(statusA.data.rank, 1);
    assert.equal(statusA.data.provisionalSeat, true);
    assert.equal(statusB.data.rank, 2);
    assert.equal(statusB.data.provisionalSeat, false);
    assert.equal(statusA.data.state, 'paid_pending');
    const outsider = await request(`${path}/payment`, 'GET', undefined, users[2].token);
    assert.equal(outsider.data.state, 'not_started');
    assert.ok(!outsider.data.receipts);
    assert.equal((await request(`${path}/payments`, 'GET', undefined, users[0].token)).status, 403);
    const staff = users[3].token;
    let snapshot = await request(`${path}/payments`, 'GET', undefined, staff);
    assert.equal(snapshot.data.capacity, 1);
    assert.equal(snapshot.data.candidates[0].name, users[0].user.name);
    assert.equal((await request(`${path}/payments/finalize`, 'POST', { revision: snapshot.data.revision, reconciled: true }, staff)).status, 409);
    const deadline = new Date(later.getTime() + 1000);
    await Tournament.updateOne({ _id: tournament.id }, { $set: { registrationDeadline: new Date(Date.now() - 1) } });
    const stale = snapshot.data.revision;
    assert.equal((await hook(payload(30, b.data.reference, later, 100000))).success, true);
    assert.equal((await request(`${path}/payments/finalize`, 'POST', { revision: stale, reconciled: true }, staff)).status, 409);
    snapshot = await request(`${path}/payments`, 'GET', undefined, staff);
    const final = await request(`${path}/payments/finalize`, 'POST', { revision: snapshot.data.revision, reconciled: true }, staff);
    assert.equal(final.success, true, final.message);
    let saved = await Tournament.findById(tournament.id);
    assert.equal(saved.players.filter(p => p.feePaid).length, 8);
    assert.equal(saved.players.some(p => p.name === 'Pending cũ'), true);
    assert.equal((await request(`${path}/payment`, 'GET', undefined, users[0].token)).data.state, 'confirmed');
    assert.equal((await request(`${path}/payment`, 'GET', undefined, users[1].token)).data.state, 'refund_required');
    const c = await Intent.create({ tournament: tournament.id, user: users[2].user._id, name: users[2].user.name, reference: `CZ${'A'.repeat(24)}`, amount: 200000, accountNumber: process.env.SEPAY_ACCOUNT_NUMBER, bankCode: 'MB', accountName: 'TEST ONLY', deadline, createdAt: new Date(earlier.getTime() - 10000) });
    assert.equal((await hook(payload(5, c.reference, new Date(earlier.getTime() - 1000)))).success, true);
    assert.equal((await request(`${path}/payment`, 'GET', undefined, users[0].token)).data.state, 'reconciliation_required');
    assert.equal((await request(`${path}/status`, 'PATCH', { status: 'in_progress' }, staff)).status, 409);
    snapshot = await request(`${path}/payments`, 'GET', undefined, staff);
    assert.equal(snapshot.data.candidates[0].providerId, '5');
    assert.equal((await request(`${path}/payments/finalize`, 'POST', { revision: snapshot.data.revision, reconciled: true }, staff)).success, true);
    saved = await Tournament.findById(tournament.id);
    assert.equal(saved.players.filter(p => p.feePaid).length, 8);
    assert.ok(saved.players.some(p => String(p.user) === String(users[2].user._id)));
    const publicList = await request('/public/tournaments');
    const publicTournament = publicList.data.items.find(t => t._id === tournament.id);
    assert.equal(publicTournament.players.length, 8);
    assert.ok(publicTournament.players.every(p => !p.paymentReference && !p.paymentReceiptUrl && !p.phone));
    assert.equal((await hook(payload(10, a.data.reference, earlier, 1))).status, 409);
    console.log('PASS: intent idempotent; bank-time ordering; last slot; webhook dedupe/auth/account/amount; legacy; ownership; stale snapshot; finalize; late reconciliation; public privacy');
    const reviewFailures = [];
    const reviewCheck = (name, actual, expected) => {
      try { assert.equal(actual, expected, name); console.log(`PASS: ${name}`); }
      catch (error) { reviewFailures.push(error.message); }
    };
    for (let run = 0; run < 3; run++) {
      const concurrent = await Tournament.create({ name: `Concurrent ${run}`, startDate: new Date(now + 86400000 * 2), endDate: new Date(now + 86400000 * 3), registrationDeadline: new Date(now + 3600000), registrationFee: 200000, maxPlayers: 8, status: 'registration_open' });
      const results = await Promise.all(users.slice(0, 3).map(user => request(`/tournaments/${concurrent.id}/register`, 'POST', { paymentMethod: 'bank_transfer' }, user.token)));
      reviewCheck(`SEPAY-REV-002 concurrent distinct users run ${run}`, results.filter(r => r.success).length, 3);
    }
    const skew = await Tournament.create({ name: 'Bank clock skew', startDate: new Date(now + 86400000 * 2), endDate: new Date(now + 86400000 * 3), registrationDeadline: new Date(now + 3600000), registrationFee: 200000, maxPlayers: 8, status: 'registration_open' });
    const skewIntent = await request(`/tournaments/${skew.id}/register`, 'POST', { paymentMethod: 'bank_transfer' }, users[0].token);
    assert.equal(skewIntent.success, true, skewIntent.message);
    const skewPaidAt = new Date();
    await Intent.updateOne({ reference: skewIntent.data.reference }, { $set: { createdAt: new Date(skewPaidAt.getTime() + 2000) } }, { timestamps: false });
    await hook(payload(100, skewIntent.data.reference, skewPaidAt));
    reviewCheck('SEPAY-REV-003 bank clock behind server', (await request(`/tournaments/${skew.id}/payment`, 'GET', undefined, users[0].token)).data.state, 'paid_pending');
    await hook({ ...payload(101, skewIntent.data.reference, new Date()), code: null, content: `IBFT_${skewIntent.data.reference}_TRANSFER` });
    reviewCheck('SEPAY-REV-009 underscore reference match', String((await Receipt.findOne({ providerId: '101' })).intent), String((await Intent.findOne({ tournament: skew.id }))._id));
    const key = process.env.SEPAY_WEBHOOK_KEY;
    delete process.env.SEPAY_WEBHOOK_KEY;
    const free = await Tournament.create({ name: 'Free tournament', startDate: new Date(now + 86400000 * 2), endDate: new Date(now + 86400000 * 3), registrationDeadline: new Date(now + 3600000), registrationFee: 0, maxPlayers: 8, status: 'registration_open' });
    const freeIntent = await request(`/tournaments/${free.id}/register`, 'POST', { paymentMethod: 'bank_transfer' }, users[0].token);
    assert.equal(freeIntent.success, true, freeIntent.message);
    assert.equal(freeIntent.data.state, 'confirmed');
    assert.equal(freeIntent.data.qrUrl, null);
    assert.ok(freeIntent.data.createdAt);
    assert.equal((await Intent.findOne({ reference: freeIntent.data.reference })).status, "confirmed");
    await Tournament.updateOne({ _id: free.id }, { $set: { registrationDeadline: new Date(Date.now() - 1) } });
    reviewCheck('SEPAY-REV-004 free tournament starts without bank attestation', (await request(`/tournaments/${free.id}/status`, 'PATCH', { status: 'in_progress' }, staff)).success, true);
    process.env.SEPAY_WEBHOOK_KEY = key;
    assert.equal((await request(`${path}/status`, 'PATCH', { status: 'in_progress' }, staff)).success, true);
    const rosterBefore = JSON.stringify((await Tournament.findById(tournament.id)).players);
    await hook(payload(200, a.data.reference, earlier, 100000));
    assert.equal((await request(`${path}/status`, 'PATCH', { status: 'completed' }, staff)).status, 409);
    snapshot = await request(`${path}/payments`, 'GET', undefined, staff);
    const acknowledge = await request(`${path}/payments/acknowledge`, 'POST', { revision: snapshot.data.revision, reconciled: true }, staff);
    reviewCheck('SEPAY-REV-001 staff can resolve late payment after start', acknowledge.success, true);
    reviewCheck('SEPAY-REV-001 acknowledge leaves playing roster untouched', JSON.stringify((await Tournament.findById(tournament.id)).players), rosterBefore);
    reviewCheck('SEPAY-REV-001 tournament can complete after acknowledgement', (await request(`${path}/status`, 'PATCH', { status: 'completed' }, staff)).success, true);
    assert.deepEqual(reviewFailures, [], reviewFailures.join('\n'));
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) {
      assert.match(mongoose.connection.name, /^cz_check_sepay_/);
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
