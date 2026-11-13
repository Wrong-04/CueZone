// Run from backend: pnpm check:customer-orders
// Uses a disposable MongoDB database and requires transaction support.
require("dotenv/config");
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { App } = require("../dist/app");
const { User } = require("../dist/modules/user/user.model");
const { Product } = require("../dist/modules/product/product.model");
const { Table } = require("../dist/modules/table/table.model");
const { CustomerOrder } = require("../dist/modules/customer-order/customer-order.model");
const { Invoice } = require("../dist/modules/invoice/invoice.model");
const { Wallet } = require("../dist/modules/wallet/wallet.model");
const { Voucher, VoucherReservation, VoucherUsage } = require("../dist/modules/voucher/voucher.model");

async function main() {
  const dbName = `cz_order_${crypto.randomUUID().slice(0, 20)}`;
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db", {
      dbName,
      serverSelectionTimeoutMS: 8000,
    });
    await Promise.all([
      User.init(),
      Product.init(),
      Table.init(),
      CustomerOrder.init(),
      Invoice.init(),
      Voucher.init(),
      VoucherReservation.init(),
      VoucherUsage.init(),
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
      return { status: response.status, body: await response.json() };
    }

    const customer = await User.create({
      name: "Portal customer",
      email: "portal-customer@check.invalid",
      password: "CheckPassword123",
      phone: "0901234567",
      role: "customer",
    });
    await User.create({
      name: "Other portal customer",
      email: "other-portal-customer@check.invalid",
      password: "CheckPassword123",
      phone: "0901234568",
      role: "customer",
    });
    await User.create({
      name: "Portal cashier",
      email: "portal-cashier@check.invalid",
      password: "CheckPassword123",
      role: "cashier",
    });
    const customerLogin = await request("/auth/login", "POST", {
      email: "portal-customer@check.invalid",
      password: "CheckPassword123",
    });
    const cashierLogin = await request("/auth/login", "POST", {
      email: "portal-cashier@check.invalid",
      password: "CheckPassword123",
    });
    const otherCustomerLogin = await request("/auth/login", "POST", {
      email: "other-portal-customer@check.invalid",
      password: "CheckPassword123",
    });
    assert.equal(customerLogin.body.success, true, customerLogin.body.message);
    assert.equal(cashierLogin.body.success, true, cashierLogin.body.message);
    const customerToken = customerLogin.body.data.accessToken;
    const cashierToken = cashierLogin.body.data.accessToken;
    const otherCustomerToken = otherCustomerLogin.body.data.accessToken;

    const updatedProfile = await request(
      "/auth/profile",
      "PATCH",
      { name: "Portal customer updated", phone: "0901234570" },
      customerToken,
    );
    assert.equal(updatedProfile.body.success, true, updatedProfile.body.message);
    const savedProfile = await request("/auth/profile", "GET", undefined, customerToken);
    assert.equal(savedProfile.body.data.name, "Portal customer updated");
    assert.equal(savedProfile.body.data.phone, "0901234570");
    await request(
      "/auth/profile",
      "PATCH",
      { name: customer.name, phone: customer.phone },
      customerToken,
    );

    const product = await Product.create({
      name: "Portal test drink",
      sku: "PORTAL-CHECK-1",
      category: "drink",
      unit: "chai",
      salePrice: 25000,
      stock: 5,
      minStock: 1,
      isForSale: true,
      isActive: true,
    });
    const tableResponse = await request(
      "/tables",
      "POST",
      {
        code: "ORDERCHK1",
        name: "Order test table",
        type: "pool",
        area: "Order Check",
        pricePerHour: 60000,
        status: "available",
      },
      cashierToken,
    );
    assert.equal(tableResponse.body.success, true, tableResponse.body.message);
    const tableId = tableResponse.body.data._id;
    const opened = await request(
      `/tables/${tableId}/session/open`,
      "POST",
      { customerName: customer.name, customerPhone: "+84 90 123 4567" },
      cashierToken,
    );
    assert.equal(opened.body.success, true, opened.body.message);
    assert.equal(String(opened.body.data.currentSession.customerId), String(customer._id));
    assert.equal(opened.body.data.currentSession.customerPhone, customer.phone);
    const sessionId = opened.body.data.currentSession.sessionId;

    const activeTables = await request(
      "/customer/fnb-orders/active-tables",
      "GET",
      undefined,
      customerToken,
    );
    assert.equal(activeTables.body.data.length, 1);
    assert.equal(activeTables.body.data[0].tableId, tableId);
    await User.updateOne({ _id: customer._id }, { $set: { phone: "0999999998" } });
    const sessionAfterPhoneChange = await request(
      "/customer/fnb-orders/active-tables",
      "GET",
      undefined,
      customerToken,
    );
    assert.equal(sessionAfterPhoneChange.body.data.length, 1);
    assert.equal(sessionAfterPhoneChange.body.data[0].tableId, tableId);
    await User.updateOne({ _id: customer._id }, { $set: { phone: customer.phone } });
    assert.equal(
      (await request("/customer/fnb-orders/active-tables")).status,
      401,
      "Guest cannot retrieve private customer sessions",
    );
    assert.equal(
      (
        await request("/customer/fnb-orders", "POST", {
          tableId,
          sessionId,
          items: [{ productId: product._id, quantity: 1 }],
        })
      ).status,
      401,
      "Guest cannot submit orders",
    );

    const orderResponse = await request(
      "/customer/fnb-orders",
      "POST",
      {
        tableId,
        sessionId,
        items: [{ productId: String(product._id), quantity: 2 }],
        note: "Ít đá",
      },
      customerToken,
    );
    assert.equal(orderResponse.status, 201, orderResponse.body.message);
    const order = orderResponse.body.data;
    assert.equal(order.status, "pending");
    assert.equal(order.totalAmount, 50000);
    assert.equal((await Table.findById(tableId)).currentSession.orders.length, 0);

    assert.equal(
      (
        await request(
          "/customer/fnb-orders",
          "POST",
          { tableId, sessionId: "stale-session", items: [{ productId: product._id, quantity: 1 }] },
          customerToken,
        )
      ).status,
      409,
      "Stale or non-active sessions cannot accept new orders",
    );
    const privateStatus = await request(
      `/customer/fnb-orders/${order._id}`,
      "GET",
      undefined,
      cashierToken,
    );
    assert.equal(privateStatus.status, 403, "Order status is private to the customer");

    const portalTableResponse = await request(
      "/tables",
      "POST",
      {
        code: "PORTALCHK1",
        name: "Customer portal table",
        type: "pool",
        area: "Portal Check",
        pricePerHour: 600000,
        status: "available",
      },
      cashierToken,
    );
    const portalTableId = portalTableResponse.body.data._id;
    const portalOpen = await request(
      `/tables/${portalTableId}/session/open`,
      "POST",
      { customerName: customer.name, customerPhone: customer.phone },
      cashierToken,
    );
    const portalSessionId = portalOpen.body.data.currentSession.sessionId;
    await Wallet.create({ userId: customer._id, balance: 0, points: 500, transactions: [] });

    const preview = await request(
      `/customer/fnb-orders/${portalTableId}/checkout-preview`,
      "POST",
      { sessionId: portalSessionId },
      customerToken,
    );
    assert.equal(preview.status, 200, preview.body.message);
    assert.equal(preview.body.data.tier.name, "Bạc");
    assert.equal(preview.body.data.membershipDiscountAmount > 0, true);
    const foreignPreview = await request(
      `/customer/fnb-orders/${portalTableId}/checkout-preview`,
      "POST",
      { sessionId: portalSessionId },
      otherCustomerToken,
    );
    assert.equal(foreignPreview.status, 403, "Customers cannot view another account's session");

    const unsupportedWalletMethod = await request(
      `/customer/fnb-orders/${portalTableId}/checkout`,
      "POST",
      { sessionId: portalSessionId, paymentMethod: "member_balance" },
      customerToken,
    );
    assert.equal(unsupportedWalletMethod.status, 400);

    const checkoutVoucher = await Voucher.create({
      code: "PAYMENT-LOCK",
      discountType: "fixed",
      discountValue: 3000,
      minOrderAmount: 0,
      startsAt: new Date(Date.now() - 60000),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      maxUses: 1,
      usageCount: 0,
      isActive: true,
    });
    const transferRequest = await request(
      `/customer/fnb-orders/${portalTableId}/checkout`,
      "POST",
      {
        sessionId: portalSessionId,
        paymentMethod: "transfer",
        voucherCode: checkoutVoucher.code,
      },
      customerToken,
    );
    assert.equal(transferRequest.status, 200, transferRequest.body.message);
    assert.equal(transferRequest.body.data.status, "pending_payment");
    let portalTable = await Table.findById(portalTableId);
    assert.equal(portalTable.currentSession.checkoutState, "pending_payment");
    assert.equal(portalTable.currentSession.isPaused, true);
    const paymentRequests = await request(
      "/customer/fnb-orders/payment-requests",
      "GET",
      undefined,
      cashierToken,
    );
    assert.equal(
      paymentRequests.body.data.some((item) => item.tableId === portalTableId),
      true,
    );
    const pendingPayment = paymentRequests.body.data.find(
      (item) => item.tableId === portalTableId,
    );
    assert.equal(pendingPayment.paymentMethod, "transfer");
    assert.equal(pendingPayment.sessionId, portalSessionId);
    assert.equal(
      pendingPayment.subtotal,
      pendingPayment.playingCost + pendingPayment.fnbTotal,
    );
    assert.equal(
      pendingPayment.totalDue,
      Math.max(
        0,
        pendingPayment.subtotal -
          pendingPayment.membershipDiscountAmount -
          pendingPayment.voucherDiscountAmount -
          pendingPayment.deposit,
      ),
    );
    assert.equal(
      pendingPayment.membershipDiscountAmount,
      portalTable.currentSession.pendingCheckout.membershipDiscountAmount,
    );
    assert.equal(pendingPayment.voucherDiscountAmount, 3000);
    assert.equal(
      (await VoucherReservation.findOne({ sessionId: portalSessionId })).discountAmount,
      3000,
    );
    assert.equal((await Voucher.findById(checkoutVoucher._id)).usageCount, 1);
    const rejectedPayment = await request(
      `/customer/fnb-orders/payment-requests/${portalTableId}`,
      "PATCH",
      { sessionId: portalSessionId, approved: false },
      cashierToken,
    );
    assert.equal(rejectedPayment.body.data.status, "rejected");
    assert.equal(await VoucherReservation.findOne({ sessionId: portalSessionId }), null);
    assert.equal((await Voucher.findById(checkoutVoucher._id)).usageCount, 0);
    portalTable = await Table.findById(portalTableId);
    assert.equal(portalTable.currentSession.checkoutState, "open");
    assert.equal(portalTable.currentSession.isPaused, false);

    const cashRequest = await request(
      `/customer/fnb-orders/${portalTableId}/checkout`,
      "POST",
      {
        sessionId: portalSessionId,
        paymentMethod: "cash",
        voucherCode: checkoutVoucher.code,
      },
      customerToken,
    );
    await Voucher.updateOne({ _id: checkoutVoucher._id }, { $set: { isActive: false } });
    const confirmedPayment = await request(
      `/customer/fnb-orders/payment-requests/${portalTableId}`,
      "PATCH",
      { sessionId: portalSessionId, approved: true },
      cashierToken,
    );
    assert.equal(confirmedPayment.body.data.status, "paid", confirmedPayment.body.message);
    assert.equal(confirmedPayment.body.data.receipt.paymentMethod, "cash");
    assert.equal(confirmedPayment.body.data.receipt.membershipTier, "Bạc");
    assert.equal(confirmedPayment.body.data.receipt.voucherCode, checkoutVoucher.code);
    assert.equal(confirmedPayment.body.data.receipt.voucherDiscountAmount, 3000);
    assert.equal(
      confirmedPayment.body.data.receipt.finalAmount,
      cashRequest.body.data.totalDue,
    );
    assert.equal((await Voucher.findById(checkoutVoucher._id)).usageCount, 1);
    assert.equal(await VoucherReservation.findOne({ sessionId: portalSessionId }), null);
    assert.equal(
      (await VoucherUsage.findOne({ sessionId: portalSessionId })).discountAmount,
      3000,
    );
    assert.equal(
      (await Invoice.findOne({ sessionId: portalSessionId })).status,
      "paid",
    );
    assert.equal((await Table.findById(portalTableId)).currentSession, undefined);
    assert.equal(cashRequest.body.data.status, "pending_payment");

    const walletTableResponse = await request(
      "/tables",
      "POST",
      {
        code: "PORTALCHK2",
        name: "Customer wallet table",
        type: "pool",
        area: "Portal Check",
        pricePerHour: 600000,
        status: "available",
      },
      cashierToken,
    );
    const walletTableId = walletTableResponse.body.data._id;
    const walletOpen = await request(
      `/tables/${walletTableId}/session/open`,
      "POST",
      { customerName: customer.name, customerPhone: customer.phone },
      cashierToken,
    );
    const walletSessionId = walletOpen.body.data.currentSession.sessionId;
    await Wallet.updateOne({ userId: customer._id }, { $set: { balance: 100000 } });
    const walletCheckout = await request(
      `/customer/fnb-orders/${walletTableId}/checkout`,
      "POST",
      { sessionId: walletSessionId, paymentMethod: "member_balance" },
      customerToken,
    );
    assert.equal(walletCheckout.status, 400);
    assert.equal(await Invoice.findOne({ sessionId: walletSessionId }), null);

    const queue = await request("/customer/fnb-orders/queue", "GET", undefined, cashierToken);
    assert.equal(queue.body.data.some((item) => item._id === order._id), true);
    const preparing = await request(
      `/customer/fnb-orders/${order._id}/status`,
      "PATCH",
      { status: "preparing" },
      cashierToken,
    );
    assert.equal(preparing.body.data.status, "preparing");
    assert.equal((await Product.findById(product._id)).stock, 3);
    assert.equal((await Table.findById(tableId)).currentSession.orders.length, 1);
    const ready = await request(
      `/customer/fnb-orders/${order._id}/status`,
      "PATCH",
      { status: "ready" },
      cashierToken,
    );
    assert.equal(ready.body.data.status, "ready");
    const served = await request(
      `/customer/fnb-orders/${order._id}/status`,
      "PATCH",
      { status: "served" },
      cashierToken,
    );
    assert.equal(served.body.data.status, "served");
    const tracked = await request(`/customer/fnb-orders/${order._id}`, "GET", undefined, customerToken);
    assert.equal(tracked.body.data.status, "served");
    const checkout = await request(
      `/tables/${tableId}/session/checkout`,
      "POST",
      { sessionId, discountPercent: 0, paymentMethod: "cash" },
      cashierToken,
    );
    assert.equal(checkout.body.success, true, checkout.body.message);
    assert.equal(checkout.body.data.fnbTotal, 50000);

    const pendingTableResponse = await request(
      "/tables",
      "POST",
      {
        code: "ORDERCHK2",
        name: "Pending payment table",
        type: "pool",
        area: "Order Check",
        pricePerHour: 60000,
        status: "available",
      },
      cashierToken,
    );
    const pendingTableId = pendingTableResponse.body.data._id;
    const pendingOpen = await request(
      `/tables/${pendingTableId}/session/open`,
      "POST",
      { customerName: customer.name, customerPhone: customer.phone },
      cashierToken,
    );
    const pendingSessionId = pendingOpen.body.data.currentSession.sessionId;
    const pendingTable = await Table.findById(pendingTableId);
    pendingTable.currentSession.checkoutState = "pending_payment";
    await pendingTable.save();
    const blockedPaymentOrder = await request(
      "/customer/fnb-orders",
      "POST",
      {
        tableId: pendingTableId,
        sessionId: pendingSessionId,
        items: [{ productId: String(product._id), quantity: 1 }],
      },
      customerToken,
    );
    assert.equal(blockedPaymentOrder.status, 409);
    pendingTable.currentSession.checkoutState = "checkout";
    await pendingTable.save();
    const blockedCheckoutOrder = await request(
      "/customer/fnb-orders",
      "POST",
      {
        tableId: pendingTableId,
        sessionId: pendingSessionId,
        items: [{ productId: String(product._id), quantity: 1 }],
      },
      customerToken,
    );
    assert.equal(blockedCheckoutOrder.status, 409);

    console.log(
      "PASS: customer table and live quote, wallet and pending cash/transfer checkout, staff confirmation, F&B orders, stock and session guards",
    );
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
