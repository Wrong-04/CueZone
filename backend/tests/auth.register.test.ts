import request from "supertest";
import { App } from "../src/app";
import { EmailVerification } from "../src/modules/auth/emailVerification.model";

const app = new App().app;
const base = "/api/v1/auth";

let seq = 0;
const uniqueEmail = () => `user_${Date.now()}_${seq++}@test.local`;

async function registerUser(overrides: Record<string, unknown> = {}) {
  return request(app)
    .post(`${base}/register`)
    .send({
      name: "Test User",
      email: uniqueEmail(),
      password: "Password123",
      phone: `09${Math.floor(Math.random() * 1e8)}`,
      ...overrides,
    });
}

describe("POST /auth/register - validate duplicate email/phone", () => {
  test("đăng ký thành công trả về accessToken/refreshToken", async () => {
    const res = await registerUser();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  test("email trùng → success:false 'Email đã được sử dụng'", async () => {
    await registerUser({ email: "dup@test.local", phone: "0900000001" });
    const res = await registerUser({ email: "dup@test.local", phone: "0900000002" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email đã được sử dụng");
  });

  test("phone trùng → success:false 'Số điện thoại đã được sử dụng'", async () => {
    await registerUser({ email: "phone_owner@test.local", phone: "0912345678" });
    const res = await registerUser({ email: "phone_other@test.local", phone: "0912345678" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Số điện thoại đã được sử dụng");
  });

  test("phone không truyền vẫn đăng ký được (sparse unique)", async () => {
    const first = await registerUser({ email: "nophone1@test.local", phone: "" });
    const second = await registerUser({ email: "nophone2@test.local" });

    expect(first.body.success).toBe(true);
    expect(second.body.success).toBe(true);
  });
});

describe("POST /auth/register/request - OTP xác thực email", () => {
  test("email đã tồn tại → success:false 'Email đã được sử dụng'", async () => {
    await registerUser({ email: "exists@test.local" });

    const res = await request(app).post(`${base}/register/request`).send({
      name: "Another",
      email: "exists@test.local",
      password: "Password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email đã được sử dụng");
  });

  test("phone trùng → success:false 'Số điện thoại đã được sử dụng'", async () => {
    await registerUser({ email: "owner@test.local", phone: "0955555555" });

    const res = await request(app).post(`${base}/register/request`).send({
      name: "New User",
      email: uniqueEmail(),
      password: "Password123",
      phone: "0955555555",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Số điện thoại đã được sử dụng");
  });

  test("gửi OTP thành công → tạo record OTP 4 số (NODE_ENV=test log ra console)", async () => {
    const email = uniqueEmail();

    const res = await request(app).post(`${base}/register/request`).send({
      name: "OTP Flow",
      email,
      password: "Password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const pending = await EmailVerification.findOne({ email });
    expect(pending).not.toBeNull();
    expect(pending!.code).toMatch(/^\d{4}$/);
    expect(pending!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
