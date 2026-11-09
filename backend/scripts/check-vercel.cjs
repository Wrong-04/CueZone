// Chạy từ backend sau pnpm build; chỉ ghi database dùng một lần.
require('dotenv/config');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');

async function main() {
  const dbName = `cz_check_vercel_${randomUUID().slice(0, 12)}`;
  process.env.MONGO_URI = (process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cuezone_db')
    .replace(/(mongodb(?:\+srv)?:\/\/[^/]+)\/[^?]*/, `$1/${dbName}`);
  process.env.VERCEL = '1';
  const { httpServer, io } = require('../dist/server');
  assert.equal(httpServer.listening, false, 'Vercel import không tự chiếm cổng');
  try {
    await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${httpServer.address().port}`;
    const response = await fetch(`${base}/api/v1/auth/profile`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).success, false);
    assert.equal(mongoose.connection.name, dbName);
    const indexes = await mongoose.connection.collection('tournamentpaymentreceipts').indexes();
    assert.ok(indexes.some(index => index.key.providerId === 1 && index.unique));
    console.log('PASS: Vercel export, readiness, auth và payment unique index');
  } finally {
    await new Promise(resolve => io.close(resolve));
    if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
