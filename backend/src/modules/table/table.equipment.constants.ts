// Số lượng chuẩn của vật tư theo từng loại bàn.
// ponytail: hardcode cho 3 TableType; ceiling = thêm loại bàn hoặc đổi chuẩn phải sửa code + deploy.
// Hướng nâng cấp: đưa chuẩn vào collection cấu hình/API admin khi cần tự chỉnh không deploy.

import { LEGACY_TABLE_TYPE_MAP, TableType } from "./table.model";

export interface TableEquipmentStandards {
  /** Số bóng chuẩn trong bộ của từng loại bàn (pool 16, carom 3, snooker 22) */
  ballsSetCount: number;
  /** Số queue dài chuẩn */
  cueCount: number;
  /** Số ngón chalk chuẩn */
  chalkCount: number;
  /** Số tam giác đặt ở mép bàn (triangle) */
  triangleCount: number;
  /** Số găng tay chuẩn */
  glovesCount: number;
  /** Trạng thái lót felt chuẩn: ok (tốt), low (yếu), broken (hư) */
  feltCondition: "ok" | "low" | "broken";
  /** Độ sáng ánh sáng chuẩn: ok (đủ sáng), low (mờ), broken (tối) */
  lightCondition: "ok" | "low" | "broken";
}

export const EQUIPMENT_STANDARDS_BY_TABLE_TYPE: Record<TableType, TableEquipmentStandards> = {
  [TableType.POOL]: {
    // Bàn bida tập trung: 16 quả bóng, 1 queue dài, 1 tam giác, 2 găng tay.
    ballsSetCount: 16,
    cueCount: 1,
    chalkCount: 1,
    triangleCount: 1,
    glovesCount: 2,
    feltCondition: "ok",
    lightCondition: "ok",
  },
  [TableType.CAROM]: {
    // Bàn đánh 3 quả (carom): 3 quả bóng, 1 queue, 1 tam giác, 1 găng tay.
    ballsSetCount: 3,
    cueCount: 1,
    chalkCount: 1,
    triangleCount: 1,
    glovesCount: 1,
    feltCondition: "ok",
    lightCondition: "ok",
  },
  [TableType.SNOOKER]: {
    // Bàn snooker: 22 quả bóng, 1 queue, 1 tam giác, 2 găng tay.
    ballsSetCount: 22,
    cueCount: 1,
    chalkCount: 1,
    triangleCount: 1,
    glovesCount: 2,
    feltCondition: "ok",
    lightCondition: "ok",
  },
};

// Bàn cũ đọc thẳng từ DB có thể vẫn giữ mã legacy (hook chỉ chuẩn hoá khi validate/update).
export function getEquipmentStandards(tableType: string): TableEquipmentStandards | undefined {
  const normalized = LEGACY_TABLE_TYPE_MAP[tableType] ?? (tableType as TableType);
  return EQUIPMENT_STANDARDS_BY_TABLE_TYPE[normalized];
}
