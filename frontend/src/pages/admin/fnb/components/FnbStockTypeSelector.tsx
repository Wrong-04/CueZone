import React from "react";
import { CoffeeOutlined } from "@ant-design/icons";
import { Tag } from "../../../../shared/ui";
import type { Category } from "../../../../services/catalog-management.service";
import type { FnbStockItem } from "../../../../types";
import {
  normalizeUnitLabel,
  getDefaultUnitForCategory,
} from "../types/fnb.types";

/**
 * Component: FnbStockTypeSelector
 * Chức năng: Bộ chuyển đổi loại hình phục vụ món ăn/thức uống trong Modal thêm/sửa món:
 * - Lựa chọn 1: Món Pha Chế & Bếp Nấu (chế biến theo order, không quản lý tồn kho lon/chai).
 * - Lựa chọn 2: Hàng Đóng Gói & Phụ Kiện (nước ngọt, bia, snack, găng/lơ... quản lý theo số lượng tồn kho).
 * - Tự động đề xuất danh mục và đơn vị tính (Ly/Phần/Lon/Chai) phù hợp với loại hình đã chọn.
 */
interface FnbStockTypeSelectorProps {
  isMadeToOrder: boolean;
  isCreatingNew: boolean;
  categories: Category[];
  stockList: FnbStockItem[];
  onChangeData: React.Dispatch<React.SetStateAction<Partial<FnbStockItem>>>;
}

export const FnbStockTypeSelector: React.FC<FnbStockTypeSelectorProps> = ({
  isMadeToOrder,
  isCreatingNew,
  categories,
  stockList,
  onChangeData,
}) => {
  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-slate-200/90 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5 whitespace-nowrap">
          <CoffeeOutlined className="text-emerald-600" />
          Loại hình phục vụ:
        </span>
        <Tag
          color={isMadeToOrder ? "purple" : "blue"}
          className="!rounded-md !text-[10px] !font-bold uppercase !border-0 whitespace-nowrap"
        >
          {isMadeToOrder ? "Chế biến theo order" : "Hàng đóng gói sẵn"}
        </Tag>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onChangeData((prev) => {
              const nextCat = prev.category || categories[0]?.code || "coffee";
              const suggestedUnit = getDefaultUnitForCategory(nextCat, stockList);
              return {
                ...prev,
                isMadeToOrder: true,
                category: nextCat,
                unit:
                  isCreatingNew || !prev.unit
                    ? suggestedUnit
                    : normalizeUnitLabel(prev.unit),
              };
            });
          }}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            isMadeToOrder
              ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-2xs ring-1 ring-emerald-200"
              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-xs font-bold text-slate-900 whitespace-nowrap">Món Pha Chế & Bếp Nấu</span>
          </div>
          <p className="text-[11px] text-slate-500 font-normal m-0 leading-tight">
            Cà phê, trà, đồ ăn... Chế biến theo order (không đếm tồn kho).
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            onChangeData((prev) => {
              const nextCat = prev.category || categories[0]?.code || "juice";
              const suggestedUnit = getDefaultUnitForCategory(nextCat, stockList);
              return {
                ...prev,
                isMadeToOrder: false,
                category: nextCat,
                unit:
                  isCreatingNew || !prev.unit
                    ? suggestedUnit
                    : normalizeUnitLabel(prev.unit),
              };
            });
          }}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            !isMadeToOrder
              ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-2xs ring-1 ring-emerald-200"
              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-xs font-bold text-slate-900 whitespace-nowrap">Hàng Đóng Gói & Phụ Kiện</span>
          </div>
          <p className="text-[11px] text-slate-500 font-normal m-0 leading-tight">
            Bia lon, nước ngọt, snack, phụ kiện... Quản lý theo số lượng tồn kho.
          </p>
        </button>
      </div>
    </div>
  );
};
