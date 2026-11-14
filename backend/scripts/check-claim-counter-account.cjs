const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { User, UserRole } = require("../dist/modules/user/user.model");
const { Wallet } = require("../dist/modules/wallet/wallet.model");
const { EmailVerification } = require("../dist/modules/auth/emailVerification.model");
const email = require("../dist/modules/auth/email.service");
const { AuthService } = require("../dist/modules/auth/auth.service");
const { normalizePhone, phonePattern } = require("../dist/utils/phone");
const { WalletService } = require("../dist/modules/wallet/wallet.service");
const { MemberCenterService } = require("../dist/modules/member/member-center.service");

const PHONE = "0901234567";
const input = { name: "Nguyễn Văn A", email: "a@example.com", password: "Passw0rd1", phone: PHONE };

function account(over = {}) {
  return User.hydrate({
    _id: new mongoose.Types.ObjectId(), name: "Khách 4567", phone: "0901 234 567",
    email: "khach_0901234567_x@cuezone.local", password: "mật-khẩu-cũ",
    role: UserRole.CUSTOMER, isActive: true, isLocked: false, ...over,
  });
}

async function main() {
  // Chỉ thay I/O collection/email; save() vẫn chạy validation và hook băm mật khẩu thật.
  // Không kết nối MongoDB, không gửi email ra ngoài.
  mongoose.set("bufferCommands", false);
  const restore = [];
  const stub = (target, key, value) => {
    const original = target[key];
    target[key] = value;
    restore.push(() => { target[key] = original; });
  };
  let found = [], saved = [], pending, lastRequest, sentTo, walletUserId;
  let saveMatches = true, failWallet = false;
  stub(User, "find", (query) => {
    const users = found.filter((user) => new RegExp(query.phone.$regex).test(user.phone));
    const result = Promise.resolve(users);
    result.session = async () => users;
    const queryResult = { limit: () => result, select: () => queryResult };
    return queryResult;
  });
  stub(User, "findOne", (query) => {
    const user = query.phone?.$regex
      ? found.find((item) => new RegExp(query.phone.$regex).test(item.phone)) ?? null
      : null;
    const result = Promise.resolve(user);
    result.select = async () => user;
    return result;
  });
  stub(User.collection, "updateOne", async (filter, update) => {
    saved.push({ filter, update });
    return { acknowledged: true, matchedCount: saveMatches ? 1 : 0, modifiedCount: saveMatches ? 1 : 0 };
  });
  stub(User.collection, "insertOne", async (document) => {
    saved.push({ document });
    return { acknowledged: true, insertedId: document._id };
  });
  stub(Wallet, "findOne", (query) => ({ select: async () => {
    if (failWallet) throw new Error("Lỗi đọc ví");
    walletUserId = query.userId;
    return { points: 120 };
  } }));
  stub(EmailVerification, "findOne", async () => pending);
  stub(EmailVerification, "findOneAndUpdate", async (_filter, update) => { lastRequest = update; return {}; });
  stub(EmailVerification, "deleteOne", async () => { pending = undefined; return {}; });
  stub(email, "sendVerificationEmail", async (address) => { sentTo = address; });
  stub(email, "sendWelcomeRegistrationEmail", async () => undefined);

  try {
    const service = new AuthService();
    const prepare = (over = {}) => {
      pending = { email: input.email, code: "123456", name: input.name, password: input.password,
        phone: PHONE, attempts: 0, expiresAt: new Date(Date.now() + 60000),
        save: async () => undefined, ...over };
    };
    const verify = (over = {}) => {
      prepare(over);
      return service.verifyAndRegister(input.email, "123456");
    };

    // Số nội địa/quốc tế hai chiều, dấu phân cách và số gần giống không bị gộp.
    const variants = [PHONE, "0901 234 567", "+84901234567", "+84 901-234-567", "84901234567"];
    for (const query of variants) {
      assert.equal(normalizePhone(query), PHONE);
      const pattern = new RegExp(phonePattern(query));
      for (const stored of variants) assert(pattern.test(stored), `${query} không khớp ${stored}`);
      for (const other of ["0901234568", "1901234567", "09012345670", "", "+0901234567"]) {
        assert(!pattern.test(other), `${query} khớp nhầm ${other}`);
      }
    }
    assert.equal(phonePattern(""), null);
    assert.equal(phonePattern("123"), null);

    // Yêu cầu mã chỉ gửi email; lưu SĐT nội địa để tạo mới nhất quán.
    for (const phone of [PHONE, "+84901234567", "+84 901-234-567"]) {
      found = [account()]; pending = undefined;
      await service.sendVerificationCode({ ...input, phone });
      assert.equal(sentTo, input.email);
      assert.equal(lastRequest.phone, PHONE);
    }
    await assert.rejects(service.sendVerificationCode({ ...input, phone: "abc0901234567" }), /định dạng/);

    // Từ chối số thuộc tài khoản thật, bị khóa, nhân viên hoặc nhiều hồ sơ tương đương.
    for (const bad of [
      [account({ email: "real@example.com" })], [account({ isLocked: true })],
      [account({ isActive: false })], [account({ role: UserRole.STAFF })],
      [account(), account({ phone: "+84901234567" })],
    ]) {
      found = bad; pending = undefined;
      await assert.rejects(service.sendVerificationCode(input), /Số điện thoại đã được sử dụng/);
    }

    // Xác minh email nhận lại cùng User/Wallet, không chèn tài khoản mới; mật khẩu được băm thật.
    for (const storedPhone of ["0901 234 567", "+84 901-234-567"]) {
      const counter = account({ phone: storedPhone }); found = [counter]; saved = [];
      const result = await verify({ phone: "+84901234567" });
      assert.equal(saved.length, 1);
      assert.equal(String(saved[0].filter._id), String(counter._id));
      assert.equal(saved[0].filter.email, "khach_0901234567_x@cuezone.local");
      assert.equal(saved[0].filter.isActive, true);
      assert.equal(saved[0].filter.isLocked, false);
      assert.equal(String(result.user._id), String(counter._id));
      assert.equal(String(walletUserId), String(counter._id));
      assert.equal(result.user.email, input.email);
      assert.equal(result.user.phone, storedPhone);
      assert.equal(result.inheritedPoints, 120);
      assert.equal(counter.name, input.name);
      assert(await counter.comparePassword(input.password));
      assert(!("password" in result.user));

      const login = await service.login({ phone: "+84 901 234 567", password: input.password });
      assert.equal(String(login.user._id), String(counter._id));
      const walletMember = await new WalletService().findCheckoutMember("+84901234567", null);
      assert.equal(String(walletMember._id), String(counter._id));
      const filters = new MemberCenterService().getInvoiceOwnershipFilters({
        _id: counter._id, phone: storedPhone, createdAt: new Date(0),
      });
      assert.equal(filters[0]["receipt.memberId"], String(counter._id));
      assert(new RegExp(filters[1]["receipt.customerPhone"].$regex).test(PHONE));
      assert(new RegExp(filters[1]["receipt.customerPhone"].$regex).test("+84901234567"));
    }

    // Tên thật và số cũ được giữ để không làm lệch lịch sử.
    const named = account({ name: "Trần Văn B" }); found = [named];
    await verify();
    assert.equal(named.name, "Trần Văn B");

    found = []; saved = [];
    const fresh = await verify();
    assert.equal(saved.length, 1);
    assert(saved[0].document);
    assert.equal(fresh.inheritedPoints, undefined);
    assert.equal(fresh.user.email, input.email);

    // OTP sai/hết hạn/quá lượt không được lưu hồ sơ.
    for (const over of [
      { code: "654321" }, { expiresAt: new Date(Date.now() - 1000) }, { attempts: 5 },
    ]) {
      found = [account()]; saved = [];
      await assert.rejects(verify(over), /Mã xác minh|quá 5 lần/);
      assert.equal(saved.length, 0);
    }
    found = [account({ email: "real@example.com" })]; saved = [];
    await assert.rejects(verify(), /Số điện thoại đã được sử dụng/);
    assert.equal(saved.length, 0);

    // /register không OTP không được nhận hồ sơ tại quầy, kể cả đổi định dạng số.
    const victim = account(); found = [victim]; saved = [];
    await assert.rejects(service.register({ ...input, phone: "+84901234567" }), /mã xác minh/);
    assert.equal(saved.length, 0);
    assert(victim.email.endsWith("@cuezone.local"));

    // Hồ sơ đã được yêu cầu khác nhận trước: save không ghi đè và không trả token.
    found = [account()]; saveMatches = false;
    await assert.rejects(verify(), /Hồ sơ hội viên đã thay đổi/);
    saveMatches = true;

    // Đọc ví lỗi không được đổi email/mật khẩu trong DB rồi báo đăng ký thất bại.
    found = [account()]; saved = []; failWallet = true;
    await assert.rejects(verify(), /Lỗi đọc ví/);
    assert.equal(saved.length, 0);
    failWallet = false;

    console.log("check-claim-counter-account: OK (email OTP, 0/+84, giữ hồ sơ/ví, băm mật khẩu, chặn ghi đè)");
  } finally {
    restore.reverse().forEach((fn) => fn());
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
