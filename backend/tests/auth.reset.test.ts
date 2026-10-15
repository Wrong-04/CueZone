import request from "supertest";
import { App } from "../src/app";
import { PasswordReset, ResetPurpose } from "../src/modules/auth/passwordReset.model";

const app = new App().app;
const base = "/api/v1/auth";

let seq = 0;
const uniqueEmail = () => `reset_${Date.now()}_${seq++}@test.local`;

async function createTestUser(email: string, password = "OldPass123") {
  const res = await request(app).post(`${base}/register`).send({
    name: "Reset User",
    email,
    password,
  });
  expect(res.body.success).toBe(true);
}

async function seedResetOtp(
  email: string,
  code: string,
  opts: { attempts?: number; expiresInMs?: number } = {}
) {
  await PasswordReset.findOneAndUpdate(
    { email: email.toLowerCase(), purpose: ResetPurpose.RESET },
    {
      email: email.toLowerCase(),
      purpose: ResetPurpose.RESET,
      code,
      attempts: opts.attempts ?? 0,
      expiresAt: new Date(Date.now() + (opts.expiresInMs ?? 5 * 60 * 1000)),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

describe("POST /auth/forgot-password - gửi OTP đặt lại mật khẩu", () => {
  test("email chưa đăng ký → success:false", async () => {
    const res = await request(app)
      .post(`${base}/forgot-password`)
      .send({ email: "nobody@test.local" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email chưa được đăng ký tài khoản");
  });

  test("email rỗng → success:false", async () => {
    const res = await request(app).post(`${base}/forgot-password`).send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email không được để trống");
  });

  test("hợp lệ → tạo OTP 4 số, hiệu lực 5 phút", async () => {
    const email = uniqueEmail();
    await createTestUser(email);

    const res = await request(app).post(`${base}/forgot-password`).send({ email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const record = await PasswordReset.findOne({ email, purpose: ResetPurpose.RESET });
    expect(record).not.toBeNull();
    expect(record!.code).toMatch(/^\d{4}$/);
    expect(record!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(record!.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000 + 1000);
  });
});

describe("POST /auth/reset-password - validate OTP & token expiry", () => {
  test("OTP đã hết hạn → 'Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới.'", async () => {
    const email = uniqueEmail();
    await createTestUser(email);
    await seedResetOtp(email, "1234", { expiresInMs: -60 * 1000 });

    const res = await request(app).post(`${base}/reset-password`).send({
      email,
      code: "1234",
      newPassword: "NewPass123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới.");
  });

  test("chưa yêu cầu OTP → success:false", async () => {
    const email = uniqueEmail();
    await createTestUser(email);

    const res = await request(app).post(`${base}/reset-password`).send({
      email,
      code: "1234",
      newPassword: "NewPass123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe(
      "Không tìm thấy yêu cầu đặt lại mật khẩu. Vui lòng yêu cầu mã mới."
    );
  });

  test("sai OTP → báo còn N lần thử", async () => {
    const email = uniqueEmail();
    await createTestUser(email);
    await seedResetOtp(email, "9999");

    const res = await request(app).post(`${base}/reset-password`).send({
      email,
      code: "1111",
      newPassword: "NewPass123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Mã xác minh không chính xác. Còn 4 lần thử.");
  });

  test("sai OTP quá 5 lần → khóa nhập", async () => {
    const email = uniqueEmail();
    await createTestUser(email);
    await seedResetOtp(email, "9999", { attempts: 5 });

    const res = await request(app).post(`${base}/reset-password`).send({
      email,
      code: "1111",
      newPassword: "NewPass123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.");
  });

  test("OTP đúng nhưng mật khẩu mới không hợp lệ → success:false", async () => {
    const email = uniqueEmail();
    await createTestUser(email);
    await seedResetOtp(email, "9999");

    const res = await request(app).post(`${base}/reset-password`).send({
      email,
      code: "9999",
      newPassword: "abc",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Mật khẩu phải có ít nhất 8 ký tự");
  });

  test("happy path: OTP đúng → đổi mật khẩu → login mật khẩu mới", async () => {
    const email = uniqueEmail();
    await createTestUser(email);

    const forgot = await request(app).post(`${base}/forgot-password`).send({ email });
    expect(forgot.body.success).toBe(true);

    const record = await PasswordReset.findOne({ email, purpose: ResetPurpose.RESET });
    expect(record).not.toBeNull();

    const reset = await request(app).post(`${base}/reset-password`).send({
      email,
      code: record!.code,
      newPassword: "NewPass123",
    });
    expect(reset.status).toBe(200);
    expect(reset.body.success).toBe(true);

    // Mật khẩu cũ không còn dùng được
    const oldLogin = await request(app)
      .post(`${base}/login`)
      .send({ email, password: "OldPass123" });
    expect(oldLogin.body.success).toBe(false);

    // Mật khẩu mới đăng nhập được
    const newLogin = await request(app)
      .post(`${base}/login`)
      .send({ email, password: "NewPass123" });
    expect(newLogin.body.success).toBe(true);
    expect(newLogin.body.data.accessToken).toBeDefined();

    // OTP đã bị xóa, dùng lại không được
    const reuse = await request(app).post(`${base}/reset-password`).send({
      email,
      code: record!.code,
      newPassword: "Another123",
    });
    expect(reuse.body.success).toBe(false);
  });
});

describe("POST /auth/change-password - đổi mật khẩu khi đã đăng nhập", () => {
  async function login(email: string, password: string) {
    const res = await request(app).post(`${base}/login`).send({ email, password });
    expect(res.body.success).toBe(true);
    return res.body.data.accessToken as string;
  }

  test("sai mật khẩu hiện tại → success:false", async () => {
    const email = uniqueEmail();
    await createTestUser(email);
    const token = await login(email, "OldPass123");

    const res = await request(app)
      .post(`${base}/change-password/request`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "WrongPass123", newPassword: "NewPass123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Mật khẩu hiện tại không chính xác");
  });

  test("mật khẩu mới trùng mật khẩu hiện tại → success:false", async () => {
    const email = uniqueEmail();
    await createTestUser(email);
    const token = await login(email, "OldPass123");

    const res = await request(app)
      .post(`${base}/change-password/request`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "OldPass123", newPassword: "OldPass123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Mật khẩu mới phải khác mật khẩu hiện tại");
  });

  test("happy path: request → OTP → verify → login mật khẩu mới", async () => {
    const email = uniqueEmail();
    await createTestUser(email);
    const token = await login(email, "OldPass123");

    const requestOtp = await request(app)
      .post(`${base}/change-password/request`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "OldPass123", newPassword: "NewPass123" });
    expect(requestOtp.status).toBe(200);
    expect(requestOtp.body.success).toBe(true);

    const record = await PasswordReset.findOne({ email, purpose: ResetPurpose.CHANGE });
    expect(record).not.toBeNull();
    expect(record!.code).toMatch(/^\d{4}$/);

    const verify = await request(app)
      .post(`${base}/change-password/verify`)
      .set("Authorization", `Bearer ${token}`)
      .send({ code: record!.code, newPassword: "NewPass123" });
    expect(verify.status).toBe(200);
    expect(verify.body.success).toBe(true);

    const newLogin = await request(app)
      .post(`${base}/login`)
      .send({ email, password: "NewPass123" });
    expect(newLogin.body.success).toBe(true);

    const oldLogin = await request(app)
      .post(`${base}/login`)
      .send({ email, password: "OldPass123" });
    expect(oldLogin.body.success).toBe(false);
  });
});
