/**
 * Integration Test Suite cho Tournament Management:
 * SCRUM-150: Validate dữ liệu và quy tắc mở đăng ký giải đấu
 * SCRUM-152: Chuyển trạng thái giải đấu sang REGISTRATION_OPEN
 * SCRUM-153: API tạo và cập nhật giải đấu Master
 * SCRUM-154: Schema và trạng thái vòng đời giải đấu Bank Pool
 * SCRUM-156: Kiểm thử tạo giải đấu, validate và chuyển trạng thái đăng ký
 */

const assert = require("assert");
const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Load backend modules directly from build/src
require("dotenv").config({ path: "backend/.env" });
const { App } = require("../dist/app");
const { Tournament, TournamentStatus } = require("../dist/modules/tournament/tournament.model");

const TEST_PORT = 5599;
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
  console.log("🚀 Starting Tournament Integration Tests (SCRUM-150 -> SCRUM-156)...");

  // Kết nối MongoDB
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected for testing");

  // Dọn dẹp các tournament test cũ nếu có
  await Tournament.deleteMany({ name: { $regex: /^TEST_/ } });

  // Khởi động Express test app
  const app = new App().app;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`✅ Test server running on http://localhost:${TEST_PORT}`);

  try {
    // 1. Tạo mock auth token admin (dùng ID admin thực tế trong DB để qua middleware requirePosStaff)
    const adminToken = jwt.sign(
      { userId: "6abc9f730691bb822f449b44", role: "admin", email: "admin@cuezone.com" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 2. SCRUM-150 Validation Test: Từ chối tạo giải đấu khi thiếu tên
    console.log("🧪 Test 1: Validation - Từ chối khi thiếu tên giải đấu...");
    const resNoName = await request(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/api/v1/tournaments",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        name: "",
        startDate: "2026-11-10T08:00:00.000Z",
        endDate: "2026-11-12T20:00:00.000Z",
        registrationDeadline: "2026-11-09T23:59:59.000Z",
        maxPlayers: 16,
      }
    );
    assert(resNoName.data.success === false, "Phải báo lỗi khi thiếu tên giải đấu");
    console.log("   ✓ Đã bắt lỗi thiếu tên giải đấu");

    // 3. SCRUM-150 Validation Test: Hạn đăng ký sau ngày thi đấu
    console.log("🧪 Test 2: Validation - Từ chối khi hạn đăng ký sau ngày bắt đầu thi đấu...");
    const resBadDate = await request(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/api/v1/tournaments",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        name: "TEST_Tourney_BadDate",
        startDate: "2026-11-10T08:00:00.000Z",
        endDate: "2026-11-12T20:00:00.000Z",
        registrationDeadline: "2026-11-11T23:59:59.000Z", // Sau ngày bắt đầu!
        maxPlayers: 16,
      }
    );
    assert(resBadDate.data.success === false, "Phải từ chối khi hạn đăng ký sau ngày bắt đầu");
    console.log("   ✓ Đã bắt lỗi hạn đăng ký không hợp lệ");

    // 4. SCRUM-150 Validation Test: Quy mô không đúng 8/16/32
    console.log("🧪 Test 3: Validation - Từ chối khi quy mô không thuộc 8, 16, 32...");
    const resBadScale = await request(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/api/v1/tournaments",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        name: "TEST_Tourney_BadScale",
        startDate: "2026-11-10T08:00:00.000Z",
        endDate: "2026-11-12T20:00:00.000Z",
        registrationDeadline: "2026-11-09T23:59:59.000Z",
        maxPlayers: 20, // Không hợp lệ
      }
    );
    assert(resBadScale.data.success === false, "Phải từ chối quy mô 20 cơ thủ");
    console.log("   ✓ Đã bắt lỗi quy mô cơ thủ không đúng chuẩn");

    // 5. SCRUM-153 Test: Tạo giải đấu Master hợp lệ (trạng thái DRAFT)
    console.log("🧪 Test 4: Tạo giải đấu Master hợp lệ ở trạng thái DRAFT...");
    const resCreate = await request(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/api/v1/tournaments",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        name: "TEST_CueZone_Championship_Q4",
        description: "Giải đấu Bank Pool thử nghiệm tự động",
        startDate: "2026-11-20T08:00:00.000Z",
        endDate: "2026-11-22T20:00:00.000Z",
        registrationDeadline: "2026-11-19T23:59:59.000Z",
        maxPlayers: 16,
        registrationFee: 200000,
        prizePool: "20.000.000đ + Cúp Vàng",
        raceToScore: 5,
        assignedTables: ["Bàn Match 13", "Bàn Match 14"],
      }
    );

    assert(resCreate.status === 201, "HTTP status phải là 201 Created");
    assert(resCreate.data.success === true, "Tạo giải đấu phải thành công");
    const createdTourney = resCreate.data.data;
    assert.strictEqual(createdTourney.status, "draft", "Trạng thái ban đầu phải là DRAFT");
    assert.strictEqual(createdTourney.maxPlayers, 16, "Quy mô phải là 16 cơ thủ");
    console.log("   ✓ Tạo giải đấu DRAFT thành công:", createdTourney._id);

    // 6. SCRUM-153 Test: Lấy chi tiết giải đấu
    console.log("🧪 Test 5: Lấy chi tiết giải đấu vừa tạo...");
    const resGet = await request({
      hostname: "localhost",
      port: TEST_PORT,
      path: `/api/v1/tournaments/${createdTourney._id}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert(resGet.data.success === true, "Phải lấy được chi tiết giải đấu");
    assert.strictEqual(resGet.data.data.name, "TEST_CueZone_Championship_Q4");
    console.log("   ✓ Lấy chi tiết giải đấu thành công");

    // 7. SCRUM-152 Test: Chuyển trạng thái sang REGISTRATION_OPEN
    console.log("🧪 Test 6: Chuyển trạng thái vòng đời sang REGISTRATION_OPEN...");
    const resChangeStatus = await request(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: `/api/v1/tournaments/${createdTourney._id}/status`,
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        status: "registration_open",
      }
    );

    assert(resChangeStatus.data.success === true, "Chuyển trạng thái phải thành công");
    assert.strictEqual(
      resChangeStatus.data.data.status,
      "registration_open",
      "Trạng thái mới phải là registration_open"
    );
    console.log("   ✓ Đã chuyển trạng thái sang REGISTRATION_OPEN thành công");

    // 8. Dọn dẹp dữ liệu test
    await Tournament.findByIdAndDelete(createdTourney._id);
    console.log("✅ Dọn dẹp dữ liệu test hoàn tất");

    console.log("\n=======================================================");
    console.log("🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ TÍCH HỢP ĐỀU ĐẠT (PASS 100%)!");
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
