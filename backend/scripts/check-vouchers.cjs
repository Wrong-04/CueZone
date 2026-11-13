// Run from backend: pnpm check:vouchers
// Uses a disposable MongoDB database and requires transaction support.
require("dotenv/config");
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { App } = require("../dist/app");
const { User } = require("../dist/modules/user/user.model");
const { Table } = require("../dist/modules/table/table.model");
const { Invoice } = require("../dist/modules/invoice/invoice.model");
const { Voucher, VoucherUsage } = require("../dist/modules/voucher/voucher.model");

async function main() {
  const dbName = `cz_voucher_check_${crypto.randomUUID().slice(0, 18)}`;
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db", {
      dbName,
      serverSelectionTimeoutMS: 8000,
    });
    await Promise.all([User.init(), Table.init(), Invoice.init(), Voucher.init(), VoucherUsage.init()]);
    server = new App().app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;

    async function request(path, method = "GET", body, token) {
      const response = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    }

    const admin = await User.create({
      name: "Voucher admin",
      email: "voucher-admin@check.invalid",
      password: "CheckPassword123",
      role: "admin",
    });
    await User.create({
      name: "Voucher cashier",
      email: "voucher-cashier@check.invalid",
      password: "CheckPassword123",
      role: "staff",
    });
    const adminLogin = await request("/auth/login", "POST", {
      email: "voucher-admin@check.invalid",
      password: "CheckPassword123",
    });
    const staffLogin = await request("/auth/login", "POST", {
      email: "voucher-cashier@check.invalid",
      password: "CheckPassword123",
    });
    assert.equal(adminLogin.body.success, true, adminLogin.body.message);
    assert.equal(staffLogin.body.success, true, staffLogin.body.message);
    const adminToken = adminLogin.body.data.accessToken;
    const staffToken = staffLogin.body.data.accessToken;

    assert.equal((await request("/vouchers", "GET", undefined, staffToken)).status, 403);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    const created = await request(
      "/vouchers",
      "POST",
      {
        code: " test20 ",
        description: "Voucher check",
        discountType: "percent",
        discountValue: 20,
        minOrderAmount: 0,
        startsAt: new Date(now.getTime() - 60000).toISOString(),
        expiresAt: expiresAt.toISOString(),
        maxUses: 1,
      },
      adminToken,
    );
    assert.equal(created.status, 201, created.body.message);
    const voucher = created.body.data;
    assert.equal(voucher.code, "TEST20");

    const duplicate = await request(
      "/vouchers",
      "POST",
      {
        code: "test20",
        discountType: "fixed",
        discountValue: 1000,
        startsAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      adminToken,
    );
    assert.equal(duplicate.status, 409);

    const invalidPercent = await request(
      "/vouchers",
      "POST",
      {
        code: "BADPERCENT",
        discountType: "percent",
        discountValue: 101,
        startsAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      adminToken,
    );
    assert.equal(invalidPercent.status, 400);

    const fixedVoucher = await request(
      "/vouchers",
      "POST",
      {
        code: "FIXED5",
        discountType: "fixed",
        discountValue: 5000,
        minOrderAmount: 20000,
        startsAt: new Date(now.getTime() - 60000).toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      adminToken,
    );
    assert.equal(fixedVoucher.status, 201, fixedVoucher.body.message);
    const belowMinimum = await request(
      "/vouchers/validate",
      "POST",
      { code: "FIXED5", subtotal: 10000 },
      staffToken,
    );
    assert.equal(belowMinimum.body.code, "VOUCHER_MIN_ORDER");
    const fixedValid = await request(
      "/vouchers/validate",
      "POST",
      { code: "FIXED5", subtotal: 25000 },
      staffToken,
    );
    assert.equal(fixedValid.body.data.discountAmount, 5000);

    const expiredVoucher = await request(
      "/vouchers",
      "POST",
      {
        code: "EXPIRED1",
        discountType: "percent",
        discountValue: 10,
        startsAt: new Date(now.getTime() - 120000).toISOString(),
        expiresAt: new Date(now.getTime() - 60000).toISOString(),
      },
      adminToken,
    );
    assert.equal(expiredVoucher.status, 201, expiredVoucher.body.message);
    const expired = await request(
      "/vouchers/validate",
      "POST",
      { code: "EXPIRED1", subtotal: 50000 },
      staffToken,
    );
    assert.equal(expired.body.code, "VOUCHER_EXPIRED");

    const tooSmall = await request("/vouchers/validate", "POST", { code: "TEST20", subtotal: -1 }, staffToken);
    assert.equal(tooSmall.body.success, false);
    const valid = await request(
      "/vouchers/validate",
      "POST",
      { code: " test20 ", subtotal: 50000 },
      staffToken,
    );
    assert.equal(valid.body.success, true, valid.body.message);
    assert.equal(valid.body.data.discountAmount, 10000);

    const tableResponse = await request(
      "/tables",
      "POST",
      {
        code: "VOUCHER1",
        name: "Voucher test table",
        type: "pool",
        area: "Voucher Check",
        pricePerHour: 60000,
        status: "available",
      },
      staffToken,
    );
    assert.equal(tableResponse.body.success, true, tableResponse.body.message);
    const tableId = tableResponse.body.data._id;
    const opened = await request(
      `/tables/${tableId}/session/open`,
      "POST",
      { customerName: "Voucher Guest" },
      staffToken,
    );
    assert.equal(opened.body.success, true, opened.body.message);
    const sessionId = opened.body.data.currentSession.sessionId;
    const checkoutPayload = { sessionId, discountPercent: 0, voucherCode: "TEST20", paymentMethod: "cash" };
    const checkout = await request(
      `/tables/${tableId}/session/checkout`,
      "POST",
      checkoutPayload,
      staffToken,
    );
    assert.equal(checkout.body.success, true, checkout.body.message);
    assert.equal(checkout.body.data.voucherCode, "TEST20");
    assert.equal(checkout.body.data.discountAmount, Math.round(checkout.body.data.subtotal * 0.2));

    const replay = await request(
      `/tables/${tableId}/session/checkout`,
      "POST",
      checkoutPayload,
      staffToken,
    );
    assert.equal(replay.body.data.invoiceCode, checkout.body.data.invoiceCode);
    assert.equal(await VoucherUsage.countDocuments({ voucherId: voucher._id }), 1);
    assert.equal((await Voucher.findById(voucher._id)).usageCount, 1);
    const exhausted = await request(
      "/vouchers/validate",
      "POST",
      { code: "TEST20", subtotal: 50000 },
      staffToken,
    );
    assert.equal(exhausted.body.code, "VOUCHER_EXHAUSTED");
    const history = await request(`/vouchers/${voucher._id}/usage`, "GET", undefined, adminToken);
    assert.equal(history.body.data.length, 1);
    assert.equal(history.body.data[0].invoiceCode, checkout.body.data.invoiceCode);
    assert.equal(await Invoice.countDocuments(), 1);
    console.log("PASS: voucher CRUD validation, staff eligibility check, checkout redemption and usage history");
  } finally {
    if (server) {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    if (mongoose.connection.readyState) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
