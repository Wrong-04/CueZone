// Run from backend: pnpm exec node scripts/check-pos.cjs
// Uses a disposable database on the configured MongoDB server, never the app database.
require('dotenv/config');
require('ts-node/register/transpile-only');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { App } = require('../src/app');
const { User } = require('../src/modules/user/user.model');
const { Table } = require('../src/modules/table/table.model');
const { Booking } = require('../src/modules/booking/booking.model');
const { Invoice } = require('../src/modules/invoice/invoice.model');
const { playingDetails } = require('../src/modules/session/session.service');
const { bookingInput } = require('../src/modules/booking/booking.service');

async function main() {
  const dbName = `cz_check_${randomUUID().slice(0, 18)}`;
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cuezone_db', { dbName, serverSelectionTimeoutMS: 5000 });
    await Promise.all([User.init(), Table.init(), Booking.init(), Invoice.init()]);
    server = new App().app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    async function request(path, method = 'GET', body, token) {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return response.json();
    }
    async function ok(path, method, body, token) {
      const result = await request(path, method, body, token);
      assert.equal(result.success, true, result.message);
      return result.data;
    }
    await User.create({ name: 'Check staff', email: 'staff@check.invalid', password: 'CheckPassword123', role: 'staff' });
    await User.create({ name: 'Check customer', email: 'customer@check.invalid', password: 'CheckPassword123', role: 'customer' });
    assert.equal((await request('/auth/login', 'POST', { email: 'staff@check.invalid', password: 'wrong' })).success, false);
    const auth = await ok('/auth/login', 'POST', { email: 'staff@check.invalid', password: 'CheckPassword123' });
    assert.ok(!('password' in auth.user));
    const token = auth.accessToken;
    assert.equal((await ok('/auth/profile', 'GET', undefined, token)).email, 'staff@check.invalid');
    const customer = await ok('/auth/login', 'POST', { email: 'customer@check.invalid', password: 'CheckPassword123' });
    assert.equal((await request('/bookings', 'GET', undefined, customer.accessToken)).success, false);
    assert.equal((await request('/bookings')).success, false);
    const table = await ok('/tables', 'POST', { code: 'CHECK1', name: 'Check table', type: 'standard_9ft', area: 'Check', pricePerHour: 60000, status: 'playing' }, token);
    assert.equal(table.status, 'available');
    const second = await ok('/tables', 'POST', { code: 'CHECK2', name: 'Second table', type: 'vip_bank_pool', area: 'Check', pricePerHour: 120000 }, token);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    assert.throws(() => bookingInput({ customerName: 'Name', phone: '0901234567', tableId: table._id, date: '2099-02-30', time: '19:00', duration: 2, deposit: 0 }));
    const bookingDto = { customerName: 'Check guest', phone: '0901234567', tableId: table._id, date: tomorrow, time: '19:00', duration: 2, deposit: 100, note: 'Check note' };
    const concurrent = await Promise.all([request('/bookings', 'POST', bookingDto, token), request('/bookings', 'POST', bookingDto, token)]);
    assert.equal(concurrent.filter(result => result.success).length, 1, 'Concurrent reservations must not double-book');
    const booking = concurrent.find(result => result.success).data;
    assert.equal(booking.estimatedCost, 120000);
    assert.equal((await ok(`/tables/${table._id}`, 'GET', undefined, token)).bookedInfo.bookingId, booking._id);
    await ok(`/bookings/${booking._id}`, 'PATCH', { status: 'approved', tableId: second._id }, token);
    assert.equal((await Table.findById(table._id)).status, 'available');
    await ok(`/bookings/${booking._id}`, 'PATCH', { status: 'rejected', rejectionReason: 'Check cancellation' }, token);
    assert.equal((await Table.findById(second._id)).status, 'available');
    await ok(`/bookings/${booking._id}`, 'PATCH', { status: 'pending' }, token);
    await ok(`/bookings/${booking._id}`, 'PATCH', { status: 'approved', tableId: table._id }, token);
    const opened = await ok(`/tables/${table._id}/session`, 'POST', { bookingId: booking._id }, token);
    const sessionId = opened.currentSession.sessionId;
    assert.equal(opened.currentSession.deposit, 100);
    assert.equal((await Booking.findById(booking._id)).status, 'checked_in');
    assert.equal((await request(`/tables/${table._id}/session`, 'POST', {}, token)).success, false);
    assert.equal((await request(`/tables/${table._id}/status`, 'PUT', { status: 'available' }, token)).success, false);
    assert.equal((await request(`/tables/${table._id}`, 'PUT', { currentSession: null, status: 'available' }, token)).success, false);
    assert.equal((await request(`/tables/${table._id}/session/pause`, 'PATCH', { sessionId: 'stale', paused: true }, token)).success, false);
    const paused = await ok(`/tables/${table._id}/session/pause`, 'PATCH', { sessionId, paused: true }, token);
    assert.equal(paused.status, 'paused');
    assert.equal(playingDetails(paused.currentSession, Date.now() + 3600000).cost, playingDetails(paused.currentSession).cost);
    await ok(`/tables/${table._id}/session/pause`, 'PATCH', { sessionId, paused: false }, token);
    await ok(`/tables/${table._id}/session/move`, 'POST', { sessionId, targetTableId: second._id, action: 'transfer' }, token);
    assert.equal((await Table.findById(second._id)).currentSession.pricePerHour, 60000);
    const another = await ok(`/tables/${table._id}/session`, 'POST', { customerName: 'Second guest' }, token);
    await ok(`/tables/${table._id}/session/move`, 'POST', { sessionId: another.currentSession.sessionId, targetTableId: second._id, action: 'merge' }, token);
    assert.equal((await Table.findById(second._id)).currentSession.carriedCost, 1000);
    assert.equal((await request(`/tables/${second._id}/session/checkout`, 'POST', { sessionId, discountPercent: 0, paymentMethod: 'vnpay' }, token)).success, false);
    const pay = { sessionId, discountPercent: 10, paymentMethod: 'cash' };
    const receipt = await ok(`/tables/${second._id}/session/checkout`, 'POST', pay, token);
    assert.equal(receipt.subtotal, 2000);
    assert.equal(receipt.finalAmount, 1700);
    assert.equal((await ok(`/tables/${second._id}/session/checkout`, 'POST', pay, token)).invoiceCode, receipt.invoiceCode);
    assert.equal(await Invoice.countDocuments(), 1);
    assert.equal((await Table.findById(second._id)).status, 'available');
    assert.equal((await ok('/bookings', 'GET', undefined, token)).length, 1);
    assert.equal((await ok('/tables?isActive=true', 'GET', undefined, token)).length, 2);
    console.log('PASS: database auth, permissions, reservation conflicts, reassignment, check-in, pause, move/merge, persisted and retry-safe cash invoice');
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    if (mongoose.connection.readyState === 1) {
      assert.equal(mongoose.connection.name, dbName);
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  }
}
main().catch(error => {
  const safeMessage = String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '<REDACTED>');
  console.error('FAIL:', error.name, safeMessage);
  process.exit(1);
});
