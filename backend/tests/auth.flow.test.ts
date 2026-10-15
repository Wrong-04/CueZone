import request from "supertest";
import { App } from "../src/app";
import { EmailVerification } from "../src/modules/auth/emailVerification.model";

const app = new App().app;
const base = "/api/v1/auth";

let seq = 0;
const uniqueEmail = () => `flow_${Date.now()}_${seq++}@test.local`;
const PASSWORD = "Password123";

async function requestOtp(email: string, name = "Flow User") {
  return request(app)
    .post(`${base}/register/request`)
    .send({ name, email, password: PASSWORD });
}

describe("Luồng đăng ký → nhận OTP → xác minh → đăng nhập → session", () => {
  test("happy path: request OTP → verify → profile → login → session hoạt động", async () => {
    const email = uniqueEmail();

    // 1. Gửi yêu cầu xác thực email (NODE_ENV=test → không gửi mail thật, OTP nằm trong DB)
    const reqRes = await requestOtp(email);
    expect(reqRes.status).toBe(200);
    expect(reqRes.body.success).toBe(true);

    // 2. Lấy OTP vừa tạo
    const pending = await EmailVerification.findOne({ email });
    expect(pending).not.toBeNull();
    const code = pending!.code;
    expect(code).toMatch(/^\d{4}$/);

    // 3. Verify OTP → trả accessToken/refreshToken + user không kèm password
    const verifyRes = await request(app)
      .post(`${base}/register/verify`)
      .send({ email, code });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    const { accessToken: verifyToken, refreshToken, user } = verifyRes.body.data;
    expect(verifyToken).toBeDefined();
    expect(refreshToken).toBeDefined();
    expect(user.email).toBe(email);
    expect(user.password).toBeUndefined();

    // 4. "Lưu session": dùng access token vừa nhận gọi profile được
    const profileRes = await request(app)
      .get(`${base}/profile`)
      .set("Authorization", `Bearer ${verifyToken}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.success).toBe(true);
    expect(profileRes.body.data.email).toBe(email);

    // 5. OTP đã dùng → bị xóa, không dùng lại được
    const reused = await request(app)
      .post(`${base}/register/verify`)
      .send({ email, code });
    expect(reused.body.success).toBe(false);
    expect(reused.body.message).toBe(
      "Không tìm thấy yêu cầu xác minh. Vui lòng yêu cầu mã mới."
    );

    // 6. Đăng nhập bằng mật khẩu đã đăng ký
    const loginRes = await request(app)
      .post(`${base}/login`)
      .send({ email, password: PASSWORD });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeDefined();
    expect(loginRes.body.data.user.email).toBe(email);

    // 7. Token từ login dùng được (session mới hoạt động)
    const profile2 = await request(app)
      .get(`${base}/profile`)
      .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`);
    expect(profile2.status).toBe(200);
    expect(profile2.body.success).toBe(true);

    // 8. Đăng nhập sai mật khẩu → từ chối
    const badRes = await request(app)
      .post(`${base}/login`)
      .send({ email, password: "WrongPass1" });
    expect(badRes.body.success).toBe(false);
    expect(badRes.body.message).toBe("Email hoặc mật khẩu không chính xác");

    // 9. Email không tồn tại → cùng message (không lộ thông tin)
    const ghostRes = await request(app)
      .post(`${base}/login`)
      .send({ email: uniqueEmail(), password: PASSWORD });
    expect(ghostRes.body.success).toBe(false);
    expect(ghostRes.body.message).toBe("Email hoặc mật khẩu không chính xác");
  });

  test("login email hoa/thường sau khi đăng ký (đã chuẩn hóa lowercase)", async () => {
    const raw = `MixedCase_${Date.now()}_${seq++}@Test.Local`;

    const regRes = await request(app)
      .post(`${base}/register`)
      .send({ name: "Case User", email: raw, password: PASSWORD });
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.user.email).toBe(raw.trim().toLowerCase());

    const loginRes = await request(app)
      .post(`${base}/login`)
      .send({ email: `  ${raw.toUpperCase()}  `, password: PASSWORD });
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });

  test("verify khi chưa yêu cầu OTP → success:false", async () => {
    const res = await request(app)
      .post(`${base}/register/verify`)
      .send({ email: uniqueEmail(), code: "1234" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe(
      "Không tìm thấy yêu cầu xác minh. Vui lòng yêu cầu mã mới."
    );
  });

  test("verify với code sai → báo còn N lần thử", async () => {
    const email = uniqueEmail();
    await requestOtp(email);

    const res = await request(app)
      .post(`${base}/register/verify`)
      .send({ email, code: "0000" });

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Mã xác minh không chính xác. Còn 4 lần thử.");
  });

  test("verify OTP hết hạn → success:false yêu cầu mã mới", async () => {
    const email = uniqueEmail();
    await requestOtp(email);

    await EmailVerification.findOneAndUpdate(
      { email },
      { expiresAt: new Date(Date.now() - 1000) }
    );

    const res = await request(app)
      .post(`${base}/register/verify`)
      .send({ email, code: "1234" });

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới.");
    expect(await EmailVerification.findOne({ email })).toBeNull();
  });

  test("verify sai quá 5 lần → khóa nhập và xóa yêu cầu", async () => {
    const email = uniqueEmail();
    await requestOtp(email);
    await EmailVerification.findOneAndUpdate({ email }, { attempts: 5 });

    const res = await request(app)
      .post(`${base}/register/verify`)
      .send({ email, code: "0000" });

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.");
    expect(await EmailVerification.findOne({ email })).toBeNull();
  });

  test("request lại trong 60 giây → báo chờ cooldown", async () => {
    const email = uniqueEmail();
    await requestOtp(email);

    const res = await requestOtp(email);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Vui lòng chờ \d+ giây trước khi yêu cầu mã mới/);
  });
});
