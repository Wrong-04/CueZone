const path = require("node:path");
const { createHash } = require("node:crypto");
const mongoose = require("mongoose");
const { loadModels, snapshot } = require("./migrate-erd.cjs");
const { erdEntities } = require("../dist/config/erd-fields");
const { EJSON } = mongoose.mongo.BSON;
const VERSION = "002_complete_erd_fields";
const stableId = (value) =>
  new mongoose.Types.ObjectId(
    createHash("sha256").update(`${VERSION}:${value}`).digest("hex").slice(0, 24),
  );

function schemaAt(model, path) {
  let schema = model.schema;
  for (const part of path.split(".").filter(Boolean)) {
    schema = schema.path(part)?.schema;
    if (!schema) throw new Error(`Thiếu schema ${model.modelName}.${path}`);
  }
  return schema;
}
function checkSchemas() {
  let fields = 0;
  for (const entry of erdEntities) {
    const schema = schemaAt(mongoose.models[entry.model], entry.path);
    for (const [erd, field] of Object.entries(entry.fields)) {
      if (!schema.path(field)) throw new Error(`Thiếu field ${entry.entity}.${erd} -> ${field}`);
      fields++;
    }
  }
  return { entities: erdEntities.length, fields };
}
function nodes(doc, path) {
  let values = [{ value: doc, parent: null }];
  for (const part of path.split(".").filter(Boolean)) {
    values = values.flatMap(({ value }) => {
      const child = value[part];
      return (Array.isArray(child) ? child : child ? [child] : []).map((item) => ({
        value: item,
        parent: value,
      }));
    });
  }
  return values;
}
function complete(model, source) {
  const doc = EJSON.parse(EJSON.stringify(source));
  const entries = erdEntities.filter((e) => e.model === model.modelName);

  for (const entry of entries) {
    let owner = doc;
    for (const part of entry.path.split(".").filter(Boolean)) {
      if (Array.isArray(owner)) break;
      if (owner[part] === undefined) owner[part] = part === "result" ? null : [];
      owner = owner[part];
      if (!owner) break;
    }
    for (const { value, parent } of nodes(doc, entry.path)) {
      for (const field of Object.values(entry.fields)) {
        if (value[field] !== undefined) continue;
        let next = null;
        if (field === "_id")
          next = stableId(`${doc._id}:${entry.path}:${value.rank ?? value.slot ?? parent?._id}`);
        else if (
          field === "tournamentId" ||
          field === "matchId" ||
          field === "tableSessionId" ||
          field === "goodsReceiptId"
        )
          next = doc._id;
        else if (entry.entity === "TOURNAMENT_RESULT" && field === "registrationId")
          next = parent._id;
        else if (entry.entity === "MATCH_PARTICIPANT" && field === "isWinner")
          next = doc.winnerRegistrationId
            ? String(value.registrationId) === String(doc.winnerRegistrationId)
            : null;
        value[field] = next;
      }

      if (entry.entity === "TOURNAMENT_REGISTRATION" && value.result === undefined)
        value.result = null;
    }
  }
  return doc;
}
function bsonField(schemaType) {
  const type = {
    String: "string",
    Boolean: "bool",
    Date: "date",
    ObjectId: "objectId",
    Number: ["double", "int", "long", "decimal"],
  }[schemaType.instance];
  if (!type) throw new Error(`Kiểu ERD chưa hỗ trợ: ${schemaType.instance}`);
  const result = { bsonType: [...(Array.isArray(type) ? type : [type]), "null"] };
  if (schemaType.enumValues?.length) result.enum = [...schemaType.enumValues, null];
  if (schemaType.options.min !== undefined) result.minimum = schemaType.options.min;
  if (schemaType.options.max !== undefined) result.maximum = schemaType.options.max;
  return result;
}
function validatorFor(model, oldValidator) {
  if (oldValidator && Object.keys(oldValidator).some((k) => k !== "$jsonSchema"))
    throw new Error("Validator ngoài JSON Schema cần kiểm tra thủ công");
  const validator = EJSON.parse(
    EJSON.stringify(oldValidator || { $jsonSchema: { bsonType: "object", properties: {} } }),
  );
  for (const entry of erdEntities.filter((e) => e.model === model.modelName)) {
    let json = validator.$jsonSchema;
    let schema = model.schema;
    for (const part of entry.path.split(".").filter(Boolean)) {
      const property = schema.path(part);
      json.properties ||= {};
      if (property.$isMongooseDocumentArray) {
        json.properties[part] ||= {
          bsonType: "array",
          items: { bsonType: "object", properties: {} },
        };
        json = json.properties[part].items;
      } else {
        json.properties[part] ||= { bsonType: ["object", "null"], properties: {} };
        json = json.properties[part];
      }
      schema = property.schema;
    }
    json.properties ||= {};
    for (const field of Object.values(entry.fields)) {
      const property = schema.path(field);
      const generated = bsonField(property);

      if (json.required?.includes(field) || field === "_id")
        generated.bsonType = generated.bsonType.filter((t) => t !== "null");
      json.properties[field] = { ...json.properties[field], ...generated };
      if (
        json.properties[field].enum &&
        generated.bsonType.includes("null") &&
        !json.properties[field].enum.includes(null)
      )
        json.properties[field].enum.push(null);
    }
  }
  return validator;
}
async function plan(db) {
  const coverage = checkSchemas();
  const changes = [];
  const validators = [];
  for (const name of new Set(erdEntities.map((e) => e.model))) {
    const model = mongoose.models[name];
    const collection = model.collection.name;
    const info = await db.listCollections({ name: collection }).next();
    if (!info) throw new Error(`Thiếu collection ${collection}; chạy migration 001 trước`);
    const validator = validatorFor(model, info.options?.validator);
    validators.push({
      collection,
      validator,
      changed: EJSON.stringify(validator) !== EJSON.stringify(info.options?.validator),
    });
    for await (const original of db.collection(collection).find({})) {
      const next = complete(model, original);
      const fields = Object.fromEntries(
        Object.entries(next).filter(
          ([key, value]) =>
            !Object.hasOwn(original, key) ||
            EJSON.stringify(value) !== EJSON.stringify(original[key]),
        ),
      );
      if (Object.keys(fields).length)
        changes.push({ collection, id: original._id, original, fields });
    }
  }
  return { ...coverage, changes, validators };
}
async function verify(db) {
  const coverage = checkSchemas();
  let documents = 0;
  let nullFields = 0;
  for (const name of new Set(erdEntities.map((e) => e.model))) {
    const model = mongoose.models[name];
    for await (const doc of db.collection(model.collection.name).find({})) {
      documents++;
      for (const entry of erdEntities.filter((e) => e.model === name)) {
        for (const { value } of nodes(doc, entry.path)) {
          for (const field of Object.values(entry.fields)) {
            if (!Object.hasOwn(value, field))
              throw new Error(`Document thiếu ${entry.entity}.${field}`);
            if (value[field] === null) nullFields++;
          }
        }
      }
    }
  }
  return { ...coverage, documents, nullFields };
}
async function apply(db, backupDir) {
  const migration = await plan(db);
  if (await db.collection("schema_migrations").findOne({ _id: VERSION })) {
    if (migration.changes.length || migration.validators.some((v) => v.changed))
      throw new Error("Schema/dữ liệu thay đổi sau migration 002; không ghi đè");
    return { alreadyApplied: true, ...(await verify(db)) };
  }
  const backup = await snapshot(db, backupDir);

  const users = db.collection("users");
  await users.createIndex(
    { phone: 1 },
    { name: "phone_1_v2", unique: true, partialFilterExpression: { phone: { $type: "string" } } },
  );
  if ((await users.indexes()).some((i) => i.name === "phone_1")) await users.dropIndex("phone_1");

  for (const item of migration.validators)
    if (item.changed)
      await db.command({
        collMod: item.collection,
        validator: item.validator,
        validationLevel: "strict",
        validationAction: "error",
      });
  await mongoose.connection.transaction(async (session) => {
    for (const change of migration.changes) {
      const current = await db
        .collection(change.collection)
        .findOne({ _id: change.id }, { session });
      if (EJSON.stringify(current) !== EJSON.stringify(change.original))
        throw new Error("Dữ liệu đang được ghi; dừng ứng dụng trước khi migration");
      try {
        await db
          .collection(change.collection)
          .updateOne({ _id: change.id }, { $set: change.fields }, { session });
      } catch (error) {
        const failed = new Set();
        function names(value) {
          if (value && typeof value === "object") {
            if (value.propertyName) failed.add(value.propertyName);
            for (const child of Object.values(value)) names(child);
          }
        }
        names(error.errInfo);
        throw new Error(
          `Không cập nhật được ${change.collection}: code=${error.code}; fields=${[...failed].join(",")}`,
        );
      }
    }
  });
  const result = await verify(db);
  for (const item of migration.validators) {
    if (await db.collection(item.collection).countDocuments({ $nor: [item.validator] }))
      throw new Error(`Dữ liệu không đạt validator: ${item.collection}`);
  }
  for (const c of backup.collections)
    if ((await db.collection(c.name).countDocuments()) !== c.count)
      throw new Error(`Số bản ghi thay đổi: ${c.name}`);
  const again = await plan(db);
  if (again.changes.length || again.validators.some((v) => v.changed))
    throw new Error("Migration không idempotent");
  await db
    .collection("schema_migrations")
    .insertOne({ _id: VERSION, appliedAt: new Date(), backupDir, coverage: result });
  return { alreadyApplied: false, backupDir, updated: migration.changes.length, ...result };
}
async function main() {
  const args = process.argv.slice(2);
  if (args.some((a) => !["--apply", "--maintenance", "--dry-run"].includes(a)))
    throw new Error("Tham số không hợp lệ");
  if (args.includes("--apply") && !args.includes("--maintenance"))
    throw new Error("Cần dừng tiến trình ghi và thêm --maintenance");
  if (!process.env.MONGO_URI) throw new Error("Thiếu MONGO_URI");
  mongoose.set("autoCreate", false);
  mongoose.set("autoIndex", false);
  await loadModels();
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;
    if (args.includes("--apply"))
      console.log(
        JSON.stringify(
          await apply(db, path.resolve(__dirname, "../../.pi/backups", `${VERSION}-${Date.now()}`)),
          null,
          2,
        ),
      );
    else {
      const result = await plan(db);
      console.log(
        JSON.stringify(
          {
            database: db.databaseName,
            entities: result.entities,
            fields: result.fields,
            updates: result.changes.length,
            validators: result.validators.filter((v) => v.changed).length,
          },
          null,
          2,
        ),
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}
module.exports = { complete, checkSchemas, plan, verify, apply, VERSION };
if (require.main === module)
  main().catch((e) => {
    console.error(
      "Migration 002 thất bại:",
      e.name,
      e.code || "",
      e.name === "Error" ? e.message : "Không in dữ liệu riêng tư",
    );
    process.exitCode = 1;
  });
