// Chạy sau khi build và được phép ghi fixture trên DB dev/test được chỉ định.
// Dùng SUPPLIER_RECEIPT_TEST_MONGO_URI và SUPPLIER_RECEIPT_TEST_DB; không đọc .env.
const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
const { once } = require("node:events");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

async function main() {
  const uri = process.env.SUPPLIER_RECEIPT_TEST_MONGO_URI;
  const dbName = process.env.SUPPLIER_RECEIPT_TEST_DB;
  assert(uri && dbName && /(^|[-_])(dev|test)([-_]|$)/i.test(dbName),
    "Cần chỉ định SUPPLIER_RECEIPT_TEST_MONGO_URI và SUPPLIER_RECEIPT_TEST_DB cho DB dev/test đã được phép.");

  const secret = randomBytes(32).toString("hex");
  process.env.JWT_SECRET = secret;
  const { authMiddleware } = require("../dist/middlewares/auth.middleware");
  const { User, UserRole } = require("../dist/modules/user/user.model");
  const GoodsReceipt = require("../dist/modules/goods-receipt/goods-receipt.model").default;
  const Supplier = require("../dist/modules/supplier/supplier.model").default;
  const supplierRouter = require("../dist/modules/supplier/supplier.routes").default;

  const objectId = () => new mongoose.Types.ObjectId();
  const supplierIds = [objectId(), objectId()];
  const receiptIds = [objectId(), objectId(), objectId()];
  const userId = objectId();
  const productId = objectId();
  const search = `Kiểm thử phiếu nhập ${randomUUID()}`;
  const lastReceiptAt = "2026-11-15T00:00:00.000Z";
  const expected = { receiptCount: 2, totalAmount: 300_000_000, lastReceiptAt };
  let connected = false;
  let server;

  try {
    await mongoose.connect(uri, { dbName, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 })
      .catch(() => { throw new Error("Không thể kết nối DB dev/test đã chọn."); });
    connected = true;

    const user = await User.create({
      _id: userId,
      name: "Quản trị kiểm thử phiếu nhập",
      email: `${userId}@check.invalid`,
      password: randomUUID(),
      role: UserRole.ADMIN,
    });
    await Supplier.insertMany(supplierIds.map((_id, index) => ({
      _id,
      name: `${search} ${index === 0 ? "A" : "B"}`,
    })));
    await GoodsReceipt.insertMany([
      { totalAmount: 200_000_000, status: "completed", completedAt: lastReceiptAt },
      { totalAmount: 100_000_000, status: "completed", completedAt: "2026-11-13T00:00:00.000Z" },
      { totalAmount: 12_000_000, status: "draft" },
    ].map((receipt, index) => ({
      ...receipt,
      _id: receiptIds[index],
      receiptNumber: `PN-${receiptIds[index]}`,
      supplier: supplierIds[0],
      createdBy: userId,
      createdAt: new Date("2026-11-10T00:00:00.000Z"),
      items: [{
        product: productId,
        productName: "Cơ bida kiểm thử",
        sku: `CHECK-${productId}`,
        unit: "cây",
        quantity: 1,
        unitCost: receipt.totalAmount,
        totalCost: receipt.totalAmount,
      }],
    })));

    server = express().use("/api/v1/suppliers", authMiddleware, supplierRouter).listen(0, "127.0.0.1");
    await once(server, "listening");
    const token = jwt.sign({ userId: String(userId), email: user.email, role: user.role }, secret, { expiresIn: "5m" });
    async function list(status) {
      const query = new URLSearchParams({ search, status });
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/suppliers?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.success, true);
      return result;
    }

    const { data, pagination } = await list("active");
    assert.deepEqual(pagination, { page: 1, limit: 20, total: 2, pages: 1 });
    const [a, b] = supplierIds.map((id) => data.find((supplier) => supplier._id === String(id)));
    assert.deepEqual(a?.receiptStats, expected);
    assert.deepEqual(b?.receiptStats, { receiptCount: 0, totalAmount: 0, lastReceiptAt: null });

    await Supplier.updateOne({ _id: supplierIds[0] }, { $set: { isActive: false } });
    const inactive = await list("inactive");
    assert.deepEqual(inactive.data.map(({ _id }) => _id), [String(supplierIds[0])]);
    assert.deepEqual(inactive.data[0].receiptStats, expected);
  } finally {
    try {
      if (server?.listening) await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    } finally {
      try {
        if (connected) {
          const cleanup = await Promise.allSettled([
            GoodsReceipt.deleteMany({ _id: { $in: receiptIds } }),
            Supplier.deleteMany({ _id: { $in: supplierIds } }),
            User.deleteOne({ _id: userId }),
          ]);
          assert(cleanup.every((result) => result.status === "fulfilled"),
            "Không dọn được hết fixture kiểm thử phiếu nhập.");
        }
      } finally {
        await mongoose.disconnect();
      }
    }
  }
  console.log("Đạt: số liệu phiếu hoàn tất, bỏ qua phiếu nháp, nhà cung cấp không có phiếu và ngừng hợp tác.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
