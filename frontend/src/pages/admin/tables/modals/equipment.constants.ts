import type { TableEquipment, TableType } from "../../../../types";

// ============================================================================
// Chuẩn vật tư theo loại bàn, dùng để gợi ý "Chuẩn: X" trong form.
// values: ok = Đủ, low = Thiếu, broken = Hư — khớp contract BilliardTable.equipment.*Condition
// ============================================================================

// Bàn cũ trong DB có thể giữ mã legacy, cần quy về 3 loại chuẩn trước khi lấy số liệu.
export const LEGACY_TABLE_TYPE_MAP: Record<string, TableType> = {
  standard_9ft: "pool",
  standard: "pool",
  nine_ball: "pool",
  full_ball: "pool",
  vip_bank_pool: "carom",
  vip: "carom",
  libre: "carom",
  three_cushion: "carom",
  match_ksteel: "snooker",
  match: "snooker",
};

export const TABLE_TYPE_EQUIPMENT_STANDARDS: Record<TableType, TableEquipment> = {
  pool: {
    ballsSetCount: 16,
    cueCount: 1,
    chalkCount: 1,
    triangleCount: 1,
    glovesCount: 2,
    feltCondition: "ok",
    lightCondition: "ok",
  },
  carom: {
    ballsSetCount: 3,
    cueCount: 1,
    chalkCount: 1,
    triangleCount: 1,
    glovesCount: 1,
    feltCondition: "ok",
    lightCondition: "ok",
  },
  snooker: {
    ballsSetCount: 22,
    cueCount: 1,
    chalkCount: 1,
    triangleCount: 1,
    glovesCount: 2,
    feltCondition: "ok",
    lightCondition: "ok",
  },
};

// Mã lạ (không nằm trong map) vẫn về chuẩn pool để form không bị undefined.
export function getTableEquipmentStandards(type: string | TableType): TableEquipment {
  const normalized = LEGACY_TABLE_TYPE_MAP[type] ?? (type as TableType);
  return TABLE_TYPE_EQUIPMENT_STANDARDS[normalized] ?? TABLE_TYPE_EQUIPMENT_STANDARDS.pool;
}

// ponytail: đang nhân bản constant backend (backend/src/modules/table/table.equipment.constants.ts và LEGACY_TABLE_TYPE_MAP trong table.model.ts) vì chưa có module dùng chung; hướng nâng cấp: đưa ra package dùng chung hoặc trả chuẩn qua API bàn bida để khỏi phải đồng bộ tay.
