// Kiểm tra contract vật tư bàn bida: constant ↔ legacy map ↔ schema model.
// Chạy từ root repo: node backend/scripts/check-table-equipment.cjs (cần build trước).
const assert = require("node:assert/strict");
const { Table, TableType, LEGACY_TABLE_TYPE_MAP } = require("../dist/modules/table/table.model");
const {
  EQUIPMENT_STANDARDS_BY_TABLE_TYPE,
  getEquipmentStandards,
} = require("../dist/modules/table/table.equipment.constants");

const COUNT_KEYS = ["ballsSetCount", "cueCount", "chalkCount", "triangleCount", "glovesCount"];
const CONDITION_KEYS = ["feltCondition", "lightCondition"];
const CONDITIONS = ["ok", "low", "broken"];

// 1. Constant phủ mọi TableType, không thiếu cũng không thừa.
const tableTypes = Object.values(TableType);
assert.deepEqual(
  Object.keys(EQUIPMENT_STANDARDS_BY_TABLE_TYPE).sort(),
  [...tableTypes].sort(),
  "constant phải phủ đúng mọi TableType",
);

// 2. Mỗi mục có đủ 5 số (>= 0) và 2 điều kiện hợp lệ.
for (const type of tableTypes) {
  const standard = EQUIPMENT_STANDARDS_BY_TABLE_TYPE[type];
  assert.deepEqual(
    Object.keys(standard).sort(),
    [...COUNT_KEYS, ...CONDITION_KEYS].sort(),
    `shape chuẩn ${type}`,
  );
  for (const key of COUNT_KEYS) {
    assert.equal(typeof standard[key], "number", `${type}.${key} phải là số`);
    assert.ok(Number.isInteger(standard[key]) && standard[key] >= 0, `${type}.${key} phải >= 0`);
  }
  for (const key of CONDITION_KEYS) {
    assert.ok(CONDITIONS.includes(standard[key]), `${type}.${key} chỉ nhận ok|low|broken`);
  }
}

// Bàn cũ vẫn giữ mã legacy khi đọc từ DB: phải resolve về đúng chuẩn của TableType.
for (const [legacy, mapped] of Object.entries(LEGACY_TABLE_TYPE_MAP)) {
  assert.deepEqual(
    getEquipmentStandards(legacy),
    EQUIPMENT_STANDARDS_BY_TABLE_TYPE[mapped],
    `legacy ${legacy}`,
  );
}
assert.equal(getEquipmentStandards("khong_ton_tai"), undefined);

// 3. Shape field trên model khớp constant (không lưu checkedAt / condition tổng hợp).
const equipmentPath = Table.schema.path("equipment");
assert.ok(equipmentPath, "Table schema phải có equipment");
assert.ok(!equipmentPath.isRequired, "equipment không bắt buộc");
assert.equal(equipmentPath.defaultValue, undefined, "không backfill cho bàn cũ");
const subPaths = equipmentPath.schema.paths;
assert.deepEqual(
  Object.keys(subPaths).sort(),
  [...COUNT_KEYS, ...CONDITION_KEYS, "note"].sort(),
  "shape equipment schema",
);
for (const key of COUNT_KEYS) {
  assert.equal(subPaths[key].instance, "Number", `equipment.${key} phải là Number`);
  assert.equal(subPaths[key].defaultValue, 0, `equipment.${key} default 0`);
}
for (const key of CONDITION_KEYS) {
  assert.equal(subPaths[key].instance, "String", `equipment.${key} phải là String`);
  assert.deepEqual(subPaths[key].enumValues, CONDITIONS, `equipment.${key} enum ok|low|broken`);
}
assert.equal(subPaths.note.instance, "String", "equipment.note phải là String");

console.log("check-table-equipment: OK");
