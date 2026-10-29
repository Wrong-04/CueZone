const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { loadModels } = require('./migrate-erd.cjs');
const { apply, plan, verify, checkSchemas } = require('./migrate-erd-fields.cjs');
const { restore } = require('./restore-erd.cjs');
const { EJSON } = mongoose.mongo.BSON;
function preserved(before, after) {
  if (Array.isArray(before)) {
    assert.equal(after.length, before.length);
    before.forEach((v, i) => preserved(v, after[i]));
  } else if (before && typeof before === 'object' && !before._bsontype && !(before instanceof Date)) {
    for (const key of Object.keys(before)) { assert.ok(Object.hasOwn(after, key), key); preserved(before[key], after[key]); }
  } else assert.equal(EJSON.stringify(after), EJSON.stringify(before));
}
async function main() {
  const dbName = `cz_check_fields_${randomUUID().slice(0, 12)}`;
  const backupDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cz-fields-'));
  let source;
  try {
    mongoose.set('autoIndex', false); mongoose.set('autoCreate', false);
    await loadModels();
    assert.equal(checkSchemas().entities, 22);
    assert.equal(checkSchemas().fields, 145);
    source = await mongoose.createConnection(process.env.MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000 }).asPromise();
    assert.notEqual(source.name, dbName);
    await mongoose.connect(process.env.MONGO_URI, { dbName, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;
    const originals = [];
    for (const info of await source.db.listCollections().toArray()) {
      if (info.type !== 'collection' || info.name === 'schema_migrations' || info.name.startsWith('system.')) continue;
      const col = await db.createCollection(info.name, info.options);
      const docs = await source.db.collection(info.name).find({}).toArray();
      if (docs.length) await col.insertMany(docs);
      for (const { key, v, ns, ...options } of await source.db.collection(info.name).indexes()) if (options.name !== '_id_') await col.createIndex(key, options);
      originals.push({ name: info.name, docs });
    }
    await source.close(); source = null;
    console.log('Đã sao chép database; chạy migration 002...');
    await apply(db, backupDir);
    console.log('Đã apply; kiểm tra chạy lại...');
    assert.equal((await plan(db)).changes.length, 0);
    assert.equal((await apply(db, backupDir)).alreadyApplied, true);
    for (const c of originals) {
      assert.equal(await db.collection(c.name).countDocuments(), c.docs.length);
      for (const before of c.docs) preserved(before, await db.collection(c.name).findOne({ _id: before._id }));
    }
    console.log('Đã kiểm tra bảo toàn; validate schema...');
    const result = await verify(db);
    // Validate document thật sau khi thêm null, không in dữ liệu riêng tư.
    for (const name of ['User', 'PricingTier', 'Tournament', 'Match', 'Order', 'TableSession', 'GoodsReceipt', 'Voucher', 'News']) {
      const model = mongoose.models[name];
      for (const doc of await db.collection(model.collection.name).find({}).toArray()) {
        try { await new model(doc).validate(); }
        catch (e) { throw new Error(`Validate ${name}: ${Object.keys(e.errors || {}).join(',')}`); }
      }
    }
    // Chứng minh validator thực sự từ chối kiểu sai, không chỉ khai báo trên Mongoose.
    const tournament = await db.collection('tournaments').findOne();
    if (tournament) await assert.rejects(db.collection('tournaments').updateOne({ _id: tournament._id }, { $set: { minPlayers: 'không phải số' } }), e => e.code === 121);
    const match = await db.collection('matches').findOne();
    if (match) {
      await assert.rejects(db.collection('matches').updateOne({ _id: match._id }, { $set: { participants: [...match.participants, match.participants[0]] } }), e => e.code === 121);
      const model = new mongoose.models.Match(match);
      await model.validate();
      assert.ok(model.participants.every(p => String(p.matchId) === String(model._id)));
    }
    const phoneIndex = (await db.collection('users').indexes()).find(i => i.name === 'phone_1_v2');
    assert.deepEqual(phoneIndex.partialFilterExpression, { phone: { $type: 'string' } });
    // Khôi phục backup và so sánh BSON nguyên bản trên database thử nghiệm duy nhất.
    assert.equal(db.databaseName, dbName);
    await db.dropDatabase();
    console.log('Kiểm tra khôi phục...');
    await restore(db, backupDir);
    for (const c of originals) for (const doc of c.docs) assert.equal(EJSON.stringify(await db.collection(c.name).findOne({ _id: doc._id })), EJSON.stringify(doc));
    console.log('PASS:', JSON.stringify(result), 'bảo toàn dữ liệu, validator, idempotency, backup/restore');
  } finally {
    if (source) await source.close();
    try { if (mongoose.connection.readyState === 1) { assert.equal(mongoose.connection.name, dbName); await mongoose.connection.dropDatabase(); } }
    finally { await mongoose.disconnect(); await fs.rm(backupDir, { recursive: true, force: true }); }
  }
}
main().catch(e => { console.error('FAIL:', e.name, e.code || '', e.name === 'Error' ? e.message : 'Kiểm tra schema/index, không in dữ liệu riêng tư'); process.exitCode = 1; });
