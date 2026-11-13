const dns = require("node:dns");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const COLLECTION = "bookings";
const REQUIRED_STATUS = "cancelled";
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const databaseIndex = args.indexOf("--database");
const targetDatabase = databaseIndex >= 0 ? args[databaseIndex + 1] : undefined;

async function main() {
  if (args.some((arg) => !["--apply", "--database", "cuezone_db"].includes(arg))) {
    throw new Error("Dùng: node scripts/migrate-booking-status-validator.cjs [--apply --database cuezone_db]");
  }
  if (args.includes("--apply") && targetDatabase !== "cuezone_db") {
    throw new Error("Khi áp dụng, phải xác nhận đích bằng --database cuezone_db");
  }
  if (databaseIndex >= 0 && targetDatabase !== "cuezone_db") {
    throw new Error("Database đích không hợp lệ");
  }
  if (!process.env.MONGO_URI) throw new Error("Thiếu MONGO_URI");

  const connection = await mongoose.createConnection(process.env.MONGO_URI, {
    autoCreate: false,
    autoIndex: false,
    serverSelectionTimeoutMS: 15000,
  }).asPromise();

  try {
    if (connection.name !== "cuezone_db") {
      throw new Error("MONGO_URI không trỏ đến database cuezone_db");
    }

    const collectionInfo = await connection.db.listCollections({ name: COLLECTION }).next();
    if (!collectionInfo) throw new Error("Không tìm thấy collection bookings");

    const validator = collectionInfo.options?.validator;
    const statusEnum = validator?.$jsonSchema?.properties?.status?.enum;
    if (!Array.isArray(statusEnum)) {
      throw new Error("Validator bookings không có enum status JSON Schema như mong đợi");
    }

    if (statusEnum.includes(REQUIRED_STATUS)) {
      console.log("Validator bookings đã cho phép trạng thái cancelled; không cần cập nhật.");
      return;
    }

    validator.$jsonSchema.properties.status.enum = [...statusEnum, REQUIRED_STATUS];
    if (!apply) {
      console.log(JSON.stringify({
        database: connection.name,
        collection: COLLECTION,
        currentStatusEnum: statusEnum,
        nextStatusEnum: validator.$jsonSchema.properties.status.enum,
        applied: false,
      }, null, 2));
      return;
    }

    await connection.db.command({
      collMod: COLLECTION,
      validator,
      validationLevel: collectionInfo.options.validationLevel || "strict",
      validationAction: collectionInfo.options.validationAction || "error",
    });

    const updatedInfo = await connection.db.listCollections({ name: COLLECTION }).next();
    const updatedEnum = updatedInfo?.options?.validator?.$jsonSchema?.properties?.status?.enum;
    if (!Array.isArray(updatedEnum) || !updatedEnum.includes(REQUIRED_STATUS)) {
      throw new Error("Không xác minh được cập nhật validator bookings");
    }
    console.log("Đã cập nhật validator bookings để cho phép trạng thái cancelled.");
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error("Cập nhật validator bookings thất bại:", error.message || error);
  process.exitCode = 1;
});
