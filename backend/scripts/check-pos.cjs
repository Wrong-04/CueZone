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
const { BookingPaymentReceipt } = require("../dist/modules/booking/booking-payment.model");
const { Invoice } = require("../dist/modules/invoice/invoice.model");
const { Wallet } = require("../dist/modules/wallet/wallet.model");
const { Product } = require("../dist/modules/product/product.model");
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
      BookingPaymentReceipt.init(),
      Invoice.init(),
      Wallet.init(),
      PlayReview.init(),
    ]);
    server = new App().app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    async function request(path, method = "GET", body, token, extraHeaders = {}) {
      const response = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...extraHeaders,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { ...(await response.json()), httpStatus: response.status };
    }
    async function ok(path, method, body, token, extraHeaders) {
      const result = await request(path, method, body, token, extraHeaders);
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
    const rejectedWalletCheckout = await request(
      `/customer/fnb-orders/${new mongoose.Types.ObjectId()}/checkout`,
      "POST",
      { sessionId: "wallet-checkout-disabled", paymentMethod: "member_balance" },
      customer.accessToken,
    );
    assert.equal(rejectedWalletCheckout.httpStatus, 400);
    assert.equal(rejectedWalletCheckout.success, false);
    await User.updateOne({ _id: customer.user._id }, { $set: { phone: "0912345678" } });
    const formattedPhoneLogin = await ok("/auth/login", "POST", {
      email: "+84 912 345 678",
      password: "CheckPassword123",
    });
    assert.equal(formattedPhoneLogin.user.phone, "0912345678");
    const duplicatePhoneRegistration = await request("/auth/register/request", "POST", {
      name: "Duplicate phone",
      email: "duplicate-phone@check.invalid",
      phone: "0912-345-678",
      password: "CheckPassword123",
    });
    assert.equal(duplicatePhoneRegistration.httpStatus, 400);
    assert.equal(duplicatePhoneRegistration.message, "Số điện thoại đã được sử dụng");
    const previousVnpayConfig = {
      tmnCode: process.env.VNPAY_TMN_CODE,
      hashSecret: process.env.VNPAY_HASH_SECRET,
      returnUrl: process.env.VNPAY_RETURN_URL,
    };
    process.env.VNPAY_TMN_CODE = "TEST0001";
    process.env.VNPAY_HASH_SECRET = "test-vnpay-hash-secret";
    process.env.VNPAY_RETURN_URL = "http://localhost:5556/customer/wallet";
    try {
      const walletService = new WalletService();
      const amount = 2_000_000;
      const topup = await walletService.createVnpayTopup(
        customer.user._id,
        amount,
        "127.0.0.1",
      );
      assert.match(topup.paymentUrl, /vnp_Amount=200000000/);
      const balanceBeforeVnpay = (await Wallet.findOne({ userId: customer.user._id }))?.balance ?? 0;
      const callbackDate = new Date(Date.now() + 7 * 60 * 60 * 1000)
        .toISOString()
        .replace(/[-:TZ.]/g, "")
        .slice(0, 14);
      const callbackParameters = {
        vnp_Amount: String(amount * 100),
        vnp_BankCode: "NCB",
        vnp_CardType: "ATM",
        vnp_CurrCode: "VND",
        vnp_OrderInfo: `Nap vi CueZone ${topup.referenceCode}`,
        vnp_PayDate: callbackDate,
        vnp_ResponseCode: "00",
        vnp_TmnCode: "TEST0001",
        vnp_TransactionNo: "TEST-TRANSACTION-1",
        vnp_TransactionStatus: "00",
        vnp_TxnRef: topup.referenceCode,
      };
      callbackParameters.vnp_SecureHash = createHmac("sha512", "test-vnpay-hash-secret")
        .update(vnpaySignData(callbackParameters))
        .digest("hex");
      const callbackResult = await ok(
        "/wallet/topups/vnpay/return",
        "POST",
        callbackParameters,
        customer.accessToken,
      );
      assert.equal(callbackResult.status, "success");
      assert.equal(
        (await Wallet.findOne({ userId: customer.user._id })).balance,
        balanceBeforeVnpay + amount,
        "A verified VNPay return should automatically credit the wallet",
      );
      await ok(
        "/wallet/topups/vnpay/return",
        "POST",
        callbackParameters,
        customer.accessToken,
      );
      assert.equal(
        (await Wallet.findOne({ userId: customer.user._id })).balance,
        balanceBeforeVnpay + amount,
        "Replaying a verified VNPay return must not credit the wallet twice",
      );
      const tamperedTopup = await walletService.createVnpayTopup(
        customer.user._id,
        100_000,
        "127.0.0.1",
      );
      const tamperedResult = await request(
        "/wallet/topups/vnpay/return",
        "POST",
        { ...callbackParameters, vnp_TxnRef: tamperedTopup.referenceCode },
        customer.accessToken,
      );
      assert.equal(tamperedResult.httpStatus, 400);
      assert.match(tamperedResult.message, /Chữ ký phản hồi VNPay không hợp lệ/);
      assert.equal(
        (await Wallet.findOne({ userId: customer.user._id })).balance,
        balanceBeforeVnpay + amount,
        "An invalid VNPay signature must never credit the wallet",
      );
    } finally {
      if (previousVnpayConfig.tmnCode === undefined) delete process.env.VNPAY_TMN_CODE;
      else process.env.VNPAY_TMN_CODE = previousVnpayConfig.tmnCode;
      if (previousVnpayConfig.hashSecret === undefined) delete process.env.VNPAY_HASH_SECRET;
      else process.env.VNPAY_HASH_SECRET = previousVnpayConfig.hashSecret;
      if (previousVnpayConfig.returnUrl === undefined) delete process.env.VNPAY_RETURN_URL;
      else process.env.VNPAY_RETURN_URL = previousVnpayConfig.returnUrl;
    }
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
    const preorderProduct = await Product.create({
      name: "Check drink",
      sku: "CHECK-FNB",
      category: "drink",
      unit: "chai",
      costPrice: 1000,
      salePrice: 10000,
      stock: 10,
      isForSale: true,
      isActive: true,
    });
    process.env.SEPAY_WEBHOOK_KEY = "test-sepay-webhook-key-000000000";
    process.env.SEPAY_BANK_CODE = "VCB";
    process.env.SEPAY_ACCOUNT_NUMBER = "1234567890";
    process.env.SEPAY_ACCOUNT_NAME = "CUEZONE TEST";
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const onlineDto = {
      customerName: "Check customer",
      phone: "0901234567",
      tableId: second._id,
      date: tomorrow,
      time: "10:00",
      duration: 2,
      deposit: 0,
      preOrderItems: [{ productId: preorderProduct._id, quantity: 2 }],
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
    assert.equal(onlineBooking.status, "pending");
    assert.equal(onlineBooking.paymentStatus, "awaiting_payment");
    assert.match(onlineBooking.payment.reference, /^CB[A-F0-9]{24}$/);
    assert.equal(onlineBooking.payment.amount, 130000);
    assert.equal((await Product.findById(preorderProduct._id)).stock, 10);
    assert.equal((await Table.findById(second._id)).status, "available");
    const bankPaidAt = new Date(Date.now() + 7 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    const sepayWebhook = {
      id: "987654321",
      transferType: "in",
      accountNumber: "1234567890",
      transferAmount: 130000,
      transactionDate: bankPaidAt,
      content: onlineBooking.payment.reference,
    };
    const sepayHeaders = {
      Authorization: `Apikey ${process.env.SEPAY_WEBHOOK_KEY}`,
    };
    await ok("/public/sepay/webhook", "POST", sepayWebhook, undefined, sepayHeaders);
    await ok("/public/sepay/webhook", "POST", sepayWebhook, undefined, sepayHeaders);
    const confirmedPayment = await ok(
      `/public/bookings/payment/${onlineBooking.payment.reference}`,
      "GET",
    );
    assert.equal(confirmedPayment.status, "paid");
    assert.equal((await Table.findById(second._id)).status, "booked");
    assert.equal((await Product.findById(preorderProduct._id)).stock, 8);
    const refreshedQr = await ok(
      `/bookings/${onlineBooking._id}/qr`,
      "POST",
      {},
      customer.accessToken,
    );
    const qrBooking = await ok(
      "/bookings/qr/resolve",
      "POST",
      { qrToken: refreshedQr.qrToken },
      token,
    );
    assert.equal(qrBooking.table.code, "CHECK2");
    assert.equal(qrBooking.preOrderItems[0].name, "Check drink");
    assert.equal(qrBooking.preOrderTotal, 20000);
    assert.equal(
      (await request("/bookings/qr/resolve", "POST", { qrToken: refreshedQr.qrToken }, customer.accessToken))
        .success,
      false,
    );
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
    assert.equal((await Product.findById(preorderProduct._id)).stock, 10);
    assert.equal(
      (await request("/bookings/qr/resolve", "POST", { qrToken: refreshedQr.qrToken }, token))
        .success,
      false,
    );
    const recreatedOnlineBooking = await ok(
      "/public/bookings",
      "POST",
      onlineDto,
      customer.accessToken,
    );
    assert.equal(recreatedOnlineBooking.status, "pending");
    assert.equal(recreatedOnlineBooking.paymentStatus, "awaiting_payment");
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
    assert.equal(guestBooking.status, "pending");
    assert.equal(guestBooking.paymentStatus, "awaiting_payment");
    assert.equal(guestBooking.customer, null);
    assert.match(guestBooking.payment.reference, /^CB[A-F0-9]{24}$/);
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
      preOrderItems: [{ productId: preorderProduct._id, quantity: 1 }],
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
    assert.equal((await Product.findById(preorderProduct._id)).stock, 9);
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
    await Table.updateOne({ _id: table._id }, { $set: { currentSession: null } });
    const opened = await ok(
      `/tables/${table._id}/session`,
      "POST",
      { bookingId: booking._id },
      token,
    );
    assert.equal(opened.currentSession.orders.length, 1);
    assert.equal(opened.currentSession.orders[0].name, "Check drink");
    assert.equal((await Booking.findById(booking._id)).inventoryReserved, false);
    const sessionId = opened.currentSession.sessionId;
    assert.equal(opened.currentSession.deposit, 100);
    assert.equal((await Booking.findById(booking._id)).status, "checked_in");
    const duplicateSession = await request(`/tables/${table._id}/session`, "POST", {}, token);
    assert.equal(duplicateSession.success, false);
    assert.equal(duplicateSession.httpStatus, 409);
    const invalidSessionInput = await request(
      `/tables/${table._id}/session`,
      "POST",
      { customerName: 123 },
      token,
    );
    assert.equal(invalidSessionInput.httpStatus, 400);
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
    // Test eligible-targets API for move/merge
    const mergeTargetsRes = await ok(
      `/tables/${table._id}/session/move-targets?action=merge`,
      "GET",
      undefined,
      token,
    );
    assert.ok(Array.isArray(mergeTargetsRes.targets));

    // Concurrency conflict test: cannot transfer into an already occupied table
    assert.equal(
      (
        await request(
          `/tables/${table._id}/session/move`,
          "POST",
          { sessionId: another.currentSession.sessionId, targetTableId: second._id, action: "transfer" },
          token,
        )
      ).success,
      false,
    );

    await ok(
      `/tables/${table._id}/session/move`,
      "POST",
      { sessionId: another.currentSession.sessionId, targetTableId: second._id, action: "merge" },
      token,
    );
    const secondTableAfterMerge = await Table.findById(second._id);
    assert.equal(secondTableAfterMerge.currentSession.carriedCost, 1000);
    assert.ok(Array.isArray(secondTableAfterMerge.currentSession.transfers));
    assert.ok(secondTableAfterMerge.currentSession.transfers.length >= 2);
    assert.equal(secondTableAfterMerge.currentSession.transfers[0].action, "transfer");
    assert.equal(secondTableAfterMerge.currentSession.transfers[1].action, "merge");
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
    assert.equal(receipt.subtotal, 12000);
    assert.equal(receipt.finalAmount, 10700);
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
    assert.equal(walletLookup.walletBalance, undefined);
    assert.equal(walletLookup.membershipPoints, 5);
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
