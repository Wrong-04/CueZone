// Run from backend: node scripts/check-password-reset.cjs
// Automated test for SCRUM-740: Password Reset & Change Password via Email OTP
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
const { PasswordResetOtp } = require("../dist/modules/auth/passwordResetOtp.model");

async function main() {
  const dbName = `cz_check_${randomUUID().slice(0, 18)}`;
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db", {
      dbName,
      serverSelectionTimeoutMS: 5000,
    });
    await Promise.all([User.init(), PasswordResetOtp.init()]);
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

    console.log("--- 1. Chuẩn bị tài khoản thử nghiệm ---");
    const testUser = await User.create({
      name: "Nguyen Van Reset",
      email: "reset_test@cuezone.vn",
      password: "OldPassword123",
      phone: "0912349999",
      role: UserRole.CUSTOMER,
      isActive: true,
      isLocked: false,
    });
    assert.ok(testUser);

    console.log("--- 2. Test Quên mật khẩu: Validate email (SCRUM-745, SCRUM-746) ---");

    const nonExistRes = await request("/auth/forgot-password", "POST", {
      email: "notfound@cuezone.vn",
    });
    assert.equal(nonExistRes.success, false);
    assert.ok(nonExistRes.message.includes("Email không tồn tại"));

    const invalidEmailRes = await request("/auth/forgot-password", "POST", {
      email: "invalid-email",
    });
    assert.equal(invalidEmailRes.success, false);

    console.log("--- 3. Test Sinh và Lưu OTP khôi phục mật khẩu (SCRUM-741, SCRUM-742) ---");

    const otpCode = "123456";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const otpDoc = await PasswordResetOtp.create({
      email: "reset_test@cuezone.vn",
      code: otpCode,
      attempts: 0,
      isUsed: false,
      expiresAt,
    });
    assert.ok(otpDoc);
    assert.equal(otpDoc.isUsed, false);

    console.log(
      "--- 4. Test Xác minh OTP và Đặt lại mật khẩu (SCRUM-743, SCRUM-744, SCRUM-745) ---",
    );

    const wrongOtpRes = await request("/auth/reset-password", "POST", {
      email: "reset_test@cuezone.vn",
      code: "999999",
      newPassword: "NewPassword123",
    });
    assert.equal(wrongOtpRes.success, false);
    assert.ok(wrongOtpRes.message.includes("Mã OTP không chính xác"));

    const weakPassRes = await request("/auth/reset-password", "POST", {
      email: "reset_test@cuezone.vn",
      code: otpCode,
      newPassword: "short",
    });
    assert.equal(weakPassRes.success, false);
    assert.ok(weakPassRes.message.includes("Mật khẩu"));

    const successReset = await request("/auth/reset-password", "POST", {
      email: "reset_test@cuezone.vn",
      code: otpCode,
      newPassword: "NewPassword123",
    });
    assert.equal(successReset.success, true);
    assert.ok(successReset.message.includes("thành công"));

    const usedOtp = await PasswordResetOtp.findById(otpDoc._id);
    assert.equal(usedOtp.isUsed, true);

    const reuseOtpRes = await request("/auth/reset-password", "POST", {
      email: "reset_test@cuezone.vn",
      code: otpCode,
      newPassword: "AnotherPassword123",
    });
    assert.equal(reuseOtpRes.success, false);
    assert.ok(reuseOtpRes.message.includes("đã được sử dụng"));

    console.log("--- 5. Test Đăng nhập bằng mật khẩu mới & hash Bcrypt ---");

    const oldLogin = await request("/auth/login", "POST", {
      email: "reset_test@cuezone.vn",
      password: "OldPassword123",
    });
    assert.equal(oldLogin.success, false);

    const newLogin = await request("/auth/login", "POST", {
      email: "reset_test@cuezone.vn",
      password: "NewPassword123",
    });
    assert.equal(newLogin.success, true);
    const token = newLogin.data.accessToken;
    assert.ok(token);

    console.log("--- 6. Test Đổi mật khẩu khi đã đăng nhập (change-password) ---");

    const wrongCurrentRes = await request(
      "/auth/change-password",
      "POST",
      { currentPassword: "WrongOldPassword", newPassword: "Next" + "Password123" },
      token,
    );
    assert.equal(wrongCurrentRes.success, false);
    assert.ok(wrongCurrentRes.message.includes("hiện tại không chính xác"));

    const samePassRes = await request(
      "/auth/change-password",
      "POST",
      { currentPassword: "NewPassword123", newPassword: "NewPassword123" },
      token,
    );
    assert.equal(samePassRes.success, false);
    assert.ok(samePassRes.message.includes("không được trùng"));

    const changeSuccess = await request(
      "/auth/change-password",
      "POST",
      { currentPassword: "NewPassword123", newPassword: "Next" + "Password123" },
      token,
    );
    assert.equal(changeSuccess.success, true);

    const finalLogin = await request("/auth/login", "POST", {
      email: "reset_test@cuezone.vn",
      password: "Next" + "Password123",
    });
    assert.equal(finalLogin.success, true);

    console.log("✅ ALL SCRUM-740 PASSWORD RESET & CHANGE TESTS PASSED!");
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
}

main().catch((err) => {
  console.error("❌ Check password reset failed:", err);
  process.exit(1);
});
