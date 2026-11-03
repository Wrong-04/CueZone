// Run from backend: pnpm exec node scripts/check-pos.cjs
// Uses a disposable database on the configured MongoDB server, never the app database.
require("dotenv/config");
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");
const { App } = require("../dist/app");
const { User } = require("../dist/modules/user/user.model");
const { Table } = require("../dist/modules/table/table.model");
const { Booking } = require("../dist/modules/booking/booking.model");
const { Invoice } = require("../dist/modules/invoice/invoice.model");
const { Wallet } = require("../dist/modules/wallet/wallet.model");
const { playingDetails } = require("../dist/modules/session/session.service");
const { bookingInput } = require("../dist/modules/booking/booking.service");
const { getMemberTier, getPointsForSpend } = require("../dist/modules/member/membership.policy");
const { PlayReview } = require("../dist/modules/member/play-review.model");

async function main() {
  assert.equal(getMemberTier(499).tier.name, "Đồng");
  assert.equal(getMemberTier(500).tier.name, "Bạc");
  assert.equal(getMemberTier(1499).tier.name, "Bạc");
  assert.equal(getMemberTier(1500).tier.name, "Vàng");
  assert.equal(getMemberTier(500).progressPercent, 0);
  assert.equal(getPointsForSpend(9999), 0);
  assert.equal(getPointsForSpend(10000), 1);

  const dbName = `cz_check_${randomUUID().slice(0, 18)}`;
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db", {
      dbName,
      serverSelectionTimeoutMS: 5000,
    });
    await Promise.all([
      User.init(),
      Table.init(),
      Booking.init(),
      Invoice.init(),
      Wallet.init(),
      PlayReview.init(),
    ]);
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
      return response.json();
    }
    async function ok(path, method, body, token) {
      const result = await request(path, method, body, token);
      assert.equal(result.success, true, result.message);
      return result.data;
    }
    await User.create({
      name: "Check staff",
      email: "staff@check.invalid",
      password: "CheckPassword123",
      role: "staff",
    });
    await User.create({
      name: "Check customer",
      email: "customer@check.invalid",
      password: "CheckPassword123",
      role: "customer",
    });
    assert.equal(
      (await request("/auth/login", "POST", { email: "staff@check.invalid", password: "wrong" }))
        .success,
      false,
    );
    const auth = await ok("/auth/login", "POST", {
      email: "staff@check.invalid",
      password: "CheckPassword123",
    });
    assert.ok(!("password" in auth.user));
    const token = auth.accessToken;
    assert.equal((await ok("/auth/profile", "GET", undefined, token)).email, "staff@check.invalid");
    const customer = await ok("/auth/login", "POST", {
      email: "customer@check.invalid",
      password: "CheckPassword123",
    });
    assert.equal(
      (await request("/bookings", "GET", undefined, customer.accessToken)).success,
      false,
    );
    assert.equal((await request("/bookings")).success, false);
    const table = await ok(
      "/tables",
      "POST",
      {
        code: "CHECK1",
        name: "Check table",
        type: "pool",
        area: "Check",
        pricePerHour: 60000,
        status: "playing",
      },
      token,
    );
    assert.equal(table.status, "available");
    const second = await ok(
      "/tables",
      "POST",
      { code: "CHECK2", name: "Second table", type: "carom", area: "Check", pricePerHour: 120000 },
      token,
    );
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const onlineDto = {
      customerName: "Check customer",
      phone: "0901234567",
      tableId: second._id,
      date: tomorrow,
      time: "10:00",
      duration: 2,
      deposit: 0,
    };
    const onlineConcurrent = await Promise.all([
      request("/public/bookings", "POST", onlineDto, customer.accessToken),
      request("/public/bookings", "POST", onlineDto, customer.accessToken),
    ]);
    assert.equal(
      onlineConcurrent.filter((result) => result.success).length,
      1,
      "Concurrent online reservations must not claim the same slot",
    );
    const onlineBooking = onlineConcurrent.find((result) => result.success).data;
    assert.equal(onlineBooking.status, "approved");
    assert.equal((await Table.findById(second._id)).status, "booked");
    assert.equal(
      (await ok("/bookings/mine", "GET", undefined, customer.accessToken)).length,
      1,
    );
    assert.equal((await request("/bookings/mine", "GET", undefined, token)).success, false);
    const availability = await ok(
      `/public/booking-availability?date=${tomorrow}&time=10%3A00&duration=2&type=carom`,
      "GET",
    );
    assert.equal(availability.some((availableTable) => availableTable._id === second._id), false);
    const cancelledOnlineBooking = await ok(
      `/bookings/${onlineBooking._id}/cancel`,
      "POST",
      { reason: "Check cancellation" },
      customer.accessToken,
    );
    assert.equal(cancelledOnlineBooking.status, "cancelled");
    assert.equal((await Table.findById(second._id)).status, "available");
    const recreatedOnlineBooking = await ok(
      "/public/bookings",
      "POST",
      onlineDto,
      customer.accessToken,
    );
    assert.equal(recreatedOnlineBooking.status, "approved");
    await ok(
      `/bookings/${recreatedOnlineBooking._id}/cancel`,
      "POST",
      { reason: "Check cleanup" },
      customer.accessToken,
    );
    const guestBooking = await ok(
      "/public/bookings",
      "POST",
      { ...onlineDto, time: "15:00" },
    );
    assert.equal(guestBooking.status, "approved");
    assert.equal(guestBooking.customer, null);
    await ok(
      `/bookings/${guestBooking._id}`,
      "PATCH",
      { status: "rejected", rejectionReason: "Check guest cleanup" },
      token,
    );
    assert.throws(() =>
      bookingInput({
        customerName: "Name",
        phone: "0901234567",
        tableId: table._id,
        date: "2099-02-30",
        time: "19:00",
        duration: 2,
        deposit: 0,
      }),
    );
    const bookingDto = {
      customerName: "Check guest",
      phone: "0901234567",
      tableId: table._id,
      date: tomorrow,
      time: "19:00",
      duration: 2,
      deposit: 100,
      note: "Check note",
    };
    const concurrent = await Promise.all([
      request("/bookings", "POST", bookingDto, token),
      request("/bookings", "POST", bookingDto, token),
    ]);
    assert.equal(
      concurrent.filter((result) => result.success).length,
      1,
      "Concurrent reservations must not double-book",
    );
    const booking = concurrent.find((result) => result.success).data;
    assert.equal(booking.estimatedCost, 120000);
    assert.equal(
      (await ok(`/tables/${table._id}`, "GET", undefined, token)).bookedInfo.bookingId,
      booking._id,
    );
    await ok(
      `/bookings/${booking._id}`,
      "PATCH",
      { status: "approved", tableId: second._id },
      token,
    );
    assert.equal((await Table.findById(table._id)).status, "available");
    await ok(
      `/bookings/${booking._id}`,
      "PATCH",
      { status: "rejected", rejectionReason: "Check cancellation" },
      token,
    );
    assert.equal((await Table.findById(second._id)).status, "available");
    await ok(`/bookings/${booking._id}`, "PATCH", { status: "pending" }, token);
    await ok(
      `/bookings/${booking._id}`,
      "PATCH",
      { status: "approved", tableId: table._id },
      token,
    );
    const opened = await ok(
      `/tables/${table._id}/session`,
      "POST",
      { bookingId: booking._id },
      token,
    );
    const sessionId = opened.currentSession.sessionId;
    assert.equal(opened.currentSession.deposit, 100);
    assert.equal((await Booking.findById(booking._id)).status, "checked_in");
    assert.equal((await request(`/tables/${table._id}/session`, "POST", {}, token)).success, false);
    assert.equal(
      (await request(`/tables/${table._id}/status`, "PUT", { status: "available" }, token)).success,
      false,
    );
    assert.equal(
      (
        await request(
          `/tables/${table._id}`,
          "PUT",
          { currentSession: null, status: "available" },
          token,
        )
      ).success,
      false,
    );
    assert.equal(
      (
        await request(
          `/tables/${table._id}/session/pause`,
          "PATCH",
          { sessionId: "stale", paused: true },
          token,
        )
      ).success,
      false,
    );
    const paused = await ok(
      `/tables/${table._id}/session/pause`,
      "PATCH",
      { sessionId, paused: true },
      token,
    );
    assert.equal(paused.status, "paused");
    assert.equal(
      playingDetails(paused.currentSession, Date.now() + 3600000).cost,
      playingDetails(paused.currentSession).cost,
    );
    await ok(`/tables/${table._id}/session/pause`, "PATCH", { sessionId, paused: false }, token);
    await ok(
      `/tables/${table._id}/session/move`,
      "POST",
      { sessionId, targetTableId: second._id, action: "transfer" },
      token,
    );
    assert.equal((await Table.findById(second._id)).currentSession.pricePerHour, 60000);
    const another = await ok(
      `/tables/${table._id}/session`,
      "POST",
      { customerName: "Second guest" },
      token,
    );
    await ok(
      `/tables/${table._id}/session/move`,
      "POST",
      { sessionId: another.currentSession.sessionId, targetTableId: second._id, action: "merge" },
      token,
    );
    assert.equal((await Table.findById(second._id)).currentSession.carriedCost, 1000);
    assert.equal(
      (
        await request(
          `/tables/${second._id}/session/checkout`,
          "POST",
          { sessionId, discountPercent: 0, paymentMethod: "invalid_method" },
          token,
        )
      ).success,
      false,
    );
    const pay = { sessionId, discountPercent: 10, paymentMethod: "cash" };
    const receipt = await ok(`/tables/${second._id}/session/checkout`, "POST", pay, token);
    assert.equal(receipt.subtotal, 2000);
    assert.equal(receipt.finalAmount, 1700);
    assert.equal(
      (await ok(`/tables/${second._id}/session/checkout`, "POST", pay, token)).invoiceCode,
      receipt.invoiceCode,
    );
    assert.equal(await Invoice.countDocuments(), 1);
    assert.equal((await Table.findById(second._id)).status, "available");

    const walletMember = await User.create({
      name: "Wallet member",
      email: "wallet-member@check.invalid",
      password: "CheckPassword123",
      role: "customer",
      phone: "0901234567",
    });
    const wallet = await Wallet.create({ userId: walletMember._id, balance: 0, points: 5 });
    const walletLookup = await ok(
      `/tables/customer-lookup?phone=${walletMember.phone}`,
      "GET",
      undefined,
      token,
    );
    assert.equal(walletLookup.walletBalance, 0);
    const memberLogin = await ok("/auth/login", "POST", {
      email: "wallet-member@check.invalid",
      password: "CheckPassword123",
    });
    const initialMembership = await ok(
      "/customer/membership",
      "GET",
      undefined,
      memberLogin.accessToken,
    );
    assert.equal(initialMembership.points, 5);
    assert.equal(initialMembership.currentTier.name, "Đồng");
    assert.equal(initialMembership.tiers.length, 3);
    assert.equal(
      (await ok("/customer/play-history?page=1", "GET", undefined, memberLogin.accessToken)).total,
      0,
    );
    assert.equal(
      (await request("/customer/membership", "GET", undefined, token)).success,
      false,
      "Only customer accounts may access membership data",
    );
    const walletSession = await ok(
      `/tables/${table._id}/session`,
      "POST",
      { customerName: walletMember.name, customerPhone: walletMember.phone, isMember: true },
      token,
    );
    await ok(
      `/tables/${table._id}/session/orders`,
      "POST",
      {
        sessionId: walletSession.currentSession.sessionId,
        orders: [
          {
            id: "member-history-order",
            name: "Check item",
            price: 50000,
            quantity: 1,
            category: "Check",
            orderTime: new Date().toISOString(),
            status: "served",
          },
        ],
      },
      token,
    );
    const walletCheckout = {
      sessionId: walletSession.currentSession.sessionId,
      discountPercent: 0,
      paymentMethod: "member_balance",
      customerPhone: walletMember.phone,
    };
    const insufficientWalletCheckout = await request(
      `/tables/${table._id}/session/checkout`,
      "POST",
      walletCheckout,
      token,
    );
    assert.equal(insufficientWalletCheckout.success, false);
    assert.equal(insufficientWalletCheckout.code, "WAL001");
    assert.equal((await Wallet.findById(wallet._id)).balance, 0);
    assert.equal((await Wallet.findById(wallet._id)).points, 5);
    assert.equal((await Table.findById(table._id)).status, "playing");
    assert.equal(await Invoice.countDocuments(), 1);

    wallet.balance = 100000;
    await wallet.save();
    const walletReceipt = await ok(
      `/tables/${table._id}/session/checkout`,
      "POST",
      walletCheckout,
      token,
    );
    assert.equal(walletReceipt.paymentMethod, "member_balance");
    assert.equal(walletReceipt.paymentStatus, "paid");
    assert.equal(walletReceipt.tableCode, "CHECK1");
    const pointsAwarded = Math.floor(walletReceipt.finalAmount / 10000);
    assert.ok(pointsAwarded > 0);
    assert.equal(walletReceipt.pointsAwarded, pointsAwarded);
    const settledWallet = await Wallet.findById(wallet._id);
    assert.equal(settledWallet.balance, 100000 - walletReceipt.finalAmount);
    assert.equal(settledWallet.points, 5 + pointsAwarded);
    assert.equal(settledWallet.transactions.at(-1).referenceCode, walletReceipt.invoiceCode);
    assert.equal(settledWallet.transactions.at(-1).pointsAwarded, pointsAwarded);
    assert.equal((await Invoice.findOne({ sessionId: walletCheckout.sessionId })).status, "paid");
    const memberHistory = await ok(
      "/customer/play-history?page=1",
      "GET",
      undefined,
      memberLogin.accessToken,
    );
    assert.equal(memberHistory.total, 1);
    assert.equal(memberHistory.items[0].tableCode, "CHECK1");
    assert.equal(memberHistory.items[0].pointsAwarded, pointsAwarded);
    assert.equal(memberHistory.items[0].review, null);
    const invalidReview = await request(
      "/customer/reviews",
      "POST",
      { sessionId: walletCheckout.sessionId, tableRating: 6, serviceRating: 5 },
      memberLogin.accessToken,
    );
    assert.equal(invalidReview.success, false);
    assert.match(invalidReview.message, /sao từ 1 đến 5/);
    const reviewPayload = {
      sessionId: walletCheckout.sessionId,
      tableRating: 4,
      serviceRating: 5,
      comment: "Bàn sạch, nhân viên hỗ trợ nhiệt tình.",
    };
    const submittedReview = await ok(
      "/customer/reviews",
      "POST",
      reviewPayload,
      memberLogin.accessToken,
    );
    assert.equal(submittedReview.tableRating, 4);
    assert.equal(submittedReview.serviceRating, 5);
    const duplicateReview = await request(
      "/customer/reviews",
      "POST",
      reviewPayload,
      memberLogin.accessToken,
    );
    assert.equal(duplicateReview.success, false);
    assert.equal(duplicateReview.message, "Phiên chơi này đã được đánh giá trước đó");
    const incompleteSessionReview = await request(
      "/customer/reviews",
      "POST",
      { ...reviewPayload, sessionId: "not-completed-session" },
      memberLogin.accessToken,
    );
    assert.equal(incompleteSessionReview.success, false);
    const staffReview = await request("/customer/reviews", "POST", reviewPayload, token);
    assert.equal(staffReview.success, false);
    assert.equal(await PlayReview.countDocuments({ sessionId: walletCheckout.sessionId }), 1);
    const historyAfterReview = await ok(
      "/customer/play-history?page=1",
      "GET",
      undefined,
      memberLogin.accessToken,
    );
    const historyReview = historyAfterReview.items.find(
      (item) => item.sessionId === walletCheckout.sessionId,
    ).review;
    assert.equal(historyReview.tableRating, 4);
    assert.equal(historyReview.serviceRating, 5);
    assert.equal(historyReview.comment, reviewPayload.comment);
    const updatedMembership = await ok(
      "/customer/membership",
      "GET",
      undefined,
      memberLogin.accessToken,
    );
    assert.equal(updatedMembership.points, 5 + pointsAwarded);
    const concurrentWalletCheckouts = await Promise.all([
      request(`/tables/${table._id}/session/checkout`, "POST", walletCheckout, token),
      request(`/tables/${table._id}/session/checkout`, "POST", walletCheckout, token),
    ]);
    assert.ok(concurrentWalletCheckouts.every((result) => result.success));
    assert.equal(
      concurrentWalletCheckouts[0].data.invoiceCode,
      concurrentWalletCheckouts[1].data.invoiceCode,
    );
    assert.equal((await Wallet.findById(wallet._id)).balance, 100000 - walletReceipt.finalAmount);
    assert.equal((await Wallet.findById(wallet._id)).points, 5 + pointsAwarded);

    const cashMemberSession = await ok(
      `/tables/${table._id}/session`,
      "POST",
      { customerName: walletMember.name, customerPhone: walletMember.phone, isMember: true },
      token,
    );
    await ok(
      `/tables/${table._id}/session/orders`,
      "POST",
      {
        sessionId: cashMemberSession.currentSession.sessionId,
        orders: [
          {
            id: "cash-member-history-order",
            name: "Check item",
            price: 30000,
            quantity: 1,
            category: "Check",
            orderTime: new Date().toISOString(),
            status: "served",
          },
        ],
      },
      token,
    );
    const cashReceipt = await ok(
      `/tables/${table._id}/session/checkout`,
      "POST",
      {
        sessionId: cashMemberSession.currentSession.sessionId,
        discountPercent: 0,
        paymentMethod: "cash",
      },
      token,
    );
    const cashPoints = Math.floor(cashReceipt.finalAmount / 10000);
    assert.equal(cashReceipt.pointsAwarded, cashPoints);
    assert.equal((await Wallet.findById(wallet._id)).points, 5 + pointsAwarded + cashPoints);
    assert.equal((await Wallet.findById(wallet._id)).balance, 100000 - walletReceipt.finalAmount);
    assert.equal(
      (
        await ok("/customer/play-history?page=1", "GET", undefined, memberLogin.accessToken)
      ).total,
      2,
    );

    assert.equal((await ok("/bookings", "GET", undefined, token)).length, 4);
    assert.equal((await ok("/tables?isActive=true", "GET", undefined, token)).length, 2);

    const poolAvailBefore = await ok("/tables/available?type=pool", "GET", undefined, token);
    assert.equal(
      poolAvailBefore.waitlistSuggested,
      false,
      "Pool table should be available before walk-in",
    );
    assert.equal(poolAvailBefore.availableCount >= 1, true);

    const walkInSession = await ok(
      `/tables/${table._id}/session/open`,
      "POST",
      { customerName: "Khách Walk-in", customerPhone: "0912345678" },
      token,
    );
    assert.equal(walkInSession.status, "playing");
    assert.equal(walkInSession.currentSession.customerName, "Khách Walk-in");

    const poolAvailAfter = await ok("/tables/available?type=pool", "GET", undefined, token);
    assert.equal(
      poolAvailAfter.waitlistSuggested,
      true,
      "Waitlist should be suggested when pool tables are full",
    );
    assert.equal(poolAvailAfter.availableCount, 0);

    const publicTables = await ok("/public/tables", "GET", undefined, undefined);
    assert.equal(Array.isArray(publicTables), true);
    assert.equal(publicTables.length >= 2, true);
    for (const pt of publicTables) {
      assert.equal(pt.customerName, undefined, "Guest table data must NOT expose customerName");
      assert.equal(pt.customerPhone, undefined, "Guest table data must NOT expose customerPhone");
      assert.equal(pt.deposit, undefined, "Guest table data must NOT expose deposit");
      assert.equal(pt.orders, undefined, "Guest table data must NOT expose orders");
      assert.equal(pt.note, undefined, "Guest table data must NOT expose note");
    }
    const publicPlaying = publicTables.find((t) => t.code === "CHECK1");
    assert.equal(publicPlaying.status, "playing");
    assert.equal(typeof publicPlaying.durationMinutes, "number");

    console.log(
      "PASS: database auth, permissions, reservation conflicts, reassignment, check-in, pause, move/merge, walk-in & waitlist, public guest floor without sensitive data",
    );
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState === 1) {
      assert.equal(mongoose.connection.name, dbName);
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  }
}
main().catch((error) => {
  const safeMessage = String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, "<REDACTED>");
  console.error("FAIL:", error.name, safeMessage);
  console.error(error.stack);
  process.exit(1);
});
