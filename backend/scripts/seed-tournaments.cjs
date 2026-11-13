const path = require("path");
const mongoose = require("mongoose");
const dns = require("dns");

try { dns.setServers(["8.8.8.8", "1.1.1.1"]); } catch (e) {}

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

require("../dist/modules/user/user.model");
require("../dist/modules/table/table.model");
const { Tournament, TournamentStatus } = require("../dist/modules/tournament/tournament.model");
const { Match } = require("../dist/modules/tournament/match.model");
const { TournamentBracketService } = require("../dist/modules/tournament/bracket.service");

async function seed() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db";
  console.log("Connecting to MongoDB:", uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@"));
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const users = await mongoose.connection.collection("users").find({}).toArray();
  const adminUser = users.find(u => u.role === "admin") || users[0];
  const customers = users.filter(u => u.role === "customer");

  if (customers.length < 8) {
    console.error("Cần ít nhất 8 tài khoản khách hàng để seed giải đấu.");
    process.exit(1);
  }

  console.log(`Tìm thấy ${customers.length} khách hàng và admin: ${adminUser.name}`);

  // Xóa các giải đấu rác/test cũ
  const junkQuery = {
    $or: [
      { name: { $regex: /test/i } },
      { name: { $regex: /bjjj/i } },
      { name: "GIải CueZone" },
      { name: "Giải Bank Pool Trẻ CueZone Junior Cup Q4/2026" },
      { name: "Giải Giao Hữu Bank Pool Mùa Thu 2026" },
      { name: "Giải Bank Pool Mở Rộng 2026 (CueZone Cup)" },
      { name: "Bank Pool Weekend Challenge - Tranh Tài Tuần #43" }
    ]
  };
  const oldTournaments = await Tournament.find(junkQuery);
  const oldIds = oldTournaments.map(t => t._id);
  if (oldIds.length > 0) {
    await Match.deleteMany({ tournament: { $in: oldIds } });
    await Tournament.deleteMany({ _id: { $in: oldIds } });
    console.log(`Đã dọn dẹp ${oldIds.length} giải đấu cũ/nháp rác.`);
  }

  const bracketService = new TournamentBracketService();

  // 1. GIẢI ĐẤU 1: Đang mở đăng ký (registration_open)
  const now = new Date();
  const t1StartDate = new Date(now.getTime() + 10 * 86400000); // 10 ngày sau
  const t1EndDate = new Date(now.getTime() + 15 * 86400000);   // 15 ngày sau
  const t1Deadline = new Date(now.getTime() + 7 * 86400000);    // 7 ngày sau (còn mở đăng ký)

  const t1Players = customers.slice(0, 11).map((c, idx) => ({
    user: c._id,
    name: c.name,
    phone: c.phone || `090${1000000 + idx}`,
    avatar: c.avatar || `https://images.unsplash.com/photo-${1500000000000 + idx * 10000}?w=150&auto=format&fit=crop&q=80`,
    seed: idx + 1,
    feePaid: true,
    paymentMethod: "counter",
    registrationStatus: "confirmed",
    registeredAt: new Date(now.getTime() - (11 - idx) * 3600000),
  }));

  const t1 = await Tournament.create({
    name: "Giải Vô Địch Bank Pool Mùa Đông CueZone Cup 2026",
    gameType: "bank_pool",
    format: "Single Elimination",
    raceToScore: 5,
    maxPlayers: 16,
    registrationFee: 200000,
    prizePool: "Tổng giá trị 30.000.000 VNĐ + 01 Cơ Predator Limited CueZone",
    firstPrize: "15.000.000đ + Cúp Vàng + Cơ Predator",
    secondPrize: "8.000.000đ + Cờ lưu niệm",
    thirdPrize: "3.500.000đ x 2",
    startDate: t1StartDate,
    endDate: t1EndDate,
    registrationDeadline: t1Deadline,
    status: TournamentStatus.REGISTRATION_OPEN,
    assignedTables: ["Bàn 01", "Bàn 02", "Bàn 03", "Bàn VIP 01"],
    createdBy: adminUser._id,
    description: "Giải đấu đỉnh cao quy tụ các tay cơ xuất sắc nhất hệ thống CueZone. Thi đấu theo thể thức loại trực tiếp chuẩn WPA quốc tế. Tất cả cơ thủ tham gia được tặng áo đấu và kỷ niệm chương độc quyền.",
    rules: "1. Áp dụng luật thi đấu Bank Pool chuẩn WPA quốc tế.\n2. Chạm 5 bi băng (Race to 5), luân phiên khai cuộc.\n3. Các cơ thủ có mặt trước giờ thi đấu 15 phút để làm thủ tục check-in.\n4. Trang phục: Quần tây, áo có cổ (polo CLB), giày tây hoặc sneaker tối màu.",
    players: t1Players,
    prizes: [
      { rank: 1, reward: "15.000.000đ + Cúp Vàng + Cơ Predator", amount: 15000000 },
      { rank: 2, reward: "8.000.000đ + Cờ lưu niệm", amount: 8000000 },
      { rank: 3, reward: "3.500.000đ x 2", amount: 3500000 }
    ]
  });
  console.log(`✅ Đã tạo Giải 1 (Đang mở ghi danh, 11/16 cơ thủ): ${t1.name}`);

  // 2. GIẢI ĐẤU 2: Đang diễn ra & có Bracket Tree sống động (in_progress)
  const t2StartDate = new Date(now.getTime() - 1 * 86400000); // bắt đầu từ hôm qua
  const t2EndDate = new Date(now.getTime() + 3 * 86400000);   // kết thúc 3 ngày sau
  const t2Deadline = new Date(now.getTime() - 2 * 86400000);  // đóng hạn 2 ngày trước

  const t2Players = customers.slice(0, 8).map((c, idx) => ({
    user: c._id,
    name: c.name,
    phone: c.phone || `090${2000000 + idx}`,
    avatar: c.avatar || `https://images.unsplash.com/photo-${1510000000000 + idx * 10000}?w=150&auto=format&fit=crop&q=80`,
    seed: idx + 1,
    feePaid: true,
    paymentMethod: "wallet",
    registrationStatus: "confirmed",
    registeredAt: new Date(now.getTime() - (10 - idx) * 86400000),
  }));

  const t2 = await Tournament.create({
    name: "CueZone Masters Invitational - Tranh Tài Đỉnh Cao 2026",
    gameType: "bank_pool",
    format: "Single Elimination",
    raceToScore: 5,
    maxPlayers: 8,
    registrationFee: 150000,
    prizePool: "Tổng giá trị 12.000.000 VNĐ",
    firstPrize: "6.000.000đ + Cúp Vô Địch Masters",
    secondPrize: "3.500.000đ",
    thirdPrize: "1.250.000đ x 2",
    startDate: t2StartDate,
    endDate: t2EndDate,
    registrationDeadline: t2Deadline,
    status: TournamentStatus.REGISTRATION_OPEN,
    assignedTables: ["Bàn Match 01", "Bàn Match 02"],
    createdBy: adminUser._id,
    description: "Giải đấu 8 cơ thủ có thứ hạng Elo cao nhất tháng tranh cúp vô địch tại đấu trường CueZone Center.",
    rules: "1. Luật Bank Pool WPA Race to 5.\n2. Trọng tài điều khiển trận đấu trực tiếp.\n3. Đồng hồ đếm giây shot-clock 40 giây mỗi lượt đánh.",
    players: t2Players,
    prizes: [
      { rank: 1, reward: "6.000.000đ + Cúp Vô Địch Masters", amount: 6000000 },
      { rank: 2, reward: "3.500.000đ", amount: 3500000 },
      { rank: 3, reward: "1.250.000đ x 2", amount: 1250000 }
    ]
  });

  // Tạo cây nhánh đấu tự động bằng thuật toán chuẩn WPA của CueZone
  await bracketService.generateSingleEliminationBracket(String(t2._id));
  await Tournament.findByIdAndUpdate(t2._id, { status: TournamentStatus.IN_PROGRESS });
  const t2Matches = await Match.find({ tournament: t2._id }).sort({ round: 1, matchNumber: 1 });
  console.log(`Đã tạo bracket cho Giải 2: ${t2Matches.length} trận đấu`);

  // Mô phỏng diễn biến giải đấu:
  // Vòng Tứ kết (Round 1: 4 trận)
  const round1Matches = t2Matches.filter(m => m.round === 1);
  if (round1Matches.length >= 4) {
    // Trận 1: Cơ thủ 1 thắng Cơ thủ 8 (5 - 2)
    const m1 = round1Matches[0];
    const p1 = m1.participants.find(p => p.slot === 1);
    await bracketService.updateMatchScore(String(m1._id), {
      score1: 5,
      score2: 2,
      status: "completed",
      winnerRegistrationId: String(p1.registrationId),
    });

    // Trận 2: Cơ thủ 4 thắng Cơ thủ 5 (5 - 4 rượt đuổi)
    const m2 = round1Matches[1];
    const p2_1 = m2.participants.find(p => p.slot === 1);
    await bracketService.updateMatchScore(String(m2._id), {
      score1: 5,
      score2: 4,
      status: "completed",
      winnerRegistrationId: String(p2_1.registrationId),
    });

    // Trận 3: Đang thi đấu nghẹt thở (4 - 3)
    const m3 = round1Matches[2];
    await bracketService.updateMatchScore(String(m3._id), {
      score1: 4,
      score2: 3,
      status: "in_progress",
    });

    // Trận 4: Chuẩn bị thi đấu (0 - 0)
    const m4 = round1Matches[3];
    await bracketService.updateMatchScore(String(m4._id), {
      score1: 0,
      score2: 0,
      status: "scheduled",
    });
  }
  console.log(`✅ Đã cập nhật tỉ số nhánh đấu trực tiếp cho Giải 2: ${t2.name}`);

  // 3. GIẢI ĐẤU 3: Đã hoàn thành (completed)
  const t3StartDate = new Date(now.getTime() - 30 * 86400000);
  const t3EndDate = new Date(now.getTime() - 26 * 86400000);
  const t3Deadline = new Date(now.getTime() - 33 * 86400000);

  const t3Players = customers.slice(0, 8).map((c, idx) => ({
    user: c._id,
    name: c.name,
    phone: c.phone || `090${3000000 + idx}`,
    avatar: c.avatar,
    seed: idx + 1,
    feePaid: true,
    paymentMethod: "counter",
    registrationStatus: "confirmed",
    registeredAt: new Date(now.getTime() - (40 - idx) * 86400000),
  }));

  const t3 = await Tournament.create({
    name: "Giải Giao Hữu Bank Pool Mùa Thu CueZone 2026",
    gameType: "bank_pool",
    format: "Single Elimination",
    raceToScore: 4,
    maxPlayers: 8,
    registrationFee: 100000,
    prizePool: "Nhất: 4.000.000đ | Nhì: 2.000.000đ",
    firstPrize: "4.000.000đ + Cúp Vô Địch",
    secondPrize: "2.000.000đ + Cờ lưu niệm",
    thirdPrize: "800.000đ x 2",
    startDate: t3StartDate,
    endDate: t3EndDate,
    registrationDeadline: t3Deadline,
    status: TournamentStatus.REGISTRATION_OPEN,
    assignedTables: ["Bàn 05"],
    createdBy: adminUser._id,
    description: "Giải đấu khép lại mùa thu 2026 với những pha băng bi đẳng cấp và chức vô địch xứng đáng của cơ thủ Trần Quốc Đạt.",
    rules: "Luật Bank Pool rút gọn chạm 4 bi băng.",
    players: t3Players,
    prizes: [
      { rank: 1, reward: "4.000.000đ + Cúp Vô Địch", amount: 4000000 },
      { rank: 2, reward: "2.000.000đ + Cờ lưu niệm", amount: 2000000 },
      { rank: 3, reward: "800.000đ x 2", amount: 800000 }
    ]
  });

  await bracketService.generateSingleEliminationBracket(String(t3._id));
  const t3Matches = await Match.find({ tournament: t3._id }).sort({ round: 1, matchNumber: 1 });

  // Hoàn tất cả 3 vòng
  // Vòng 1
  for (const m of t3Matches.filter(x => x.round === 1)) {
    const winnerSlot = m.participants[0];
    await bracketService.updateMatchScore(String(m._id), {
      score1: 4,
      score2: 2,
      status: "completed",
      winnerRegistrationId: String(winnerSlot.registrationId),
    });
  }
  // Vòng 2 (Bán kết)
  const t3Semis = await Match.find({ tournament: t3._id, round: 2 });
  for (const m of t3Semis) {
    const winnerSlot = m.participants[0];
    await bracketService.updateMatchScore(String(m._id), {
      score1: 4,
      score2: 3,
      status: "completed",
      winnerRegistrationId: String(winnerSlot.registrationId),
    });
  }
  // Vòng 3 (Chung kết)
  const t3Final = await Match.findOne({ tournament: t3._id, round: 3 });
  if (t3Final) {
    const championSlot = t3Final.participants[0];
    await bracketService.updateMatchScore(String(t3Final._id), {
      score1: 4,
      score2: 1,
      status: "completed",
      winnerRegistrationId: String(championSlot.registrationId),
    });
  }
  await Tournament.findByIdAndUpdate(t3._id, { status: TournamentStatus.COMPLETED });
  console.log(`✅ Đã tạo và hoàn tất nhánh đấu cho Giải 3 (Completed): ${t3.name}`);

  // 4. GIẢI ĐẤU 4: Bản nháp (draft)
  const t4 = await Tournament.create({
    name: "Giải Billiards Đồng Đội CueZone Super League Mùa Xuân 2027",
    gameType: "bank_pool",
    format: "Single Elimination",
    raceToScore: 7,
    maxPlayers: 16,
    registrationFee: 300000,
    prizePool: "Tổng giá trị 50.000.000 VNĐ",
    firstPrize: "25.000.000đ + Cúp Vàng Đồng Đội",
    secondPrize: "15.000.000đ",
    thirdPrize: "5.000.000đ x 2",
    startDate: new Date("2027-02-15T08:00:00.000Z"),
    endDate: new Date("2027-02-20T18:00:00.000Z"),
    registrationDeadline: new Date("2027-02-10T18:00:00.000Z"),
    status: TournamentStatus.DRAFT,
    assignedTables: ["Bàn 01", "Bàn 02", "Bàn 03", "Bàn 04"],
    createdBy: adminUser._id,
    description: "Giải đấu quy mô cấp khu vực cho các câu lạc bộ bida giao lưu thi đấu đầu xuân 2027.",
    rules: "Áp dụng điều lệ giải đồng đội CueZone WPA Bank Pool.",
    players: [],
    prizes: [
      { rank: 1, reward: "25.000.000đ + Cúp Vàng", amount: 25000000 },
      { rank: 2, reward: "15.000.000đ", amount: 15000000 },
      { rank: 3, reward: "5.000.000đ x 2", amount: 5000000 }
    ]
  });
  console.log(`✅ Đã tạo Giải 4 (Bản nháp - Draft): ${t4.name}`);

  console.log("\n🎉 SEED DỮ LIỆU GIẢI ĐẤU THÀNH CÔNG 100%!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Lỗi khi seed giải đấu:", err);
  process.exit(1);
});
