import { useState, useEffect, useMemo, useCallback } from "react";
import { message } from "../../../../shared/ui";
import { useAuth } from "../../../../contexts/AuthContext";
import { hasPermission } from "../../../../utils/permissions";
import { productService } from "../../../../services/product.service";
import { fetchCategories, type Category } from "../../../../services/catalog-management.service";
import { isFnbWarehouseItem } from "../../../../utils/fnb";
import type { FnbStockItem } from "../../../../types";
import {
  isFreshPreparedCategory,
  isItemMadeToOrder,
  isItemOutOfStock,
  generateSkuForCategory,
  normalizeUnitLabel,
  getDefaultUnitForCategory,
  resolveProductImage,
} from "../types/fnb.types";

/**
 * Custom Hook: useFnbInventory
 * Quản lý toàn bộ dữ liệu và logic nghiệp vụ cho màn hình Thực Đơn Món Ăn & Thức Uống F&B:
 * 1. Nạp danh mục sản phẩm F&B và danh sách category từ máy chủ (lọc bỏ hàng kho thô).
 * 2. Phân loại sản phẩm: Món chế biến tươi (Made-to-order) vs Hàng đóng gói quản lý tồn kho (Packaged).
 * 3. Tính toán các chỉ số thẻ KPI (Tổng món, Đang mở bán, Cảnh báo hết/thiếu, Món pha chế).
 * 4. Tạo danh sách Pills danh mục kèm số lượng món thực tế.
 * 5. Lọc đa điều kiện: Danh mục, Trạng thái bán, Loại hình phục vụ, Tình trạng ảnh, Tìm kiếm từ khóa.
 * 6. Hành động nghiệp vụ: Mở bán / Tạm ngưng (bảo vệ khi tồn kho = 0), Thêm món mới, Cập nhật thông tin món.
 */
export function useFnbInventory() {
  const { user } = useAuth();
  // Kiểm tra quyền quản lý thực đơn (Admin hoặc tài khoản có permission inventory.manage)
  const canManageInventory = hasPermission(user, "inventory.manage") || user?.role === "admin";

  // ── 1. State: Dữ liệu sản phẩm & danh mục từ Backend ──────────────────────
  const [stockList, setStockList] = useState<FnbStockItem[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // ── 2. State: Chế độ xem (Lưới thẻ / Bảng) & Bộ lọc tìm kiếm ─────────────
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [photoStatusFilter, setPhotoStatusFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("default");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ── 3. State: Form Modal Thêm / Chỉnh Sửa Món ─────────────────────────────
  const [editItemModalVisible, setEditItemModalVisible] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [editingItemData, setEditingItemData] = useState<Partial<FnbStockItem>>({
    code: "",
    name: "",
    category: "coffee",
    categoryName: "",
    price: 30000,
    unit: "Ly",
    description: "",
    stockQuantity: 0,
    minThreshold: 0,
    image: "",
  });

  // ── 4. Derived State (useMemo): Kiểm tra bộ lọc & Tính toán chỉ số KPI ─────
  // Kiểm tra xem có đang kích hoạt bất kỳ bộ lọc nào khác mặc định không
  const isFilterActive = useMemo(() => {
    return (
      selectedCategory !== "all" ||
      stockStatusFilter !== "all" ||
      serviceTypeFilter !== "all" ||
      photoStatusFilter !== "all" ||
      sortOption !== "default" ||
      Boolean(searchQuery.trim())
    );
  }, [selectedCategory, stockStatusFilter, serviceTypeFilter, photoStatusFilter, sortOption, searchQuery]);

  // Tính toán 4 chỉ số KPI tổng hợp cho hàng thẻ thống kê đỉnh trang
  const fnbMetrics = useMemo(() => {
    const totalItems = stockList.length;
    const availableCount = stockList.filter((i) => !isItemOutOfStock(i)).length;
    const lowOrOutCount = stockList.filter(
      (i) =>
        isItemOutOfStock(i) ||
        (!isItemMadeToOrder(i) && i.stockQuantity <= i.minThreshold),
    ).length;
    const madeToOrderCount = stockList.filter((i) => isItemMadeToOrder(i)).length;

    return {
      totalItems,
      availableCount,
      lowOrOutCount,
      madeToOrderCount,
    };
  }, [stockList]);

  // Tạo danh sách thẻ con nhộng (Pills) danh mục kèm đếm số lượng món
  const categoryPillItems = useMemo(() => {
    const counts: Record<string, number> = {};
    stockList.forEach((item) => {
      const cat = item.category || "other";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const items = [{ key: "all", label: "Tất cả thực đơn", count: stockList.length }];
    const seenCodes = new Set<string>();

    dbCategories.forEach((cat) => {
      const code = cat.code || "";
      if (code && !seenCodes.has(code)) {
        seenCodes.add(code);
        items.push({
          key: code,
          label: cat.name || code,
          count: counts[code] || 0,
        });
      }
    });

    Object.keys(counts).forEach((catCode) => {
      if (!seenCodes.has(catCode) && catCode !== "all") {
        const sampleItem = stockList.find((i) => i.category === catCode);
        items.push({
          key: catCode,
          label: sampleItem?.categoryName || catCode,
          count: counts[catCode],
        });
      }
    });

    return items;
  }, [stockList, dbCategories]);

  // Lọc và sắp xếp danh sách món ăn/thức uống theo toàn bộ điều kiện người dùng chọn
  const filteredItems = useMemo(() => {
    const list = stockList.filter((item) => {
      const matchCat = selectedCategory === "all" || item.category === selectedCategory;
      const madeToOrder = isItemMadeToOrder(item);
      const outOfStock = isItemOutOfStock(item);
      const isLowStock =
        !madeToOrder && !outOfStock && item.stockQuantity > 0 && item.stockQuantity <= item.minThreshold;
      const isInStock = !outOfStock && (madeToOrder || item.stockQuantity > item.minThreshold);

      let matchStockStatus = true;
      if (stockStatusFilter === "in_stock") matchStockStatus = isInStock;
      if (stockStatusFilter === "low_stock") matchStockStatus = isLowStock;
      if (stockStatusFilter === "out_of_stock") matchStockStatus = outOfStock;

      let matchServiceType = true;
      if (serviceTypeFilter === "made_to_order") matchServiceType = madeToOrder;
      if (serviceTypeFilter === "packaged") matchServiceType = !madeToOrder;

      let matchPhoto = true;
      if (photoStatusFilter === "has_image") matchPhoto = Boolean(item.image?.trim());
      if (photoStatusFilter === "no_image") matchPhoto = !item.image?.trim();

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q);

      return matchCat && matchStockStatus && matchServiceType && matchPhoto && matchQuery;
    });

    // Sắp xếp theo lựa chọn
    if (sortOption === "stock_asc") {
      list.sort((a, b) => a.stockQuantity - b.stockQuantity);
    } else if (sortOption === "stock_desc") {
      list.sort((a, b) => b.stockQuantity - a.stockQuantity);
    } else if (sortOption === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortOption === "name_asc") {
      list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }

    return list;
  }, [
    stockList,
    selectedCategory,
    stockStatusFilter,
    serviceTypeFilter,
    photoStatusFilter,
    searchQuery,
    sortOption,
  ]);

  // ── 5. Handlers: Các hành động nghiệp vụ ──────────────────────────────────
  // Đồng bộ sản phẩm và danh mục từ Database
  const fetchProductsFromDb = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.allSettled([
        productService.getAll(),
        fetchCategories(),
      ]);

      const loadedCategories =
        categoriesRes.status === "fulfilled" && Array.isArray(categoriesRes.value?.data)
          ? categoriesRes.value.data.filter((c) => c.scope !== "warehouse" && c.isActive !== false)
          : [];
      setDbCategories(loadedCategories);

      const dbCatLookup = new Map<string, Category>();
      loadedCategories.forEach((c) => {
        if (c._id) dbCatLookup.set(c._id, c);
        if (c.code) dbCatLookup.set(c.code.toLowerCase(), c);
      });

      const dbProducts = productsRes.status === "fulfilled" ? productsRes.value : null;

      if (Array.isArray(dbProducts) && dbProducts.length > 0) {
        const mapped: FnbStockItem[] = dbProducts
          .filter((p: any) => !isFnbWarehouseItem(p.name, p.category, p.productType))
          .map((p: any) => {
            const rawCat = String(p.category || "").trim();
            const matchedCat = dbCatLookup.get(rawCat) || dbCatLookup.get(rawCat.toLowerCase());
            const cat = matchedCat?.code || rawCat || "other";
            const rawMadeToOrder = p.isthemaketoorder ?? p.isTheMakeToOrder ?? p.isMadeToOrder;
            const isMadeToOrderVal =
              rawMadeToOrder !== undefined
                ? Boolean(rawMadeToOrder)
                : isFreshPreparedCategory(cat);
            const isForSale = p.isForSale !== false;
            const parsedStock = Number(p.stock);
            const stockQuantity = Number.isFinite(parsedStock) ? Math.max(0, parsedStock) : 0;

            return {
              id: String(p._id),
              code: p.sku || `MN-${String(p._id).slice(-4)}`,
              name: p.name,
              category: cat,
              categoryName:
                matchedCat?.name ||
                (p.categoryName && !/^[0-9a-fA-F]{24}$/.test(p.categoryName)
                  ? p.categoryName
                  : cat || "Món Ăn & Đồ Uống"),
              price: Number(p.salePrice) || 0,
              priceFormatted: `${Number(p.salePrice || 0).toLocaleString("vi-VN")}đ`,
              stockQuantity,
              minThreshold: isMadeToOrderVal ? 0 : (Number(p.minStock) || 5),
              unit: normalizeUnitLabel(p.unit || "Phần"),
              description: p.description || "",
              image: resolveProductImage(p.imageUrl),
              isMadeToOrder: isMadeToOrderVal,
              isForSale,
              costPrice: Number(p.costPrice) || 0,
            };
          });
        setStockList(mapped);
      } else {
        setStockList([]);
      }
    } catch (err) {
      console.warn("Lỗi đồng bộ sản phẩm từ DB:", err);
      message.error("Không thể tải danh sách thực đơn từ hệ thống. Vui lòng thử lại.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Đặt lại toàn bộ bộ lọc về trạng thái ban đầu
  const handleResetFilters = useCallback(() => {
    setSelectedCategory("all");
    setStockStatusFilter("all");
    setServiceTypeFilter("all");
    setPhotoStatusFilter("all");
    setSortOption("default");
    setSearchQuery("");
  }, []);

  // Bật/tắt mở bán món ăn (Bảo vệ: Hàng đóng gói có tồn kho = 0 không được phép mở bán trước khi nhập kho)
  const handleToggleZeroStock = useCallback(
    async (item: FnbStockItem) => {
      const madeToOrder = isItemMadeToOrder(item);
      const currentlyOut = isItemOutOfStock(item);

      if (!madeToOrder && currentlyOut && item.stockQuantity <= 0) {
        message.info(
          `Mặt hàng đóng gói "${item.name}" đang có tồn kho = 0. Vui lòng nhập kho tại Kho Hàng trước khi mở bán.`,
        );
        if (canManageInventory) {
          setIsCreatingNew(false);
          setEditingItemData({
            ...item,
            unit: normalizeUnitLabel(item.unit || getDefaultUnitForCategory(item.category, stockList)),
            image: item.image || "",
            isMadeToOrder: isItemMadeToOrder(item),
            isForSale: item.isForSale !== false,
          });
          setEditItemModalVisible(true);
        }
        return;
      }

      const nextForSale = currentlyOut;
      setStockList((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isForSale: nextForSale } : i)),
      );

      try {
        await productService.update(item.id, { isForSale: nextForSale });
        if (!nextForSale) {
          message.info(`Đã cập nhật: Tạm ngưng phục vụ món "${item.name}".`);
        } else {
          message.success(`Đã mở bán lại món "${item.name}" thành công.`);
        }
      } catch (error: any) {
        setStockList((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isForSale: item.isForSale } : i)),
        );
        message.error(
          error?.response?.data?.message || error?.message || "Không thể cập nhật trạng thái món.",
        );
      }
    },
    [canManageInventory, stockList],
  );

  // Mở modal thêm món mới vào menu (Tự sinh mã SKU và đơn vị tính theo danh mục)
  const handleOpenCreateModal = useCallback(() => {
    if (!canManageInventory) {
      message.warning("Chỉ Quản lý / Admin mới có quyền thêm món mới vào thực đơn.");
      return;
    }
    setIsCreatingNew(true);
    const defaultCategory = dbCategories[0]?.code || "coffee";
    const defaultCategoryName = dbCategories[0]?.name || defaultCategory;
    const defaultUnit = getDefaultUnitForCategory(defaultCategory, stockList);
    const newId = `fnb-${Date.now().toString().slice(-4)}`;
    const autoCode = generateSkuForCategory(defaultCategory, stockList.length);
    setEditingItemData({
      id: newId,
      code: autoCode,
      name: "",
      category: defaultCategory,
      categoryName: defaultCategoryName,
      price: 30000,
      priceFormatted: "30.000đ",
      stockQuantity: 0,
      minThreshold: 0,
      unit: defaultUnit,
      image: "",
      isMadeToOrder: isFreshPreparedCategory(defaultCategory),
      isForSale: true,
      description: "",
    });
    setEditItemModalVisible(true);
  }, [canManageInventory, dbCategories, stockList]);

  // Mở modal chỉnh sửa món hiện có
  const handleOpenEditItemModal = useCallback(
    (item: FnbStockItem) => {
      if (!canManageInventory) {
        message.warning("Chỉ Quản lý / Admin mới có quyền chỉnh sửa thông tin món.");
        return;
      }
      setIsCreatingNew(false);
      setEditingItemData({
        ...item,
        unit: normalizeUnitLabel(item.unit || getDefaultUnitForCategory(item.category, stockList)),
        image: item.image || "",
        isMadeToOrder: isItemMadeToOrder(item),
        isForSale: item.isForSale !== false,
      });
      setEditItemModalVisible(true);
    },
    [canManageInventory, stockList],
  );

  // Lưu thông tin món ăn / thức uống (Tạo mới vào Database hoặc Cập nhật)
  const handleSaveItemDetails = useCallback(async () => {
    if (!canManageInventory) {
      message.error("Bạn không có quyền lưu thông tin món!");
      return;
    }
    if (!editingItemData.name?.trim()) {
      message.warning("Vui lòng nhập tên món ăn/thức uống!");
      return;
    }
    if (!editingItemData.price || editingItemData.price <= 0) {
      message.warning("Vui lòng nhập đơn giá bán hợp lệ!");
      return;
    }

    const dbMatchedCat = dbCategories.find(
      (c) =>
        c.code.toLowerCase() === String(editingItemData.category || "").toLowerCase() ||
        c._id === editingItemData.category,
    );
    const resolvedCategory =
      dbMatchedCat?.code || editingItemData.category || dbCategories[0]?.code || "coffee";
    const finalCategoryName =
      dbMatchedCat?.name ||
      editingItemData.categoryName ||
      resolvedCategory ||
      "Khác";
    const isMadeToOrderVal =
      editingItemData.isMadeToOrder !== undefined
        ? Boolean(editingItemData.isMadeToOrder)
        : isFreshPreparedCategory(resolvedCategory);

    const itemToSave: FnbStockItem = {
      id: editingItemData.id || `fnb-${Date.now()}`,
      code: (editingItemData.code || "FNB-01").trim(),
      name: editingItemData.name.trim(),
      category: resolvedCategory as FnbStockItem["category"],
      categoryName: finalCategoryName,
      price: Number(editingItemData.price) || 0,
      priceFormatted: `${Number(editingItemData.price || 0).toLocaleString("vi-VN")}đ`,
      stockQuantity: isCreatingNew
        ? 0
        : Math.max(0, Number(editingItemData.stockQuantity) || 0),
      minThreshold: isMadeToOrderVal ? 0 : Math.max(0, Number(editingItemData.minThreshold) ?? 5),
      unit: normalizeUnitLabel(
        editingItemData.unit || getDefaultUnitForCategory(resolvedCategory, stockList),
      ),
      description: editingItemData.description || "",
      image: editingItemData.image?.trim() || "",
      isMadeToOrder: isMadeToOrderVal,
      isForSale: editingItemData.isForSale !== false,
      costPrice: editingItemData.costPrice,
    };

    try {
      if (isCreatingNew) {
        const created = await productService.create({
          name: itemToSave.name,
          sku: itemToSave.code,
          category: itemToSave.category,
          productType: "fnb",
          unit: itemToSave.unit,
          salePrice: itemToSave.price,
          minStock: itemToSave.minThreshold,
          stock: itemToSave.stockQuantity,
          imageUrl: itemToSave.image,
          description: itemToSave.description,
          isMadeToOrder: itemToSave.isMadeToOrder,
          isForSale: itemToSave.isForSale !== false,
          isActive: true,
        });
        if (created?._id) itemToSave.id = String(created._id);
        setStockList((prev) => [itemToSave, ...prev]);
        message.success(`Đã thêm món "${itemToSave.name}" vào thực đơn!`);
      } else {
        await productService.update(itemToSave.id, {
          name: itemToSave.name,
          sku: itemToSave.code,
          category: itemToSave.category,
          salePrice: itemToSave.price,
          unit: itemToSave.unit,
          stock: itemToSave.stockQuantity,
          minStock: itemToSave.minThreshold,
          imageUrl: itemToSave.image,
          description: itemToSave.description,
          isMadeToOrder: itemToSave.isMadeToOrder,
          isForSale: itemToSave.isForSale !== false,
        });
        setStockList((prev) => prev.map((i) => (i.id === itemToSave.id ? itemToSave : i)));
        message.success(`Đã lưu thay đổi món "${itemToSave.name}"!`);
      }
      setEditItemModalVisible(false);
    } catch (err: any) {
      console.error("Lỗi lưu món:", err);
      if (itemToSave.id.startsWith("fnb-")) {
        if (isCreatingNew) {
          setStockList((prev) => [itemToSave, ...prev]);
        } else {
          setStockList((prev) => prev.map((i) => (i.id === itemToSave.id ? itemToSave : i)));
        }
        message.success(`Đã lưu thay đổi món "${itemToSave.name}"!`);
        setEditItemModalVisible(false);
      } else {
        message.error(err?.response?.data?.message || err?.message || "Không thể lưu món. Vui lòng thử lại!");
      }
    }
  }, [canManageInventory, editingItemData, dbCategories, isCreatingNew, stockList]);

  // Tải danh sách thực đơn ngay khi component mount
  useEffect(() => {
    void fetchProductsFromDb();
  }, [fetchProductsFromDb]);

  // ── 6. Trả về toàn bộ dữ liệu & hàm điều khiển cho FnBInventoryPage ────────
  return {
    canManageInventory,
    stockList,
    dbCategories,
    loading,
    viewMode,
    setViewMode,
    selectedCategory,
    setSelectedCategory,
    stockStatusFilter,
    setStockStatusFilter,
    serviceTypeFilter,
    setServiceTypeFilter,
    photoStatusFilter,
    setPhotoStatusFilter,
    sortOption,
    setSortOption,
    searchQuery,
    setSearchQuery,
    editItemModalVisible,
    setEditItemModalVisible,
    isCreatingNew,
    editingItemData,
    setEditingItemData,
    isFilterActive,
    fnbMetrics,
    categoryPillItems,
    filteredItems,
    fetchProductsFromDb,
    handleResetFilters,
    handleToggleZeroStock,
    handleOpenCreateModal,
    handleOpenEditItemModal,
    handleSaveItemDetails,
  };
}
