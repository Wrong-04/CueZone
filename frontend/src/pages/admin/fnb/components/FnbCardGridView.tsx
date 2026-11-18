import React from "react";
import {
  EditOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  CameraOutlined,
  SearchOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { Button, Card, Tag, Typography, Image } from "../../../../shared/ui";
import type { FnbStockItem } from "../../../../types";
import {
  isItemMadeToOrder,
  isItemOutOfStock,
  getItemPrepType,
  getItemLocationName,
} from "../types/fnb.types";

const { Title, Text } = Typography;

interface FnbCardGridViewProps {
  items: FnbStockItem[];
  canManageInventory: boolean;
  onOpenEditModal: (item: FnbStockItem) => void;
  onToggleZeroStock: (item: FnbStockItem) => void;
  onNavigateToInventory?: () => void;
}

export const FnbCardGridView: React.FC<FnbCardGridViewProps> = ({
  items,
  canManageInventory,
  onOpenEditModal,
  onToggleZeroStock,
  onNavigateToInventory,
}) => {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center min-h-[360px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-2xl">
          <SearchOutlined />
        </div>
        <Title level={4} className="!text-slate-700 !mb-1">
          Không tìm thấy món nào
        </Title>
        <Text className="!text-slate-400 !text-xs">
          Vui lòng thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác.
        </Text>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {items.map((item) => {
        const isMadeToOrder = isItemMadeToOrder(item);
        const prepType = getItemPrepType(item.category, isMadeToOrder);
        const isFreshBeverage = prepType === "fresh_beverage";
        const isCookedFood = prepType === "cooked_food";
        const isOutOfStock = isItemOutOfStock(item);
        const isLowStock =
          !isMadeToOrder &&
          !isOutOfStock &&
          item.stockQuantity > 0 &&
          item.stockQuantity <= item.minThreshold;
        const percent = Math.min(
          100,
          Math.round((item.stockQuantity / (item.minThreshold * 2.5 || 20)) * 100),
        );
        const locationLabel = getItemLocationName(item.category);

        return (
          <Card
            key={item.id}
            styles={{
              body: {
                padding: 0,
                display: "flex",
                flexDirection: "column",
                height: "100%",
              },
            }}
            className="!p-0 !rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 group bg-white h-full relative"
          >
            {/* Top Image Container */}
            <div className="relative w-full aspect-[4/3] shrink-0 overflow-hidden bg-slate-100 rounded-t-3xl [&_.ant-image]:!block [&_.ant-image]:!w-full [&_.ant-image]:!h-full [&_.ant-image-img]:!block [&_.ant-image-img]:!w-full [&_.ant-image-img]:!h-full [&_.ant-image-img]:!object-cover">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  className="group-hover:scale-105 transition-transform duration-500 ease-out"
                  preview={{
                    mask: (
                      <div className="flex items-center gap-1.5 text-xs text-white font-bold bg-black/40 px-3 py-1.5 rounded-full whitespace-nowrap">
                        <EyeOutlined /> Xem ảnh gốc
                      </div>
                    ),
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200/60 text-slate-400">
                  <CameraOutlined className="text-3xl text-slate-300 mb-1" />
                  <span className="text-xs font-semibold text-slate-400">Chưa có ảnh</span>
                </div>
              )}

              {/* Floating Category Badge */}
              <div className="absolute top-3 left-3 z-10">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-xs whitespace-nowrap">
                  {item.categoryName}
                </span>
              </div>

              {/* Floating Quick Edit Button */}
              {canManageInventory && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEditModal(item);
                  }}
                  title="Chỉnh sửa thông tin, giá bán & hình ảnh món"
                  className="absolute bottom-3 right-3 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 shadow-md flex items-center justify-center transition-all hover:scale-110 border border-slate-200 cursor-pointer"
                >
                  <EditOutlined className="text-xs" />
                </button>
              )}

              {/* Floating Stock Status Badge */}
              <div className="absolute top-3 right-3 z-10">
                {isOutOfStock ? (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs flex items-center gap-1 whitespace-nowrap">
                    <CloseCircleOutlined /> TẠM NGƯNG
                  </span>
                ) : isMadeToOrder ? (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1 whitespace-nowrap">
                    <CheckCircleOutlined /> ĐANG BÁN
                  </span>
                ) : isLowStock ? (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-xs flex items-center gap-1 whitespace-nowrap">
                    <WarningOutlined /> SẮP HẾT
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1 whitespace-nowrap">
                    <CheckCircleOutlined /> ĐANG BÁN
                  </span>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>

            {/* Card Content */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap">
                    {item.code}
                  </span>
                  <span className="font-semibold text-slate-500 whitespace-nowrap">
                    {isFreshBeverage
                      ? "Pha chế tại chỗ"
                      : isCookedFood
                        ? "Bếp nấu theo order"
                        : `ĐVT: ${item.unit}`}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 h-11 mb-2 group-hover:text-emerald-700 transition-colors">
                  {item.name}
                </h3>

                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-xl font-black text-emerald-700 tracking-tight font-mono whitespace-nowrap">
                    {item.price.toLocaleString("vi-VN")}đ
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                    {locationLabel}
                  </span>
                </div>
              </div>

              {/* Stock / Prep Status */}
              <div className="pt-2.5 border-t border-slate-100 min-h-[48px] flex flex-col justify-center">
                {isMadeToOrder ? (
                  <div className="flex items-center justify-between text-xs">
                    {isOutOfStock ? (
                      <span className="text-rose-600 font-bold flex items-center gap-1.5 whitespace-nowrap">
                        <CloseCircleOutlined /> Tạm hết nguyên liệu
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center gap-1.5 whitespace-nowrap">
                        <CheckCircleOutlined /> {isCookedFood ? "Chế biến nóng • Sẵn sàng" : "Pha chế tươi • Sẵn sàng"}
                      </span>
                    )}
                    <Tag color="cyan" className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-semibold !mr-0 whitespace-nowrap">
                      {isCookedFood ? "Bếp nóng" : "Quầy Bar"}
                    </Tag>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span
                        className={
                          isOutOfStock
                            ? "text-rose-600 font-bold whitespace-nowrap"
                            : isLowStock
                              ? "text-amber-600 font-bold whitespace-nowrap"
                              : "text-slate-700 whitespace-nowrap"
                        }
                      >
                        Tồn quầy: {item.stockQuantity} {item.unit}
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal whitespace-nowrap">
                        Min: {item.minThreshold}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOutOfStock
                            ? "bg-rose-500 w-0"
                            : isLowStock
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${isOutOfStock ? 0 : Math.max(8, percent)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Action Buttons */}
              <div className="pt-3 border-t border-slate-100 mt-2">
                {isMadeToOrder ? (
                  <div className={`grid ${canManageInventory ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleZeroStock(item)}
                      className={`!rounded-xl !text-xs !font-bold !h-9 whitespace-nowrap ${
                        isOutOfStock
                          ? "!border-emerald-300 !text-emerald-700 hover:!bg-emerald-50"
                          : "!border-rose-200 !text-rose-600 hover:!bg-rose-50 hover:!text-rose-700 hover:!border-rose-300"
                      }`}
                    >
                      {isOutOfStock ? "Mở bán lại" : "Báo hết món"}
                    </Button>
                    {canManageInventory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenEditModal(item)}
                        leftIcon={<EditOutlined />}
                        className="!rounded-xl !text-xs !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !font-bold !h-9 whitespace-nowrap"
                      >
                        Sửa món
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleZeroStock(item)}
                      className={`!rounded-xl !text-xs !font-bold !h-9 whitespace-nowrap ${
                        isOutOfStock
                          ? "!border-emerald-300 !text-emerald-700 hover:!bg-emerald-50"
                          : "!border-rose-200 !text-rose-600 hover:!bg-rose-50 hover:!text-rose-700 hover:!border-rose-300"
                      }`}
                    >
                      {isOutOfStock ? "Mở bán lại" : "Báo hết"}
                    </Button>

                    {canManageInventory ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenEditModal(item)}
                        leftIcon={<EditOutlined />}
                        className="!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !rounded-xl !text-xs !font-bold !h-9 whitespace-nowrap"
                      >
                        Sửa món
                      </Button>
                    ) : onNavigateToInventory ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={onNavigateToInventory}
                        leftIcon={<InboxOutlined />}
                        className="!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !rounded-xl !text-xs !font-bold !h-9 whitespace-nowrap"
                      >
                        Xem sổ kho
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
