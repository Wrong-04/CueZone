// Run from backend: pnpm exec node scripts/check-auth.cjs
// Automated test for SCRUM-724: User Registration
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { App } = require("../dist/app");
const { User, UserRole } = require("../dist/modules/user/user.model");
const { EmailVerification } = require("../dist/modules/auth/emailVerification.model");

async function main() {
  const dbName = `cz_check_${randomUUID().slice(0, 18)}`;
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db", {
      dbName,
      serverSelectionTimeoutMS: 5000,
    });
    await Promise.all([User.init(), EmailVerification.init()]);
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
      const data = await response.json();
      return { status: response.status, ...data };
    }

    console.log("--- 1. Test validation đầu vào (SCRUM-725) ---");

    const r1 = await request("/auth/register", "POST", {
      name: "",
      email: "test@cuezone.vn",
      password: "Password123",
    });
    assert.equal(r1.success, false);
    assert.ok(r1.message.includes("Họ và tên"));

    const r2 = await request("/auth/register", "POST", {
      name: "Nguyen Van A",
      email: "not-an-email",
      password: "Password123",
    });
    assert.equal(r2.success, false);
    assert.ok(r2.message.includes("Email"));

    const r3 = await request("/auth/register", "POST", {
      name: "Nguyen Van A",
      email: "valid@cuezone.vn",
      password: "short",
    });
    assert.equal(r3.success, false);
    assert.ok(r3.message.includes("Mật khẩu"));

    const r4 = await request("/auth/register", "POST", {
      name: "Nguyen Van A",
      email: "valid@cuezone.vn",
      password: "Password123",
      phone: "12345",
    });
    assert.equal(r4.success, false);
    assert.ok(r4.message.includes("Số điện thoại"));

    console.log(
      "--- 2. Test đăng ký thành công & Role mặc định customer (SCRUM-726, SCRUM-729) ---",
    );
    const registerData = {
      name: "Nguyen Van A",
      email: "customer1@cuezone.vn",
      password: "Password123",
      phone: "0912345678",
    };
    const regRes = await request("/auth/register", "POST", registerData);
    assert.equal(regRes.success, true);
    assert.equal(regRes.status, 201);
    assert.ok(regRes.data.accessToken);
    assert.ok(regRes.data.user);
    assert.equal(regRes.data.user.role, "customer");
    assert.equal(regRes.data.user.email, "customer1@cuezone.vn");
    assert.equal(regRes.data.user.phone, "0912345678");

    assert.equal(regRes.data.user.password, undefined);

    console.log("--- 3. Test mã hóa mật khẩu bằng Bcrypt (SCRUM-728) ---");
    const userInDb = await User.findOne({ email: "customer1@cuezone.vn" }).select("+password");
    assert.ok(userInDb);
    assert.notEqual(userInDb.password, "Password123");
    const isMatch = await bcrypt.compare("Password123", userInDb.password);
    assert.equal(isMatch, true, "Bcrypt hash must match candidate password");

    console.log("--- 4. Test kiểm tra tính duy nhất Email & Số điện thoại (SCRUM-725) ---");

    const duplicateEmail = await request("/auth/register", "POST", {
      name: "Duplicate Email User",
      email: "customer1@cuezone.vn",
      password: "Password123",
      phone: "0987654321",
    });
    assert.equal(duplicateEmail.success, false);
    assert.ok(duplicateEmail.message.includes("Email đã được sử dụng"));

    const duplicatePhone = await request("/auth/register", "POST", {
      name: "Duplicate Phone User",
      email: "another@cuezone.vn",
      password: "Password123",
      phone: "0912345678",
    });
    assert.equal(duplicatePhone.success, false);
    assert.ok(duplicatePhone.message.includes("Số điện thoại đã được sử dụng"));

    console.log("--- 5. Test luồng xác thực Email & OTP (SCRUM-727, SCRUM-730) ---");

    const otpCode = "654321";
    await EmailVerification.create({
      name: "Khach OTP",
      email: "customer2@cuezone.vn",
      password: "Password123",
      phone: "0988888888",
      code: otpCode,
      attempts: 0,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const wrongOtp = await request("/auth/register/verify", "POST", {
      email: "customer2@cuezone.vn",
      code: "000000",
    });
    assert.equal(wrongOtp.success, false);
    assert.ok(wrongOtp.message.includes("Mã xác minh không chính xác"));

    const correctOtp = await request("/auth/register/verify", "POST", {
      email: "customer2@cuezone.vn",
      code: otpCode,
    });
    assert.equal(correctOtp.success, true);
    assert.equal(correctOtp.status, 201);
    assert.equal(correctOtp.data.user.role, "customer");
    assert.equal(correctOtp.data.user.email, "customer2@cuezone.vn");
    assert.equal(correctOtp.data.user.phone, "0988888888");

    const pendingCleaned = await EmailVerification.findOne({ email: "customer2@cuezone.vn" });
    assert.equal(pendingCleaned, null);

    console.log("✅ ALL SCRUM-724 REGISTRATION TESTS PASSED!");

    console.log("\n======================================================");
    console.log("TEST BỔ SUNG CHO SCRUM-732: ĐĂNG NHẬP VÀ XÁC THỰC JWT");
    console.log("======================================================");

    const { Role } = require("../dist/modules/role/role.model");
    await Role.init();
    await Role.create([
      {
        name: "staff",
        displayName: "Nhân viên sàn",
        permissions: [{ module: "tables", actions: ["read", "update"] }],
      },
      {
        name: "admin",
        displayName: "Quản trị viên",
        permissions: [{ module: "users", actions: ["*"] }],
      },
      {
        name: "customer",
        displayName: "Khách hàng",
        permissions: [{ module: "bookings", actions: ["create"] }],
      },
    ]);

    await User.create([
      {
        name: "Staff User",
        email: "staff1@cuezone.vn",
        phone: "0977111222",
        password: "Password123",
        role: "staff",
        isActive: true,
        isLocked: false,
      },
      {
        name: "Locked User",
        email: "locked@cuezone.vn",
        phone: "0977333444",
        password: "Password123",
        role: "customer",
        isActive: true,
        isLocked: true,
      },
      {
        name: "Inactive User",
        email: "inactive@cuezone.vn",
        phone: "0977555666",
        password: "Password123",
        role: "customer",
        isActive: false,
        isLocked: false,
      },
    ]);

    console.log("--- 6. Test Đăng nhập thất bại (SCRUM-736) ---");

    const wrongPass = await request("/auth/login", "POST", {
      email: "staff1@cuezone.vn",
      password: "WrongPassword123",
    });
    assert.equal(wrongPass.success, false);
    assert.ok(wrongPass.message.includes("Email hoặc mật khẩu không chính xác"));

    const lockedRes = await request("/auth/login", "POST", {
      email: "locked@cuezone.vn",
      password: "Password123",
    });
    assert.equal(lockedRes.success, false);
    assert.ok(lockedRes.message.includes("Tài khoản đã bị khóa"));

    const inactiveRes = await request("/auth/login", "POST", {
      email: "inactive@cuezone.vn",
      password: "Password123",
    });
    assert.equal(inactiveRes.success, false);
    assert.ok(inactiveRes.message.includes("Tài khoản đã bị vô hiệu hóa"));

    console.log("--- 7. Test Đăng nhập thành công và Trả về Permissions (SCRUM-733, 735, 737) ---");

    const loginEmail = await request("/auth/login", "POST", {
      email: "staff1@cuezone.vn",
      password: "Password123",
    });
    assert.equal(loginEmail.success, true);
    assert.ok(loginEmail.data.accessToken, "Phải có accessToken");
    assert.ok(loginEmail.data.refreshToken, "Phải có refreshToken");
    assert.equal(loginEmail.data.user.email, "staff1@cuezone.vn");
    assert.ok(!("password" in loginEmail.data.user), "Mật khẩu không được lộ trong response");
    assert.ok(
      Array.isArray(loginEmail.data.user.permissions),
      "User response phải có mảng permissions",
    );
    assert.equal(loginEmail.data.user.permissions[0].module, "tables");
    assert.deepEqual(loginEmail.data.user.permissions[0].actions, ["read", "update"]);

    const loginPhone = await request("/auth/login", "POST", {
      phone: "0977111222",
      password: "Password123",
    });
    assert.equal(loginPhone.success, true);
    assert.equal(loginPhone.data.user.email, "staff1@cuezone.vn");

    const accessToken = loginEmail.data.accessToken;
    const refreshToken = loginEmail.data.refreshToken;

    console.log("--- 8. Test lấy thông tin cá nhân Profile (SCRUM-737) ---");
    const profileRes = await request("/auth/profile", "GET", undefined, accessToken);
    assert.equal(profileRes.success, true);
    assert.equal(profileRes.data.email, "staff1@cuezone.vn");
    assert.ok(Array.isArray(profileRes.data.permissions), "Profile phải có mảng permissions");
    assert.equal(profileRes.data.permissions[0].module, "tables");

    console.log("--- 9. Test Làm mới Token bằng Refresh Token (SCRUM-734) ---");
    const refreshRes = await request("/auth/refresh-token", "POST", { refreshToken });
    assert.equal(refreshRes.success, true);
    assert.ok(refreshRes.data.accessToken, "Access token mới phải tồn tại");
    assert.ok(refreshRes.data.refreshToken, "Refresh token mới phải tồn tại");

    const invalidRefresh = await request("/auth/refresh-token", "POST", {
      refreshToken: "invalid.token",
    });
    assert.equal(invalidRefresh.success, false);

    console.log("--- 10. Test Middleware xác thực và phân quyền JWT (SCRUM-738) ---");

    const noTokenRes = await request("/users", "GET");
    assert.equal(noTokenRes.success, false);

    const forbiddenRes = await request("/users", "GET", undefined, accessToken);
    assert.equal(forbiddenRes.success, false);

    console.log("✅ ALL SCRUM-732 AUTH & JWT TESTS PASSED!");
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
}

main().catch((err) => {
  console.error("❌ Check auth failed:", err);
  process.exit(1);
});
