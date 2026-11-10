const assert = require("assert");
const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

require("dotenv").config({ path: "backend/.env" });
const { App } = require("../dist/app");
const { Tournament, TournamentStatus } = require("../dist/modules/tournament/tournament.model");
const { User, UserRole } = require("../dist/modules/user/user.model");

const TEST_PORT = 5594;
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
  console.log("🚀 Bắt đầu kiểm thử SCRUM-924 (Đăng ký giải đấu: Online SePay + Tại quầy)...");

  if (!process.env.MONGO_URI) {
    console.warn("⚠️ MONGO_URI chưa được cấu hình. Bỏ qua kiểm thử tích hợp DB.");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected");

  const app = new App().app;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));

  try {
    const staffId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();
    const customer2Id = new mongoose.Types.ObjectId();

    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const staffPhone = `090${randSuffix}01`;
    const customer1Phone = `091${randSuffix}02`;
    const customer2Phone = `098${randSuffix}03`;

    await User.create([
      {
        _id: staffId,
        name: "Nhân viên quầy test",
        email: `staff_${Date.now()}_${randSuffix}@cuezone.test`,
        phone: staffPhone,
        password: "StaffPassword123",
        role: UserRole.STAFF,
        isActive: true,
        isLocked: false,
      },
      {
        _id: customerId,
        name: "Cơ thủ Online Test",
        email: `customer1_${Date.now()}_${randSuffix}@cuezone.test`,
        phone: customer1Phone,
        password: "CustomerPassword123",
        role: UserRole.CUSTOMER,
        isActive: true,
        isLocked: false,
      },
      {
        _id: customer2Id,
        name: "Cơ thủ Tại Quầy Test",
        email: `customer2_${Date.now()}_${randSuffix}@cuezone.test`,
        phone: customer2Phone,
        password: "CustomerPassword123",
        role: UserRole.CUSTOMER,
        isActive: true,
        isLocked: false,
      },
    ]);

    const staffToken = jwt.sign(
      { userId: String(staffId), role: UserRole.STAFF },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    const customerToken = jwt.sign(
      { userId: String(customerId), role: UserRole.CUSTOMER },
      JWT_SECRET,
      { expiresIn: "1h" },
    );

    const testTourney = new Tournament({
      name: "GIẢI ĐẤU SCRUM-924 TEST SUITE",
      startDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      maxPlayers: 8,
      registrationFee: 100000,
      status: TournamentStatus.REGISTRATION_OPEN,
      players: [],
    });
    await testTourney.save();

    console.log("🧪 Test 1: Khách hàng không thể gọi API ghi danh tại quầy (403)...");
    const resForbidden = await request(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: `/api/v1/tournaments/${testTourney._id}/players/counter`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
      },
      { customerId: String(customer2Id), paymentMethod: "cash" },
    );
    assert.strictEqual(resForbidden.status, 403);
    console.log("   ✓ Đã chặn khách hàng gọi API quầy");

    console.log("🧪 Test 2: Nhân viên ghi danh cơ thủ tại quầy bằng tiền mặt (201)...");
    const resCounterSuccess = await request(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: `/api/v1/tournaments/${testTourney._id}/players/counter`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffToken}`,
        },
      },
      { customerId: String(customer2Id), paymentMethod: "cash", note: "Đã thu 100k tiền mặt" },
    );
    assert.strictEqual(resCounterSuccess.status, 201);
    assert.strictEqual(resCounterSuccess.data.success, true);

    const afterCounter = await Tournament.findById(testTourney._id);
    const counterPlayer = afterCounter.players.find((p) => String(p.user) === String(customer2Id));
    assert(counterPlayer, "Cơ thủ phải có trong danh sách");
    assert.strictEqual(counterPlayer.feePaid, true);
    assert.strictEqual(counterPlayer.registrationStatus, "confirmed");
    assert.strictEqual(counterPlayer.paymentMethod, "cash");
    console.log("   ✓ Ghi danh tại quầy thành công, trạng thái CONFIRMED & ĐÃ THU PHÍ");

    console.log("🧪 Test 3: Chặn một cơ thủ ghi danh 2 lần tại quầy (409)...");
    const resDuplicate = await request(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: `/api/v1/tournaments/${testTourney._id}/players/counter`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffToken}`,
        },
      },
      { customerId: String(customer2Id), paymentMethod: "cash" },
    );
    assert.strictEqual(resDuplicate.status, 409);
    console.log("   ✓ Chặn cơ thủ đăng ký 2 lần thành công");

    // Dọn dẹp dữ liệu kiểm thử
    await Tournament.findByIdAndDelete(testTourney._id);
    await User.deleteMany({ _id: { $in: [staffId, customerId, customer2Id] } });
    console.log("✅ Dọn dẹp dữ liệu test hoàn tất");

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
