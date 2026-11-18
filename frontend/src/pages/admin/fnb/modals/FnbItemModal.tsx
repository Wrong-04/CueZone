import React from "react";
import { CameraOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Modal, Button, Tag, Input, Select } from "../../../../shared/ui";
import type { Category } from "../../../../services/catalog-management.service";
import type { FnbStockItem } from "../../../../types";
import {
  isFreshPreparedCategory,
  generateSkuForCategory,
  normalizeUnitLabel,
  getDefaultUnitForCategory,
  getCommonUnitsForCategory,
} from "../types/fnb.types";
import { FnbStockTypeSelector } from "../components/FnbStockTypeSelector";
import { FnbImageUploader } from "../components/FnbImageUploader";

interface FnbItemModalProps {
  visible: boolean;
  onCancel: () => void;
  isCreatingNew: boolean;
  itemData: Partial<FnbStockItem>;
  onChangeData: React.Dispatch<React.SetStateAction<Partial<FnbStockItem>>>;
  categories: Category[];
  stockList: FnbStockItem[];
  onSave: () => Promise<void>;
  onNavigateToInventory?: () => void;
}

export const FnbItemModal: React.FC<FnbItemModalProps> = ({
  visible,
  onCancel,
  isCreatingNew,
  itemData,
  onChangeData,
  categories,
  stockList,
  onSave,
  onNavigateToInventory,
}) => {
  const currentCategory = itemData.category || "coffee";
  const isMadeToOrder =
    itemData.isMadeToOrder !== undefined
      ? Boolean(itemData.isMadeToOrder)
      : isFreshPreparedCategory(currentCategory);

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={720}
      title={
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <CameraOutlined className="text-lg" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-base block leading-tight whitespace-nowrap">
              {isCreatingNew
                ? "Thêm Món Mới Vào Thực Đơn"
                : `Chỉnh Sửa Món: ${itemData.name || ""}`}
            </span>
            <span className="text-xs text-slate-500 font-normal whitespace-nowrap">
              Cấu hình thông tin, giá bán và hình ảnh hiển thị trên thực đơn
            </span>
          </div>
        </div>
      }
    >
      <div className="py-4 space-y-4 text-xs">
        {/* Item Type Selector */}
        <FnbStockTypeSelector
          isMadeToOrder={isMadeToOrder}
          isCreatingNew={isCreatingNew}
          categories={categories}
          stockList={stockList}
          onChangeData={onChangeData}
        />

        {/* Item Basic Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 whitespace-nowrap">
              Tên món: <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="Ví dụ: Cà phê muối đặc biệt"
              value={itemData.name || ""}
              onChange={(e) => onChangeData((prev) => ({ ...prev, name: e.target.value }))}
              className="!h-10 !rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Mã món: <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const newSku = generateSkuForCategory(
                    itemData.category || categories[0]?.code || "coffee",
                    stockList.length,
                  );
                  onChangeData((prev) => ({ ...prev, code: newSku }));
                }}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer whitespace-nowrap"
              >
                Tự động tạo mã
              </button>
            </div>
            <Input
              placeholder="Ví dụ: DRK-008"
              value={itemData.code || ""}
              onChange={(e) =>
                onChangeData((prev) => ({
                  ...prev,
                  code: e.target.value.toUpperCase(),
                }))
              }
              className="!h-10 !rounded-xl font-mono text-xs uppercase font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 whitespace-nowrap">
              Danh mục:
            </label>
            <Select
              value={itemData.category || categories[0]?.code || "coffee"}
              onChange={(val) => {
                const newCat = val;
                const matchedCat = categories.find((c) => c.code === newCat);
                const autoUnit = getDefaultUnitForCategory(newCat, stockList);
                onChangeData((prev) => ({
                  ...prev,
                  category: newCat,
                  categoryName: matchedCat?.name || newCat,
                  unit: autoUnit,
                  code: isCreatingNew ? generateSkuForCategory(newCat, stockList.length) : prev.code,
                }));
              }}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={(() => {
                const seen = new Set<string>();
                const options: Array<{ value: string; label: string }> = [];

                for (const cat of categories) {
                  if (!cat.code || cat.code === "drink") continue;
                  const key = cat.code.toLowerCase();
                  if (seen.has(key)) continue;
                  seen.add(key);
                  options.push({
                    value: cat.code,
                    label: cat.name,
                  });
                }

                for (const item of stockList) {
                  if (!item.category || /^[0-9a-fA-F]{24}$/.test(item.category)) continue;
                  const key = item.category.toLowerCase();
                  if (seen.has(key)) continue;
                  seen.add(key);
                  options.push({
                    value: item.category,
                    label: item.categoryName || item.category,
                  });
                }

                const currentVal = itemData.category;
                if (currentVal && !seen.has(currentVal.toLowerCase())) {
                  options.push({
                    value: currentVal,
                    label: itemData.categoryName || currentVal,
                  });
                }

                return options;
              })()}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 whitespace-nowrap">
              Đơn vị tính:
            </label>
            <Select
              value={normalizeUnitLabel(
                itemData.unit || getDefaultUnitForCategory(currentCategory, stockList),
              )}
              onChange={(val) => onChangeData((prev) => ({ ...prev, unit: val }))}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={(() => {
                const baseUnits = getCommonUnitsForCategory(currentCategory, stockList);
                const currentUnit = itemData.unit
                  ? normalizeUnitLabel(itemData.unit)
                  : "";
                const allUnits =
                  currentUnit && !baseUnits.some((u) => u.toLowerCase() === currentUnit.toLowerCase())
                    ? [currentUnit, ...baseUnits]
                    : baseUnits;
                return allUnits.map((u) => ({
                  value: u,
                  label: u,
                }));
              })()}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 whitespace-nowrap">
              Đơn giá bán (VNĐ): <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              min={0}
              step={500}
              placeholder="35000"
              value={itemData.price ?? 0}
              onChange={(e) =>
                onChangeData((prev) => ({
                  ...prev,
                  price: Math.max(0, parseInt(e.target.value, 10) || 0),
                }))
              }
              className="!h-10 !rounded-xl font-mono text-xs font-bold"
            />
            <div className="mt-1 text-[11px] text-emerald-700 font-semibold flex items-center justify-between whitespace-nowrap">
              <span>Giá hiển thị:</span>
              <strong className="text-xs">
                {Number(itemData.price || 0).toLocaleString("vi-VN")}đ
              </strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 whitespace-nowrap">
              Mô tả món (khách xem khi gọi món):
            </label>
            <Input
              placeholder="Ví dụ: Vị êm đằm, ướp lạnh sâu, lon 330ml."
              value={itemData.description || ""}
              onChange={(e) =>
                onChangeData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="!h-10 !rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Stock status indicator */}
        {isMadeToOrder ? (
          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
            <CheckCircleOutlined className="text-lg text-emerald-600 shrink-0" />
            <div className="leading-tight">
              <strong className="block text-emerald-950 text-xs font-bold whitespace-nowrap">
                Chế biến tươi theo order (Bar / Bếp):
              </strong>
              <span className="text-[11px] text-emerald-800 whitespace-nowrap">
                Không quản lý tồn kho. Nhân viên chỉ cần bấm nút <em>"Báo hết món"</em> khi hết nguyên liệu.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-xs whitespace-nowrap">
                  Quản lý tồn kho & Cảnh báo quầy:
                </span>
                <Tag color="blue" className="!rounded-md !text-[10px] !font-bold whitespace-nowrap">
                  HÀNG ĐÓNG GÓI
                </Tag>
              </div>

              {onNavigateToInventory && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    onCancel();
                    onNavigateToInventory();
                  }}
                  className="!text-[11px] !font-bold !text-blue-700 hover:!text-blue-800 !p-0 whitespace-nowrap"
                >
                  Mở Sổ Kho & Nhập Hàng &rarr;
                </Button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 whitespace-nowrap">
                Tồn kho hiện tại ({itemData.unit || "phần"}):
              </label>
              <div className="h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between font-mono text-xs font-bold text-slate-900 shadow-2xs">
                <span className="whitespace-nowrap">
                  {isCreatingNew ? 0 : (itemData.stockQuantity || 0)} {itemData.unit || "phần"}
                </span>
                <Tag
                  color={
                    isCreatingNew
                      ? "default"
                      : itemData.stockQuantity === 0
                        ? "error"
                        : "green"
                  }
                  className="!text-[10px] !px-2 !py-0.5 !border-0 !m-0 !font-bold whitespace-nowrap"
                >
                  {isCreatingNew
                    ? "MÓN MỚI (CHƯA NHẬP KHO)"
                    : itemData.stockQuantity === 0
                      ? "HẾT HÀNG"
                      : "CÒN HÀNG"}
                </Tag>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block whitespace-nowrap">
                * Tồn kho được quản lý tự động qua <strong>Phiếu nhập kho</strong> tại Kho Hàng & Vật Tư.
              </span>
            </div>
          </div>
        )}

        {/* Image selection & upload */}
        <FnbImageUploader
          image={itemData.image}
          onChangeImage={(url) => onChangeData((prev) => ({ ...prev, image: url }))}
        />

        {/* Modal footer buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="md" onClick={onCancel} className="!rounded-xl !text-xs whitespace-nowrap">
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onSave}
            className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs shadow-sm whitespace-nowrap"
          >
            {isCreatingNew ? "Lưu Món Mới" : "Lưu Thay Đổi"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
