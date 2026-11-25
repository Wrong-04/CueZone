// ============================================================================
// 1. IMPORTS & ICONS
// ============================================================================
import React, { useEffect, useState } from "react";
import { AppstoreOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Select } from "../../../../shared/ui";
import type { BilliardTable, TableEquipment, TableType } from "../../../../types";
import { getTableEquipmentStandards } from "./equipment.constants";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface TableFormModalProps {
  visible: boolean;
  onCancel: () => void;
  editingTable: BilliardTable | null;
  tableCode: string;
  setTableCode: (val: string) => void;
  tableName: string;
  setTableName: (val: string) => void;
  tableType: TableType;
  setTableType: (val: TableType) => void;
  tableFloor: number;
  setTableFloor: (val: number) => void;
  tableArea: string;
  onSelectArea: (area: string) => void;
  tablePrice: number;
  saving: boolean;
  distinctFloors: number[];
  onSave: (equipment: TableEquipment) => void;
}

// ============================================================================
// 3. CONSTANTS & HELPERS: VẬT TƯ BAN ĐẦU
// ============================================================================
type EquipmentCountKey = (typeof EQUIPMENT_COUNT_KEYS)[number];

const EQUIPMENT_COUNT_KEYS = [
  "ballsSetCount",
  "cueCount",
  "chalkCount",
  "triangleCount",
  "glovesCount",
] as const;

const EQUIPMENT_FIELD_LABELS: Record<EquipmentCountKey, string> = {
  ballsSetCount: "Số bộ bi",
  cueCount: "Số cơ/gậy",
  chalkCount: "Số phấn/lơ",
  triangleCount: "Số tam giác xếp bi",
  glovesCount: "Số găng tay",
};

const EQUIPMENT_CONDITION_OPTIONS = [
  { value: "ok", label: "Đủ" },
  { value: "low", label: "Thiếu" },
  { value: "broken", label: "Hư" },
] as const;

// ============================================================================
// 4. MAIN COMPONENT: MODAL TẠO MỚI & CHỈNH SỬA BÀN BIDA
// ============================================================================
export const TableFormModal: React.FC<TableFormModalProps> = ({
  visible,
  onCancel,
  editingTable,
  tableCode,
  setTableCode,
  tableName,
  setTableName,
  tableType,
  setTableType,
  tableFloor,
  setTableFloor,
  tableArea,
  onSelectArea,
  tablePrice,
  saving,
  distinctFloors,
  onSave,
}) => {
  // ── State: Vật tư ban đầu của bàn ──────────────────────────────────────
  const standards = getTableEquipmentStandards(tableType);
  const [equipment, setEquipment] = useState<TableEquipment>(
    () => editingTable?.equipment ?? standards
  );

  // Đồng bộ giá trị vật tư khi mở modal tạo mới hoặc chỉnh sửa bàn
  useEffect(() => {
    if (visible) {
      setEquipment(editingTable?.equipment ?? standards);
    }
  }, [visible, editingTable, standards]);

  const setEquipmentCount = (key: EquipmentCountKey, value: number) => {
    setEquipment((prev) => {
      const next = { ...prev };
      next[key] = value;
      return next;
    });
  };

  const setEquipmentCondition = (
    key: "feltCondition" | "lightCondition",
    value: TableEquipment["feltCondition"]
  ) => {
    setEquipment((prev) => {
      const next = { ...prev };
      next[key] = value;
      return next;
    });
  };

  const handleCountChange = (key: EquipmentCountKey, rawValue: string) => {
    const parsed = Number(rawValue);
    setEquipmentCount(key, Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={540}
      title={
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <AppstoreOutlined className="text-emerald-600 text-lg" />
          <span className="font-black text-slate-900 text-base whitespace-nowrap">
            {editingTable ? `Chỉnh Sửa ${editingTable.name}` : "Thêm Bàn Bida Mới"}
          </span>
        </div>
      }
    >
      <div className="py-2 space-y-3.5 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">Mã bàn:</label>
            <Input
              placeholder="T01, V09, M13..."
              value={tableCode}
              onChange={(e) => setTableCode(e.target.value)}
              className="!h-9 !rounded-xl font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">Tên hiển thị:</label>
            <Input
              placeholder="Bàn 01, Bàn VIP 09..."
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="!h-9 !rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">Loại bàn:</label>
            <Select
              value={tableType}
              onChange={(val) => setTableType(val as TableType)}
              className="!w-full !rounded-xl !h-9"
              options={[
                { value: "pool", label: "Bàn Bida Lỗ (Pool)" },
                { value: "carom", label: "Bàn Bida Carom (Phăng)" },
                { value: "snooker", label: "Bàn Bida Snooker" },
              ]}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">Tầng:</label>
            <Select
              value={tableFloor}
              onChange={(val) => setTableFloor(Number(val))}
              className="!w-full !rounded-xl !h-9"
              options={[
                ...distinctFloors.map((f) => ({
                  value: f,
                  label: `Tầng ${f}`,
                })),
                ...[1, 2, 3, 4, 5]
                  .filter((f) => !distinctFloors.includes(f))
                  .map((f) => ({
                    value: f,
                    label: `Tầng ${f} (Mở rộng)`,
                  })),
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">Khu vực đặt bàn:</label>
          <Select
            value={tableArea}
            onChange={onSelectArea}
            className="!w-full !rounded-xl !h-9"
            options={[
              { value: "Phổ thông", label: "Khu Phổ Thông" },
              { value: "Khu VIP", label: "Khu VIP" },
              { value: "Thi đấu", label: "Khu Thi Đấu" },
            ]}
          />
        </div>

        {/* ── Vật tư ban đầu theo từng bàn bida ── */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <span className="block text-slate-700 font-semibold whitespace-nowrap">Vật tư ban đầu</span>
          <div className="grid grid-cols-2 gap-3">
            {EQUIPMENT_COUNT_KEYS.map((key) => (
              <div key={key}>
                <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">
                  {EQUIPMENT_FIELD_LABELS[key]}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={equipment[key]}
                    onChange={(e) => handleCountChange(key, e.target.value)}
                    className="!h-9 !rounded-xl"
                  />
                  <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                    Chuẩn: {standards[key]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">
                Tình trạng nỉ
              </label>
              <Select
                value={equipment.feltCondition}
                onChange={(val) =>
                  setEquipmentCondition("feltCondition", val as TableEquipment["feltCondition"])
                }
                className="!w-full !rounded-xl !h-9"
                options={[...EQUIPMENT_CONDITION_OPTIONS]}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">
                Tình trạng đèn
              </label>
              <Select
                value={equipment.lightCondition}
                onChange={(val) =>
                  setEquipmentCondition("lightCondition", val as TableEquipment["lightCondition"])
                }
                className="!w-full !rounded-xl !h-9"
                options={[...EQUIPMENT_CONDITION_OPTIONS]}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">
              Ghi chú kiểm kê
            </label>
            <Input.TextArea
              placeholder="VD: nỉ cũ, đèn yếu, quả trắng nhạt..."
              value={equipment.note ?? ""}
              onChange={(e) => setEquipment((prev) => ({ ...prev, note: e.target.value }))}
              className="!rounded-xl"
              rows={2}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-700 font-semibold whitespace-nowrap">Đơn giá giờ chơi:</span>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap">
              Cố định theo {tableArea || "Khu vực"}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black font-mono text-emerald-700 whitespace-nowrap">
              {tablePrice.toLocaleString("vi-VN")}đ
            </span>
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">/ giờ</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 mb-0 leading-relaxed [text-wrap:balance]">
            * Giá giờ cố định theo Khu vực. Bạn có thể đổi giá tại tab <strong>Bảng Giá Theo Khung Giờ</strong>.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="!rounded-xl whitespace-nowrap"
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            onClick={() => onSave(equipment)}
            className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4 whitespace-nowrap"
          >
            Lưu Thông Tin
          </Button>
        </div>
      </div>
    </Modal>
  );
};
