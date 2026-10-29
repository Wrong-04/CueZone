// Kiểm tra trên bản sao dữ liệu thật trong database dùng một lần, không seed dữ liệu giả.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { RENAMES, loadModels, plan, apply } = require('./migrate-erd.cjs');
const { EJSON } = mongoose.mongo.BSON;

async function main() {
  const dbName = `cz_check_mig_${randomUUID().replaceAll('-', '').slice(0, 18)}`;
  const backupDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cz-migration-'));
  let source;
  try {
    assert.ok(process.env.MONGO_URI, 'Cần MONGO_URI để kiểm tra bằng dữ liệu thật');
    mongoose.set('autoIndex', false);
    mongoose.set('autoCreate', false);
    await loadModels();
    source = await mongoose.createConnection(process.env.MONGO_URI, { autoIndex: false, autoCreate: false }).asPromise();
    const sourceDb = source.db;
    assert.notEqual(sourceDb.databaseName, dbName);
    await mongoose.connect(process.env.MONGO_URI, { dbName, autoIndex: false, autoCreate: false });
    const db = mongoose.connection.db;
    const originals = [];
    for (const info of await sourceDb.listCollections().toArray()) {
      if (info.type !== 'collection' || info.name.startsWith('system.') || info.name === 'schema_migrations') continue;
      // Kể cả khi nguồn đã migrate, dựng lại tên legacy trên bản sao để kiểm tra DDL.
      const oldName = Object.entries(RENAMES).find(([, target]) => target === info.name)?.[0] || info.name;
      const collection = await db.createCollection(oldName);
      const docs = await sourceDb.collection(info.name).find({}).toArray();
      if (docs.length) await collection.insertMany(docs);
      for (const index of await sourceDb.collection(info.name).indexes()) {
        if (index.name === '_id_') continue;
        const { key, v, ns, ...options } = index;
        await collection.createIndex(key, options);
      }
      originals.push({ name: oldName, docs });
    }
    await source.close();
    source = null;
    console.log('Đã sao chép dữ liệu nguồn; kiểm tra và áp dụng migration trên bản sao...');
    const first = await plan(db);
    assert.ok(first.renames.length);
    const result = await apply(db, first, backupDir);
    assert.equal(result.alreadyApplied, false);
    console.log('Đã áp dụng; kiểm tra bảo toàn dữ liệu và idempotency...');
    const second = await plan(db);
    assert.equal(second.renames.length, 0);
    assert.equal(second.updates.length, 0);
    assert.equal((await apply(db, second, backupDir)).alreadyApplied, true);
    for (const original of originals) {
      const target = RENAMES[original.name] || original.name;
      assert.equal(await db.collection(target).countDocuments(), original.docs.length);
      for (const doc of original.docs) {
        const current = await db.collection(target).findOne({ _id: doc._id });
        assert.ok(current);
        for (const key of Object.keys(doc)) {
          // Mảng được bổ sung metadata; mọi trường nguồn còn lại phải giữ nguyên BSON.
          if (target === 'tournaments' && ['players', 'rounds', 'groups', 'prizes'].includes(key)) continue;
          assert.equal(EJSON.stringify(current[key]), EJSON.stringify(doc[key]), `${target}.${key}`);
        }
        if (target === 'tournaments') {
          for (const [i, player] of (doc.players || []).entries()) {
            for (const key of Object.keys(player)) assert.equal(EJSON.stringify(current.players[i][key]), EJSON.stringify(player[key]));
          }
        }
      }
    }
    const manifest = EJSON.parse(await fs.readFile(path.join(backupDir, 'manifest.ejson'), 'utf8'));
    for (const collection of manifest.collections) {
      const text = await fs.readFile(path.join(backupDir, collection.file), 'utf8');
      const docs = text.trim() ? text.trim().split('\n').map(line => EJSON.parse(line)) : [];
      assert.equal(docs.length, collection.count);
    }
    await assert.rejects(db.collection('match_frames').insertOne({ match: new mongoose.Types.ObjectId(), frameNo: 0 }), e => e.code === 121);
    await assert.rejects(db.collection('transactions').insertOne({ amount: -1, paymentMethod: 'cash', status: 'completed', idempotencyKey: 'invalid-check' }), e => e.code === 121);
    const { Match } = mongoose.models;
    const match = await Match.findOne();
    if (match) {
      await match.validate();
      const invalid = new Match({ ...match.toObject(), participants: [match.participants[0], match.participants[0]] });
      await assert.rejects(invalid.validate());
      await assert.rejects(db.collection('matches').insertOne({ ...match.toObject(), _id: new mongoose.Types.ObjectId() }), e => e.code === 11000);
    }
    const tournament = await mongoose.models.Tournament.findOne({ 'players.0': { $exists: true } });
    if (tournament) {
      tournament.players.push(tournament.players[0]);
      await assert.rejects(tournament.validate());
    }
    // Hai hóa đơn POS thực tế không có invoiceNumber vẫn hợp lệ với index legacy đã sửa.
    const invoiceIndex = (await db.collection('invoices').indexes()).find(i => i.name === 'invoiceNumber_1_v2');
    if (invoiceIndex) assert.deepEqual(invoiceIndex.partialFilterExpression, { invoiceNumber: { $type: 'string' } });
    // Chỉ xóa database thử nghiệm, rồi kiểm chứng bản sao lưu có khôi phục được thực sự.
    assert.equal(db.databaseName, dbName);
    await db.dropDatabase();
    const { restore } = require('./restore-erd.cjs');
    console.log('Kiểm tra khôi phục từ backup...');
    const restored = await restore(db, backupDir);
    assert.equal(restored.collections, originals.length);
    for (const original of originals) {
      const docs = await db.collection(original.name).find({}).toArray();
      assert.equal(docs.length, original.docs.length);
      const byId = new Map(docs.map(doc => [String(doc._id), EJSON.stringify(doc)]));
      for (const doc of original.docs) assert.equal(byId.get(String(doc._id)), EJSON.stringify(doc));
    }
    console.log('PASS: bản sao dữ liệu thật, bảo toàn BSON, sao lưu/khôi phục, đổi tên, quan hệ giải đấu, unique index, validation, chạy lại không thay đổi');
  } finally {
    if (source) await source.close();
    if (mongoose.connection.readyState === 1) {
      assert.equal(mongoose.connection.name, dbName);
      try { await mongoose.connection.dropDatabase(); }
      finally { await mongoose.disconnect(); }
    }
    await mongoose.disconnect();
    await fs.rm(backupDir, { recursive: true, force: true });
  }
}
main().catch(error => {
  console.error('FAIL:', error.name, error.code || '', String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '<ẩn>').replace(/dup key:.*$/s, 'dup key: <ẩn>'));
  process.exitCode = 1;
});
