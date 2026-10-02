import React, { useState, useEffect, useMemo } from "react";
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
  type TableColumnsType,
} from "../../shared/ui";
import { INITIAL_FNB_STOCK, type FnbStockItem } from "../../mock/posData";

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

export const FnBInventoryPage: React.FC = () => {
  // ── 1. STATE MANAGEMENT ───────────────────────────────────────────────────
  const [stockList, setStockList] = useState<FnbStockItem[]>(() => {
    const saved = localStorage.getItem("cuezone_fnb_stock");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with images if missing
          return parsed.map((item: FnbStockItem) => {
            const initial = INITIAL_FNB_STOCK.find((i) => i.id === item.id);
            return {
              ...item,
              image: item.image || initial?.image || "/fnb/fnb-salt-coffee.jpg",
            };
          });
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_FNB_STOCK;
  });

  useEffect(() => {
    localStorage.setItem("cuezone_fnb_stock", JSON.stringify(stockList));
  }, [stockList]);

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
    stockQuantity: 20,
    minThreshold: 10,
    image: "/fnb/fnb-salt-coffee.jpg",
  });

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
        i.id === selectedItemForAdjust.id ? { ...i, stockQuantity: adjustedQty } : i
      )
    );

    message.success(
      `Đã cập nhật tồn kho món "${selectedItemForAdjust.name}" thành ${adjustedQty} ${selectedItemForAdjust.unit}!`
    );
    setAdjustModalVisible(false);
    setSelectedItemForAdjust(null);
  };

  const handleToggleZeroStock = (item: FnbStockItem) => {
    const nextQty = item.stockQuantity > 0 ? 0 : Math.max(item.minThreshold + 10, 15);
    setStockList((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, stockQuantity: nextQty } : i))
    );
    if (nextQty === 0) {
      message.info(`Đã cập nhật: Hết hàng món "${item.name}".`);
    } else {
      message.success(`Đã khôi phục phục vụ món "${item.name}" (+${nextQty} ${item.unit}).`);
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
    });
    setEditItemModalVisible(true);
  };

  const handleOpenEditItemModal = (item: FnbStockItem) => {
    setIsCreatingNew(false);
    setEditingItemData({ ...item });
    setEditItemModalVisible(true);
  };

  const handleSaveItemDetails = () => {
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

    const finalCategoryName =
      categoryMap[editingItemData.category || "coffee"] || "Khác";

    const itemToSave: FnbStockItem = {
      id: editingItemData.id || `fnb-${Date.now()}`,
      code: editingItemData.code || "FNB-01",
      name: editingItemData.name.trim(),
      category: (editingItemData.category as FnbStockItem["category"]) || "coffee",
      categoryName: finalCategoryName,
      price: Number(editingItemData.price) || 0,
      priceFormatted: `${Number(editingItemData.price || 0).toLocaleString("vi-VN")}đ`,
      stockQuantity: Number(editingItemData.stockQuantity) || 0,
      minThreshold: Number(editingItemData.minThreshold) || 5,
      unit: editingItemData.unit || "Món",
      image: editingItemData.image || "/fnb/fnb-salt-coffee.jpg",
    };

    if (isCreatingNew) {
      setStockList((prev) => [itemToSave, ...prev]);
      message.success(`Đã thêm mới thành công món "${itemToSave.name}" vào thực đơn!`);
    } else {
      setStockList((prev) =>
        prev.map((i) => (i.id === itemToSave.id ? itemToSave : i))
      );
      message.success(`Đã cập nhật thông tin món "${itemToSave.name}"!`);
    }

    setEditItemModalVisible(false);
  };

  const handleResetToDefaults = () => {
    localStorage.removeItem("cuezone_fnb_stock");
    setStockList(INITIAL_FNB_STOCK);
    message.success("Đã khôi phục thực đơn và hình ảnh món ăn về mặc định!");
  };

  // ── 3. FILTER & SEARCH ────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return stockList.filter((item) => {
      const matchCat =
        selectedCategory === "all" || item.category === selectedCategory;
      const isOutOfStock = item.stockQuantity === 0;
      const isLowStock =
        item.stockQuantity > 0 && item.stockQuantity <= item.minThreshold;
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
    const lowStockCount = stockList.filter(
      (i) => i.stockQuantity > 0 && i.stockQuantity <= i.minThreshold
    ).length;
    const outOfStockCount = stockList.filter((i) => i.stockQuantity === 0).length;
    const inStockCount = stockList.filter((i) => i.stockQuantity > i.minThreshold).length;
    const totalInventoryValue = stockList.reduce(
      (acc, cur) => acc + cur.price * cur.stockQuantity,
      0
    );

    return {
      totalItems,
      lowStockCount,
      outOfStockCount,
      inStockCount,
      totalInventoryValue,
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
      label: "Nước ép",
      badge: stockList.filter((i) => i.category === "juice").length,
    },
    {
      key: "beer",
      label: "Bia & Đồ uống",
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
      title: "Tồn Kho Hiện Tại",
      dataIndex: "stockQuantity",
      key: "stockQuantity",
      width: 170,
      render: (qty: number, record: FnbStockItem) => {
        const isOutOfStock = qty === 0;
        const isLowStock = qty > 0 && qty <= record.minThreshold;
        const percent = Math.min(100, Math.round((qty / (record.minThreshold * 2.5 || 20)) * 100));

        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-black text-sm ${
                  isOutOfStock
                    ? "text-rose-600"
                    : isLowStock
                    ? "text-amber-600"
                    : "text-slate-800"
                }`}
              >
                {qty} {record.unit}
              </span>
              <span className="text-[10.5px] text-slate-400">
                Min: {record.minThreshold} {record.unit}
              </span>
            </div>
            {/* Visual stock bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOutOfStock
                    ? "bg-rose-500 w-0"
                    : isLowStock
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${isOutOfStock ? 0 : Math.max(8, percent)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: "Trạng Thái Kho",
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
              <CloseCircleOutlined /> HẾT HÀNG
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
            <CheckCircleOutlined /> SẴN SÀNG
          </Tag>
        );
      },
    },
    {
      title: "Thao Tác",
      key: "actions",
      width: 200,
      align: "right",
      render: (_: unknown, record: FnbStockItem) => {
        const isOutOfStock = record.stockQuantity === 0;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleZeroStock(record)}
              className={`!text-[11px] !h-8 !px-2.5 !rounded-xl ${
                isOutOfStock
                  ? "!border-emerald-300 !text-emerald-700 hover:!bg-emerald-50"
                  : "!border-rose-200 !text-rose-600 hover:!bg-rose-50"
              }`}
            >
              {isOutOfStock ? "Khôi phục" : "Báo hết"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenAdjustModal(record)}
              className="!text-[11px] !h-8 !px-2.5 !rounded-xl !bg-slate-100 hover:!bg-slate-200 !text-slate-700 font-bold"
            >
              Nhập kho
            </Button>
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
              <Title level={2} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                Thực Đơn Món Ăn & Quản Lý Kho F&B
              </Title>
              <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black">
                CUEZONE GASTRONOMY
              </Tag>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 max-w-2xl block">
              Quản lý hình ảnh thực đơn món ăn sắc nét, kiểm soát định mức tồn kho, cảnh báo hết hàng và đồng bộ món phục vụ trực tiếp cho quầy POS bida.
            </Text>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ReloadOutlined />}
              onClick={handleResetToDefaults}
              className="!rounded-xl !text-xs !text-slate-600"
            >
              Mặc định
            </Button>
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
                Tổng số thực đơn
              </span>
              <span className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 text-xs border border-slate-200">
                <FireOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {metrics.totalItems}
              </span>
              <span className="text-xs font-semibold text-slate-500">món ăn & đồ uống</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">
                Sắp hết (&lt; Ngưỡng Min)
              </span>
              <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs border border-amber-200">
                <WarningOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">
                {metrics.lowStockCount}
              </span>
              <span className="text-xs font-semibold text-amber-700">cần nhập thêm</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-rose-800 font-semibold uppercase tracking-wider">
                Đã hết hàng
              </span>
              <span className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 text-xs border border-rose-200">
                <CloseCircleOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-800 tracking-tight">
                {metrics.outOfStockCount}
              </span>
              <span className="text-xs font-semibold text-rose-700">tạm ngưng order</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
                Giá trị tồn kho F&B
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
              <FilterOutlined /> Lọc tình trạng:
            </span>
            <Select
              value={stockStatusFilter}
              onChange={(val) => setStockStatusFilter(val)}
              className="!w-48 !rounded-xl !text-xs"
              options={[
                { value: "all", label: "Tất cả tình trạng kho" },
                { value: "in_stock", label: "Còn nhiều hàng" },
                { value: "low_stock", label: "Sắp hết hàng (< Min)" },
                { value: "out_of_stock", label: "Hết hàng (Tạm dừng)" },
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
                Bảng Kiểm Kho
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── VIEW MODE 1: DẠNG THẺ CÓ HÌNH ẢNH MÓN ĂN (VISUAL CARD GRID) ───── */}
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
                const isOutOfStock = item.stockQuantity === 0;
                const isLowStock =
                  item.stockQuantity > 0 && item.stockQuantity <= item.minThreshold;
                const percent = Math.min(
                  100,
                  Math.round((item.stockQuantity / (item.minThreshold * 2.5 || 20)) * 100)
                );

                return (
                  <Card
                    key={item.id}
                    className="!p-0 !rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between group bg-white"
                  >
                    {/* Top Image Container */}
                    <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                      <Image
                        src={item.image || "/fnb/fnb-salt-coffee.jpg"}
                        alt={item.name}
                        fallback="/fnb/fnb-salt-coffee.jpg"
                        className="!w-full !h-full !object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
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

                      {/* Floating Stock Status Badge */}
                      <div className="absolute top-3 right-3 z-10">
                        {isOutOfStock ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs flex items-center gap-1">
                            <CloseCircleOutlined /> HẾT HÀNG
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-xs flex items-center gap-1">
                            <WarningOutlined /> SẮP HẾT
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                            <CheckCircleOutlined /> CÒN HÀNG
                          </span>
                        )}
                      </div>

                      {/* Subtle Bottom Vignette */}
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                    </div>

                    {/* Card Content */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Code & Unit pill */}
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                          <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {item.code}
                          </span>
                          <span className="font-semibold text-slate-500">
                            ĐVT: {item.unit}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 mb-2 group-hover:text-emerald-700 transition-colors">
                          {item.name}
                        </h3>

                        {/* Price */}
                        <div className="mb-4">
                          <span className="text-xl font-black text-emerald-700 tracking-tight">
                            {item.price.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </div>

                      {/* Stock Level Progress */}
                      <div className="pt-3 border-t border-slate-100 space-y-1.5">
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
                            Tồn kho: {item.stockQuantity} {item.unit}
                          </span>
                          <span className="text-[11px] text-slate-400">
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

                      {/* Card Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-4 mt-3 border-t border-slate-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleZeroStock(item)}
                          className={`!rounded-xl !text-xs !font-bold !h-9 ${
                            isOutOfStock
                              ? "!border-emerald-300 !text-emerald-700 hover:!bg-emerald-50"
                              : "!border-slate-200 !text-slate-600 hover:!bg-rose-50 hover:!text-rose-600 hover:!border-rose-200"
                          }`}
                        >
                          {isOutOfStock ? "Khôi phục" : "Báo hết"}
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenAdjustModal(item)}
                          leftIcon={<InboxOutlined />}
                          className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !text-xs !font-bold !h-9"
                        >
                          Nhập kho
                        </Button>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditItemModal(item)}
                          leftIcon={<EditOutlined />}
                          className="!w-full !rounded-xl !text-xs !text-slate-500 hover:!text-slate-900 !h-8"
                        >
                          Chỉnh sửa thông tin & ảnh món
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW MODE 2: DẠNG BẢNG KIỂM KHO (INVENTORY SPREADSHEET TABLE) ──── */}
      {viewMode === "table" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <Table<FnbStockItem>
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

      {/* ── MODAL 1: ĐIỀU CHỈNH TỒN KHO & NHẬP KHO NHANH ───────────────────── */}
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
                Nhập Kho & Điều Chỉnh Tồn Kho
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
              <span className="text-[11px] font-semibold text-slate-500">
                Thao tác nhanh:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAdjustedQty(selectedItemForAdjust.stockQuantity + 20)
                  }
                  className="!rounded-lg !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !text-xs"
                >
                  Nhập thêm +20
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAdjustedQty(selectedItemForAdjust.stockQuantity + 50)
                  }
                  className="!rounded-lg !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !text-xs"
                >
                  Nhập thêm +50
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAdjustedQty(selectedItemForAdjust.minThreshold * 2)
                  }
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

      {/* ── MODAL 2: THÊM MỚI / CHỈNH SỬA THÔNG TIN & ẢNH MÓN ĂN ───────────── */}
      <Modal
        open={editItemModalVisible}
        onCancel={() => setEditItemModalVisible(false)}
        footer={null}
        width={680}
        title={
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CameraOutlined className="text-base" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-base block leading-tight">
                {isCreatingNew
                  ? "Thêm Món Ăn / Đồ Uống Mới"
                  : `Chỉnh Sửa Món: ${editingItemData.name || ""}`}
              </span>
              <span className="text-xs text-slate-500 font-normal">
                Thiết lập hình ảnh món ăn ẩm thực, đơn giá và số lượng tồn kho định mức
              </span>
            </div>
          </div>
        }
      >
        <div className="py-4 space-y-5 text-xs">
          {/* Item Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên món ăn / đồ uống: <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ví dụ: Cà Phê Muối CueZone Signature"
                value={editingItemData.name || ""}
                onChange={(e) =>
                  setEditingItemData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mã mặt hàng (SKU): <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ví dụ: CF-01"
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
                value={editingItemData.category || "coffee"}
                onChange={(val) =>
                  setEditingItemData((prev) => ({
                    ...prev,
                    category: val as FnbStockItem["category"],
                  }))
                }
                className="!w-full !rounded-xl !text-xs !h-10"
                options={[
                  { value: "coffee", label: "Cà Phê" },
                  { value: "tea", label: "Trà Trái Cây" },
                  { value: "juice", label: "Nước Ép" },
                  { value: "beer", label: "Bia & Đồ Có Cồn" },
                  { value: "food", label: "Món Ăn Nóng" },
                  { value: "snack", label: "Ăn Vặt" },
                  { value: "equipment", label: "Phụ Kiện Bida" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đơn vị tính:
              </label>
              <Input
                placeholder="Ly, Dĩa, Lon, Chai, Hũ, Cục..."
                value={editingItemData.unit || "Ly"}
                onChange={(e) =>
                  setEditingItemData((prev) => ({ ...prev, unit: e.target.value }))
                }
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đơn giá niêm yết (VNĐ): <span className="text-rose-500">*</span>
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
                className="!h-10 !rounded-xl font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tồn kho ban đầu / hiện tại:
              </label>
              <Input
                type="number"
                placeholder="20"
                value={editingItemData.stockQuantity || 0}
                onChange={(e) =>
                  setEditingItemData((prev) => ({
                    ...prev,
                    stockQuantity: parseInt(e.target.value) || 0,
                  }))
                }
                className="!h-10 !rounded-xl font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngưỡng cảnh báo hết hàng (Min Threshold):
              </label>
              <Input
                type="number"
                placeholder="10"
                value={editingItemData.minThreshold || 5}
                onChange={(e) =>
                  setEditingItemData((prev) => ({
                    ...prev,
                    minThreshold: parseInt(e.target.value) || 5,
                  }))
                }
                className="!h-10 !rounded-xl font-mono text-xs"
              />
            </div>
          </div>

          {/* ── IMAGE SELECTION GALLERY ───────────────────────────────────── */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 text-xs block">
                  Chọn Hình Ảnh Món Ăn Ẩm Thực (Culinary Photography):
                </span>
                <span className="text-[11px] text-slate-500">
                  Chọn ảnh chụp thực tế chất lượng cao từ thư viện CueZone hoặc nhập URL riêng
                </span>
              </div>

              {/* Preview Current Selected */}
              <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-2xs shrink-0">
                <img
                  src={editingItemData.image || "/fnb/fnb-salt-coffee.jpg"}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {PRESET_CULINARY_IMAGES.map((preset) => {
                const isSelected = editingItemData.image === preset.url;
                return (
                  <div
                    key={preset.url}
                    onClick={() =>
                      setEditingItemData((prev) => ({ ...prev, image: preset.url }))
                    }
                    className={`cursor-pointer rounded-2xl border-2 p-1.5 transition-all flex flex-col items-center gap-1.5 bg-white relative group ${
                      isSelected
                        ? "border-emerald-600 shadow-xs ring-2 ring-emerald-100"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="w-full aspect-4/3 rounded-xl overflow-hidden bg-slate-100 relative">
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shadow-xs">
                            <CheckOutlined />
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 text-center line-clamp-1">
                      {preset.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Custom URL Input */}
            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Hoặc nhập đường dẫn hình ảnh tùy chỉnh (Custom Image URL):
              </label>
              <Input
                placeholder="https://... hoặc /fnb/..."
                value={editingItemData.image || ""}
                onChange={(e) =>
                  setEditingItemData((prev) => ({ ...prev, image: e.target.value }))
                }
                className="!h-9 !rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setEditItemModalVisible(false)}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveItemDetails}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs"
            >
              {isCreatingNew ? "Lưu Món Mới" : "Lưu Thay Đổi"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FnBInventoryPage;
