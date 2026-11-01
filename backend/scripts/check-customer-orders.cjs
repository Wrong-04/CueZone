// Run from backend: pnpm check:customer-orders
// Uses a disposable MongoDB database and requires transaction support.
require("dotenv/config");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { App } = require("../dist/app");
const { User } = require("../dist/modules/user/user.model");
const { Product } = require("../dist/modules/product/product.model");
const { Table } = require("../dist/modules/table/table.model");
const { CustomerOrder } = require("../dist/modules/customer-order/customer-order.model");

async function main() {
  const dbName = `cz_order_${crypto.randomUUID().slice(0, 20)}`;
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db", {
      dbName,
      serverSelectionTimeoutMS: 8000,
    });
    await Promise.all([User.init(), Product.init(), Table.init(), CustomerOrder.init()]);
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
    assert.equal(customerLogin.body.success, true, customerLogin.body.message);
    assert.equal(cashierLogin.body.success, true, cashierLogin.body.message);
    const customerToken = customerLogin.body.data.accessToken;
    const cashierToken = cashierLogin.body.data.accessToken;

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
      { customerName: customer.name, customerPhone: customer.phone },
      cashierToken,
    );
    assert.equal(opened.body.success, true, opened.body.message);
    const sessionId = opened.body.data.currentSession.sessionId;

    const activeTables = await request(
      "/customer/fnb-orders/active-tables",
      "GET",
      undefined,
      customerToken,
    );
    assert.equal(activeTables.body.data.length, 1);
    assert.equal(activeTables.body.data[0].tableId, tableId);
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

    console.log("PASS: customer table verification, pending order, staff queue, status tracking, stock and checkout-state guard");
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
