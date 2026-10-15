/**
 * Seed 3 tài khoản demo khớp với SEED_ACCOUNTS ở frontend
 * (frontend/src/mock/seedData.ts) để nút "Đăng nhập nhanh" gọi
 * API thật /auth/login và pass bcrypt compare.
 *
 * Chạy:  cd backend && npx ts-node --transpile-only scripts/seed-auth.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User, UserRole } from "../src/modules/user/user.model";

const SEED_USERS = [
  {
    name: "Nguyễn Tiến Dũng (Chủ CLB)",
    email: "admin@cuezone.com",
    password: "password123",
    role: UserRole.ADMIN,
    position: "Quản trị viên (Admin)",
    branch: "CueZone Club - Chi nhánh Landmark",
  },
  {
    name: "Lê Thuỳ Trang (Nhân Viên Vận Hành)",
    email: "staff@cuezone.com",
    password: "password123",
    role: UserRole.STAFF,
    position: "Nhân viên vận hành & POS",
    branch: "CueZone Club - Chi nhánh Landmark",
  },
  {
    name: "Đặng Tuấn Anh (Hội Viên)",
    email: "customer@cuezone.com",
    password: "password123",
    role: UserRole.CUSTOMER,
    position: "Khách hàng hội viên",
    branch: "CueZone Club - Chi nhánh Landmark",
  },
];

async function run(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI chưa được cấu hình trong .env");
  }

  await mongoose.connect(uri);
  console.log(`Connected to DB: ${mongoose.connection.name}`);

  for (const seed of SEED_USERS) {
    const existing = await User.findOne({ email: seed.email }).select("+password");
    if (existing) {
      existing.name = seed.name;
      existing.role = seed.role;
      existing.password = seed.password; // pre-save hook → bcrypt hash
      existing.isActive = true;
      existing.isLocked = false;
      await existing.save();
      console.log(`Updated: ${seed.email} (${seed.role})`);
    } else {
      await User.create(seed); // pre-save hook → bcrypt hash
      console.log(`Created: ${seed.email} (${seed.role})`);
    }
  }

  await mongoose.disconnect();
  console.log("Seed done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
