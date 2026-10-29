const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { EJSON } = mongoose.mongo.BSON;

async function restore(db, backupDir) {
  if ((await db.listCollections().toArray()).length)
    throw new Error("Database khôi phục phải trống");
  const manifest = EJSON.parse(await fs.readFile(path.join(backupDir, "manifest.ejson"), "utf8"));
  const files = [];

  for (const collection of manifest.collections) {
    if (!/^\d+\.ejsonl$/.test(collection.file)) throw new Error("Tên file backup không hợp lệ");
    const text = await fs.readFile(path.join(backupDir, collection.file), "utf8");
    if (createHash("sha256").update(text).digest("hex") !== collection.sha256)
      throw new Error("Checksum backup không khớp");
    const docs = text.trim()
      ? text
          .trim()
          .split("\n")
          .map((line) => EJSON.parse(line))
      : [];
    if (docs.length !== collection.count) throw new Error("Số bản ghi backup không khớp");
    files.push({ ...collection, docs });
  }
  for (const file of files) {
    const collection = await db.createCollection(file.name, file.options || {});

    if (file.docs.length)
      await collection.insertMany(file.docs, { bypassDocumentValidation: true });
    for (const index of file.indexes) {
      if (index.name === "_id_") continue;
      const { key, v, ns, ...options } = index;
      await collection.createIndex(key, options);
    }
    if ((await collection.countDocuments()) !== file.count)
      throw new Error("Khôi phục thiếu bản ghi");
  }
  return { collections: files.length, documents: files.reduce((sum, file) => sum + file.count, 0) };
}

async function main() {
  const [backupDir, dbName] = process.argv.slice(2);
  if (!backupDir || !/^cz_restore_[a-z0-9_]{1,25}$/.test(dbName || ""))
    throw new Error(
      "Dùng: node scripts/restore-erd.cjs <backupDir> cz_restore_<tên> (tổng tối đa 36 ký tự)",
    );
  if (!process.env.MONGO_URI) throw new Error("Thiếu MONGO_URI");
  let source;
  try {
    source = await mongoose
      .createConnection(process.env.MONGO_URI, { autoIndex: false, autoCreate: false })
      .asPromise();
    if (source.name === dbName) throw new Error("Không được khôi phục đè database nguồn");
    await source.close();
    source = null;
    await mongoose.connect(process.env.MONGO_URI, { dbName, autoIndex: false, autoCreate: false });
    console.log(
      JSON.stringify({
        database: dbName,
        ...(await restore(mongoose.connection.db, path.resolve(backupDir))),
      }),
    );
  } finally {
    if (source) await source.close();
    await mongoose.disconnect();
  }
}
module.exports = { restore };
if (require.main === module)
  main().catch((error) => {
    console.error(
      "Khôi phục thất bại:",
      error.name,
      error.code || "",
      error.name === "Error" ? error.message : "Kiểm tra backup/quyền MongoDB",
    );
    process.exitCode = 1;
  });
