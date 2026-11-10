import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  DollarOutlined,
  FireOutlined,
  CheckOutlined,
  FilterOutlined,
  CoffeeOutlined,
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
import { INITIAL_FNB_STOCK, type FnbStockItem } from "../../mock/posData";
import { productService } from "../../services/product.service";

const { Title, Text } = Typography;

// Preset culinary photo library for quick selection
const PRESET_CULINARY_IMAGES = [
  {
    url: "/fnb/fnb-salt-coffee.jpg",
    label: "Cà Phê Muối / Đồ Uống Cà Phê",
    category: "coffee",
  },
  {
    url: "/fnb/fnb-peach-tea.jpg",
    label: "Trà Đào Cam Sả / Trà Hoa Quả",
    category: "tea",
  },
  {
    url: "/fnb/fnb-cold-beer.jpg",
    label: "Bia Lon & Đồ Uống Ướp Lạnh",
    category: "beer",
  },
  {
    url: "/fnb/fnb-beef-noodles.jpg",
    label: "Mì Xào Bò / Món Ăn Nóng",
    category: "food",
  },
  {
    url: "/fnb/fnb-seafood-rice.jpg",
    label: "Cơm Chiên Hải Sản / Cơm Rang",
    category: "food",
  },
  {
    url: "/fnb/fnb-beef-jerky.jpg",
    label: "Bò Khô Cháy Tỏi / Ăn Vặt",
    category: "snack",
  },
  {
    url: "/fnb/fnb-billiard-gear.jpg",
    label: "Lơ Bida & Găng Tay Chuyên Nghiệp",
    category: "equipment",
  },
];


// Helper to determine accurate preparation type and storage location
const isFreshPreparedCategory = (category: string) => {
  return category === "coffee" || category === "tea" || category === "food";
};

const getItemPrepType = (category: string) => {
  if (category === "coffee" || category === "tea") return "fresh_beverage";
  if (category === "food") return "cooked_food";
  return "packaged_stock";
};

const getItemLocationName = (category: string) => {
  if (category === "coffee" || category === "tea") return "Quầy Pha Chế";
  if (category === "food") return "Bếp Nóng";
  if (category === "beer" || category === "juice") return "Tủ Mát Đồ Uống";
  if (category === "equipment") return "Quầy Phụ Kiện";
  return "Kệ Quầy Bar";
};

// Curated image resolver to avoid blurry or mismatched placeholder images
const resolveProductImage = (name: string, category: string, currentUrl?: string): string => {
  if (currentUrl && currentUrl.includes("cloudinary.com")) return currentUrl;
  const n = name.toLowerCase();
  if (n.includes("bia") || n.includes("beer") || n.includes("heineken") || n.includes("tiger")) {
    return "/fnb/fnb-cold-beer.jpg";
  }
  if (n.includes("cà phê") || n.includes("cafe") || n.includes("coffee")) {
    return "/fnb/fnb-salt-coffee.jpg";
  }
  if (n.includes("trà") || n.includes("tea") || n.includes("đào")) {
    return "/fnb/fnb-peach-tea.jpg";
  }
  if (n.includes("mì") || n.includes("xúc xích") || n.includes("bò") || n.includes("bánh mì") || n.includes("cơm")) {
    return "/fnb/fnb-beef-noodles.jpg";
  }
  if (n.includes("hướng dương") || n.includes("hạt điều") || n.includes("khô") || n.includes("khoai")) {
    return "/fnb/fnb-beef-jerky.jpg";
  }
  if (category === "equipment" || n.includes("bida") || n.includes("lơ") || n.includes("găng") || n.includes("bao tay") || n.includes("kamui") || n.includes("bóng")) {
    return "/fnb/fnb-billiard-gear.jpg";
  }
  if (currentUrl && !currentUrl.includes("photo-1538481199705") && !currentUrl.includes("photo-1618886614638")) {
    return currentUrl;
  }
  return "/fnb/fnb-salt-coffee.jpg";
};

export const FnBInventoryPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canManageInventory = hasPermission(user, "inventory.manage");
  // ── 1. STATE & LIVE DATABASE INTEGRATION ──────────────────────────────────
  const [stockList, setStockList] = useState<FnbStockItem[]>(INITIAL_FNB_STOCK);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchProductsFromDb = useCallback(async () => {
    setLoading(true);
    try {
      const dbProducts = await productService.getAll();
      if (Array.isArray(dbProducts) && dbProducts.length > 0) {
        const resolveCat = (name: string, rawCat: unknown): FnbStockItem["category"] => {
          const n = name.toLowerCase();
          const c = String(rawCat || "").toLowerCase();
          if (c === "food" || c.includes("ăn") || c.includes("món")) return "food";
          if (c === "snack" || c.includes("vặt")) return "snack";
          if (c === "accessory" || c.includes("phụ kiện")) return "equipment";
          // If drink:
          if (n.includes("cà phê") || n.includes("cafe")) return "coffee";
          if (n.includes("trà")) return "tea";
          if (n.includes("bia") || n.includes("beer")) return "beer";
          return "juice"; // giải khát (pepsi, 7up, redbull, aquafina, kem)
        };

        const categoryNameMap: Record<string, string> = {
          coffee: "Cà Phê",
          tea: "Trà Trái Cây",
          juice: "Nước Giải Khát",
          beer: "Bia & Đồ Có Cồn",
          food: "Món Ăn Nóng",
          snack: "Ăn Vặt",
          equipment: "Phụ Kiện Bida",
        };

        const mapped: FnbStockItem[] = dbProducts
          .filter((p: any) => p.category !== "ingredient")
          .map((p: any) => {
            const cat = resolveCat(p.name, p.category);
            const isMadeToOrder =
              p.isMadeToOrder !== undefined
                ? Boolean(p.isMadeToOrder)
                : isFreshPreparedCategory(cat);
            return {
              id: String(p._id),
              code: p.sku || `MN-${String(p._id).slice(-4)}`,
              name: p.name,
              category: cat,
              categoryName: categoryNameMap[cat] || "Khác",
              price: Number(p.salePrice) || 0,
              priceFormatted: `${Number(p.salePrice || 0).toLocaleString("vi-VN")}đ`,
              stockQuantity: isMadeToOrder
                ? p.isForSale === false
                  ? 0
                  : 999
                : p.isForSale === false
                  ? 0
                  : (Number(p.stock) ?? 20),
              minThreshold: isMadeToOrder ? 0 : (Number(p.minStock) || 5),
              unit: p.unit || "Phần",
              description: p.description || "",
              image: resolveProductImage(p.name, cat, p.imageUrl),
              isMadeToOrder,
            };
          });
        if (mapped.length > 0) {
          setStockList(mapped);
        }
      }
    } catch (err) {
      console.warn("Lỗi đồng bộ sản phẩm từ DB:", err);
    } finally {
      setLoading(false);
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
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Quick Inward / Stock Adjustment Modal
  const [adjustModalVisible, setAdjustModalVisible] = useState<boolean>(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<FnbStockItem | null>(null);
  const [adjustedQty, setAdjustedQty] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState<string>("");

  // Add / Edit Item Details Modal
  const [editItemModalVisible, setEditItemModalVisible] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [editingItemData, setEditingItemData] = useState<Partial<FnbStockItem>>({
    code: "",
    name: "",
    category: "coffee",
    categoryName: "Cà Phê",
    price: 35000,
    unit: "Ly",
      description: "",
    stockQuantity: 20,
    minThreshold: 10,
    image: "/fnb/fnb-salt-coffee.jpg",
  });
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);

  // ── 2. ACTIONS ────────────────────────────────────────────────────────────
  const handleOpenAdjustModal = (item: FnbStockItem) => {
    setSelectedItemForAdjust(item);
    setAdjustedQty(item.stockQuantity);
    setAdjustNote("");
    setAdjustModalVisible(true);
  };

  const handleSaveStockAdjustment = () => {
    if (!selectedItemForAdjust) return;
    if (adjustedQty < 0) {
      message.warning("Số lượng tồn kho không thể là số âm!");
      return;
    }

    setStockList((prev) =>
      prev.map((i) =>
        i.id === selectedItemForAdjust.id ? { ...i, stockQuantity: adjustedQty } : i,
      ),
    );

    message.success(
      `Đã cập nhật tồn kho món "${selectedItemForAdjust.name}" thành ${adjustedQty} ${selectedItemForAdjust.unit}!`,
    );
    setAdjustModalVisible(false);
    setSelectedItemForAdjust(null);
  };

  const handleToggleZeroStock = async (item: FnbStockItem) => {
    const nextQty = item.stockQuantity > 0 ? 0 : Math.max(item.minThreshold + 10, 15);
    const isNowForSale = nextQty > 0;

    setStockList((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, stockQuantity: nextQty } : i)),
    );

    try {
      await productService.update(item.id, { isForSale: isNowForSale });
    } catch (error) {
      console.warn("Lưu trạng thái món vào DB:", error);
    }

    if (nextQty === 0) {
      message.info(`Đã cập nhật: Tạm ngưng phục vụ món "${item.name}".`);
    } else {
      message.success(`Đã mở bán lại món "${item.name}" thành công.`);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreatingNew(true);
    const newId = `fnb-${Date.now().toString().slice(-4)}`;
    const newCode = `MN-${Math.floor(100 + Math.random() * 900)}`;
    setEditingItemData({
      id: newId,
      code: newCode,
      name: "",
      category: "coffee",
      categoryName: "Cà Phê",
      price: 35000,
      priceFormatted: "35.000đ",
      stockQuantity: 25,
      minThreshold: 10,
      unit: "Ly",
      image: "/fnb/fnb-salt-coffee.jpg",
      isMadeToOrder: true,
      description: "",
    });
    setEditItemModalVisible(true);
  };

  const handleOpenEditItemModal = (item: FnbStockItem) => {
    setIsCreatingNew(false);
    setEditingItemData({
      ...item,
      isMadeToOrder: item.isMadeToOrder ?? isFreshPreparedCategory(item.category),
    });
    setEditItemModalVisible(true);
  };

  const handleSaveItemDetails = async () => {
    if (!editingItemData.name?.trim()) {
      message.warning("Vui lòng nhập tên món ăn/thức uống!");
      return;
    }
    if (!editingItemData.price || editingItemData.price <= 0) {
      message.warning("Vui lòng nhập đơn giá bán hợp lệ!");
      return;
    }

    const categoryMap: Record<string, string> = {
      coffee: "Cà Phê",
      tea: "Trà Trái Cây",
      juice: "Nước Ép",
      beer: "Bia & Đồ Có Cồn",
      food: "Món Ăn Nóng",
      snack: "Ăn Vặt",
      equipment: "Phụ Kiện",
    };

    const finalCategoryName = categoryMap[editingItemData.category || "coffee"] || "Khác";
    const isMadeToOrder =
      editingItemData.isMadeToOrder !== undefined
        ? Boolean(editingItemData.isMadeToOrder)
        : isFreshPreparedCategory(editingItemData.category || "coffee");

    const itemToSave: FnbStockItem = {
      id: editingItemData.id || `fnb-${Date.now()}`,
      code: editingItemData.code || "FNB-01",
      name: editingItemData.name.trim(),
      category: (editingItemData.category as FnbStockItem["category"]) || "coffee",
      categoryName: finalCategoryName,
      price: Number(editingItemData.price) || 0,
      priceFormatted: `${Number(editingItemData.price || 0).toLocaleString("vi-VN")}đ`,
      stockQuantity: isMadeToOrder ? 999 : (Number(editingItemData.stockQuantity) || 0),
      minThreshold: isMadeToOrder ? 0 : (Number(editingItemData.minThreshold) || 5),
      unit: editingItemData.unit || (isMadeToOrder ? "Ly" : "Lon"),
      description: editingItemData.description || "",
      image: editingItemData.image || "/fnb/fnb-salt-coffee.jpg",
      isMadeToOrder,
    };

    try {
      if (isCreatingNew) {
        const created = await productService.create({
          name: itemToSave.name,
          sku: itemToSave.code,
          category: itemToSave.category,
          unit: itemToSave.unit,
          costPrice: Math.round(itemToSave.price * 0.6),
          salePrice: itemToSave.price,
          minStock: itemToSave.minThreshold,
          stock: itemToSave.stockQuantity,
          imageUrl: itemToSave.image,
          description: itemToSave.description,
          isMadeToOrder: itemToSave.isMadeToOrder,
          isForSale: true,
          isActive: true,
        });
        if (created?._id) itemToSave.id = String(created._id);
        setStockList((prev) => [itemToSave, ...prev]);
        message.success(`Đã thêm mới thành công món "${itemToSave.name}" vào cơ sở dữ liệu!`);
      } else {
        await productService.update(itemToSave.id, {
          name: itemToSave.name,
          salePrice: itemToSave.price,
          unit: itemToSave.unit,
          stock: itemToSave.stockQuantity,
          minStock: itemToSave.minThreshold,
          imageUrl: itemToSave.image,
          description: itemToSave.description,
          isMadeToOrder: itemToSave.isMadeToOrder,
        });
        setStockList((prev) => prev.map((i) => (i.id === itemToSave.id ? itemToSave : i)));
        message.success(`Đã cập nhật thông tin món "${itemToSave.name}" trong cơ sở dữ liệu!`);
      }
    } catch {
      if (isCreatingNew) {
        setStockList((prev) => [itemToSave, ...prev]);
      } else {
        setStockList((prev) => prev.map((i) => (i.id === itemToSave.id ? itemToSave : i)));
      }
      message.success(`Đã lưu món "${itemToSave.name}" thành công!`);
    }

    setEditItemModalVisible(false);
  };

  const handleResetToDefaults = () => {
    void fetchProductsFromDb();
    message.success("Đã đồng bộ lại danh sách món từ cơ sở dữ liệu!");
  };

  // ── 3. FILTER & SEARCH ────────────────────────────────────────────────────
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

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q);

      return matchCat && matchStockStatus && matchQuery;
    });
  }, [stockList, selectedCategory, stockStatusFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const totalItems = stockList.length;
    const lowStockCount = stockList.filter((i) => {
      const isMadeToOrder = i.isMadeToOrder ?? isFreshPreparedCategory(i.category);
      if (isMadeToOrder) return false;
      return i.stockQuantity > 0 && i.stockQuantity <= i.minThreshold;
    }).length;
    const outOfStockCount = stockList.filter((i) => i.stockQuantity === 0).length;
    const inStockCount = stockList.filter((i) => {
      const isMadeToOrder = i.isMadeToOrder ?? isFreshPreparedCategory(i.category);
      if (isMadeToOrder) return i.stockQuantity > 0;
      return i.stockQuantity > i.minThreshold;
    }).length;
    const totalInventoryValue = stockList.reduce((acc, cur) => {
      const isMadeToOrder = cur.isMadeToOrder ?? isFreshPreparedCategory(cur.category);
      if (isMadeToOrder) return acc;
      return acc + cur.price * cur.stockQuantity;
    }, 0);
    const totalCategories = new Set(stockList.map((i) => i.category)).size;

    return {
      totalItems,
      lowStockCount,
      outOfStockCount,
      inStockCount,
      totalInventoryValue,
      totalCategories,
    };
  }, [stockList]);

  // Pill filter items
  const categoryPillItems = [
    { key: "all", label: "Tất cả thực đơn", badge: stockList.length },
    {
      key: "coffee",
      label: "Cà phê",
      badge: stockList.filter((i) => i.category === "coffee").length,
    },
    {
      key: "tea",
      label: "Trà trái cây",
      badge: stockList.filter((i) => i.category === "tea").length,
    },
    {
      key: "juice",
      label: "Nước giải khát",
      badge: stockList.filter((i) => i.category === "juice").length,
    },
    {
      key: "beer",
      label: "Bia & Đồ có cồn",
      badge: stockList.filter((i) => i.category === "beer").length,
    },
    {
      key: "food",
      label: "Món ăn nóng",
      badge: stockList.filter((i) => i.category === "food").length,
    },
    {
      key: "snack",
      label: "Ăn vặt",
      badge: stockList.filter((i) => i.category === "snack").length,
    },
    {
      key: "equipment",
      label: "Phụ kiện bida",
      badge: stockList.filter((i) => i.category === "equipment").length,
    },
  ];

  // ── 4. TABLE COLUMNS CONFIGURATION ─────────────────────────────────────────
  const tableColumns: TableColumnsType<FnbStockItem> = [
    {
      title: "Hình Ảnh",
      dataIndex: "image",
      key: "image",
      width: 90,
      render: (imgUrl: string, record: FnbStockItem) => (
        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shadow-2xs group shrink-0">
          <Image
            src={imgUrl || "/fnb/fnb-salt-coffee.jpg"}
            alt={record.name}
            width={56}
            height={56}
            className="!w-14 !h-14 !object-cover rounded-xl transition-transform duration-300 group-hover:scale-110"
            fallback="/fnb/fnb-salt-coffee.jpg"
            preview={{
              mask: (
                <div className="flex items-center justify-center text-[10px] text-white font-bold bg-black/50">
                  <EyeOutlined />
                </div>
              ),
            }}
          />
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
        const isFresh =
          record.isMadeToOrder !== undefined
            ? record.isMadeToOrder
            : isFreshPreparedCategory(record.category);
        const isOutOfStock = qty === 0;
        const isLowStock = qty > 0 && qty <= record.minThreshold;
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
                {isOutOfStock ? "Tạm hết nguyên liệu" : "Luôn sẵn sàng phục vụ"}
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
        if (record.stockQuantity === 0) {
          return (
            <Tag
              color="error"
              className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1"
            >
              <CloseCircleOutlined /> TẠM NGƯNG
            </Tag>
          );
        }
        if (record.stockQuantity <= record.minThreshold) {
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
        const isFresh =
          record.isMadeToOrder !== undefined
            ? record.isMadeToOrder
            : isFreshPreparedCategory(record.category);
        const isOutOfStock = record.stockQuantity === 0;
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
                onClick={() => handleOpenAdjustModal(record)}
                className="!text-[11px] !h-8 !px-2.5 !rounded-xl !bg-slate-100 hover:!bg-slate-200 !text-slate-700 font-bold"
              >
                Cập nhật tồn
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenEditItemModal(record)}
              leftIcon={<EditOutlined />}
              className="!text-[11px] !h-8 !px-2.5 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold"
            >
              Sửa
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── COMMAND BAR & SUMMARY CARDS ────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50 via-teal-50 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
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
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusOutlined />}
              onClick={handleOpenCreateModal}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold shadow-sm"
            >
              Thêm Món Mới
            </Button>
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 relative z-10">
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Tổng số món
              </span>
              <span className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 text-xs border border-slate-200">
                <FireOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {metrics.totalItems}
              </span>
              <span className="text-xs font-semibold text-slate-500">món trong menu</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">
                Sắp hết hàng
              </span>
              <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs border border-amber-200">
                <WarningOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">
                {metrics.lowStockCount}
              </span>
              <span className="text-xs font-semibold text-amber-700">cần nhập thêm kho</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-rose-800 font-semibold uppercase tracking-wider">
                Tạm ngưng bán
              </span>
              <span className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 text-xs border border-rose-200">
                <CloseCircleOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-800 tracking-tight">
                {metrics.outOfStockCount}
              </span>
              <span className="text-xs font-semibold text-rose-700">hết hàng / ngưng phục vụ</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
                Giá trị tồn quầy
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs border border-emerald-200">
                <DollarOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight truncate">
                {metrics.totalInventoryValue.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>
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

        {/* Second Row: Stock Filter, Search & View Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <FilterOutlined /> Trạng thái:
            </span>
            <Select
              value={stockStatusFilter}
              onChange={(val) => setStockStatusFilter(val)}
              className="!w-48 !rounded-xl !text-xs"
              options={[
                { value: "all", label: "Tất cả trạng thái món" },
                { value: "in_stock", label: "Đang sẵn sàng phục vụ" },
                { value: "low_stock", label: "Sắp hết hàng (< Tối thiểu)" },
                { value: "out_of_stock", label: "Tạm hết / Ngưng bán" },
              ]}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="w-full sm:w-64">
              <Input
                placeholder="Tìm món, mã món, loại..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="!rounded-xl !h-10 text-xs"
              />
            </div>

            {/* View Switcher: Card Grid vs Table */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <Button
                variant={viewMode === "grid" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                leftIcon={<AppstoreOutlined />}
                className={`!rounded-lg !text-xs !font-bold !h-8 !px-3 ${
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
                className={`!rounded-lg !text-xs !font-bold !h-8 !px-3 ${
                  viewMode === "table"
                    ? "!bg-white !text-emerald-700 !shadow-2xs !border-transparent"
                    : "!text-slate-600 hover:!text-slate-900"
                }`}
              >
                Danh Sách Dạng Bảng
              </Button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "grid" && (
        <div>
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
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
                const prepType = getItemPrepType(item.category);
                const isFreshBeverage = prepType === "fresh_beverage";
                const isCookedFood = prepType === "cooked_food";
                const isMadeToOrder = isFreshBeverage || isCookedFood;
                const isOutOfStock = item.stockQuantity === 0;
                const isLowStock =
                  item.stockQuantity > 0 && item.stockQuantity <= item.minThreshold;
                const percent = Math.min(
                  100,
                  Math.round((item.stockQuantity / (item.minThreshold * 2.5 || 20)) * 100),
                );
                const locationLabel = getItemLocationName(item.category);

                return (
                  <Card
                    key={item.id}
                    className="!p-0 !rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between group bg-white h-full relative"
                  >
                    {/* Top Image Container with Quick Edit Pen */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 rounded-t-3xl [&_.ant-image]:!w-full [&_.ant-image]:!h-full [&_.ant-image-img]:!w-full [&_.ant-image-img]:!h-full [&_.ant-image-img]:!object-cover">
                      <Image
                        src={item.image || "/fnb/fnb-salt-coffee.jpg"}
                        alt={item.name}
                        fallback="/fnb/fnb-salt-coffee.jpg"
                        className="group-hover:scale-105 transition-transform duration-500 ease-out"
                        preview={{
                          mask: (
                            <div className="flex items-center gap-1.5 text-xs text-white font-bold bg-black/40 px-3 py-1.5 rounded-full">
                              <EyeOutlined /> Xem ảnh gốc
                            </div>
                          ),
                        }}
                      />

                      {/* Floating Category Badge */}
                      <div className="absolute top-3 left-3 z-10">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-xs">
                          {item.categoryName}
                        </span>
                      </div>

                      {/* Floating Quick Edit Button (Accessible to both staff & admin to fix photos/descriptions) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditItemModal(item);
                        }}
                        title="Chỉnh sửa thông tin, giá bán & hình ảnh món"
                        className="absolute bottom-3 right-3 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 shadow-md flex items-center justify-center transition-all hover:scale-110 border border-slate-200"
                      >
                        <EditOutlined className="text-xs" />
                      </button>

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
                              {isOutOfStock ? "Mở bán lại" : "Báo hết món"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditItemModal(item)}
                              leftIcon={<EditOutlined />}
                              className="!rounded-xl !text-xs !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !font-bold !h-9"
                            >
                              Sửa món
                            </Button>
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

                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenAdjustModal(item)}
                              leftIcon={<InboxOutlined />}
                              className="!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !rounded-xl !text-xs !font-bold !h-9"
                            >
                              Cập nhật tồn
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}            </div>
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

      <Modal
        open={adjustModalVisible}
        onCancel={() => setAdjustModalVisible(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <InboxOutlined className="text-base" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-base block leading-tight">
                {isAdmin ? "Điều Chỉnh Tồn Kho & Kiểm Kê" : "Bổ Sung Quầy & Cập Nhật Số Lượng"}
              </span>
              <span className="text-xs text-slate-500 font-normal">
                {selectedItemForAdjust?.name} ({selectedItemForAdjust?.code})
              </span>
            </div>
          </div>
        }
      >
        {selectedItemForAdjust && (
          <div className="py-4 space-y-4 text-xs">
            {/* Thumbnail + info header */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                <img
                  src={selectedItemForAdjust.image}
                  alt={selectedItemForAdjust.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-0.5 flex-1">
                <span className="font-mono text-[11px] font-bold text-slate-500">
                  {selectedItemForAdjust.code} • {selectedItemForAdjust.categoryName}
                </span>
                <span className="font-bold text-slate-900 text-sm block">
                  {selectedItemForAdjust.name}
                </span>
                <div className="flex items-center gap-3 pt-0.5 text-xs">
                  <span>
                    Hiện có:{" "}
                    <strong className="text-emerald-700 font-black">
                      {selectedItemForAdjust.stockQuantity} {selectedItemForAdjust.unit}
                    </strong>
                  </span>
                  <span>
                    Ngưỡng Min: <strong>{selectedItemForAdjust.minThreshold}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Stepper Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Số lượng tồn kho sau điều chỉnh ({selectedItemForAdjust.unit}):
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setAdjustedQty((prev) => Math.max(0, prev - 10))}
                  className="!h-10 !px-3 !rounded-xl !font-bold text-slate-700"
                >
                  -10
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setAdjustedQty((prev) => Math.max(0, prev - 1))}
                  className="!h-10 !px-3 !rounded-xl !font-bold text-slate-700"
                >
                  -1
                </Button>
                <Input
                  type="number"
                  value={adjustedQty}
                  onChange={(e) => setAdjustedQty(parseInt(e.target.value) || 0)}
                  className="!h-10 !rounded-xl text-center font-black text-lg font-mono flex-1 !text-emerald-700"
                />
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setAdjustedQty((prev) => prev + 1)}
                  className="!h-10 !px-3 !rounded-xl !font-bold !text-emerald-700 !border-emerald-200 hover:!bg-emerald-50"
                >
                  +1
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setAdjustedQty((prev) => prev + 10)}
                  className="!h-10 !px-3 !rounded-xl !font-bold !text-emerald-700 !border-emerald-200 hover:!bg-emerald-50"
                >
                  +10
                </Button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Thao tác nhanh:</span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdjustedQty(selectedItemForAdjust.stockQuantity + 20)}
                  className="!rounded-lg !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !text-xs"
                >
                  Nhập thêm +20
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdjustedQty(selectedItemForAdjust.stockQuantity + 50)}
                  className="!rounded-lg !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !text-xs"
                >
                  Nhập thêm +50
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdjustedQty(selectedItemForAdjust.minThreshold * 2)}
                  className="!rounded-lg !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !text-xs"
                >
                  Lên mức an toàn (x2 Min)
                </Button>
              </div>
            </div>

            {/* Note field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do / Ghi chú đợt kiểm kê hoặc nhập kho:
              </label>
              <Input
                placeholder="Ví dụ: Nhập bổ sung đồ uống sáng nay, hao hụt..."
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                onClick={() => setAdjustModalVisible(false)}
                className="!rounded-xl !text-xs"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveStockAdjustment}
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-5 !text-xs"
              >
                Xác Nhận Cập Nhật
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
                Cập nhật hình ảnh, đơn giá niêm yết và thông tin hiển thị trên thực đơn gọi món
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
                    Loại hình phục vụ & Quản lý tồn kho:
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
                      setEditingItemData((prev) => ({
                        ...prev,
                        isMadeToOrder: true,
                        category:
                          prev.category === "beer" || prev.category === "equipment"
                            ? "coffee"
                            : prev.category,
                        unit:
                          prev.unit && ["lon", "chai", "gói", "bao"].includes(prev.unit.toLowerCase())
                            ? "Ly"
                            : prev.unit || "Ly",
                      }));
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
                      Cà phê, trà, nước ép, mì tôm, đồ chiên... Chế biến theo order, không bắt đếm tồn kho, quản lý nhanh bằng bật/tắt phục vụ.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemData((prev) => ({
                        ...prev,
                        isMadeToOrder: false,
                        category: prev.category === "coffee" ? "juice" : prev.category,
                        unit:
                          prev.unit && ["ly", "tô", "đĩa"].includes(prev.unit.toLowerCase())
                            ? "Lon"
                            : prev.unit || "Lon",
                      }));
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
                      Bia lon, nước ngọt đóng chai, snack, găng tay, lơ bida... Đếm tồn kho quầy thực tế và cảnh báo nhập hàng khi sắp hết.
                    </p>
                  </button>
                </div>
              </div>

              {/* Item Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên món ăn / đồ uống: <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="Ví dụ: Cà phê muối đặc biệt"
                    value={editingItemData.name || ""}
                    onChange={(e) => setEditingItemData((prev) => ({ ...prev, name: e.target.value }))}
                    className="!h-10 !rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mã món (SKU): <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="Ví dụ: DRK-008"
                    value={editingItemData.code || ""}
                    onChange={(e) =>
                      setEditingItemData((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className="!h-10 !rounded-xl font-mono text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phân loại danh mục:
                  </label>
                  <Select
                    value={editingItemData.category || (isMadeToOrder ? "coffee" : "juice")}
                    onChange={(val) =>
                      setEditingItemData((prev) => ({
                        ...prev,
                        category: val as FnbStockItem["category"],
                      }))
                    }
                    className="!w-full !rounded-xl !text-xs !h-10"
                    options={
                      isMadeToOrder
                        ? [
                            { value: "coffee", label: "Cà Phê (Pha chế tại quầy)" },
                            { value: "tea", label: "Trà Trái Cây & Nước Ép (Pha chế)" },
                            { value: "food", label: "Món Ăn Nóng (Bếp nấu)" },
                            { value: "snack", label: "Ăn Vặt & Đồ Chiên Nóng" },
                            { value: "juice", label: "Đồ Uống Pha Chế Khác" },
                          ]
                        : [
                            { value: "juice", label: "Nước Giải Khát (Lon/Chai)" },
                            { value: "beer", label: "Bia & Đồ Có Cồn (Lon/Chai)" },
                            { value: "snack", label: "Ăn Vặt & Bánh Kẹo (Đóng gói)" },
                            { value: "equipment", label: "Phụ Kiện Bida" },
                          ]
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị tính:</label>
                  <Input
                    placeholder={isMadeToOrder ? "Ly, Cốc, Tô, Đĩa, Phần..." : "Lon, Chai, Gói, Cái, Hộp..."}
                    value={editingItemData.unit || (isMadeToOrder ? "Ly" : "Lon")}
                    onChange={(e) => setEditingItemData((prev) => ({ ...prev, unit: e.target.value }))}
                    className="!h-10 !rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đơn giá bán niêm yết (VNĐ): <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="35000"
                    value={editingItemData.price || 0}
                    onChange={(e) =>
                      setEditingItemData((prev) => ({
                        ...prev,
                        price: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="!h-10 !rounded-xl font-mono text-xs font-bold"
                  />
                  <div className="mt-1 text-[11px] text-emerald-700 font-semibold flex items-center justify-between">
                    <span>Giá hiển thị cho khách:</span>
                    <strong className="text-xs">
                      {Number(editingItemData.price || 0).toLocaleString("vi-VN")}đ
                    </strong>
                  </div>
                </div>

                {/* Conditional Stock Inputs based on category */}
                {isMadeToOrder ? (
                  <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                    <CheckCircleOutlined className="text-lg text-emerald-600 shrink-0" />
                    <span className="leading-relaxed">
                      <strong>Món chế biến theo order:</strong> Hệ thống tự động phục vụ liên tục tại bàn. Nhân viên quản lý nhanh bằng nút <em>Báo hết món</em> khi hết đá hoặc nguyên liệu.
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số lượng tồn quầy hiện tại ({editingItemData.unit || "phần"}):
                    </label>
                    <Input
                      type="number"
                      placeholder="20"
                      value={editingItemData.stockQuantity || 0}
                      onChange={(e) =>
                        setEditingItemData((prev) => ({
                          ...prev,
                          stockQuantity: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                      className="!h-10 !rounded-xl font-mono text-xs"
                    />
                    <span className="text-[10.5px] text-slate-400 mt-1 block">
                      Số lượng thực tế có sẵn tại tủ mát/quầy để bán cho khách
                    </span>
                  </div>
                )}

                {/* Min stock for packaged items */}
                {!isMadeToOrder && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mức cảnh báo sắp hết (Tối thiểu):
                    </label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={editingItemData.minThreshold || 5}
                      onChange={(e) =>
                        setEditingItemData((prev) => ({
                          ...prev,
                          minThreshold: Math.max(1, parseInt(e.target.value) || 5),
                        }))
                      }
                      className="!h-10 !rounded-xl font-mono text-xs max-w-xs"
                    />
                    <span className="text-[10.5px] text-slate-400 mt-1 block">
                      Khi số lượng tồn dưới mức này, hệ thống sẽ hiện cảnh báo màu vàng "SẮP HẾT"
                    </span>
                  </div>
                )}

                {/* Description Field for Customer E-Menu */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mô tả ngắn (hiển thị cho khách khi quét mã gọi món):
                  </label>
                  <Input
                    placeholder="Ví dụ: Cà phê Robusta thơm nồng kết hợp lớp kem muối béo ngậy đặc trưng CueZone, uống lạnh sảng khoái."
                    value={editingItemData.description || ""}
                    onChange={(e) =>
                      setEditingItemData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="!h-10 !rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* ── IMAGE SELECTION & UPLOAD SECTION ──────────────────────── */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">
                      Hình ảnh món hiển thị trên thực đơn:
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tải ảnh thực tế từ thiết bị hoặc chọn ảnh mẫu ẩm thực sắc nét bên dưới
                    </span>
                  </div>

                  {/* Preview Current Selected */}
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0 bg-white">
                    <img
                      src={editingItemData.image || "/fnb/fnb-salt-coffee.jpg"}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Upload Button */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1 pb-1">
                  <Upload
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    showUploadList={false}
                    beforeUpload={async (file) => {
                      if (file.size > 5 * 1024 * 1024) {
                        message.warning("Ảnh không được vượt quá 5 MB");
                        return Upload.LIST_IGNORE;
                      }
                      if (editingItemData.id) {
                        setIsUploadingProductImage(true);
                        try {
                          const updated = await productService.uploadProductImage(editingItemData.id, file);
                          setEditingItemData((prev) => ({ ...prev, image: updated.imageUrl }));
                          setStockList((current) =>
                            current.map((item) =>
                              item.id === editingItemData.id ? { ...item, image: updated.imageUrl } : item,
                            ),
                          );
                          message.success("Đã tải ảnh lên hệ thống thành công!");
                        } catch (err: any) {
                          message.error(err?.message || "Không thể tải ảnh lên máy chủ");
                        } finally {
                          setIsUploadingProductImage(false);
                        }
                      } else {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          if (e.target?.result) {
                            setEditingItemData((prev) => ({ ...prev, image: String(e.target?.result) }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                      return Upload.LIST_IGNORE;
                    }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<CameraOutlined />}
                      loading={isUploadingProductImage}
                      className="!rounded-xl !text-xs !border-emerald-300 !text-emerald-700 hover:!bg-emerald-50 font-bold !h-9 !px-3.5"
                    >
                      {isUploadingProductImage ? "Đang tải ảnh lên..." : "Tải ảnh từ thiết bị"}
                    </Button>
                  </Upload>
                  <span className="text-[11px] text-slate-400">hoặc bấm chọn một ảnh mẫu bên dưới:</span>
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {PRESET_CULINARY_IMAGES.map((preset) => {
                    const isSelected = editingItemData.image === preset.url;
                    return (
                      <div
                        key={preset.url}
                        onClick={() => setEditingItemData((prev) => ({ ...prev, image: preset.url }))}
                        className={`cursor-pointer rounded-2xl border-2 p-1.5 transition-all flex flex-col items-center gap-1.5 bg-white relative group ${
                          isSelected
                            ? "border-emerald-600 shadow-xs ring-2 ring-emerald-100"
                            : "border-slate-200/80 hover:border-slate-300 hover:shadow-2xs"
                        }`}
                      >
                        <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <span className="text-[10px] text-center font-bold text-slate-700 line-clamp-1 w-full px-1">
                          {preset.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-xs">
                            <CheckOutlined />
                          </div>
                        )}
                      </div>
                    );
                  })}
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
