require("dotenv/config");
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (error) {}
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");
const { App } = require("../dist/app");
const { User } = require("../dist/modules/user/user.model");
const { Notification } = require("../dist/modules/notification/notification.model");
const { NotificationService } = require("../dist/modules/notification/notification.service");

async function main() {
  const dbName = `cz_notification_check_${randomUUID().slice(0, 16)}`;
  let server;

  try {
    console.log("Connecting to MongoDB using a temporary database...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db", {
      dbName,
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected; preparing indexes...");
    await Promise.all([User.init(), Notification.init()]);

    server = new App().app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    console.log("Temporary API server started; running notification checks...");

    async function request(path, method = "GET", body, token) {
      const response = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, ...(await response.json()) };
    }

    const staff = await User.create({
      name: "Notification Check Staff",
      email: "notification-staff@check.invalid",
      password: "CheckPassword123",
      role: "staff",
    });
    const customer = await User.create({
      name: "Notification Check Customer",
      email: "notification-customer@check.invalid",
      password: "CheckPassword123",
      role: "customer",
    });

    const staffLogin = await request("/auth/login", "POST", {
      email: "notification-staff@check.invalid",
      password: "CheckPassword123",
    });
    const customerLogin = await request("/auth/login", "POST", {
      email: "notification-customer@check.invalid",
      password: "CheckPassword123",
    });
    assert.equal(staffLogin.success, true, staffLogin.message);
    assert.equal(customerLogin.success, true, customerLogin.message);

    const staffToken = staffLogin.data.accessToken;
    const customerToken = customerLogin.data.accessToken;
    assert.equal((await request("/notifications")).status, 401);

    const created = await request(
      "/notifications",
      "POST",
      {
        title: "Thông báo kiểm tra",
        content: "Nội dung chỉ thuộc về nhân viên tạo thông báo.",
        userId: String(customer._id),
      },
      staffToken,
    );
    assert.equal(created.status, 201, created.message);
    assert.equal(created.data.userId, String(staff._id));
    assert.equal(created.data.content, "Nội dung chỉ thuộc về nhân viên tạo thông báo.");
    assert.equal(created.data.isRead, false);

    const customerCreated = await request(
      "/notifications",
      "POST",
      {
        title: "Thông báo riêng của khách",
        content: "Không hiển thị cho nhân viên.",
      },
      customerToken,
    );
    assert.equal(customerCreated.success, true, customerCreated.message);

    const staffPage = await request("/notifications?page=1&limit=1", "GET", undefined, staffToken);
    assert.equal(staffPage.success, true, staffPage.message);
    assert.equal(staffPage.data.notifications.length, 1);
    assert.equal(staffPage.data.notifications[0]._id, created.data._id);
    assert.equal(staffPage.data.pagination.total, 1);
    assert.equal(staffPage.data.pagination.totalPages, 1);
    assert.equal(staffPage.data.unreadCount, 1);

    const customerPage = await request("/notifications", "GET", undefined, customerToken);
    assert.equal(customerPage.success, true, customerPage.message);
    assert.equal(customerPage.data.notifications.length, 1);
    assert.equal(customerPage.data.notifications[0]._id, customerCreated.data._id);

    const wrongOwnerRead = await request(
      `/notifications/${created.data._id}/read`,
      "PUT",
      {},
      customerToken,
    );
    assert.equal(wrongOwnerRead.status, 404);

    const markedRead = await request(
      `/notifications/${created.data._id}/read`,
      "PUT",
      {},
      staffToken,
    );
    assert.equal(markedRead.success, true, markedRead.message);
    assert.equal(markedRead.data.isRead, true);

    const staffUnread = await request("/notifications/unread-count", "GET", undefined, staffToken);
    const customerUnread = await request(
      "/notifications/unread-count",
      "GET",
      undefined,
      customerToken,
    );
    assert.equal(staffUnread.data.unreadCount, 0);
    assert.equal(customerUnread.data.unreadCount, 1);
    assert.equal(
      (await request("/notifications?page=1&limit=101", "GET", undefined, staffToken)).status,
      400,
    );

    await new NotificationService().create({
      title: "Thông báo hệ thống mẫu",
      message: "Thông báo phát sinh từ thao tác quản trị.",
    });
    assert.equal(await Notification.countDocuments({ userId: staff._id }), 2);
    assert.equal(await Notification.countDocuments({ userId: customer._id }), 1);

    console.log(
      "PASS: notification create, ownership filtering, pagination, unread count, mark-read and staff fan-out",
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
