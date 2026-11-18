// ============================================================================
// 1. IMPORTS & ICONS
// ============================================================================
import React from "react";
import { ClockCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { InputNumber } from "antd";
import { Button, Input, Modal, Select } from "../../../../shared/ui";
import type { PricingTier } from "../../../../types";
import { TIME_OPTIONS } from "../types/tables.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface PricingTierModalProps {
  visible: boolean;
  onCancel: () => void;
  editingPricing: PricingTier | null;
  pricingName: string;
  setPricingName: (val: string) => void;
  pricingDayType: string;
  setPricingDayType: (val: string) => void;
  pricingIsActive: boolean;
  setPricingIsActive: (val: boolean) => void;
  pricingStartTime: string;
  setPricingStartTime: (val: string) => void;
  pricingEndTime: string;
  setPricingEndTime: (val: string) => void;
  pricingStandardPrice: number;
  setPricingStandardPrice: (val: number) => void;
  pricingVipPrice: number;
  setPricingVipPrice: (val: number) => void;
  pricingMatchPrice: number;
  setPricingMatchPrice: (val: number) => void;
  saving: boolean;
  onSave: () => void;
}

// ============================================================================
// 4. MAIN COMPONENT: MODAL TẠO & CẬP NHẬT BẢNG GIÁ THEO KHUNG GIỜ
// Thiết lập đơn giá tiền giờ cho bàn tiêu chuẩn, bàn VIP, bàn thi đấu theo khung giờ trong ngày
// ============================================================================
export const PricingTierModal: React.FC<PricingTierModalProps> = ({
  visible,
  onCancel,
  editingPricing,
  pricingName,
  setPricingName,
  pricingDayType,
  setPricingDayType,
  pricingIsActive,
  setPricingIsActive,
  pricingStartTime,
  setPricingStartTime,
  pricingEndTime,
  setPricingEndTime,
  pricingStandardPrice,
  setPricingStandardPrice,
  pricingVipPrice,
  setPricingVipPrice,
  pricingMatchPrice,
  setPricingMatchPrice,
  saving,
  onSave,
}) => {
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={580}
      title={
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <ClockCircleOutlined className="text-emerald-600 text-lg" />
          <span className="font-black text-slate-900 text-base whitespace-nowrap">
            {editingPricing ? `Cập Nhật Khung Giờ` : "Thêm Khung Giờ Mới"}
          </span>
        </div>
      }
    >
      <div className="py-2 space-y-3.5 text-xs">
        <div>
          <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">Tên khung giờ:</label>
          <Input
            placeholder="Khung Giờ Sáng, Giờ Vàng Tối..."
            value={pricingName}
            onChange={(e) => setPricingName(e.target.value)}
            className="!h-9 !rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">Ngày áp dụng:</label>
            <Select
              value={pricingDayType}
              onChange={(val) => setPricingDayType(val)}
              className="!w-full !rounded-xl !h-9"
              options={[
                { value: "all", label: "Cả tuần (T2–CN)" },
                { value: "weekday", label: "Ngày thường (T2–T6)" },
                { value: "weekend", label: "Cuối tuần (T7 & CN)" },
              ]}
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">Trạng thái:</label>
            <Select
              value={pricingIsActive ? "active" : "inactive"}
              onChange={(val) => setPricingIsActive(val === "active")}
              className="!w-full !rounded-xl !h-9"
              options={[
                { value: "active", label: "Hoạt Động" },
                { value: "inactive", label: "Tạm Ngưng" },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">Từ giờ:</label>
            <Select
              showSearch
              value={pricingStartTime}
              onChange={(val) => setPricingStartTime(val)}
              className="!w-full !rounded-xl !h-9 font-mono"
              options={TIME_OPTIONS}
              placeholder="Chọn giờ bắt đầu"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1 whitespace-nowrap">Đến giờ:</label>
            <Select
              showSearch
              value={pricingEndTime}
              onChange={(val) => setPricingEndTime(val)}
              className="!w-full !rounded-xl !h-9 font-mono"
              options={TIME_OPTIONS}
              placeholder="Chọn giờ kết thúc"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1 text-xs whitespace-nowrap">
              Khu Phổ Thông (đ/h):
            </label>
            <InputNumber
              min={0}
              step={500}
              value={pricingStandardPrice}
              onChange={(val) => setPricingStandardPrice(Number(val) || 0)}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, "") || 0)}
              className="!w-full !h-9 !rounded-xl font-mono text-center font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1 text-xs whitespace-nowrap">
              Khu VIP (đ/h):
            </label>
            <InputNumber
              min={0}
              step={500}
              value={pricingVipPrice}
              onChange={(val) => setPricingVipPrice(Number(val) || 0)}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, "") || 0)}
              className="!w-full !h-9 !rounded-xl font-mono text-center font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1 text-xs whitespace-nowrap">
              Khu Thi Đấu (đ/h):
            </label>
            <InputNumber
              min={0}
              step={500}
              value={pricingMatchPrice}
              onChange={(val) => setPricingMatchPrice(Number(val) || 0)}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, "") || 0)}
              className="!w-full !h-9 !rounded-xl font-mono text-center font-bold text-slate-800"
            />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-[11px] text-blue-800 flex items-start gap-2">
          <InfoCircleOutlined className="text-blue-600 mt-0.5 shrink-0" />
          <span className="[text-wrap:balance]">
            <strong>Lưu ý:</strong> Giá mới áp dụng cho các lượt chơi tiếp theo, không đổi giá bàn đang chơi.
          </span>
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
            onClick={onSave}
            className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4 whitespace-nowrap"
          >
            Lưu Biểu Giá
          </Button>
        </div>
      </div>
    </Modal>
  );
};
