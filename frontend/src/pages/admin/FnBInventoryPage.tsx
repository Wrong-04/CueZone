import React, { useState, useEffect, useMemo } from "react";
import {
  SearchOutlined,
  EditOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tag,
  Input,
  Select,
  Typography,
  message,
  Modal,
} from "../../shared/ui";
import { INITIAL_FNB_STOCK, type FnbStockItem } from "../../mock/posData";

const { Title, Text } = Typography;

export const FnBInventoryPage: React.FC = () => {
  const [stockList, setStockList] = useState<FnbStockItem[]>(() => {
    const saved = localStorage.getItem("cuezone_fnb_stock");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_FNB_STOCK;
  });

  useEffect(() => {
    localStorage.setItem("cuezone_fnb_stock", JSON.stringify(stockList));
  }, [stockList]);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Edit stock modal
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<FnbStockItem | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState<string>("");

  const handleOpenEdit = (item: FnbStockItem) => {
    setSelectedItem(item);
    setNewStockQty(item.stockQuantity);
    setAdjustNote("");
    setEditModalVisible(true);
  };

  const handleSaveStock = () => {
    if (!selectedItem) return;
    if (newStockQty < 0) {
      message.warning("Số lượng tồn kho không thể âm!");
      return;
    }

    setStockList((prev) =>
      prev.map((i) =>
        i.id === selectedItem.id ? { ...i, stockQuantity: newStockQty } : i
      )
    );

    message.success(`Đã cập nhật tồn kho món "${selectedItem.name}" thành ${newStockQty} ${selectedItem.unit}!`);
    setEditModalVisible(false);
    setSelectedItem(null);
  };

  // Quick toggle out-of-stock
  const handleToggleZeroStock = (item: FnbStockItem) => {
    const nextQty = item.stockQuantity > 0 ? 0 : item.minThreshold + 5;
    setStockList((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, stockQuantity: nextQty } : i))
    );
    if (nextQty === 0) {
      message.info(`Đã đánh dấu hết hàng món "${item.name}".`);
    } else {
      message.success(`Đã khôi phục tồn kho món "${item.name}" (+${nextQty} ${item.unit}).`);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return stockList.filter((item) => {
      const matchCat = selectedCategory === "all" || item.category === selectedCategory;
      const isOutOfStock = item.stockQuantity === 0;
      const isLowStock = item.stockQuantity > 0 && item.stockQuantity <= item.minThreshold;
      const isInStock = item.stockQuantity > item.minThreshold;

      let matchStockStatus = true;
      if (stockStatusFilter === "in_stock") matchStockStatus = isInStock;
      if (stockStatusFilter === "low_stock") matchStockStatus = isLowStock;
      if (stockStatusFilter === "out_of_stock") matchStockStatus = isOutOfStock;

      const matchQuery =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCat && matchStockStatus && matchQuery;
    });
  }, [stockList, selectedCategory, stockStatusFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const totalItems = stockList.length;
    const lowStockCount = stockList.filter(
      (i) => i.stockQuantity > 0 && i.stockQuantity <= i.minThreshold
    ).length;
    const outOfStockCount = stockList.filter((i) => i.stockQuantity === 0).length;
    const totalInventoryValue = stockList.reduce(
      (acc, cur) => acc + cur.price * cur.stockQuantity,
      0
    );

    return { totalItems, lowStockCount, outOfStockCount, totalInventoryValue };
  }, [stockList]);

  return (
    <div className="space-y-6">
      {/* ── HEADER & STOCK METRICS ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <InboxOutlined className="text-emerald-600 text-xl" />
              <Title level={2} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                Thực Đơn F&B & Quản Lý Tồn Kho
              </Title>
              <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-xs !font-bold">
                STOCK AVAILABILITY
              </Tag>
            </div>
            <Text className="!text-xs !text-slate-500">
              Tra cứu tồn kho món ăn, đồ uống, phụ kiện và hỗ trợ quầy POS cập nhật hàng bán
            </Text>
          </div>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500 block mb-0.5 font-medium">Tổng số mặt hàng</span>
            <span className="text-2xl font-black text-slate-900">{metrics.totalItems} món</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80">
            <span className="text-xs text-amber-700 block mb-0.5 font-medium">Sắp hết hàng (&lt; Min)</span>
            <span className="text-2xl font-black text-amber-800">{metrics.lowStockCount} món</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80">
            <span className="text-xs text-rose-700 block mb-0.5 font-medium">Đã hết hàng (Out of stock)</span>
            <span className="text-2xl font-black text-rose-800">{metrics.outOfStockCount} món</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
            <span className="text-xs text-emerald-700 block mb-0.5 font-medium">Ước tính giá trị tồn kho</span>
            <span className="text-xl font-black text-emerald-800 block truncate">
              {metrics.totalInventoryValue.toLocaleString("vi-VN")}đ
            </span>
          </div>
        </div>
      </div>

      {/* ── BỘ LỌC VÀ TÌM KIẾM ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc danh mục */}
          <Select
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
            className="!w-44 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả danh mục" },
              { value: "coffee", label: "Cà phê" },
              { value: "tea", label: "Trà trái cây" },
              { value: "juice", label: "Nước ép" },
              { value: "beer", label: "Bia & Đồ uống" },
              { value: "food", label: "Món ăn nóng" },
              { value: "snack", label: "Ăn vặt" },
              { value: "equipment", label: "Phụ kiện bida" },
            ]}
          />

          {/* Lọc tình trạng tồn kho */}
          <Select
            value={stockStatusFilter}
            onChange={(val) => setStockStatusFilter(val)}
            className="!w-44 !rounded-xl !text-xs"
            options={[
              { value: "all", label: "Tất cả tình trạng kho" },
              { value: "in_stock", label: "Còn nhiều hàng" },
              { value: "low_stock", label: "Sắp hết hàng" },
              { value: "out_of_stock", label: "Hết hàng (Tạm ngưng)" },
            ]}
          />
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Tìm tên món, mã hàng..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            className="!rounded-xl"
          />
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH MẶT HÀNG & TỒN KHO ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Mã</th>
                <th className="py-3.5 px-4">Tên Món & Phân Loại</th>
                <th className="py-3.5 px-4">Đơn Giá Bán</th>
                <th className="py-3.5 px-4 text-center">Tồn Kho Hiện Tại</th>
                <th className="py-3.5 px-4 text-center">Ngưỡng Tối Thiểu</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái Kho</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy mặt hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isOutOfStock = item.stockQuantity === 0;
                  const isLowStock = item.stockQuantity > 0 && item.stockQuantity <= item.minThreshold;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">
                        {item.code}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block text-xs">{item.name}</span>
                        <span className="text-[11px] text-slate-500">{item.categoryName}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {item.price.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-sm">
                        <span
                          className={
                            isOutOfStock
                              ? "text-rose-600"
                              : isLowStock
                              ? "text-amber-600"
                              : "text-slate-800"
                          }
                        >
                          {item.stockQuantity} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">
                        {item.minThreshold} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold">
                            HẾT HÀNG
                          </Tag>
                        ) : isLowStock ? (
                          <Tag color="warning" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold">
                            SẮP HẾT
                          </Tag>
                        ) : (
                          <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold">
                            SẴN SÀNG
                          </Tag>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleZeroStock(item)}
                            className={`!text-[11px] !h-7 !px-2.5 !rounded-lg ${
                              isOutOfStock
                                ? "!border-emerald-300 !text-emerald-700 hover:!bg-emerald-50"
                                : "!border-rose-200 !text-rose-600 hover:!bg-rose-50"
                            }`}
                          >
                            {isOutOfStock ? "Khôi phục" : "Báo hết"}
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            leftIcon={<EditOutlined />}
                            className="!text-[11px] !h-7 !px-2.5 !rounded-lg !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold"
                          >
                            Nhập kho
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: CẬP NHẬT TỒN KHO MẶT HÀNG ─────────────────────────────── */}
      <Modal
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2">
            <EditOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Điều Chỉnh Tồn Kho: {selectedItem?.name}
            </span>
          </div>
        }
      >
        {selectedItem && (
          <div className="py-3 space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Mã hàng:</span>
                <strong>{selectedItem.code}</strong>
              </div>
              <div className="flex justify-between">
                <span>Đơn vị tính:</span>
                <strong>{selectedItem.unit}</strong>
              </div>
              <div className="flex justify-between">
                <span>Tồn kho hiện tại:</span>
                <strong className="text-emerald-700 font-bold">
                  {selectedItem.stockQuantity} {selectedItem.unit}
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nhập số lượng tồn kho mới ({selectedItem.unit}):
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewStockQty((prev) => Math.max(0, prev - 5))}
                  className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => setNewStockQty((prev) => Math.max(0, prev - 1))}
                  className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  -1
                </button>
                <Input
                  type="number"
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(parseInt(e.target.value) || 0)}
                  className="!h-10 !rounded-xl text-center font-bold text-base font-mono"
                />
                <button
                  type="button"
                  onClick={() => setNewStockQty((prev) => prev + 1)}
                  className="h-10 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setNewStockQty((prev) => prev + 10)}
                  className="h-10 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold"
                >
                  +10
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ghi chú điều chỉnh (Nhập hàng đợt mới, thất thoát, bù hàng...):
              </label>
              <Input
                placeholder="Ví dụ: Nhập bổ sung từ nhà cung cấp..."
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="!h-10 !rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalVisible(false)}
                className="!rounded-xl"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveStock}
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
              >
                Lưu Thay Đổi
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FnBInventoryPage;
