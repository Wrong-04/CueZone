const assert = require("assert");
const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

require("dotenv").config({ path: "backend/.env" });
const { App } = require("../dist/app");
const { Tournament, TournamentStatus } = require("../dist/modules/tournament/tournament.model");

const TEST_PORT = 5592;
const JWT_SECRET = process.env.JWT_SECRET || "cuezone_billiards_jwt_secret_2026";

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on("error", reject);
    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log("🚀 Bắt đầu kiểm thử SCRUM-924 (Đăng ký giải đấu & Upload biên lai)...");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected");

  const app = new App().app;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));

  try {
    const customerId = "6abc9f730691bb822f449b47";
    const customerToken = jwt.sign(
      { userId: customerId, role: "customer", email: "customer1@gmail.com" },
      JWT_SECRET,
      { expiresIn: "1h" },
    );

    // 1. Kiểm tra API thông tin ngân hàng CLB (SCRUM-928)
    console.log("🧪 Test 1: Lấy thông tin tài khoản ngân hàng CLB...");
    const bankRes = await request({
      hostname: "localhost",
      port: TEST_PORT,
      path: "/api/v1/tournaments/bank-info",
      method: "GET",
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(bankRes.status, 200);
    assert.strictEqual(bankRes.data.success, true);
    assert.strictEqual(bankRes.data.data.accountNumber, "0908888999");
    console.log("   ✓ Thông tin ngân hàng CLB chuẩn xác:", bankRes.data.data.accountNumber);

    // 2. Tạo một giải đấu test mở đăng ký
    const testTourney = new Tournament({
      name: "TEST_SCRUM_924_TOURNAMENT",
      startDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      maxPlayers: 8,
      registrationFee: 150000,
      status: TournamentStatus.REGISTRATION_OPEN,
      players: [],
    });
    await testTourney.save();

    // 3. Từ chối đăng ký bank_transfer nếu thiếu biên lai (SCRUM-926)
    console.log("🧪 Test 2: Từ chối đăng ký chuyển khoản có phí nếu thiếu biên lai...");
    const resNoReceipt = await request(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: `/api/v1/tournaments/${testTourney._id}/register`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
      },
      { paymentMethod: "bank_transfer" },
    );
    assert.strictEqual(resNoReceipt.status, 400);
    assert.strictEqual(resNoReceipt.data.success, false);
    console.log("   ✓ Đã chặn thành công khi không có biên lai");

    // 4. Đăng ký thành công bank_transfer có biên lai -> PENDING (SCRUM-927)
    console.log("🧪 Test 3: Đăng ký thành công kèm ảnh biên lai -> Trạng thái PENDING...");
    const fakeReceiptUrl = "https://res.cloudinary.com/cuezone/image/upload/v1/receipt.jpg";
    const resSuccess = await request(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: `/api/v1/tournaments/${testTourney._id}/register`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
      },
      {
        paymentMethod: "bank_transfer",
        paymentReceiptUrl: fakeReceiptUrl,
      },
    );
    assert.strictEqual(resSuccess.status, 201);
    assert.strictEqual(resSuccess.data.success, true);

    const savedTourney = await Tournament.findById(testTourney._id);
    const registeredPlayer = savedTourney.players.find((p) => String(p.user) === customerId);
    assert(registeredPlayer, "Cơ thủ phải có trong danh sách");
    assert.strictEqual(registeredPlayer.registrationStatus, "pending", "Trạng thái phải là PENDING");
    assert.strictEqual(registeredPlayer.feePaid, false, "Lệ phí chưa duyệt");
    assert.strictEqual(registeredPlayer.paymentReceiptUrl, fakeReceiptUrl);
    console.log("   ✓ Đơn đăng ký đã lưu với trạng thái PENDING và URL biên lai");

    // 5. Chặn đăng ký trùng lặp (Business rule: 1 VĐV không đăng ký 2 lần)
    console.log("🧪 Test 4: Chặn một vận động viên đăng ký 2 lần trong cùng một giải...");
    const resDuplicate = await request(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: `/api/v1/tournaments/${testTourney._id}/register`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
      },
      { paymentMethod: "bank_transfer", paymentReceiptUrl: fakeReceiptUrl },
    );
    assert.strictEqual(resDuplicate.status, 409);
    assert.strictEqual(resDuplicate.data.success, false);
    console.log("   ✓ Chặn đăng ký 2 lần thành công (HTTP 409)");

    // Dọn dẹp dữ liệu test
    await Tournament.findByIdAndDelete(testTourney._id);
    console.log("✅ Dọn dẹp dữ liệu kiểm thử hoàn tất");

    console.log("\n=======================================================");
    console.log("🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ SCRUM-924 ĐỀU ĐẠT (PASS 100%)!");
    console.log("=======================================================\n");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
