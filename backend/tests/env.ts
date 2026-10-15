/**
 * Chạy trước MỌI import của test (setupFiles) nên env được set
 * trước khi src/config/app.config.ts đọc process.env.
 */
import dotenv from "dotenv";

dotenv.config();

function toTestUri(uri: string): string {
  const qIndex = uri.indexOf("?");
  const path = qIndex === -1 ? uri : uri.slice(0, qIndex);
  const query = qIndex === -1 ? "" : uri.slice(qIndex);

  const schemeEnd = path.indexOf("//") + 1; // vị trí sau "//"
  const atIndex = path.lastIndexOf("@");
  const lastSlash = path.lastIndexOf("/");

  // Chỉ cắt phần db name khi có "/xxx" sau host (sau "@" nếu có)
  if (lastSlash > Math.max(atIndex, schemeEnd)) {
    return `${path.slice(0, lastSlash)}/cuezone_test${query}`;
  }
  return `${path}/cuezone_test${query}`;
}

process.env.NODE_ENV = "test";
process.env.MONGO_URI = toTestUri(
  process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db"
);
