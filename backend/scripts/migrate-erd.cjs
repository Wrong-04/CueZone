// Chạy sau build. Mặc định chỉ xem kế hoạch; --apply yêu cầu dừng các tiến trình ghi.
const path = require('node:path');
const fs = require('node:fs/promises');
const { createHash } = require('node:crypto');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const VERSION = '001_erd_mongodb';
const RENAMES = {
  tables: 'pool_tables', pricingtiers: 'pricing_types', tablesessions: 'table_sessions',
  importreceipts: 'goods_receipts', inventorytransactions: 'inventory_transactions',
  wallettransactions: 'wallet_transactions', auditlogs: 'audit_logs',
  emailverifications: 'email_verifications', passwordresetotps: 'password_reset_otps',
};
const { EJSON } = mongoose.mongo.BSON;
const stableId = (value) => new mongoose.Types.ObjectId(createHash('sha256').update(`${VERSION}:${value}`).digest('hex').slice(0, 24));
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

async function loadModels() {
  // Chỉ nạp model, không nạp server, cron hay seed.
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith('.model.js')) require(file);
    }
  }
  await walk(path.resolve(__dirname, '../dist/modules'));
}

async function snapshot(db, dir) {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const manifest = { database: db.databaseName, version: VERSION, createdAt: new Date(), collections: [] };
  for (const [i, info] of (await db.listCollections().toArray()).entries()) {
    if (info.type !== 'collection' || info.name.startsWith('system.')) continue;
    const file = `${i}.ejsonl`;
    const handle = await fs.open(path.join(dir, file), 'wx', 0o600);
    let count = 0;
    const hash = createHash('sha256');
    try {
      for await (const doc of db.collection(info.name).find({})) {
        const line = EJSON.stringify(doc, { relaxed: false }) + '\n';
        hash.update(line);
        await handle.writeFile(line);
        count++;
      }
      await handle.sync();
    } finally { await handle.close(); }
    const sha256 = hash.digest('hex');
    if (createHash('sha256').update(await fs.readFile(path.join(dir, file))).digest('hex') !== sha256) throw new Error('Sao lưu không khớp checksum');
    if (count !== await db.collection(info.name).countDocuments()) throw new Error('Dữ liệu thay đổi khi sao lưu; cần dừng ứng dụng');
    manifest.collections.push({ name: info.name, file, count, sha256, options: info.options, indexes: await db.collection(info.name).indexes() });
  }
  await fs.writeFile(path.join(dir, 'manifest.ejson'), EJSON.stringify(manifest, { relaxed: false }), { mode: 0o600, flag: 'wx' });
  return manifest;
}

async function plan(db) {
  const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  const renames = Object.entries(RENAMES).filter(([old]) => names.has(old));
  for (const [old, target] of renames) {
    if (names.has(target)) throw new Error(`Có đồng thời ${old} và ${target}; không tự gộp/xóa dữ liệu`);
  }
  const source = (name) => Object.entries(RENAMES).find(([old, target]) => target === name && names.has(old))?.[0] || name;
  const read = (name) => db.collection(source(name)).find({}).toArray();
  const tournaments = await read('tournaments');
  const matches = await read('matches');
  const updates = [];
  const warnings = [];
  const queue = (collection, doc, fields) => {
    const changed = Object.fromEntries(Object.entries(fields).filter(([key, value]) => EJSON.stringify(doc[key]) !== EJSON.stringify(value)));
    if (Object.keys(changed).length) updates.push({ collection, id: doc._id, fields: changed });
  };

  for (const tournament of tournaments) {
    const players = (tournament.players || []).map(p => ({
      ...p, _id: p._id || stableId(`registration:${tournament._id}:${p.user || p.player}`),
      user: p.user || p.player,
      registrationStatus: p.registrationStatus || 'confirmed',
    }));
    if (players.some(p => !p.user) || new Set(players.map(p => String(p.user))).size !== players.length) throw new Error('Đăng ký giải đấu thiếu tài khoản hoặc bị trùng');
    const localMatches = matches.filter(m => sameId(m.tournament, tournament._id));
    const rounds = [...(tournament.rounds || [])];
    for (const roundNo of [...new Set(localMatches.map(m => m.round))].sort((a, b) => a - b)) {
      if (!rounds.some(r => r.roundNo === roundNo)) {
        if (tournament.format !== 'Single Elimination') throw new Error('Chưa có quy tắc chuyển vòng đấu cho thể thức này');
        rounds.push({ _id: stableId(`round:${tournament._id}:${roundNo}`), roundNo, stage: 'knockout', raceTo: tournament.raceToScore });
      }
    }
    const prizes = tournament.prizes || ['firstPrize', 'secondPrize', 'thirdPrize'].flatMap((key, i) =>
      tournament[key] ? [{ rank: i + 1, reward: tournament[key] }] : []);
    const fields = { players, rounds, groups: tournament.groups || [], prizes };
    await new mongoose.models.Tournament({ ...tournament, ...fields }).validate();
    queue('tournaments', tournament, fields);
    if (!tournament.gameType) warnings.push('Giải đấu chưa khai báo gameType; không suy đoán từ tên');
    if (tournament.prizePool && tournament.prizePoolAmount == null) warnings.push('Giải thưởng dạng mô tả được giữ nguyên; chưa có số tiền chuẩn hóa');

    for (const match of localMatches) {
      const registration = (user) => players.find(p => sameId(p.user, user));
      const participants = match.participants || [1, 2].flatMap(slot => {
        const user = match[`player${slot}`];
        if (!user) return [];
        const player = registration(user);
        if (!player) throw new Error('Cơ thủ trong trận không thuộc danh sách đăng ký');
        return [{ registrationId: player._id, slot, score: match[`score${slot}`] ?? 0 }];
      });
      for (const participant of participants) if (!players.some(p => sameId(p._id, participant.registrationId))) throw new Error('Tham chiếu đăng ký trận đấu không hợp lệ');
      const round = rounds.find(r => r.roundNo === match.round);
      const fields = { participants, roundId: match.roundId || round?._id };
      if (match.winner && !match.winnerRegistrationId) {
        const winner = registration(match.winner);
        if (!winner) throw new Error('Người thắng không có đăng ký');
        fields.winnerRegistrationId = winner._id;
      }
      // Chỉ nối nhánh khi dữ liệu hiện có chứng minh người thắng đi vào đúng một trận kế tiếp.
      if (!match.nextMatchId && match.winner) {
        const next = localMatches.filter(m => m.round === match.round + 1 && [m.player1, m.player2].some(p => sameId(p, match.winner)));
        if (next.length === 1) {
          fields.nextMatchId = next[0]._id;
          fields.nextMatchSlot = sameId(next[0].player1, match.winner) ? 1 : 2;
        }
      }
      const nextId = fields.nextMatchId || match.nextMatchId;
      if (nextId) {
        const next = localMatches.find(m => sameId(m._id, nextId));
        if (!next || next.round <= match.round) throw new Error('Nhánh kế tiếp khác giải hoặc không tiến tới vòng sau');
        if (!match.nextMatchSlot && !fields.nextMatchSlot && match.winner) {
          if (sameId(next.player1, match.winner)) fields.nextMatchSlot = 1;
          else if (sameId(next.player2, match.winner)) fields.nextMatchSlot = 2;
        }
      }
      await new mongoose.models.Match({ ...match, ...fields }).validate();
      queue('matches', match, fields);
      if (!match.referee) warnings.push('Trận đấu lịch sử thiếu trọng tài');
    }
  }
  if (matches.some(m => !tournaments.some(t => sameId(t._id, m.tournament)))) throw new Error('Trận đấu tham chiếu giải không tồn tại');
  // Kiểm tra cả dữ liệu lịch sử; không tự sửa số tiền hoặc tự nhận là đã thanh toán.
  for (const [collection, model] of [['orders', 'Order'], ['goods_receipts', 'GoodsReceipt'], ['vouchers', 'Voucher'], ['table_sessions', 'TableSession']]) {
    for (const doc of await read(collection)) await new mongoose.models[model](doc).validate();
  }
  // MongoDB không có FK: kiểm tra tham chiếu trước khi ghi, không tự tạo document đích.
  const references = {
    tournaments: { createdBy: 'users' },
    matches: { tournament: 'tournaments', table: 'pool_tables', referee: 'users' },
    orders: { customer: 'users', table: 'pool_tables', session: 'table_sessions', transactionId: 'transactions' },
    table_sessions: { table: 'pool_tables', customer: 'users', openedBy: 'users', closedBy: 'users', voucher: 'vouchers', order: 'orders' },
    goods_receipts: { supplier: 'suppliers', createdBy: 'users' },
    bookings: { table: 'pool_tables', customer: 'users', staff: 'users' },
    pool_tables: { pricingTier: 'pricing_types' },
    news: { author: 'users' },
  };
  const ids = new Map();
  for (const target of new Set(Object.values(references).flatMap(fields => Object.values(fields)))) {
    ids.set(target, new Set((await read(target)).map(doc => String(doc._id))));
  }
  for (const [collection, fields] of Object.entries(references)) {
    for (const doc of await read(collection)) {
      for (const [field, target] of Object.entries(fields)) {
        if (doc[field] != null && !ids.get(target).has(String(doc[field]))) throw new Error(`Tham chiếu không tồn tại: ${collection}.${field} -> ${target}`);
      }
      if (collection === 'tournaments') {
        for (const player of doc.players || []) {
          if (!ids.get('users').has(String(player.user || player.player))) throw new Error('Đăng ký giải đấu tham chiếu tài khoản không tồn tại');
          if (player.transactionId && !ids.get('transactions').has(String(player.transactionId))) throw new Error('Lệ phí tham chiếu giao dịch không tồn tại');
        }
      }
      if (['orders', 'goods_receipts', 'table_sessions'].includes(collection)) {
        const products = new Set((await read('products')).map(p => String(p._id)));
        for (const item of doc.items || []) if (!products.has(String(item.product))) throw new Error(`Sản phẩm không tồn tại: ${collection}.items`);
      }
    }
  }
  const news = await read('news');
  if (news.some(n => !n.author)) warnings.push('Bài viết lịch sử thiếu tác giả');
  warnings.push('Không tạo ván đấu, thanh toán, kết quả hoặc thời điểm không có chứng từ nguồn');
  return { renames, updates, warnings: [...new Set(warnings)] };
}

async function validators(db) {
  const objectId = { bsonType: 'objectId' };
  const number = { bsonType: ['int', 'long', 'double', 'decimal'], minimum: 0 };
  // Chặn ghi sai kiểu ở MongoDB, kể cả khi bỏ qua Mongoose. Không ép trường chưa biết của lịch sử.
  const definitions = {
    transactions: {
      required: ['amount', 'paymentMethod', 'status', 'idempotencyKey'],
      properties: { amount: number, paymentMethod: { enum: ['cash', 'wallet', 'bank_transfer', 'transfer', 'vnpay', 'card', 'mixed'] }, status: { enum: ['pending', 'completed', 'failed', 'refunded'] }, idempotencyKey: { bsonType: 'string' } },
    },
    match_frames: {
      required: ['match', 'frameNo'],
      properties: { match: objectId, frameNo: { ...number, minimum: 1, multipleOf: 1 }, winnerRegistrationId: objectId, highestBreak: number, durationSec: number },
    },
    matches: {
      required: ['tournament', 'roundId', 'round', 'matchNumber', 'participants'],
      properties: { tournament: objectId, roundId: objectId, winnerRegistrationId: objectId, nextMatchId: objectId, nextMatchSlot: { enum: [1, 2] }, participants: { bsonType: 'array', maxItems: 2, items: { bsonType: 'object', required: ['registrationId', 'slot', 'score'], properties: { registrationId: objectId, slot: { enum: [1, 2] }, score: { ...number, multipleOf: 1 } } } } },
    },
  };
  for (const [collection, definition] of Object.entries(definitions)) {
    const validator = { $jsonSchema: { bsonType: 'object', ...definition } };
    if (await db.collection(collection).countDocuments({ $nor: [validator] })) throw new Error(`Dữ liệu không đạt validator: ${collection}`);
    const info = await db.listCollections({ name: collection }).next();
    if (info.options?.validator && EJSON.stringify(info.options.validator) !== EJSON.stringify(validator)) throw new Error(`Đã có validator riêng: ${collection}; không ghi đè`);
    await db.command({ collMod: collection, validator, validationLevel: 'strict', validationAction: 'error' });
  }
}

async function indexes(db) {
  // Chỉ thêm index; không syncIndexes vì sẽ xóa index ngoài schema của dữ liệu lịch sử.
  for (const model of Object.values(mongoose.models)) await model.createIndexes();
  // Index seed cũ không partial sẽ chặn hóa đơn POS thứ hai (cả hai thiếu invoiceNumber).
  const invoices = db.collection('invoices');
  const old = (await invoices.indexes()).find(i => i.name === 'invoiceNumber_1');
  if (old && !old.partialFilterExpression) {
    await invoices.createIndex({ invoiceNumber: 1 }, { name: 'invoiceNumber_1_v2', unique: true, partialFilterExpression: { invoiceNumber: { $type: 'string' } } });
    await invoices.dropIndex(old.name);
  }
}

async function apply(db, migrationPlan, backupDir) {
  const previous = await db.collection('schema_migrations').findOne({ _id: VERSION });
  if (previous) {
    if (migrationPlan.renames.length || migrationPlan.updates.length) throw new Error('Migration đã ghi nhận nhưng dữ liệu còn lệch; cần kiểm tra thủ công');
    return { alreadyApplied: true };
  }
  // Sao lưu toàn bộ BSON, indexes và options trước mọi DDL/ghi dữ liệu.
  const backup = await snapshot(db, backupDir);
  for (const [old, target] of migrationPlan.renames) await db.collection(old).rename(target, { dropTarget: false });
  for (const model of Object.values(mongoose.models)) {
    if (!(await db.listCollections({ name: model.collection.name }).hasNext())) await db.createCollection(model.collection.name);
  }
  // DDL không nằm trong transaction; nếu lỗi, giữ backup và cho phép chạy tiếp, không xóa nguồn.
  await indexes(db);
  await mongoose.connection.transaction(async session => {
    for (const update of migrationPlan.updates) {
      const result = await db.collection(update.collection).updateOne({ _id: update.id }, { $set: update.fields }, { session });
      if (result.matchedCount !== 1) throw new Error('Dữ liệu thay đổi trong khi migration');
    }
  });
  const verification = await plan(db);
  if (verification.renames.length || verification.updates.length) throw new Error('Kiểm tra idempotency thất bại');
  for (const collection of backup.collections) {
    const target = RENAMES[collection.name] || collection.name;
    if (await db.collection(target).countDocuments() !== collection.count) throw new Error(`Số bản ghi thay đổi: ${target}`);
  }
  await validators(db);
  await db.collection('schema_migrations').insertOne({ _id: VERSION, appliedAt: new Date(), backupDir, collections: backup.collections.map(c => ({ name: c.name, count: c.count, sha256: c.sha256 })) });
  return { alreadyApplied: false, backupDir };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(a => !['--apply', '--maintenance', '--dry-run'].includes(a))) throw new Error('Tham số không hợp lệ');
  const write = args.includes('--apply');
  if (write && !args.includes('--maintenance')) throw new Error('Dừng tất cả tiến trình ghi, sau đó chạy --apply --maintenance');
  if (!process.env.MONGO_URI) throw new Error('Thiếu MONGO_URI');
  mongoose.set('autoIndex', false);
  mongoose.set('autoCreate', false);
  await loadModels();
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;
    const migrationPlan = await plan(db);
    console.log(JSON.stringify({ database: db.databaseName, mode: write ? 'apply' : 'dry-run', renames: migrationPlan.renames, documentsToUpdate: migrationPlan.updates.length, warnings: migrationPlan.warnings }, null, 2));
    if (write) {
      const dir = path.resolve(__dirname, '../../.pi/backups', `${VERSION}-${Date.now()}`);
      console.log(JSON.stringify(await apply(db, migrationPlan, dir), null, 2));
    }
  } finally { await mongoose.disconnect(); }
}

module.exports = { VERSION, RENAMES, loadModels, snapshot, plan, apply };
if (require.main === module) main().catch(error => {
  // Không in document, tài khoản, URI hay lỗi validator chứa dữ liệu cá nhân.
  console.error('Migration thất bại:', error.name, error.code || '', error.name === 'Error' ? error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '<ẩn>') : 'Kiểm tra schema/index trong database thử nghiệm');
  process.exitCode = 1;
});
