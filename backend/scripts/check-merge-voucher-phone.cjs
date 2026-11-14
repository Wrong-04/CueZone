// Chạy sau pnpm --filter backend build: node backend/scripts/check-merge-voucher-phone.cjs
// Chỉ thay I/O model trong tiến trình; không kết nối hay ghi MongoDB.
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { Voucher, VoucherUsage, VoucherReservation } = require("../dist/modules/voucher/voucher.model");
const { VoucherService } = require("../dist/modules/voucher/voucher.service");
const { User } = require("../dist/modules/user/user.model");
const { Wallet } = require("../dist/modules/wallet/wallet.model");

async function main() {
  mongoose.set("bufferCommands", false);
  const restore = [];
  const stub = (target, key, value) => {
    const original = target[key];
    target[key] = value;
    restore.push(() => { target[key] = original; });
  };
  const query = (value) => {
    const result = Promise.resolve(value);
    result.session = () => result;
    result.select = () => result;
    return result;
  };
  const customerId = new mongoose.Types.ObjectId();
  const voucher = {
    _id: new mongoose.Types.ObjectId(), code: "MERGE20", isActive: true,
    startsAt: new Date(0), usageCount: 0, minOrderAmount: 0,
    discountType: "percent", discountValue: 20, targetAudience: "all",
  };
  let usedPhone, reservedPhone, usedId, points = 500, writes = 0;
  let memberPhone = "0901234567";
  const matches = (condition, phone) => phone !== undefined && (
    condition.customerPhone?.$regex
      ? new RegExp(condition.customerPhone.$regex).test(phone)
      : condition.customerPhone === phone
  );
  const hasHistory = (filter, phone, id) => {
    assert.equal(String(filter.voucherId), String(voucher._id));
    return (filter.$or || [filter]).some((condition) =>
      matches(condition, phone) || (id && String(condition.customerId) === String(id)),
    );
  };
  stub(Voucher, "findOne", () => query(voucher));
  stub(VoucherUsage, "findOne", (filter) => query(hasHistory(filter, usedPhone, usedId) ? {} : null));
  stub(VoucherReservation, "findOne", (filter) => query(hasHistory(filter, reservedPhone) ? {} : null));
  stub(User, "findOne", (filter) => {
    assert.equal(filter.role, "customer");
    assert.equal(filter.isActive, true);
    assert.equal(filter.isLocked, false);
    const found = filter.$or.some((condition) =>
      condition._id ? String(condition._id) === String(customerId)
        : condition.phone?.$regex ? new RegExp(condition.phone.$regex).test(memberPhone)
          : condition.phone === memberPhone,
    );
    return query(found ? { _id: customerId } : null);
  });
  stub(Wallet, "findOne", () => query({ points }));
  stub(Voucher, "findOneAndUpdate", async () => { writes++; return voucher; });
  stub(VoucherUsage, "create", async () => { writes++; });
  stub(VoucherReservation, "create", async () => { writes++; });
  const service = new VoucherService();
  const data = { sessionId: "merge-check", invoiceCode: "merge-check", customerName: "Kiểm tra" };
  const variants = ["0901234567", "0901 234 567", "+84901234567", "+84 901-234-567"];
  const alreadyUsed = (error) => error.code === "VOUCHER_ALREADY_USED";
  try {
    for (const stored of variants) {
      for (const input of variants) {
        usedPhone = stored;
        await assert.rejects(service.validate(voucher.code, 50000, input), alreadyUsed);
        await assert.rejects(service.redeem(voucher.code, 50000, { ...data, customerPhone: input }, null), alreadyUsed);
        await assert.rejects(service.reserve(voucher.code, 50000, { ...data, customerPhone: input }, null), alreadyUsed);
        usedPhone = undefined;
        reservedPhone = stored;
        await assert.rejects(service.redeem(voucher.code, 50000, { ...data, customerPhone: input }, null), alreadyUsed);
        await assert.rejects(service.reserve(voucher.code, 50000, { ...data, customerPhone: input }, null), alreadyUsed);
        reservedPhone = undefined;
      }
    }
    // Mã bị chặn không được tăng lượt dùng hoặc tạo usage/reservation.
    assert.equal(writes, 0);
    usedId = customerId;
    await assert.rejects(service.redeem(voucher.code, 50000, { ...data, customerId }, null), alreadyUsed);
    await assert.rejects(service.reserve(voucher.code, 50000, { ...data, customerId }, null), alreadyUsed);
    usedId = undefined;
    usedPhone = "123";
    await assert.rejects(service.redeem(voucher.code, 50000, { ...data, customerPhone: "123" }, null), alreadyUsed);
    await assert.rejects(service.reserve(voucher.code, 50000, { ...data, customerPhone: "123" }, null), alreadyUsed);
    assert.equal(writes, 0);

    usedPhone = "0901234567";
    for (const other of ["0901234568", "1901234567", "09012345670", "123"]) {
      assert.equal((await service.validate(voucher.code, 50000, other)).discountAmount, 10000);
      assert.equal((await service.redeem(voucher.code, 50000, { ...data, customerPhone: other }, null)).discountAmount, 10000);
      assert.equal((await service.reserve(voucher.code, 50000, { ...data, customerPhone: other }, null)).discountAmount, 10000);
    }
    usedPhone = undefined;
    voucher.targetAudience = "vip";
    const vipOnly = (error) => error.code === "VOUCHER_VIP_ONLY";
    for (const stored of variants) {
      memberPhone = stored;
      for (const input of variants) {
        points = 500;
        assert.equal((await service.redeem(voucher.code, 50000, { ...data, customerPhone: input }, null)).discountAmount, 10000);
        points = 499;
        const before = writes;
        await assert.rejects(service.redeem(voucher.code, 50000, { ...data, customerPhone: input }, null), vipOnly);
        assert.equal(writes, before);
      }
    }
    const before = writes;
    await assert.rejects(service.redeem(voucher.code, 50000, data, null), vipOnly);
    await assert.rejects(service.redeem(voucher.code, 50000, { ...data, customerPhone: "0901234568" }, null), vipOnly);
    assert.equal(writes, before);
    console.log("OK: voucher 0/+84 hai chiều, chặn usage/reservation và giữ điều kiện VIP; không truy cập DB");
  } finally {
    restore.reverse().forEach((fn) => fn());
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
