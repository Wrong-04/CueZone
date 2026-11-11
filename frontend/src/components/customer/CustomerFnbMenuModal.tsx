import { useMemo, useState } from "react";
import {
  MinusOutlined,
  PlusOutlined,
  SearchOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { Button, Image, Input, Modal, Tag } from "../../shared/ui";
import type { ProductMenu } from "../../services/product.service";
import { CustomerFnbCategoryPills } from "./CustomerFnbCategoryPills";
import {
  getCustomerFnbCategoryLabel,
  getFnbImageUrl,
  isFnbItemOutOfStock,
  isFnbItemPrepared,
  isFnbWarehouseItem,
  resolveFnbCategory,
} from "../../utils/fnb";

interface CustomerFnbMenuModalProps {
  open: boolean;
  onClose: () => void;
  items: ProductMenu[];
  loading: boolean;
  selectedQuantities: Record<string, number>;
  onQuantityChange: (productId: string, delta: number) => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirming?: boolean;
}

export function CustomerFnbMenuModal({
  open,
  onClose,
  items,
  loading,
  selectedQuantities,
  onQuantityChange,
  onConfirm,
  confirmLabel,
  confirming = false,
}: CustomerFnbMenuModalProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const validFnbItems = useMemo(() => {
    return items.filter((item) => !isFnbWarehouseItem(item.name, item.category));
  }, [items]);

  const categoryOptions = useMemo(() => {
    const allCategoriesInItems = Array.from(
      new Set(validFnbItems.map((item) => resolveFnbCategory(item.name, item.category))),
    );
    const standardOrder = ["coffee", "tea", "juice", "beer", "food", "snack"];
    const standardPresent = standardOrder.filter((cat) => allCategoriesInItems.includes(cat));
    const dynamicCategories = allCategoriesInItems.filter((cat) => !standardOrder.includes(cat));
    const finalCategories = [...standardPresent, ...dynamicCategories];

    return [
      { key: "all", label: "Tất cả thực đơn", badge: validFnbItems.length },
      ...finalCategories.map((category) => ({
        key: category,
        label: getCustomerFnbCategoryLabel(category),
        badge: validFnbItems.filter((item) => resolveFnbCategory(item.name, item.category) === category)
          .length,
      })),
    ];
  }, [validFnbItems]);

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase("vi-VN");
    return validFnbItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" ||
        resolveFnbCategory(item.name, item.category) === selectedCategory;
      const matchesSearch = !query || item.name.toLocaleLowerCase("vi-VN").includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [validFnbItems, searchText, selectedCategory]);

  const totalItems = Object.values(selectedQuantities).reduce((sum, quantity) => sum + quantity, 0);
  const totalPrice = validFnbItems.reduce(
    (sum, item) => sum + item.salePrice * (selectedQuantities[item._id] || 0),
    0,
  );
  const exceedsStock = validFnbItems.some(
    (item) => (selectedQuantities[item._id] || 0) > Math.max(0, item.stock ?? 0),
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={840}
      title={
        <div className="flex items-center gap-2">
          <ShoppingOutlined className="text-emerald-600" />
          <span className="font-bold text-slate-900">Thực đơn đồ ăn & thức uống</span>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="flex flex-col gap-3">
          <CustomerFnbCategoryPills
            items={categoryOptions}
            activeKey={selectedCategory}
            onSelect={(category) => setSelectedCategory(category)}
          />
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm tên món..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            allowClear
            className="w-full"
          />
        </div>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Đang tải thực đơn...</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Không tìm thấy món nào phù hợp.
            </div>
          ) : (
            filteredItems.map((item) => {
              const quantity = selectedQuantities[item._id] || 0;
              const category = resolveFnbCategory(item.name, item.category);
              const isPrepared = isFnbItemPrepared(item);
              const isOutOfStock = isFnbItemOutOfStock(item);
              const reachedStockLimit = quantity >= Math.max(0, item.stock ?? 0);

              return (
                <div
                  key={item._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Image
                      src={getFnbImageUrl(item.name, category, item.imageUrl)}
                      alt={item.name}
                      fallback={getFnbImageUrl(item.name, category)}
                      preview
                      width={88}
                      height={72}
                      className="!shrink-0 !rounded-lg !object-cover"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-slate-900">{item.name}</span>
                        <Tag color="blue" className="!m-0 !text-[10px]">
                          {getCustomerFnbCategoryLabel(category)}
                        </Tag>
                        {isPrepared ? (
                          <Tag color="purple" className="!m-0 !text-[10px]">
                            Chế biến
                          </Tag>
                        ) : isOutOfStock ? (
                          <Tag color="error" className="!m-0 !text-[10px]">
                            Hết hàng
                          </Tag>
                        ) : (
                          <Tag color="default" className="!m-0 !text-[10px]">
                            Còn {item.stock}
                          </Tag>
                        )}
                      </div>
                      <div className="mt-1 text-xs font-bold text-emerald-700">
                        {item.salePrice.toLocaleString("vi-VN")}đ
                      </div>
                      {item.description && (
                        <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<MinusOutlined />}
                      disabled={quantity === 0 || confirming}
                      onClick={() => onQuantityChange(item._id, -1)}
                      className="!h-8 !w-8 !p-0"
                    />
                    <span className="w-5 text-center text-sm font-bold">{quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<PlusOutlined />}
                      disabled={isOutOfStock || reachedStockLimit || confirming}
                      onClick={() => onQuantityChange(item._id, 1)}
                      className="!h-8 !w-8 !p-0 !border-emerald-300 !text-emerald-700"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <div className="text-slate-500">{totalItems} món đã chọn</div>
            <div className="font-bold text-emerald-700">
              Tạm tính: {totalPrice.toLocaleString("vi-VN")}đ
            </div>
            {exceedsStock && (
              <div className="mt-1 text-xs text-rose-600">
                Số lượng chọn đã vượt tồn kho hiện tại. Vui lòng giảm số lượng món.
              </div>
            )}
          </div>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={confirming}
            disabled={loading || confirming || totalItems === 0 || exceedsStock}
            className="!bg-emerald-600 !border-emerald-600"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
