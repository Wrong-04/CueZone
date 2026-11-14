import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { hasPermission } from "../../utils/permissions";
import {
  InboxOutlined,
  AppstoreOutlined,
  BarsOutlined,
  PlusOutlined,
  EditOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  CameraOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  CoffeeOutlined,
  PictureOutlined,
  SortAscendingOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tag,
  Input,
  Select,
  Typography,
  message,
  Modal,
  Table,
  Image,
  Card,
  SegmentedPillList,
  Upload,
  type TableColumnsType,
} from "../../shared/ui";
import { Spin } from "antd";
import type { FnbStockItem } from "../../types";
import { productService } from "../../services/product.service";
import { fetchCategories, type Category } from "../../services/catalog-management.service";
import { isFnbWarehouseItem } from "../../utils/fnb";

const { Title, Text } = Typography;

// Helper to determine accurate preparation type and storage location
const isFreshPreparedCategory = (category: string) => {
  return category === "coffee" || category === "tea" || category === "food";
};

const isItemMadeToOrder = (
  item: Pick<FnbStockItem, "isMadeToOrder" | "category">,
): boolean => {
  return item.isMadeToOrder !== undefined
    ? Boolean(item.isMadeToOrder)
    : isFreshPreparedCategory(item.category);
};

const isItemOutOfStock = (
  item: Pick<FnbStockItem, "isMadeToOrder" | "category" | "isForSale" | "stockQuantity">,
): boolean => {
  if (item.isForSale === false) return true;
  if (isItemMadeToOrder(item)) return false;
  return item.stockQuantity <= 0;
};

const getItemPrepType = (category: string, explicitMadeToOrder?: boolean) => {
  const madeToOrder =
    explicitMadeToOrder !== undefined
      ? explicitMadeToOrder
      : isFreshPreparedCategory(category);
  if (!madeToOrder) return "packaged_stock";
  if (category === "food") return "cooked_food";
  return "fresh_beverage";
};

const getItemLocationName = (category: string) => {
  if (category === "coffee" || category === "tea") return "Quầy Pha Chế";
  if (category === "food") return "Bếp Nóng";
  if (category === "beer" || category === "juice") return "Tủ Mát Đồ Uống";
  return "Kệ Quầy Bar";
};

// Product image resolver: preserve real URLs from Cloudinary/DB, return empty string if no image provided
const resolveProductImage = (_name: string, _category: string, currentUrl?: string): string => {
  if (
    currentUrl &&
    currentUrl.trim() &&
    !currentUrl.includes("photo-1538481199705") &&
    !currentUrl.includes("photo-1618886614638") &&
    !currentUrl.startsWith("/fnb/fnb-")
  ) {
    return currentUrl.trim();
  }
  return "";
};

// Automatic SKU generation based on category prefix and item count
export const generateSkuForCategory = (category: string, currentCount: number) => {
  const prefixMap: Record<string, string> = {
    coffee: "CF",
    tea: "TEA",
    juice: "DRK",
    beer: "BEER",
    food: "FOOD",
    snack: "SNK",
  };
  const prefix = prefixMap[category] || "FNB";
  const num = String(currentCount + 1).padStart(3, "0");
  return `${prefix}-${num}`;
};

// Normalize unit display casing so MongoDB lowercase units ("ly", "lon", "đĩa") match UI options cleanly
export const normalizeUnitLabel = (unit?: string): string => {
  const trimmed = String(unit || "").trim();
  if (!trimmed) return "Phần";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const FALLBACK_GENERAL_UNITS = ["Phần", "Ly", "Lon", "Chai", "Đĩa", "Tô", "Gói", "Hộp", "Cái"];

// Default unit resolved from existing DB items in the same category first, with general fallback
export const getDefaultUnitForCategory = (category: string, items: FnbStockItem[] = []) => {
  const catLower = String(category || "").toLowerCase();
  const unitCounts = new Map<string, number>();

  for (const item of items) {
    if (String(item.category || "").toLowerCase() !== catLower) continue;
    const normalized = normalizeUnitLabel(item.unit);
    unitCounts.set(normalized, (unitCounts.get(normalized) || 0) + 1);
  }

  if (unitCounts.size > 0) {
    let topUnit = "";
    let topCount = -1;
    for (const [unit, count] of unitCounts.entries()) {
      if (count > topCount) {
        topUnit = unit;
        topCount = count;
      }
    }
    if (topUnit) return topUnit;
  }

  return "Phần";
};

// Dynamic unit options aggregated from live DB products in the category/menu, plus general suggestions
export const getCommonUnitsForCategory = (category: string, items: FnbStockItem[] = []) => {
  const catLower = String(category || "").toLowerCase();
  const seen = new Set<string>();
  const result: string[] = [];

  const pushUnit = (raw?: string) => {
    if (!raw || !raw.trim()) return;
    const normalized = normalizeUnitLabel(raw);
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  };

  // 1. Real units used by DB products in the selected category
  for (const item of items) {
    if (String(item.category || "").toLowerCase() === catLower) {
      pushUnit(item.unit);
    }
  }

  // 2. Real units used by other F&B products in DB
  for (const item of items) {
    pushUnit(item.unit);
  }

  // 3. General F&B units fallback when DB has no items yet
  for (const u of FALLBACK_GENERAL_UNITS) {
    pushUnit(u);
  }

  return result;
};

export const FnBInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageInventory = hasPermission(user, "inventory.manage") || user?.role === "admin";
  // ── 1. STATE & LIVE DATABASE INTEGRATION ──────────────────────────────────
  const [stockList, setStockList] = useState<FnbStockItem[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

      const dbProducts =
        productsRes.status === "fulfilled" ? productsRes.value : null;

      if (Array.isArray(dbProducts) && dbProducts.length > 0) {
        const mapped: FnbStockItem[] = dbProducts
          .filter((p: any) => !isFnbWarehouseItem(p.name, p.category, p.productType))
          .map((p: any) => {
            const rawCat = String(p.category || "").trim();
            const matchedCat = dbCatLookup.get(rawCat) || dbCatLookup.get(rawCat.toLowerCase());
            const cat = matchedCat?.code || rawCat || "other";
            const rawMadeToOrder =
              p.isthemaketoorder ?? p.isTheMakeToOrder ?? p.isMadeToOrder;
            const isMadeToOrder =
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
              minThreshold: isMadeToOrder ? 0 : (Number(p.minStock) || 5),
              unit: normalizeUnitLabel(p.unit || "Phần"),
              description: p.description || "",
              image: resolveProductImage(p.name, cat, p.imageUrl),
              isMadeToOrder,
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

  useEffect(() => {
    void fetchProductsFromDb();
  }, [fetchProductsFromDb]);

  // View mode: 'grid' (cards with real images) or 'table' (inventory spreadsheet with thumbnails)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [photoStatusFilter, setPhotoStatusFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("default");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleResetFilters = useCallback(() => {
    setSelectedCategory("all");
    setStockStatusFilter("all");
    setServiceTypeFilter("all");
    setPhotoStatusFilter("all");
    setSortOption("default");
    setSearchQuery("");
  }, []);

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

  // Add / Edit Item Details Modal
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
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);

  // ── 2. ACTIONS ────────────────────────────────────────────────────────────

  const handleToggleZeroStock = async (item: FnbStockItem) => {
    const madeToOrder = isItemMadeToOrder(item);
    const currentlyOut = isItemOutOfStock(item);

    // Hàng đóng gói đã hết sạch tồn kho thật -> mở Modal / dẫn nhập kho thay vì gán cứng số ảo
    if (!madeToOrder && currentlyOut && item.stockQuantity <= 0) {
      message.info(
        `Mặt hàng đóng gói "${item.name}" đang có tồn kho = 0. Vui lòng nhập kho tại Kho Hàng trước khi mở bán.`,
      );
      if (canManageInventory) {
        handleOpenEditItemModal(item);
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
  };

  const handleOpenCreateModal = () => {
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
  };

  const handleOpenEditItemModal = (item: FnbStockItem) => {
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
  };

  const handleSaveItemDetails = async () => {
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
    const resolvedCategory = dbMatchedCat?.code || editingItemData.category || dbCategories[0]?.code || "coffee";
    const finalCategoryName =
      dbMatchedCat?.name ||
      editingItemData.categoryName ||
      resolvedCategory ||
      "Khác";
    const isMadeToOrder =
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
      minThreshold: isMadeToOrder ? 0 : Math.max(0, Number(editingItemData.minThreshold) ?? 5),
      unit: normalizeUnitLabel(
        editingItemData.unit || getDefaultUnitForCategory(resolvedCategory, stockList),
      ),
      description: editingItemData.description || "",
      image: editingItemData.image?.trim() || "",
      isMadeToOrder,
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
  };

  const handleResetToDefaults = () => {
    void fetchProductsFromDb(true);
    message.success("Đã làm mới danh sách thực đơn!");
  };

  // ── 3. FILTER & SEARCH ────────────────────────────────────────────────────
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

    if (sortOption === "stock_asc") {
      list.sort((a, b) => {
        const aVal = isItemMadeToOrder(a) ? (isItemOutOfStock(a) ? -1 : Number.MAX_SAFE_INTEGER) : a.stockQuantity;
        const bVal = isItemMadeToOrder(b) ? (isItemOutOfStock(b) ? -1 : Number.MAX_SAFE_INTEGER) : b.stockQuantity;
        return aVal - bVal;
      });
    } else if (sortOption === "stock_desc") {
      list.sort((a, b) => {
        const aVal = isItemMadeToOrder(a) ? -1 : a.stockQuantity;
        const bVal = isItemMadeToOrder(b) ? -1 : b.stockQuantity;
        return bVal - aVal;
      });
    } else if (sortOption === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortOption === "name_asc") {
      list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }

    return list;
  }, [stockList, selectedCategory, stockStatusFilter, serviceTypeFilter, photoStatusFilter, searchQuery, sortOption]);

  // Pill filter items — driven directly by MongoDB categories + any extra category present in stockList
  const categoryPillItems = useMemo(() => {
    const dbPills = dbCategories
      .filter((c) => c.code !== "drink")
      .map((cat) => ({
        key: cat.code,
        label: cat.name,
        badge: stockList.filter((i) => i.category === cat.code).length,
      }));
    const seenKeys = new Set(dbPills.map((p) => p.key.toLowerCase()));
    const presentCategories = Array.from(new Set(stockList.map((i) => i.category)));
    const extraPills = presentCategories
      .filter((cat) => !seenKeys.has(cat.toLowerCase()) && !/^[0-9a-fA-F]{24}$/.test(cat))
      .map((cat) => {
        const sampleItem = stockList.find((i) => i.category === cat);
        const rawLabel = sampleItem?.categoryName || cat;
        const displayLabel = /^[0-9a-fA-F]{24}$/.test(rawLabel) ? "Món khác" : rawLabel;
        return {
          key: cat,
          label: displayLabel,
          badge: stockList.filter((i) => i.category === cat).length,
        };
      });

    return [
      { key: "all", label: "Tất cả thực đơn", badge: stockList.length },
      ...dbPills,
      ...extraPills,
    ];
  }, [stockList, dbCategories]);

  // ── 4. TABLE COLUMNS CONFIGURATION ─────────────────────────────────────────
  const tableColumns: TableColumnsType<FnbStockItem> = [
    {
      title: "Hình Ảnh",
      dataIndex: "image",
      key: "image",
      width: 90,
      render: (imgUrl: string, record: FnbStockItem) => (
        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shadow-2xs group shrink-0 bg-slate-50 flex items-center justify-center">
          {imgUrl ? (
            <Image
              src={imgUrl}
              alt={record.name}
              width={56}
              height={56}
              className="!w-14 !h-14 !object-cover rounded-xl transition-transform duration-300 group-hover:scale-110"
              preview={{
                mask: (
                  <div className="flex items-center justify-center text-[10px] text-white font-bold bg-black/50">
                    <EyeOutlined />
                  </div>
                ),
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300">
              <CameraOutlined className="text-base" />
              <span className="text-[9px] font-semibold text-slate-400 mt-0.5">Không ảnh</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Mã & Tên Món",
      dataIndex: "name",
      key: "name",
      render: (_: unknown, record: FnbStockItem) => (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-block px-1.5 py-0.5 rounded font-mono text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {record.code}
            </span>
            <Tag color="cyan" className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-medium">
              {record.categoryName}
            </Tag>
          </div>
          <span className="font-bold text-slate-900 text-sm block hover:text-emerald-700 transition-colors">
            {record.name}
          </span>
          <span className="text-[11px] text-slate-400">Đơn vị: {record.unit}</span>
        </div>
      ),
    },
    {
      title: "Đơn Giá Bán",
      dataIndex: "price",
      key: "price",
      width: 130,
      render: (price: number) => (
        <span className="font-extrabold text-emerald-700 text-sm">
          {price.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: "Tồn Kho & Phục Vụ",
      dataIndex: "stockQuantity",
      key: "stockQuantity",
      width: 180,
      render: (qty: number, record: FnbStockItem) => {
        const isFresh = isItemMadeToOrder(record);
        const isOutOfStock = isItemOutOfStock(record);
        const isLowStock = !isFresh && !isOutOfStock && qty > 0 && qty <= record.minThreshold;
        const percent = Math.min(100, Math.round((qty / (record.minThreshold * 2.5 || 20)) * 100));

        if (isFresh) {
          return (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Tag color="cyan" className="!rounded-md !px-2 !py-0 !text-[10px] !font-bold">
                  Pha chế tại chỗ
                </Tag>
              </div>
              <span className="text-xs text-slate-500">
                {isOutOfStock ? "Tạm ngưng phục vụ" : "Luôn sẵn sàng phục vụ"}
              </span>
            </div>
          );
        }

        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-black text-sm ${
                  isOutOfStock ? "text-rose-600" : isLowStock ? "text-amber-600" : "text-slate-800"
                }`}
              >
                {qty} {record.unit}
              </span>
              <span className="text-[10.5px] text-slate-400">
                Tủ bar • Min: {record.minThreshold}
              </span>
            </div>
            {/* Visual stock bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOutOfStock ? "bg-rose-500 w-0" : isLowStock ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${isOutOfStock ? 0 : Math.max(8, percent)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: "Trạng Thái Phục Vụ",
      key: "status",
      width: 130,
      align: "center",
      render: (_: unknown, record: FnbStockItem) => {
        const isFresh = isItemMadeToOrder(record);
        const outOfStock = isItemOutOfStock(record);
        if (outOfStock) {
          return (
            <Tag
              color="error"
              className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1"
            >
              <CloseCircleOutlined /> TẠM NGƯNG
            </Tag>
          );
        }
        if (!isFresh && record.stockQuantity <= record.minThreshold) {
          return (
            <Tag
              color="warning"
              className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1"
            >
              <WarningOutlined /> SẮP HẾT
            </Tag>
          );
        }
        return (
          <Tag
            color="green"
            className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1"
          >
            <CheckCircleOutlined /> ĐANG BÁN
          </Tag>
        );
      },
    },
    {
      title: "Thao Tác",
      key: "actions",
      width: 220,
      align: "right",
      render: (_: unknown, record: FnbStockItem) => {
        const isFresh = isItemMadeToOrder(record);
        const isOutOfStock = isItemOutOfStock(record);
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleZeroStock(record)}
              className={`!text-[11px] !h-8 !px-2.5 !rounded-xl font-bold ${
                isOutOfStock
                  ? "!border-emerald-300 !text-emerald-700 hover:!bg-emerald-50"
                  : "!border-rose-200 !text-rose-600 hover:!bg-rose-50"
              }`}
            >
              {isOutOfStock ? "Mở bán lại" : "Báo hết"}
            </Button>
            {!isFresh && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/inventory")}
                className="!text-[11px] !h-8 !px-2.5 !rounded-xl !bg-slate-100 hover:!bg-slate-200 !text-slate-700 font-semibold"
              >
                Xem sổ kho
              </Button>
            )}
            {canManageInventory && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenEditItemModal(record)}
                leftIcon={<EditOutlined />}
                className="!text-[11px] !h-8 !px-2.5 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold"
              >
                Sửa
              </Button>
            )}
          </div>
        );
      },
    },
  ];

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

  return (
    <div className="space-y-6 pb-12 max-w-[1440px] mx-auto">
      {/* ── COMMAND BAR (HEADER) ────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50 via-teal-50 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <InboxOutlined className="text-xl" />
              </div>
              <Title
                level={2}
                className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight"
              >
                Thực Đơn Món Ăn & Thức Uống F&B
              </Title>
              <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black">
                MENU DỊCH VỤ CLB
              </Tag>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 max-w-2xl block">
              Quản lý menu đồ ăn, thức uống, cấu hình món chế biến theo yêu cầu và kiểm soát tồn kho hàng đóng gói phục vụ tại bàn.
            </Text>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ReloadOutlined />}
              onClick={handleResetToDefaults}
              className="!rounded-xl !text-xs !text-slate-600 hover:!text-slate-900"
            >
              Làm mới
            </Button>
            {canManageInventory && (
              <Button
                variant="secondary"
                size="md"
                to="/inventory"
                leftIcon={<InboxOutlined />}
                className="!rounded-xl !text-xs !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !font-semibold"
              >
                Xem Kho Hàng
              </Button>
            )}
            {canManageInventory && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<PlusOutlined />}
                onClick={handleOpenCreateModal}
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold shadow-sm"
              >
                Thêm Món Mới
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 THẺ KPI SUMMARY CARDS (ĐỒNG BỘ GIAO DIỆN VỚI KHO) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số món thực đơn */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng món thực đơn
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
              <ShopOutlined />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 font-mono">
            {fnbMetrics.totalItems} món
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Đồ uống, món ăn & ăn vặt đang quản lý
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
        </div>

        {/* Card 2: Đang sẵn sàng phục vụ */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Đang sẵn sàng bán
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
              <CheckCircleOutlined />
            </div>
          </div>
          <div className="text-3xl font-black text-cyan-600 font-mono">
            {fnbMetrics.availableCount} món
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Sẵn sàng nhận order và phục vụ tại bàn
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
        </div>

        {/* Card 3: Cảnh báo hết / sắp hết */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tạm ngưng / Cần nhập
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
              <WarningOutlined />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600 font-mono">
            {fnbMetrics.lowOrOutCount} món
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Mặt hàng hết kho hoặc dưới mức tối thiểu
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
        </div>

        {/* Card 4: Món pha chế tại chỗ */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pha chế tại chỗ
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              <CoffeeOutlined />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-600 font-mono">
            {fnbMetrics.madeToOrderCount} món
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Món order trực tiếp không quản lý theo lon/chai
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
        </div>
      </div>

      {/* ── FILTER TOOLBAR & VIEW SWITCHER ────────────────────────────────── */}
      <div className="space-y-3.5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        {/* Category Pills */}
        <div className="overflow-x-auto pb-1">
          <SegmentedPillList
            items={categoryPillItems}
            activeKey={selectedCategory}
            onSelect={(key) => setSelectedCategory(key)}
          />
        </div>

        {/* Second Row: Stock Filter, Service Type, Photo Status, Sort & Search */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 whitespace-nowrap">
                <FilterOutlined /> Trạng thái:
              </span>
              <Select
                value={stockStatusFilter}
                onChange={(val) => setStockStatusFilter(val)}
                className="!w-36 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "in_stock", label: "Đang sẵn sàng" },
                  { value: "low_stock", label: "Sắp hết (< Min)" },
                  { value: "out_of_stock", label: "Tạm ngưng bán" },
                ]}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 whitespace-nowrap">
                <CoffeeOutlined /> Loại hình:
              </span>
              <Select
                value={serviceTypeFilter}
                onChange={(val) => setServiceTypeFilter(val)}
                className="!w-36 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả loại hình" },
                  { value: "made_to_order", label: "☕ Chế biến tươi" },
                  { value: "packaged", label: "📦 Đóng gói sẵn" },
                ]}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 whitespace-nowrap">
                <PictureOutlined /> Ảnh:
              </span>
              <Select
                value={photoStatusFilter}
                onChange={(val) => setPhotoStatusFilter(val)}
                className="!w-32 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả ảnh" },
                  { value: "has_image", label: "📷 Có ảnh" },
                  { value: "no_image", label: "⚠️ Chưa ảnh" },
                ]}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 whitespace-nowrap">
                <SortAscendingOutlined /> Sắp xếp:
              </span>
              <Select
                value={sortOption}
                onChange={(val) => setSortOption(val)}
                className="!w-40 !rounded-xl !text-xs"
                options={[
                  { value: "default", label: "Mặc định hệ thống" },
                  { value: "stock_asc", label: "Tồn kho: Thấp → Cao" },
                  { value: "stock_desc", label: "Tồn kho: Cao → Thấp" },
                  { value: "price_asc", label: "Giá bán: Thấp → Cao" },
                  { value: "price_desc", label: "Giá bán: Cao → Thấp" },
                  { value: "name_asc", label: "Tên món: A → Z" },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Search Input */}
            <div className="w-full sm:w-48">
              <Input
                placeholder="Tìm món, mã món..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="!rounded-xl !h-9 text-xs"
              />
            </div>

            {/* View Switcher: Card Grid vs Table */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <Button
                variant={viewMode === "grid" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                leftIcon={<AppstoreOutlined />}
                className={`!rounded-lg !text-xs !font-bold !h-7 !px-2.5 ${
                  viewMode === "grid"
                    ? "!bg-white !text-emerald-700 !shadow-2xs !border-transparent"
                    : "!text-slate-600 hover:!text-slate-900"
                }`}
              >
                Thẻ Có Ảnh
              </Button>
              <Button
                variant={viewMode === "table" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                leftIcon={<BarsOutlined />}
                className={`!rounded-lg !text-xs !font-bold !h-7 !px-2.5 ${
                  viewMode === "table"
                    ? "!bg-white !text-emerald-700 !shadow-2xs !border-transparent"
                    : "!text-slate-600 hover:!text-slate-900"
                }`}
              >
                Danh Sách Bảng
              </Button>
            </div>
          </div>
        </div>

        {/* Third Row: Fixed height Result counter & Reset filter to avoid vertical layout shift */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs h-7">
          <div className="text-slate-500 font-medium">
            Đang hiển thị{" "}
            <strong className="text-slate-800 font-bold">{filteredItems.length}</strong> /{" "}
            <span className="text-slate-600">{stockList.length}</span> món
            <span
              className={`text-emerald-600 ml-1.5 font-semibold transition-opacity ${
                isFilterActive ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              (Đang áp dụng bộ lọc)
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            tabIndex={isFilterActive ? 0 : -1}
            className={`text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer transition-opacity ${
              isFilterActive ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <ReloadOutlined className="text-[11px]" /> Đặt lại bộ lọc
          </button>
        </div>
      </div>

      {loading && stockList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-xs min-h-[640px] flex flex-col items-center justify-center">
          <Spin size="large" />
          <div className="mt-3 text-slate-500 font-semibold text-sm">Đang tải thực đơn từ hệ thống...</div>
        </div>
      ) : (
        <div className="min-h-[640px]">
          {viewMode === "grid" && (
            <div>
          {filteredItems.length === 0 ? (
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredItems.map((item) => {
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
                    {/* Top Image Container with Quick Edit Pen */}
                    <div className="relative w-full aspect-[4/3] shrink-0 overflow-hidden bg-slate-100 rounded-t-3xl [&_.ant-image]:!block [&_.ant-image]:!w-full [&_.ant-image]:!h-full [&_.ant-image-img]:!block [&_.ant-image-img]:!w-full [&_.ant-image-img]:!h-full [&_.ant-image-img]:!object-cover">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          className="group-hover:scale-105 transition-transform duration-500 ease-out"
                          preview={{
                            mask: (
                              <div className="flex items-center gap-1.5 text-xs text-white font-bold bg-black/40 px-3 py-1.5 rounded-full">
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
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-xs">
                          {item.categoryName}
                        </span>
                      </div>

                      {/* Floating Quick Edit Button (Only managers/admins can edit product details) */}
                      {canManageInventory && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditItemModal(item);
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
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs flex items-center gap-1">
                            <CloseCircleOutlined /> TẠM NGƯNG
                          </span>
                        ) : isMadeToOrder ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                            <CheckCircleOutlined /> ĐANG BÁN
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-xs flex items-center gap-1">
                            <WarningOutlined /> SẮP HẾT
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                            <CheckCircleOutlined /> ĐANG BÁN
                          </span>
                        )}
                      </div>

                      {/* Subtle Bottom Vignette */}
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                    </div>

                    {/* Card Content - Fixed flex layout for horizontal alignment */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Code & Type pill */}
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {item.code}
                          </span>
                          <span className="font-semibold text-slate-500">
                            {isFreshBeverage
                              ? "Pha chế tại chỗ"
                              : isCookedFood
                                ? "Bếp nấu theo order"
                                : `ĐVT: ${item.unit}`}
                          </span>
                        </div>

                        {/* Title - Fixed height h-11 line-clamp-2 for perfect baseline alignment */}
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 h-11 mb-2 group-hover:text-emerald-700 transition-colors">
                          {item.name}
                        </h3>

                        {/* Price & Location */}
                        <div className="flex items-baseline justify-between mb-3">
                          <span className="text-xl font-black text-emerald-700 tracking-tight">
                            {item.price.toLocaleString("vi-VN")}đ
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {locationLabel}
                          </span>
                        </div>
                      </div>

                      {/* Stock Level / Preparation Status - Fixed min height min-h-[48px] */}
                      <div className="pt-2.5 border-t border-slate-100 min-h-[48px] flex flex-col justify-center">
                        {isMadeToOrder ? (
                          <div className="flex items-center justify-between text-xs">
                            {isOutOfStock ? (
                              <span className="text-rose-600 font-bold flex items-center gap-1.5">
                                <CloseCircleOutlined /> Tạm hết nguyên liệu
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                <CheckCircleOutlined /> {isCookedFood ? "Chế biến nóng • Sẵn sàng" : "Pha chế tươi • Sẵn sàng"}
                              </span>
                            )}
                            <Tag color="cyan" className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-semibold !mr-0">
                              {isCookedFood ? "Bếp nóng" : "Quầy Bar"}
                            </Tag>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span
                                className={
                                  isOutOfStock
                                    ? "text-rose-600 font-bold"
                                    : isLowStock
                                      ? "text-amber-600 font-bold"
                                      : "text-slate-700"
                                }
                              >
                                Tồn quầy: {item.stockQuantity} {item.unit}
                              </span>
                              <span className="text-[11px] text-slate-400 font-normal">
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

                      {/* Card Action Buttons - Clean layout without duplicate icons */}
                      <div className="pt-3 border-t border-slate-100 mt-2">
                        {isMadeToOrder ? (
                          <div className={`grid ${canManageInventory ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleZeroStock(item)}
                              className={`!rounded-xl !text-xs !font-bold !h-9 ${
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
                                onClick={() => handleOpenEditItemModal(item)}
                                leftIcon={<EditOutlined />}
                                className="!rounded-xl !text-xs !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !font-bold !h-9"
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
                              onClick={() => handleToggleZeroStock(item)}
                              className={`!rounded-xl !text-xs !font-bold !h-9 ${
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
                                onClick={() => handleOpenEditItemModal(item)}
                                leftIcon={<EditOutlined />}
                                className="!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !rounded-xl !text-xs !font-bold !h-9"
                              >
                                Sửa món
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => navigate("/inventory")}
                                leftIcon={<InboxOutlined />}
                                className="!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !rounded-xl !text-xs !font-bold !h-9"
                              >
                                Xem sổ kho
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {viewMode === "table" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <Table<FnbStockItem>
            loading={loading}
            columns={tableColumns}
            dataSource={filteredItems}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showTotal: (total, range) =>
                `Hiển thị ${range[0]}-${range[1]} trên tổng số ${total} mặt hàng`,
              className: "!px-4 !py-3",
            }}
          />
        </div>
      )}
        </div>
      )}

      <Modal
        open={editItemModalVisible}
        onCancel={() => setEditItemModalVisible(false)}
        footer={null}
        width={720}
        title={
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <CameraOutlined className="text-lg" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-base block leading-tight">
                {isCreatingNew
                  ? "Thêm Món Mới Vào Thực Đơn"
                  : `Chỉnh Sửa Món: ${editingItemData.name || ""}`}
              </span>
              <span className="text-xs text-slate-500 font-normal">
                Cấu hình thông tin, giá bán và hình ảnh hiển thị trên thực đơn
              </span>
            </div>
          </div>
        }
      >
        {(() => {
          const currentCategory = editingItemData.category || "coffee";
          const isMadeToOrder =
            editingItemData.isMadeToOrder !== undefined
              ? Boolean(editingItemData.isMadeToOrder)
              : isFreshPreparedCategory(currentCategory);

          return (
            <div className="py-4 space-y-4 text-xs">
              {/* Item Type Selector: Made to order vs Packaged */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <CoffeeOutlined className="text-emerald-600" />
                    Loại hình phục vụ:
                  </span>
                  <Tag
                    color={isMadeToOrder ? "purple" : "blue"}
                    className="!rounded-md !text-[10px] !font-bold uppercase !border-0"
                  >
                    {isMadeToOrder ? "Chế biến theo order" : "Hàng đóng gói sẵn"}
                  </Tag>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemData((prev) => {
                        const nextCat = prev.category || dbCategories[0]?.code || "coffee";
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
                      <span className="text-xs font-bold text-slate-900">Món Pha Chế & Bếp Nấu</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal m-0 leading-tight">
                      Cà phê, trà, đồ ăn... Chế biến theo order (không đếm tồn kho).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemData((prev) => {
                        const nextCat = prev.category || dbCategories[0]?.code || "juice";
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
                      <span className="text-xs font-bold text-slate-900">Hàng Đóng Gói & Phụ Kiện</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal m-0 leading-tight">
                      Bia lon, nước ngọt, snack, phụ kiện... Quản lý theo số lượng tồn kho.
                    </p>
                  </button>
                </div>
              </div>

              {/* Item Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên món: <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="Ví dụ: Cà phê muối đặc biệt"
                    value={editingItemData.name || ""}
                    onChange={(e) => setEditingItemData((prev) => ({ ...prev, name: e.target.value }))}
                    className="!h-10 !rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Mã món: <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newSku = generateSkuForCategory(
                          editingItemData.category || dbCategories[0]?.code || "coffee",
                          stockList.length,
                        );
                        setEditingItemData((prev) => ({ ...prev, code: newSku }));
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                    >
                      Tự động tạo mã
                    </button>
                  </div>
                  <Input
                    placeholder="Ví dụ: DRK-008"
                    value={editingItemData.code || ""}
                    onChange={(e) =>
                      setEditingItemData((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className="!h-10 !rounded-xl font-mono text-xs uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Danh mục:
                  </label>
                  <Select
                    value={editingItemData.category || dbCategories[0]?.code || "coffee"}
                    onChange={(val) => {
                      const newCat = val;
                      const matchedCat = dbCategories.find((c) => c.code === newCat);
                      const autoUnit = getDefaultUnitForCategory(newCat, stockList);
                      setEditingItemData((prev) => ({
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

                      for (const cat of dbCategories) {
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

                      const currentVal = editingItemData.category;
                      if (currentVal && !seen.has(currentVal.toLowerCase())) {
                        options.push({
                          value: currentVal,
                          label: editingItemData.categoryName || currentVal,
                        });
                      }

                      return options;
                    })()}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đơn vị tính:
                  </label>
                  <Select
                    value={normalizeUnitLabel(
                      editingItemData.unit || getDefaultUnitForCategory(currentCategory, stockList),
                    )}
                    onChange={(val) => setEditingItemData((prev) => ({ ...prev, unit: val }))}
                    className="!w-full !rounded-xl !text-xs !h-10"
                    options={(() => {
                      const baseUnits = getCommonUnitsForCategory(currentCategory, stockList);
                      const currentUnit = editingItemData.unit
                        ? normalizeUnitLabel(editingItemData.unit)
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đơn giá bán (VNĐ): <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={500}
                    placeholder="35000"
                    value={editingItemData.price ?? 0}
                    onChange={(e) =>
                      setEditingItemData((prev) => ({
                        ...prev,
                        price: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className="!h-10 !rounded-xl font-mono text-xs font-bold"
                  />
                  <div className="mt-1 text-[11px] text-emerald-700 font-semibold flex items-center justify-between">
                    <span>Giá hiển thị:</span>
                    <strong className="text-xs">
                      {Number(editingItemData.price || 0).toLocaleString("vi-VN")}đ
                    </strong>
                  </div>
                </div>

                {/* Description Field for Customers */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mô tả món (khách xem khi gọi món):
                  </label>
                  <Input
                    placeholder="Ví dụ: Vị êm đằm, ướp lạnh sâu, lon 330ml."
                    value={editingItemData.description || ""}
                    onChange={(e) =>
                      setEditingItemData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="!h-10 !rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* ── STOCK CONFIGURATION: SEPARATED BY ITEM TYPE & SYNCHRONIZED WITH INVENTORY MODULE ── */}
              {isMadeToOrder ? (
                <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
                  <CheckCircleOutlined className="text-lg text-emerald-600 shrink-0" />
                  <div className="leading-tight">
                    <strong className="block text-emerald-950 text-xs font-bold">
                      Chế biến tươi theo order (Bar / Bếp):
                    </strong>
                    <span className="text-[11px] text-emerald-800">
                      Không quản lý tồn kho. Nhân viên chỉ cần bấm nút <em>"Báo hết món"</em> khi hết nguyên liệu.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs">
                        Quản lý tồn kho & Cảnh báo quầy:
                      </span>
                      <Tag color="blue" className="!rounded-md !text-[10px] !font-bold">
                        HÀNG ĐÓNG GÓI
                      </Tag>
                    </div>

                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setEditItemModalVisible(false);
                        navigate("/inventory");
                      }}
                      className="!text-[11px] !font-bold !text-blue-700 hover:!text-blue-800 !p-0"
                    >
                      Mở Sổ Kho & Nhập Hàng &rarr;
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Stock Quantity: Always read-only on menu screen to enforce inventory accounting principles */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tồn kho quầy ({editingItemData.unit || "phần"}):
                      </label>
                      <div className="h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between font-mono text-xs font-bold text-slate-900 shadow-2xs">
                        <span>
                          {isCreatingNew ? 0 : (editingItemData.stockQuantity || 0)} {editingItemData.unit || "phần"}
                        </span>
                        <Tag
                          color={
                            isCreatingNew
                              ? "default"
                              : editingItemData.stockQuantity === 0
                                ? "error"
                                : (editingItemData.stockQuantity || 0) <= (editingItemData.minThreshold || 5)
                                  ? "warning"
                                  : "green"
                          }
                          className="!text-[10px] !px-2 !py-0.5 !border-0 !m-0 !font-bold"
                        >
                          {isCreatingNew
                            ? "MÓN MỚI (CHƯA NHẬP KHO)"
                            : editingItemData.stockQuantity === 0
                              ? "HẾT HÀNG"
                              : (editingItemData.stockQuantity || 0) <= (editingItemData.minThreshold || 5)
                                ? "SẮP HẾT"
                                : "CÒN HÀNG"}
                        </Tag>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        * Tồn kho cập nhật qua <strong>Phiếu nhập kho</strong> tại Kho Hàng & Vật Tư.
                      </span>
                    </div>

                    {/* Low-stock alert threshold setting */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cảnh báo khi tồn quầy &le; :
                      </label>
                      <Input
                        type="number"
                        placeholder="5"
                        value={editingItemData.minThreshold ?? 5}
                        onChange={(e) =>
                          setEditingItemData((prev) => ({
                            ...prev,
                            minThreshold: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="!h-10 !rounded-xl font-mono text-xs font-bold"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Hệ thống sẽ báo vàng <strong>"SẮP HẾT"</strong> khi tồn kho chạm mức này.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── IMAGE SELECTION & UPLOAD SECTION ──────────────────────── */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3.5">
                  {/* Preview Current Selected */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs shrink-0 bg-white group">
                    {editingItemData.image ? (
                      <>
                        <img
                          src={editingItemData.image}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          title="Xóa ảnh (để trống)"
                          onClick={() =>
                            setEditingItemData((prev) => ({
                              ...prev,
                              image: "",
                            }))
                          }
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-1">
                        <CameraOutlined className="text-xl text-slate-400" />
                        <span className="text-[10px] font-medium text-slate-400">Chưa có ảnh</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2.5 min-w-0">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        Hình ảnh món:
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-tight">
                        Chọn ảnh từ thiết bị hoặc dán link ảnh web
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Upload
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        showUploadList={false}
                        beforeUpload={async (file) => {
                          if (file.size > 5 * 1024 * 1024) {
                            message.warning("Ảnh không được vượt quá 5 MB");
                            return Upload.LIST_IGNORE;
                          }
                          setIsUploadingProductImage(true);
                          try {
                            if (editingItemData.id && !editingItemData.id.startsWith("fnb-")) {
                              const updated = await productService.uploadProductImage(editingItemData.id, file);
                              const cloudUrl = updated.imageUrl || "";
                              setEditingItemData((prev) => ({ ...prev, image: cloudUrl }));
                              setStockList((current) =>
                                current.map((item) =>
                                  item.id === editingItemData.id ? { ...item, image: cloudUrl } : item,
                                ),
                              );
                              message.success("Tải ảnh lên thành công!");
                            } else {
                              const res = await productService.uploadDirect(file);
                              setEditingItemData((prev) => ({ ...prev, image: res.imageUrl }));
                              message.success("Tải ảnh lên thành công!");
                            }
                          } catch (err: any) {
                            message.error(err?.message || "Không thể tải ảnh lên. Vui lòng thử lại.");
                          } finally {
                            setIsUploadingProductImage(false);
                          }
                          return Upload.LIST_IGNORE;
                        }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<CameraOutlined />}
                          loading={isUploadingProductImage}
                          className="!rounded-xl !text-xs !border-emerald-300 !text-emerald-700 hover:!bg-emerald-50 font-bold !h-8 !px-3"
                        >
                          {isUploadingProductImage ? "Đang tải ảnh lên..." : "Tải ảnh từ thiết bị"}
                        </Button>
                      </Upload>

                      <Input
                        placeholder="Hoặc dán link ảnh web (https://...)"
                        value={editingItemData.image || ""}
                        onChange={(e) => setEditingItemData((prev) => ({ ...prev, image: e.target.value }))}
                        className="!h-8 !rounded-xl text-xs flex-1 min-w-[200px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal footer buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setEditItemModalVisible(false)}
                  className="!rounded-xl !text-xs"
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveItemDetails}
                  className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs shadow-sm"
                >
                  {isCreatingNew ? "Lưu Món Mới" : "Lưu Thay Đổi"}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default FnBInventoryPage;
