import request from "supertest";
import jwt from "jsonwebtoken";
import { App } from "../src/app";
import { appConfig } from "../src/config/app.config";

const app = new App().app;
const base = "/api/v1/auth";

const expiredPayload = {
  userId: "64b000000000000000000000",
  email: "expired@test.local",
  role: "customer",
};

function expiredAccessToken(): string {
  return jwt.sign(expiredPayload, appConfig.jwt.secret, { expiresIn: "-10s" });
}

function expiredRefreshToken(): string {
  return jwt.sign(expiredPayload, appConfig.jwt.refreshSecret, { expiresIn: "-10s" });
}

let seq = 0;
async function registerAndGetTokens() {
  const res = await request(app).post(`${base}/register`).send({
    name: "Token User",
    email: `token_${Date.now()}_${seq++}@test.local`,
    password: "Password123",
  });
  expect(res.body.success).toBe(true);
  return res.body.data as { accessToken: string; refreshToken: string };
}

describe("GET /auth/profile - access token", () => {
  test("không có token → 401", async () => {
    const res = await request(app).get(`${base}/profile`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Không có token xác thực");
  });

  test("access token hết hạn → 401 'Token không hợp lệ hoặc đã hết hạn'", async () => {
    const res = await request(app)
      .get(`${base}/profile`)
      .set("Authorization", `Bearer ${expiredAccessToken()}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Token không hợp lệ hoặc đã hết hạn");
  });

  test("access token ký sai secret → 401", async () => {
    const forged = jwt.sign(expiredPayload, "wrong_secret", { expiresIn: "1h" });

    const res = await request(app)
      .get(`${base}/profile`)
      .set("Authorization", `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("access token hợp lệ → 200 success:true", async () => {
    const { accessToken } = await registerAndGetTokens();

    const res = await request(app)
      .get(`${base}/profile`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBeDefined();
    expect(res.body.data.password).toBeUndefined();
  });
});

describe("POST /auth/refresh-token - refresh token", () => {
  test("refresh token hết hạn → success:false 'Refresh token không hợp lệ hoặc đã hết hạn'", async () => {
    const res = await request(app)
      .post(`${base}/refresh-token`)
      .send({ refreshToken: expiredRefreshToken() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Refresh token không hợp lệ hoặc đã hết hạn");
  });

  test("refresh token rỗng/garbage → success:false", async () => {
    const res = await request(app)
      .post(`${base}/refresh-token`)
      .send({ refreshToken: "not-a-jwt" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Refresh token không hợp lệ hoặc đã hết hạn");
  });

  test("refresh token hợp lệ → cấp lại accessToken mới", async () => {
    const { refreshToken } = await registerAndGetTokens();

    const res = await request(app)
      .post(`${base}/refresh-token`)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });
});

describe("POST /auth/change-password - bắt buộc JWT", () => {
  test("không có token → 401", async () => {
    const res = await request(app)
      .post(`${base}/change-password/request`)
      .send({ currentPassword: "OldPass123", newPassword: "NewPass123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Không có token xác thực");
  });

  test("access token hết hạn → 401", async () => {
    const res = await request(app)
      .post(`${base}/change-password/request`)
      .set("Authorization", `Bearer ${expiredAccessToken()}`)
      .send({ currentPassword: "OldPass123", newPassword: "NewPass123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Token không hợp lệ hoặc đã hết hạn");
  });
});
