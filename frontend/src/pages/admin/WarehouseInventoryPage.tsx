import React, { useState, useEffect, useMemo } from "react";
import {
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  ReloadOutlined,
  FileDoneOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tag,
  Typography,
  message,
  Modal,
  Table,
  Input,
  Select,
  SegmentedPillList,
  type TableColumnsType,
} from "../../shared/ui";

const { Title, Text } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WarehouseItem {
  id: string;
  sku: string;
  name: string;
  category: "equipment" | "table_supplies" | "beverage" | "ingredients" | "maintenance";
  categoryName: string;
  stockQty: number;
  minThreshold: number;
  unit: string;
  costPrice: number; // Giá vốn nhập kho
  sellingPrice?: number; // Giá bán (nếu có)
  location: string; // Vị trí kệ kho
  supplier: string;
}

export interface InventorySlip {
  id: string;
  slipCode: string;
  type: "inward" | "outward";
  date: string;
  createdTime: string;
  creator: string;
  partnerOrTarget: string; // Nhà cung cấp hoặc Bàn/Quầy tiếp nhận
  itemsCount: number;
  totalValue: number;
  status: "completed" | "pending";
  note: string;
  details: {
    sku: string;
    name: string;
    qty: number;
    unit: string;
    price: number;
    subtotal: number;
  }[];
}

// ── Mock Initial Data ─────────────────────────────────────────────────────────

const INITIAL_WAREHOUSE_STOCK: WarehouseItem[] = [
  // Bida Equipment & Cues
  {
    id: "wh-01",
    sku: "EQ-CUE-01",
    name: "Cơ Bida Lỗ Predator Sneaky Pete Custom",
    category: "equipment",
    categoryName: "Cơ & Ngọn Bida",
    stockQty: 8,
    minThreshold: 3,
    unit: "Cây",
    costPrice: 9500000,
    sellingPrice: 12500000,
    location: "Kệ A1 - Tủ Cơ VIP",
    supplier: "Predator Cues USA Distribution",
  },
  {
    id: "wh-02",
    sku: "EQ-SHAFT-01",
    name: "Ngọn Cơ Carbon Predator REVO 12.4mm",
    category: "equipment",
    categoryName: "Cơ & Ngọn Bida",
    stockQty: 5,
    minThreshold: 2,
    unit: "Ngọn",
    costPrice: 8200000,
    sellingPrice: 10500000,
    location: "Kệ A1 - Hộp Kính",
    supplier: "Predator Cues USA Distribution",
  },
  {
    id: "wh-03",
    sku: "EQ-CHALK-01",
    name: "Lơ Bida Taom Pyro Chalk Xanh Cyan (Hộp 9 cục)",
    category: "equipment",
    categoryName: "Phụ Kiện Bida",
    stockQty: 24,
    minThreshold: 10,
    unit: "Hộp",
    costPrice: 420000,
    sellingPrice: 580000,
    location: "Kệ A2 - Ngăn 1",
    supplier: "Billiard World Việt Nam",
  },
  {
    id: "wh-04",
    sku: "EQ-GLOVE-01",
    name: "Bao Tay Bida Chuyên Dụng Predator Second Skin",
    category: "equipment",
    categoryName: "Phụ Kiện Bida",
    stockQty: 45,
    minThreshold: 15,
    unit: "Chiếc",
    costPrice: 240000,
    sellingPrice: 350000,
    location: "Kệ A2 - Ngăn 2",
    supplier: "Billiard World Việt Nam",
  },
  {
    id: "wh-05",
    sku: "EQ-TIP-01",
    name: "Đầu Cơ Bida Kamui Black Clear (Size M/H)",
    category: "equipment",
    categoryName: "Phụ Kiện Bida",
    stockQty: 30,
    minThreshold: 10,
    unit: "Viên",
    costPrice: 280000,
    sellingPrice: 390000,
    location: "Kệ A2 - Hộp Nhỏ",
    supplier: "Kamui Japan Official",
  },

  // Table Supplies (Vải nỉ, bóng thi đấu, băng cao su)
  {
    id: "wh-06",
    sku: "TB-FELT-01",
    name: "Vải Nỉ Bàn Bida Simonis 860 Tournament Blue (Cuộn 9FT)",
    category: "table_supplies",
    categoryName: "Vật Tư Bàn Bida",
    stockQty: 6,
    minThreshold: 3,
    unit: "Bộ",
    costPrice: 4800000,
    sellingPrice: 6200000,
    location: "Kho Vật Tư Nặng B1",
    supplier: "Iwan Simonis Bỉ - Đại lý VN",
  },
  {
    id: "wh-07",
    sku: "TB-BALL-01",
    name: "Bộ Bóng Bida Aramith Tournament Pro-Cup TV (Bóng Chấm Đỏ)",
    category: "table_supplies",
    categoryName: "Vật Tư Bàn Bida",
    stockQty: 8,
    minThreshold: 4,
    unit: "Bộ",
    costPrice: 5200000,
    sellingPrice: 6800000,
    location: "Kệ B2 - Tủ Bảo Quản Bóng",
    supplier: "Saluc SA Aramith Bỉ",
  },
  {
    id: "wh-08",
    sku: "TB-RUBBER-01",
    name: "Bộ Băng Cao Su K-Steel Bàn Thi Đấu Quốc Tế",
    category: "table_supplies",
    categoryName: "Vật Tư Bàn Bida",
    stockQty: 4,
    minThreshold: 2,
    unit: "Bộ",
    costPrice: 3500000,
    sellingPrice: 4500000,
    location: "Kho Vật Tư Nặng B1",
    supplier: "K-Steel Korea Corp",
  },

  // F&B Beverages (Thùng lưu kho)
  {
    id: "wh-09",
    sku: "FB-BEER-01",
    name: "Bia Heineken Silver Lon 330ml (Thùng 24 lon)",
    category: "beverage",
    categoryName: "Đồ Uống Lưu Kho",
    stockQty: 35,
    minThreshold: 15,
    unit: "Thùng",
    costPrice: 395000,
    sellingPrice: 840000,
    location: "Kho Lạnh F&B C1",
    supplier: "Đại lý Phân Phối Bia Nước Ngọt Tân Hiệp",
  },
  {
    id: "wh-10",
    sku: "FB-BEER-02",
    name: "Bia Corona Extra Chai 355ml (Thùng 24 chai)",
    category: "beverage",
    categoryName: "Đồ Uống Lưu Kho",
    stockQty: 6, // Sắp hết
    minThreshold: 10,
    unit: "Thùng",
    costPrice: 680000,
    sellingPrice: 1152000,
    location: "Kho Lạnh F&B C1",
    supplier: "Đại lý Phân Phối Bia Nước Ngọt Tân Hiệp",
  },
  {
    id: "wh-11",
    sku: "FB-WATER-01",
    name: "Nước Suối Tinh Khiết Dasani 500ml (Thùng 24 chai)",
    category: "beverage",
    categoryName: "Đồ Uống Lưu Kho",
    stockQty: 50,
    minThreshold: 20,
    unit: "Thùng",
    costPrice: 95000,
    sellingPrice: 240000,
    location: "Kệ C2 - Nước Đóng Chai",
    supplier: "Coca-Cola Beverages Vietnam",
  },

  // Ingredients (Nguyên liệu pha chế)
  {
    id: "wh-12",
    sku: "FB-INGR-01",
    name: "Cà Phê Hạt Robusta Đắk Lắk Hảo Hạng",
    category: "ingredients",
    categoryName: "Nguyên Liệu Pha Chế",
    stockQty: 18,
    minThreshold: 10,
    unit: "Kg",
    costPrice: 160000,
    location: "Tủ Nguyên Liệu C3",
    supplier: "Nông Trại Cà Phê Buôn Ma Thuột",
  },
  {
    id: "wh-13",
    sku: "FB-INGR-02",
    name: "Sữa Đặc Có Đường Ngôi Sao Phương Nam (Thùng 48 lon)",
    category: "ingredients",
    categoryName: "Nguyên Liệu Pha Chế",
    stockQty: 5,
    minThreshold: 8,
    unit: "Thùng",
    costPrice: 890000,
    location: "Tủ Nguyên Liệu C3",
    supplier: "Vinamilk Việt Nam",
  },

  // Maintenance & Cleaning
  {
    id: "wh-14",
    sku: "MT-CLEAN-01",
    name: "Dung Dịch Đánh Bóng Bi Aramith Ball Cleaner 250ml",
    category: "maintenance",
    categoryName: "Bảo Dưỡng & Vệ Sinh",
    stockQty: 12,
    minThreshold: 5,
    unit: "Chai",
    costPrice: 320000,
    location: "Tủ Hóa Chất D1",
    supplier: "Saluc SA Aramith Bỉ",
  },
  {
    id: "wh-15",
    sku: "MT-BRUSH-01",
    name: "Bàn Chải Vệ Sinh Nỉ Bàn Bida Lông Ngựa Simonis",
    category: "maintenance",
    categoryName: "Bảo Dưỡng & Vệ Sinh",
    stockQty: 4,
    minThreshold: 2,
    unit: "Cái",
    costPrice: 250000,
    location: "Tủ Dụng Cụ D2",
    supplier: "Iwan Simonis Bỉ - Đại lý VN",
  },
];

const INITIAL_SLIPS: InventorySlip[] = [
  {
    id: "slip-01",
    slipCode: "PNK-2026-101",
    type: "inward",
    date: "01/10/2026",
    createdTime: "09:30",
    creator: "Nguyễn Văn Nam (Thủ kho)",
    partnerOrTarget: "Iwan Simonis Bỉ - Đại lý VN",
    itemsCount: 4,
    totalValue: 24000000,
    status: "completed",
    note: "Nhập bổ sung 5 bộ nỉ Simonis 860 chuẩn bị cho giải đấu Q4",
    details: [
      {
        sku: "TB-FELT-01",
        name: "Vải Nỉ Bàn Bida Simonis 860 Tournament Blue",
        qty: 5,
        unit: "Bộ",
        price: 4800000,
        subtotal: 24000000,
      },
    ],
  },
  {
    id: "slip-02",
    slipCode: "PNK-2026-102",
    type: "inward",
    date: "02/10/2026",
    createdTime: "08:15",
    creator: "Nguyễn Văn Nam (Thủ kho)",
    partnerOrTarget: "Đại lý Phân Phối Bia Nước Ngọt Tân Hiệp",
    itemsCount: 2,
    totalValue: 18650000,
    status: "completed",
    note: "Nhập bia lon Heineken và Corona ướp lạnh cuối tuần",
    details: [
      {
        sku: "FB-BEER-01",
        name: "Bia Heineken Silver Lon 330ml (Thùng 24 lon)",
        qty: 30,
        unit: "Thùng",
        price: 395000,
        subtotal: 11850000,
      },
      {
        sku: "FB-BEER-02",
        name: "Bia Corona Extra Chai 355ml (Thùng 24 chai)",
        qty: 10,
        unit: "Thùng",
        price: 680000,
        subtotal: 6800000,
      },
    ],
  },
  {
    id: "slip-03",
    slipCode: "PXK-2026-088",
    type: "outward",
    date: "02/10/2026",
    createdTime: "11:00",
    creator: "Nguyễn Văn Nam (Thủ kho)",
    partnerOrTarget: "Bàn Match 13 & Bàn Match 14 (Khu VAR)",
    itemsCount: 2,
    totalValue: 9600000,
    status: "completed",
    note: "Xuất 2 bộ nỉ Simonis thay mới mặt bàn phục vụ vòng bán kết Bank Pool",
    details: [
      {
        sku: "TB-FELT-01",
        name: "Vải Nỉ Bàn Bida Simonis 860 Tournament Blue",
        qty: 2,
        unit: "Bộ",
        price: 4800000,
        subtotal: 9600000,
      },
    ],
  },
  {
    id: "slip-04",
    slipCode: "PXK-2026-089",
    type: "outward",
    date: "02/10/2026",
    createdTime: "13:30",
    creator: "Nguyễn Văn Nam (Thủ kho)",
    partnerOrTarget: "Quầy Bar & Quầy POS Bida Tầng 1",
    itemsCount: 3,
    totalValue: 5850000,
    status: "completed",
    note: "Cấp phát 10 thùng bia Heineken và 5 thùng nước suối lên quầy lạnh",
    details: [
      {
        sku: "FB-BEER-01",
        name: "Bia Heineken Silver Lon 330ml (Thùng 24 lon)",
        qty: 10,
        unit: "Thùng",
        price: 395000,
        subtotal: 3950000,
      },
      {
        sku: "FB-WATER-01",
        name: "Nước Suối Tinh Khiết Dasani 500ml (Thùng 24 chai)",
        qty: 20,
        unit: "Thùng",
        price: 95000,
        subtotal: 1900000,
      },
    ],
  },
];

export const WarehouseInventoryPage: React.FC = () => {
  // ── 1. STATE ──────────────────────────────────────────────────────────────
  const [stockList, setStockList] = useState<WarehouseItem[]>(() => {
    const saved = localStorage.getItem("cuezone_warehouse_stock");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_WAREHOUSE_STOCK;
  });

  const [slipsList, setSlipsList] = useState<InventorySlip[]>(() => {
    const saved = localStorage.getItem("cuezone_inventory_slips");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_SLIPS;
  });

  useEffect(() => {
    localStorage.setItem("cuezone_warehouse_stock", JSON.stringify(stockList));
  }, [stockList]);

  useEffect(() => {
    localStorage.setItem("cuezone_inventory_slips", JSON.stringify(slipsList));
  }, [slipsList]);

  // Main navigation tabs
  const [activeTab, setActiveTab] = useState<string>("stock");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ── 2. MODALS ─────────────────────────────────────────────────────────────
  // Modal: Nhập kho mới
  const [inwardModalVisible, setInwardModalVisible] = useState<boolean>(false);
  const [inwardForm, setInwardForm] = useState({
    sku: "TB-FELT-01",
    qty: 5,
    unitPrice: 4800000,
    supplier: "Iwan Simonis Bỉ - Đại lý VN",
    note: "Nhập bổ sung định kỳ cho kho bàn bida",
  });

  // Modal: Xuất kho
  const [outwardModalVisible, setOutwardModalVisible] = useState<boolean>(false);
  const [outwardForm, setOutwardForm] = useState({
    sku: "FB-BEER-01",
    qty: 5,
    target: "Quầy Bar & POS Bàn Bida",
    note: "Cấp phát hàng phục vụ khách cuối tuần",
  });

  // Modal: Chi tiết phiếu
  const [selectedSlip, setSelectedSlip] = useState<InventorySlip | null>(null);

  // ── 3. ACTIONS ────────────────────────────────────────────────────────────
  const handleCreateInwardSlip = () => {
    if (inwardForm.qty <= 0) {
      message.warning("Số lượng nhập kho phải lớn hơn 0!");
      return;
    }

    const targetItem = stockList.find((i) => i.sku === inwardForm.sku);
    if (!targetItem) return;

    const subtotal = inwardForm.qty * inwardForm.unitPrice;
    const newSlip: InventorySlip = {
      id: `slip-${Date.now()}`,
      slipCode: `PNK-${Date.now().toString().slice(-4)}`,
      type: "inward",
      date: new Date().toLocaleDateString("vi-VN"),
      createdTime: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      creator: "Nguyễn Văn Nam (Thủ kho)",
      partnerOrTarget: inwardForm.supplier,
      itemsCount: 1,
      totalValue: subtotal,
      status: "completed",
      note: inwardForm.note,
      details: [
        {
          sku: targetItem.sku,
          name: targetItem.name,
          qty: inwardForm.qty,
          unit: targetItem.unit,
          price: inwardForm.unitPrice,
          subtotal: subtotal,
        },
      ],
    };

    // Update stock quantity
    setStockList((prev) =>
      prev.map((i) =>
        i.sku === targetItem.sku
          ? { ...i, stockQty: i.stockQty + inwardForm.qty }
          : i
      )
    );

    // Add slip
    setSlipsList((prev) => [newSlip, ...prev]);

    message.success(
      `Đã lập phiếu nhập kho thành công! Cộng thêm +${inwardForm.qty} ${targetItem.unit} vào mặt hàng "${targetItem.name}".`
    );
    setInwardModalVisible(false);
  };

  const handleCreateOutwardSlip = () => {
    if (outwardForm.qty <= 0) {
      message.warning("Số lượng xuất kho phải lớn hơn 0!");
      return;
    }

    const targetItem = stockList.find((i) => i.sku === outwardForm.sku);
    if (!targetItem) return;

    if (targetItem.stockQty < outwardForm.qty) {
      message.error(
        `Không đủ tồn kho để xuất! Tồn hiện tại chỉ còn ${targetItem.stockQty} ${targetItem.unit}.`
      );
      return;
    }

    const subtotal = outwardForm.qty * targetItem.costPrice;
    const newSlip: InventorySlip = {
      id: `slip-${Date.now()}`,
      slipCode: `PXK-${Date.now().toString().slice(-4)}`,
      type: "outward",
      date: new Date().toLocaleDateString("vi-VN"),
      createdTime: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      creator: "Nguyễn Văn Nam (Thủ kho)",
      partnerOrTarget: outwardForm.target,
      itemsCount: 1,
      totalValue: subtotal,
      status: "completed",
      note: outwardForm.note,
      details: [
        {
          sku: targetItem.sku,
          name: targetItem.name,
          qty: outwardForm.qty,
          unit: targetItem.unit,
          price: targetItem.costPrice,
          subtotal: subtotal,
        },
      ],
    };

    // Update stock quantity
    setStockList((prev) =>
      prev.map((i) =>
        i.sku === targetItem.sku
          ? { ...i, stockQty: i.stockQty - outwardForm.qty }
          : i
      )
    );

    // Add slip
    setSlipsList((prev) => [newSlip, ...prev]);

    message.success(
      `Đã lập phiếu xuất kho thành công! Trừ -${outwardForm.qty} ${targetItem.unit} cho "${targetItem.name}".`
    );
    setOutwardModalVisible(false);
  };

  const handleResetToDefaults = () => {
    localStorage.removeItem("cuezone_warehouse_stock");
    localStorage.removeItem("cuezone_inventory_slips");
    setStockList(INITIAL_WAREHOUSE_STOCK);
    setSlipsList(INITIAL_SLIPS);
    message.success("Đã khôi phục dữ liệu tổng kho và lịch sử phiếu về mặc định!");
  };

  // ── 4. FILTERED DATA & METRICS ────────────────────────────────────────────
  const filteredStock = useMemo(() => {
    return stockList.filter((item) => {
      const matchCat = categoryFilter === "all" || item.category === categoryFilter;
      const isOut = item.stockQty === 0;
      const isLow = item.stockQty > 0 && item.stockQty <= item.minThreshold;
      const isIn = item.stockQty > item.minThreshold;

      let matchStatus = true;
      if (statusFilter === "in_stock") matchStatus = isIn;
      if (statusFilter === "low_stock") matchStatus = isLow;
      if (statusFilter === "out_of_stock") matchStatus = isOut;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);

      return matchCat && matchStatus && matchQuery;
    });
  }, [stockList, categoryFilter, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const totalItems = stockList.length;
    const totalValue = stockList.reduce(
      (acc, cur) => acc + cur.costPrice * cur.stockQty,
      0
    );
    const lowStockCount = stockList.filter(
      (i) => i.stockQty > 0 && i.stockQty <= i.minThreshold
    ).length;
    const outStockCount = stockList.filter((i) => i.stockQty === 0).length;
    const totalSlips = slipsList.length;

    return {
      totalItems,
      totalValue,
      lowStockCount,
      outStockCount,
      totalSlips,
    };
  }, [stockList, slipsList]);

  // Main Pills
  const mainPills = [
    { key: "stock", label: "Tồn Kho Vật Tư & Thiết Bị", badge: stockList.length },
    {
      key: "inward",
      label: "Lịch Sử Phiếu Nhập Kho",
      badge: slipsList.filter((s) => s.type === "inward").length,
    },
    {
      key: "outward",
      label: "Phiếu Xuất Kho & Cấp Phát",
      badge: slipsList.filter((s) => s.type === "outward").length,
    },
    {
      key: "audit",
      label: "Kiểm Kê & Cân Bằng Kho",
      badge: "Định kỳ",
    },
  ];

  // Stock Table Columns
  const stockColumns: TableColumnsType<WarehouseItem> = [
    {
      title: "Mã SKU",
      dataIndex: "sku",
      key: "sku",
      width: 140,
      render: (sku: string) => (
        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
          {sku}
        </span>
      ),
    },
    {
      title: "Tên Mặt Hàng / Vật Tư",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: WarehouseItem) => (
        <div>
          <span className="font-bold text-slate-900 text-sm block">{name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <Tag color="cyan" className="!rounded-md !px-1.5 !py-0 !text-[10px]">
              {record.categoryName}
            </Tag>
            <span className="text-[11px] text-slate-400">
              Vị trí: <strong>{record.location}</strong>
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Giá Vốn Nhập",
      dataIndex: "costPrice",
      key: "costPrice",
      width: 130,
      render: (cost: number) => (
        <span className="font-mono font-bold text-slate-700 text-xs">
          {cost.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: "Tồn Kho Hiện Tại",
      dataIndex: "stockQty",
      key: "stockQty",
      width: 170,
      render: (qty: number, record: WarehouseItem) => {
        const isOut = qty === 0;
        const isLow = qty > 0 && qty <= record.minThreshold;
        const percent = Math.min(100, Math.round((qty / (record.minThreshold * 2.5 || 20)) * 100));

        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-black text-sm ${
                  isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-700"
                }`}
              >
                {qty} {record.unit}
              </span>
              <span className="text-[10.5px] text-slate-400">
                Min: {record.minThreshold} {record.unit}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className={`h-full rounded-full transition-all ${
                  isOut ? "bg-rose-500 w-0" : isLow ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${isOut ? 0 : Math.max(8, percent)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: "Tổng Giá Trị Tồn",
      key: "totalVal",
      width: 150,
      render: (_: unknown, record: WarehouseItem) => {
        const val = record.costPrice * record.stockQty;
        return (
          <span className="font-black text-emerald-800 text-sm font-mono">
            {val.toLocaleString("vi-VN")}đ
          </span>
        );
      },
    },
    {
      title: "Trạng Thái",
      key: "status",
      width: 130,
      align: "center",
      render: (_: unknown, record: WarehouseItem) => {
        if (record.stockQty === 0) {
          return (
            <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1">
              <CloseCircleOutlined /> HẾT HÀNG
            </Tag>
          );
        }
        if (record.stockQty <= record.minThreshold) {
          return (
            <Tag color="warning" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1">
              <WarningOutlined /> SẮP HẾT
            </Tag>
          );
        }
        return (
          <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1">
            <CheckCircleOutlined /> DỒI DÀO
          </Tag>
        );
      },
    },
    {
      title: "Thao Tác",
      key: "actions",
      width: 160,
      align: "right",
      render: (_: unknown, record: WarehouseItem) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setInwardForm({
                sku: record.sku,
                qty: record.minThreshold * 2,
                unitPrice: record.costPrice,
                supplier: record.supplier,
                note: `Nhập bổ sung cho mặt hàng ${record.name}`,
              });
              setInwardModalVisible(true);
            }}
            className="!text-[11px] !h-8 !px-2.5 !rounded-xl !border-emerald-300 !text-emerald-700 hover:!bg-emerald-50 font-bold"
          >
            Nhập Thêm
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOutwardForm({
                sku: record.sku,
                qty: 1,
                target: "Quầy Bar & POS Bida",
                note: `Xuất mặt hàng ${record.name}`,
              });
              setOutwardModalVisible(true);
            }}
            className="!text-[11px] !h-8 !px-2.5 !rounded-xl !bg-slate-100 hover:!bg-slate-200 !text-slate-700"
          >
            Xuất Kho
          </Button>
        </div>
      ),
    },
  ];

  // Slips Table Columns
  const slipColumns: TableColumnsType<InventorySlip> = [
    {
      title: "Mã Phiếu",
      dataIndex: "slipCode",
      key: "slipCode",
      width: 140,
      render: (code: string) => (
        <span className="font-mono font-black text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {code}
        </span>
      ),
    },
    {
      title: "Thời Gian",
      key: "time",
      width: 150,
      render: (_: unknown, record: InventorySlip) => (
        <span className="text-xs text-slate-600">
          {record.date} • {record.createdTime}
        </span>
      ),
    },
    {
      title: "Đối Tác / Địa Điểm Cấp Phát",
      dataIndex: "partnerOrTarget",
      key: "partnerOrTarget",
      render: (partner: string, record: InventorySlip) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{partner}</span>
          <span className="text-[11px] text-slate-400">Người lập: {record.creator}</span>
        </div>
      ),
    },
    {
      title: "Tổng Giá Trị",
      dataIndex: "totalValue",
      key: "totalValue",
      width: 150,
      render: (val: number, record: InventorySlip) => (
        <span
          className={`font-mono font-black text-sm ${
            record.type === "inward" ? "text-emerald-700" : "text-blue-700"
          }`}
        >
          {record.type === "inward" ? "+" : "-"}
          {val.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: "Trạng Thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      align: "center",
      render: (status: string) => (
        <Tag color={status === "completed" ? "green" : "gold"} className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold">
          {status === "completed" ? "ĐÃ HOÀN TẤT" : "CHỜ DUYỆT"}
        </Tag>
      ),
    },
    {
      title: "Chi Tiết",
      key: "action",
      width: 100,
      align: "right",
      render: (_: unknown, record: InventorySlip) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedSlip(record)}
          leftIcon={<EyeOutlined />}
          className="!rounded-xl !text-xs !h-8 !border-slate-300"
        >
          Xem
        </Button>
      ),
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
                Quản Lý Tổng Kho & Vật Tư Thiết Bị Bida
              </Title>
              <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black">
                CUEZONE CENTRAL WAREHOUSE
              </Tag>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 max-w-2xl block">
              Kiểm soát vật tư bida chuyên dụng (cơ Predator, nỉ Simonis, bóng Aramith), đồ uống F&B lưu kho, lịch sử phiếu nhập xuất và biên bản kiểm kê cân bằng kho.
            </Text>
          </div>

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
              variant="outline"
              size="md"
              leftIcon={<ArrowUpOutlined />}
              onClick={() => setOutwardModalVisible(true)}
              className="!rounded-xl !text-xs font-bold !text-slate-700"
            >
              Lập Phiếu Xuất
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<ArrowDownOutlined />}
              onClick={() => setInwardModalVisible(true)}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold shadow-sm"
            >
              Tạo Phiếu Nhập Kho
            </Button>
          </div>
        </div>

        {/* Counter KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 relative z-10">
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Tổng giá trị tài sản kho
              </span>
              <span className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 text-xs border border-slate-200">
                <DollarOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                {metrics.totalValue.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
                Mặt hàng lưu kho
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs border border-emerald-200">
                <InboxOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">
                {metrics.totalItems}
              </span>
              <span className="text-xs font-semibold text-emerald-700">mã SKU vật tư</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">
                Chạm ngưỡng an toàn
              </span>
              <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs border border-amber-200">
                <WarningOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">
                {metrics.lowStockCount}
              </span>
              <span className="text-xs font-semibold text-amber-700">cần đặt thêm</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-blue-800 font-semibold uppercase tracking-wider">
                Phiếu nhập / xuất
              </span>
              <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 text-xs border border-blue-200">
                <FileTextOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-blue-800 tracking-tight">
                {metrics.totalSlips}
              </span>
              <span className="text-xs font-semibold text-blue-700">chứng từ hoàn tất</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN TABS SWITCHER ────────────────────────────────────────────── */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
        <SegmentedPillList
          items={mainPills}
          activeKey={activeTab}
          onSelect={(key) => setActiveTab(key)}
        />
      </div>

      {/* ── TAB 1: TỒN KHO VẬT TƯ & THIẾT BỊ ───────────────────────────────── */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* Sub Filters */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                className="!w-44 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả nhóm vật tư" },
                  { value: "equipment", label: "Cơ & Phụ kiện bida" },
                  { value: "table_supplies", label: "Vật tư bàn bida" },
                  { value: "beverage", label: "Đồ uống lưu kho" },
                  { value: "ingredients", label: "Nguyên liệu pha chế" },
                  { value: "maintenance", label: "Bảo dưỡng & Vệ sinh" },
                ]}
              />

              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                className="!w-40 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "in_stock", label: "Còn dồi dào" },
                  { value: "low_stock", label: "Sắp hết hàng" },
                  { value: "out_of_stock", label: "Hết hàng" },
                ]}
              />
            </div>

            <div className="w-full sm:w-72">
              <Input
                placeholder="Tìm mã SKU, tên vật tư, vị trí..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="!rounded-xl !h-10 text-xs"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <Table<WarehouseItem>
              columns={stockColumns}
              dataSource={filteredStock}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total, range) =>
                  `Hiển thị ${range[0]}-${range[1]} trên tổng số ${total} vật tư`,
                className: "!px-4 !py-3",
              }}
            />
          </div>
        </div>
      )}

      {/* ── TAB 2: LỊCH SỬ PHIẾU NHẬP KHO ──────────────────────────────────── */}
      {activeTab === "inward" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Nhật Ký Phiếu Nhập Kho Hàng Hóa
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Toàn bộ các đợt nhập hàng từ nhà phân phối và đối tác chính hãng
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusOutlined />}
              onClick={() => setInwardModalVisible(true)}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold"
            >
              + Tạo Phiếu Nhập Mới
            </Button>
          </div>

          <Table<InventorySlip>
            columns={slipColumns}
            dataSource={slipsList.filter((s) => s.type === "inward")}
            rowKey="id"
            pagination={{ pageSize: 8, className: "!px-4 !py-3" }}
          />
        </div>
      )}

      {/* ── TAB 3: PHIẾU XUẤT KHO & CẤP PHÁT ───────────────────────────────── */}
      {activeTab === "outward" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Nhật Ký Phiếu Xuất Kho & Cấp Phát Bàn Bida
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Ghi nhận vật tư xuất thay nỉ bàn đấu, cấp quầy bar POS và bảo trì phụ kiện
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusOutlined />}
              onClick={() => setOutwardModalVisible(true)}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold"
            >
              + Lập Phiếu Xuất Mới
            </Button>
          </div>

          <Table<InventorySlip>
            columns={slipColumns}
            dataSource={slipsList.filter((s) => s.type === "outward")}
            rowKey="id"
            pagination={{ pageSize: 8, className: "!px-4 !py-3" }}
          />
        </div>
      )}

      {/* ── TAB 4: KIỂM KÊ & CÂN BẰNG KHO ──────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Kiểm Kê Kho Định Kỳ & Cân Bằng Tồn Thực Tế
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Đối chiếu số lượng tồn trên phần mềm với số lượng kiểm đếm thực tế tại kệ kho
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              leftIcon={<FileDoneOutlined />}
              onClick={() =>
                message.success(
                  "Đã hoàn thành kiểm kê và cân bằng tồn kho! Dữ liệu đã được chốt sổ tháng."
                )
              }
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold text-xs"
            >
              Chốt Biên Bản Cân Bằng Kho
            </Button>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <div>
              <strong>Đợt kiểm kê gần nhất:</strong> Ngày 01/10/2026 bởi Thủ kho Nguyễn Văn Nam.
            </div>
            <Tag color="green" className="!rounded-full !font-bold">
              TỶ LỆ KHỚP SỔ SÁCH: 98.5%
            </Tag>
          </div>

          {/* Audit List */}
          <div className="space-y-3">
            {stockList.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:border-slate-300 transition-all shadow-2xs"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500 block">
                    {item.sku} • {item.location}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div className="text-center">
                    <span className="text-slate-400 block text-[11px]">Tồn sổ sách</span>
                    <strong className="text-slate-700 text-sm">
                      {item.stockQty} {item.unit}
                    </strong>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-400 block text-[11px]">Kiểm đếm thực tế</span>
                    <strong className="text-emerald-700 text-sm">
                      {item.stockQty} {item.unit}
                    </strong>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-400 block text-[11px]">Chênh lệch</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                      0 (Khớp)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL: TẠO PHIẾU NHẬP KHO ──────────────────────────────────────── */}
      <Modal
        open={inwardModalVisible}
        onCancel={() => setInwardModalVisible(false)}
        footer={null}
        width={580}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ArrowDownOutlined className="text-emerald-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Lập Phiếu Nhập Kho Hàng Hóa Mới
            </span>
          </div>
        }
      >
        <div className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn mặt hàng / vật tư nhập:
            </label>
            <Select
              value={inwardForm.sku}
              onChange={(val) => {
                const target = stockList.find((i) => i.sku === val);
                setInwardForm((prev) => ({
                  ...prev,
                  sku: val,
                  unitPrice: target?.costPrice || 0,
                  supplier: target?.supplier || prev.supplier,
                }));
              }}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={stockList.map((i) => ({
                value: i.sku,
                label: `${i.sku} - ${i.name} (Tồn hiện có: ${i.stockQty} ${i.unit})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số lượng nhập:
              </label>
              <Input
                type="number"
                value={inwardForm.qty}
                onChange={(e) =>
                  setInwardForm((prev) => ({
                    ...prev,
                    qty: parseInt(e.target.value) || 0,
                  }))
                }
                className="!h-10 !rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đơn giá vốn nhập (VNĐ):
              </label>
              <Input
                type="number"
                value={inwardForm.unitPrice}
                onChange={(e) =>
                  setInwardForm((prev) => ({
                    ...prev,
                    unitPrice: parseInt(e.target.value) || 0,
                  }))
                }
                className="!h-10 !rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nhà cung cấp / Đối tác giao hàng:
            </label>
            <Input
              value={inwardForm.supplier}
              onChange={(e) =>
                setInwardForm((prev) => ({ ...prev, supplier: e.target.value }))
              }
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú nhập kho:
            </label>
            <Input
              value={inwardForm.note}
              onChange={(e) =>
                setInwardForm((prev) => ({ ...prev, note: e.target.value }))
              }
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs">
            <span className="font-semibold text-emerald-800">Tổng giá trị phiếu:</span>
            <span className="font-black text-emerald-900 text-base font-mono">
              {(inwardForm.qty * inwardForm.unitPrice).toLocaleString("vi-VN")}đ
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setInwardModalVisible(false)}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCreateInwardSlip}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs"
            >
              Xác Nhận Nhập Kho
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: TẠO PHIẾU XUẤT KHO ──────────────────────────────────────── */}
      <Modal
        open={outwardModalVisible}
        onCancel={() => setOutwardModalVisible(false)}
        footer={null}
        width={580}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ArrowUpOutlined className="text-blue-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Lập Phiếu Xuất Kho & Cấp Phát
            </span>
          </div>
        }
      >
        <div className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn mặt hàng xuất kho:
            </label>
            <Select
              value={outwardForm.sku}
              onChange={(val) => setOutwardForm((prev) => ({ ...prev, sku: val }))}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={stockList.map((i) => ({
                value: i.sku,
                label: `${i.sku} - ${i.name} (Còn tồn: ${i.stockQty} ${i.unit})`,
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Số lượng xuất:
            </label>
            <Input
              type="number"
              value={outwardForm.qty}
              onChange={(e) =>
                setOutwardForm((prev) => ({
                  ...prev,
                  qty: parseInt(e.target.value) || 0,
                }))
              }
              className="!h-10 !rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Địa điểm / Bộ phận tiếp nhận:
            </label>
            <Select
              value={outwardForm.target}
              onChange={(val) => setOutwardForm((prev) => ({ ...prev, target: val }))}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={[
                { value: "Quầy Bar & POS Bàn Bida", label: "Quầy Bar & POS Bàn Bida" },
                { value: "Bàn Match 13 (Khu vực VAR)", label: "Bàn Match 13 (Khu vực VAR)" },
                { value: "Bàn Match 14 (Khu vực VAR)", label: "Bàn Match 14 (Khu vực VAR)" },
                { value: "Tủ Cơ Cho Thuê Lễ Tân", label: "Tủ Cơ Cho Thuê Lễ Tân" },
                { value: "Bảo Dưỡng & Thay Nỉ Định Kỳ", label: "Bảo Dưỡng & Thay Nỉ Định Kỳ" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú xuất kho:
            </label>
            <Input
              value={outwardForm.note}
              onChange={(e) =>
                setOutwardForm((prev) => ({ ...prev, note: e.target.value }))
              }
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setOutwardModalVisible(false)}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCreateOutwardSlip}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs"
            >
              Xác Nhận Xuất Kho
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: CHI TIẾT PHIẾU ─────────────────────────────────────────── */}
      <Modal
        open={Boolean(selectedSlip)}
        onCancel={() => setSelectedSlip(null)}
        footer={null}
        width={600}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileTextOutlined className="text-emerald-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Chi Tiết Chứng Từ: {selectedSlip?.slipCode}
            </span>
          </div>
        }
      >
        {selectedSlip && (
          <div className="py-4 space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-slate-700">
              <div>
                Loại phiếu:{" "}
                <strong className={selectedSlip.type === "inward" ? "text-emerald-700" : "text-blue-700"}>
                  {selectedSlip.type === "inward" ? "PHIẾU NHẬP KHO" : "PHIẾU XUẤT KHO"}
                </strong>
              </div>
              <div>
                Ngày giờ: <strong>{selectedSlip.date} • {selectedSlip.createdTime}</strong>
              </div>
              <div>
                Người lập: <strong>{selectedSlip.creator}</strong>
              </div>
              <div>
                Đối tác / Bộ phận: <strong>{selectedSlip.partnerOrTarget}</strong>
              </div>
              <div className="col-span-2 text-slate-500">
                Ghi chú: <em>{selectedSlip.note || "Không có"}</em>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 text-xs block mb-2">
                Danh sách mặt hàng chứng từ:
              </span>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Mã SKU</th>
                      <th className="py-2.5 px-3">Tên Mặt Hàng</th>
                      <th className="py-2.5 px-3 text-center">Số Lượng</th>
                      <th className="py-2.5 px-3 text-right">Đơn Giá</th>
                      <th className="py-2.5 px-3 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSlip.details.map((d) => (
                      <tr key={d.sku}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                          {d.sku}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{d.name}</td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          {d.qty} {d.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {d.price.toLocaleString("vi-VN")}đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {d.subtotal.toLocaleString("vi-VN")}đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="font-bold text-slate-700">Tổng thanh toán chứng từ:</span>
              <span className="font-black text-emerald-800 text-lg font-mono">
                {selectedSlip.totalValue.toLocaleString("vi-VN")}đ
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => setSelectedSlip(null)}
                className="!bg-emerald-600 !rounded-xl !text-xs !font-bold"
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WarehouseInventoryPage;
