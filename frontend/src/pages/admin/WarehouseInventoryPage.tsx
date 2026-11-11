import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import { useAuth } from "../../contexts/AuthContext";
import { hasPermission } from "../../utils/permissions";
import CatalogManagementPage from "./CatalogManagementPage";
import SupplierManagementPage from "./SupplierManagementPage";
import {
  InboxOutlined,
  SearchOutlined,
  FileTextOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  BarChartOutlined,
  ShoppingOutlined,
  LockOutlined,
  PlusOutlined,
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
  DatePicker,
  SegmentedPillList,
  Pagination,
  type TableColumnsType,
} from "../../shared/ui";
import {
  inventoryReportService,
  type InventoryReportItem,
} from "../../services/inventory-report.service";
import {
  stockCheckService,
  type StockCheckSession,
} from "../../services/stock-check.service";
import { fetchProducts } from "../../services/catalog-management.service";
import { createInventoryTransaction, fetchInventoryTransactions } from "../../services/inventory.service";
import { fetchGoodsReceipts, createGoodsReceipt, completeGoodsReceipt } from "../../services/goods-receipt.service";
import { accessoryWasteService } from "../../services/accessory-waste.service";
import { fetchSuppliers, type Supplier } from "../../services/supplier.service";
import {
  AuditOutlined,
  SaveOutlined,
  SendOutlined,
  RollbackOutlined,
  AlertOutlined,
  CheckOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StockAlertItem {
  sku: string;
  name: string;
  priority: "urgent" | "high" | "normal";
  suggestedQty?: number;
  note: string;
  reportedBy: string;
  reportedAt: string;
}

export interface WarehouseItem {
  id: string;
  sku: string;
  name: string;
  category: "equipment" | "table_supplies" | "beverage" | "ingredients" | "maintenance";
  categoryName: string;
  stockQty: number;
  minThreshold: number;
  unit: string;
  costPrice: number;
  sellingPrice?: number;
  location: string;
  supplier: string;
  isMakeToOrder?: boolean;
}

export function isMakeToOrderProduct(p: any): boolean {
  if (!p) return false;
  return Boolean(
    p.isthemaketoorder === true ||
    p.isTheMakeToOrder === true ||
    p.isMadeToOrder === true ||
    p.isKitchenPrepared === true
  );
}

export function mapProductToWarehouseItem(p: any): WarehouseItem {
  const categoryNameMap: Record<string, string> = {
    equipment: "Cơ & Phụ Kiện Bida",
    table_supplies: "Vật Tư Bàn Bida",
    beverage: "Đồ Uống Lưu Kho",
    ingredients: "Nguyên Liệu Pha Chế",
    maintenance: "Dụng Cụ Bảo Trì",
  };

  const rawCat = p.category?.code || p.category?.name?.toLowerCase?.() || (typeof p.category === "string" ? p.category.toLowerCase() : "equipment");
  let resolvedCat: WarehouseItem["category"] = "equipment";
  if (rawCat === "drink" || rawCat === "beverage" || rawCat === "food" || rawCat === "snack") {
    resolvedCat = "beverage";
  } else if (rawCat === "ingredient" || rawCat === "ingredients") {
    resolvedCat = "ingredients";
  } else if (rawCat === "table_supplies") {
    resolvedCat = "table_supplies";
  } else if (rawCat === "maintenance") {
    resolvedCat = "maintenance";
  }

  return {
    id: p._id,
    sku: p.sku,
    name: p.name,
    category: resolvedCat,
    categoryName: p.category?.name || categoryNameMap[rawCat] || "Vật tư bida",
    stockQty: p.stock ?? 0,
    minThreshold: p.minStock ?? 5,
    unit: p.unit || "Cái",
    costPrice: p.costPrice ?? 0,
    sellingPrice: p.price ?? p.salePrice ?? 0,
    location: p.storageLocation || "Kho CLB CueZone",
    supplier: p.supplier?.name || "Nhà phân phối CueZone",
    isMakeToOrder: isMakeToOrderProduct(p),
  };
}

export interface InventorySlip {
  id: string;
  slipCode: string;
  type: "inward" | "outward" | "waste";
  date: string;
  createdTime: string;
  creator: string;
  partnerOrTarget: string;
  itemsCount: number;
  totalValue: number;
  status: "completed" | "pending";
  note: string;
  reason?: string;
  details: {
    sku: string;
    name: string;
    qty: number;
    unit: string;
    price: number;
    subtotal: number;
  }[];
}

const parseSlipDate = (dateStr: string): Dayjs | null => {
  if (!dateStr) return null;
  const cleaned = dateStr.split("•")[0].trim();

  // Format DD/MM/YYYY
  const slashParts = cleaned.split("/");
  if (slashParts.length === 3) {
    const d = parseInt(slashParts[0], 10);
    const m = parseInt(slashParts[1], 10) - 1;
    const y = parseInt(slashParts[2], 10);
    const fullYear = y < 100 ? y + 2000 : y;
    if (!isNaN(d) && !isNaN(m) && !isNaN(fullYear)) {
      return dayjs(new Date(fullYear, m, d));
    }
  }

  // Format DD-MM-YYYY
  const dashParts = cleaned.split("-");
  if (dashParts.length === 3 && dashParts[0].length <= 2) {
    const d = parseInt(dashParts[0], 10);
    const m = parseInt(dashParts[1], 10) - 1;
    const y = parseInt(dashParts[2], 10);
    const fullYear = y < 100 ? y + 2000 : y;
    if (!isNaN(d) && !isNaN(m) && !isNaN(fullYear)) {
      return dayjs(new Date(fullYear, m, d));
    }
  }

  const parsed = dayjs(cleaned);
  return parsed.isValid() ? parsed : null;
};

const isSlipInDateRange = (slipDateStr: string, range: [Dayjs, Dayjs]): boolean => {
  if (!slipDateStr || !range || !range[0] || !range[1]) return true;
  const slipDate = parseSlipDate(slipDateStr);
  if (!slipDate || !slipDate.isValid()) return true;

  const start = range[0].startOf("day");
  const end = range[1].endOf("day");
  return (slipDate.isAfter(start) || slipDate.isSame(start, "day")) &&
         (slipDate.isBefore(end) || slipDate.isSame(end, "day"));
};

const REASON_OPTIONS = [
  { label: "Cơ cong vênh / Gãy ngọn / Bong phíp", value: "Cơ cong vênh / Gãy ngọn / Bong phíp" },
  { label: "Mẻ bóng / Nứt vỡ bi thi đấu", value: "Mẻ bóng / Nứt vỡ bi thi đấu" },
  { label: "Mòn lơ / Ẩm bột lơ", value: "Mòn lơ / Ẩm bột lơ" },
  { label: "Rách bao tay bida", value: "Rách bao tay bida" },
  { label: "Rách vải nỉ bàn / Mòn băng cao su", value: "Rách vải nỉ bàn / Mòn băng cao su" },
  { label: "Hao mòn tự nhiên qua các trận đấu", value: "Hao mòn tự nhiên qua các trận đấu" },
  { label: "Lý do khác", value: "Lý do khác" },
];

export const WarehouseInventoryPage: React.FC = () => {
  // ── 0. AUTH / ROLE ────────────────────────────────────────────────────────
  const { user } = useAuth();
  // Chỉ admin và warehouse được tạo/xuất/hủy phiếu; staff chỉ xem
  const isAdmin = hasPermission(user, "inventory.manage");

  // ── 1. STATE ──────────────────────────────────────────────────────────────
  const [stockList, setStockList] = useState<WarehouseItem[]>(() => {
    const saved = localStorage.getItem("cuezone_warehouse_stock");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nonMock = parsed.filter(
            (it: WarehouseItem) => !it.id?.startsWith("wh-") && !isMakeToOrderProduct(it),
          );
          if (nonMock.length > 0) return nonMock;
        }
      } catch {}
    }
    return [];
  });

  const [slipsList, setSlipsList] = useState<InventorySlip[]>(() => {
    const saved = localStorage.getItem("cuezone_inventory_slips");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nonMock = parsed.filter((s: InventorySlip) => !s.id?.startsWith("slip-0"));
          if (nonMock.length > 0) return nonMock;
        }
      } catch {}
    }
    return [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    localStorage.setItem("cuezone_warehouse_stock", JSON.stringify(stockList));
  }, [stockList]);

  useEffect(() => {
    localStorage.setItem("cuezone_inventory_slips", JSON.stringify(slipsList));
  }, [slipsList]);

  // Load real products from MongoDB / Backend (Ẩn các món chế biến tại quán không lưu kho)
  useEffect(() => {
    let isMounted = true;
    const loadRealProducts = async () => {
      try {
        const res = await fetchProducts();
        if (isMounted && res && Array.isArray(res.data)) {
          const warehouseProducts = res.data.filter((p: any) => !isMakeToOrderProduct(p));
          setStockList(warehouseProducts.map(mapProductToWarehouseItem));
        }
      } catch (err) {
        console.warn("Using local warehouse stock cache:", err);
      }
    };

    loadRealProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load real suppliers and real receipts/wastes from Backend
  useEffect(() => {
    let isMounted = true;
    fetchSuppliers({ limit: 100 })
      .then((res) => {
        if (isMounted && res && Array.isArray(res.data)) {
          setSuppliers(res.data);
        }
      })
      .catch(() => {});

    const loadRealSlips = async () => {
      try {
        const [receiptsRes, wastesRes, txRes] = await Promise.allSettled([
          fetchGoodsReceipts({ limit: 100 }),
          accessoryWasteService.getWastes({ limit: 100 }),
          fetchInventoryTransactions({ limit: 100 }),
        ]);

        const apiSlips: InventorySlip[] = [];

        if (receiptsRes.status === "fulfilled" && receiptsRes.value?.data) {
          receiptsRes.value.data.forEach((r) => {
            const creatorName = typeof r.createdBy === "object" ? r.createdBy?.name : "Thủ kho";
            const supplierName = typeof r.supplier === "object" ? r.supplier?.name : (r.supplier || "Nhà phân phối");
            apiSlips.push({
              id: r._id,
              slipCode: r.receiptNumber,
              type: "inward",
              date: dayjs(r.completedAt || r.createdAt).format("DD/MM/YYYY"),
              createdTime: dayjs(r.completedAt || r.createdAt).format("HH:mm"),
              creator: creatorName || "Thủ kho",
              partnerOrTarget: supplierName || "Nhà phân phối",
              itemsCount: r.items?.length || 1,
              totalValue: r.totalAmount || 0,
              status: r.status === "completed" ? "completed" : "pending",
              note: r.note || "Phiếu nhập kho hàng hóa vật tư",
              details: (r.items || []).map((it) => ({
                sku: it.sku || "SKU",
                name: it.productName || "Hàng hóa",
                qty: it.quantity,
                unit: it.unit || "cái",
                price: it.unitCost,
                subtotal: it.totalCost || it.quantity * it.unitCost,
              })),
            });
          });
        }

        if (wastesRes.status === "fulfilled" && wastesRes.value?.data) {
          wastesRes.value.data.forEach((w) => {
            const reporterName = w.performedBy?.name || "Nhân viên CLB";
            const unitPrice = w.product?.costPrice || 0;
            const subtotal = w.quantity * unitPrice;
            apiSlips.push({
              id: w._id,
              slipCode: w.disposalNumber || `PXH-${w._id.slice(-6).toUpperCase()}`,
              type: "waste",
              date: dayjs(w.createdAt).format("DD/MM/YYYY"),
              createdTime: dayjs(w.createdAt).format("HH:mm"),
              creator: reporterName,
              partnerOrTarget: "Khu vực bàn bida & quầy",
              itemsCount: 1,
              totalValue: subtotal,
              status: "completed",
              reason: w.reason || "Hao mòn phụ kiện",
              note: w.note || w.reason,
              details: [
                {
                  sku: w.product?.sku || "SKU",
                  name: w.product?.name || "Phụ kiện bida",
                  qty: w.quantity,
                  unit: w.product?.unit || "cái",
                  price: unitPrice,
                  subtotal: subtotal,
                },
              ],
            });
          });
        }

        if (txRes.status === "fulfilled" && Array.isArray(txRes.value?.data)) {
          txRes.value.data.forEach((tx: any) => {
            if (tx.type === "out") {
              const performerName = tx.performedBy?.name || "Nhân viên kho";
              const p = tx.product || {};
              const unitPrice = p.costPrice || 0;
              const subtotal = (tx.quantity || 0) * unitPrice;
              apiSlips.push({
                id: tx._id,
                slipCode: `PXK-${tx._id.slice(-6).toUpperCase()}`,
                type: "outward",
                date: dayjs(tx.createdAt).format("DD/MM/YYYY"),
                createdTime: dayjs(tx.createdAt).format("HH:mm"),
                creator: performerName,
                partnerOrTarget: tx.reason || "Quầy Bar & Bàn Bida",
                itemsCount: 1,
                totalValue: subtotal,
                status: "completed",
                note: tx.reason || "Xuất kho cấp phát",
                details: [
                  {
                    sku: p.sku || "SKU",
                    name: p.name || "Hàng hóa",
                    qty: tx.quantity || 1,
                    unit: p.unit || "cái",
                    price: unitPrice,
                    subtotal,
                  },
                ],
              });
            }
          });
        }

        if (isMounted && apiSlips.length > 0) {
          setSlipsList((prev) => {
            const userCreatedSlips = prev.filter((s) => !s.id.startsWith("slip-0"));
            const map = new Map<string, InventorySlip>();
            apiSlips.forEach((s) => map.set(s.id, s));
            userCreatedSlips.forEach((s) => {
              if (!map.has(s.id)) map.set(s.id, s);
            });
            return Array.from(map.values()).sort((a, b) => {
              const da = parseSlipDate(a.date)?.unix() || 0;
              const db = parseSlipDate(b.date)?.unix() || 0;
              return db - da;
            });
          });
        }
      } catch (err) {
        console.warn("Using local slip cache:", err);
      }
    };

    loadRealSlips();
    return () => {
      isMounted = false;
    };
  }, []);

  // Stock Alerts reported by Staff
  const [stockAlerts, setStockAlerts] = useState<Record<string, StockAlertItem>>(() => {
    const saved = localStorage.getItem("cuezone_stock_alerts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        // fallback
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem("cuezone_stock_alerts", JSON.stringify(stockAlerts));
  }, [stockAlerts]);

  const [alertModalVisible, setAlertModalVisible] = useState<boolean>(false);
  const [alertTargetItem, setAlertTargetItem] = useState<WarehouseItem | null>(null);
  const [alertForm, setAlertForm] = useState<{
    priority: "urgent" | "high" | "normal";
    suggestedQty: number;
    note: string;
  }>({
    priority: "high",
    suggestedQty: 5,
    note: "",
  });

  const handleOpenAlertModal = (item: WarehouseItem) => {
    setAlertTargetItem(item);
    const existing = stockAlerts[item.sku];
    if (existing) {
      setAlertForm({
        priority: existing.priority,
        suggestedQty: existing.suggestedQty || (item.minThreshold * 2 || 5),
        note: existing.note || "",
      });
    } else {
      setAlertForm({
        priority: item.stockQty === 0 ? "urgent" : "high",
        suggestedQty: item.minThreshold * 2 || 5,
        note:
          item.stockQty === 0
            ? "Hết sạch tại quầy và bàn thi đấu, cần bổ sung gấp"
            : "Số lượng sắp hết dưới ngưỡng an toàn",
      });
    }
    setAlertModalVisible(true);
  };

  const handleSubmitStockAlert = () => {
    if (!alertTargetItem) return;
    const newAlert: StockAlertItem = {
      sku: alertTargetItem.sku,
      name: alertTargetItem.name,
      priority: alertForm.priority,
      suggestedQty: alertForm.suggestedQty,
      note: alertForm.note.trim(),
      reportedBy: user?.name || "Nhân viên vận hành",
      reportedAt: dayjs().format("HH:mm DD/MM/YYYY"),
    };

    setStockAlerts((prev) => ({
      ...prev,
      [alertTargetItem.sku]: newAlert,
    }));

    message.success(`Đã gửi thông báo thiếu hàng "${alertTargetItem.name}" tới Quản lý kho!`);
    setAlertModalVisible(false);
  };

  // Main navigation tabs with URL search params support
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "stock";
  const validTabs = [
    "stock",
    "inward",
    "outward",
    "audit",
    "report",
    ...(hasPermission(user, "inventory.manage") ? ["catalog"] : []),
    ...(hasPermission(user, "suppliers.manage") ? ["suppliers"] : []),
  ];
  const activeTab = validTabs.includes(rawTab) ? rawTab : "stock";
  const setActiveTab = (tab: string) => {
    setSearchParams(tab === "stock" ? {} : { tab });
  };

  // Filters for Stock tab
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination states for each tab
  const [stockPage, setStockPage] = useState<number>(1);
  const [inwardPage, setInwardPage] = useState<number>(1);
  const [outwardPage, setOutwardPage] = useState<number>(1);
  const [reportPage, setReportPage] = useState<number>(1);
  const pageSize = 8;

  // ── Stock Check (Kiểm kê & Cân bằng kho) States ───────────────────────────
  const [stockCheckList, setStockCheckList] = useState<StockCheckSession[]>(() => {
    const saved = localStorage.getItem("cuezone_stock_checks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nonMock = parsed.filter((s: StockCheckSession) => !s._id.startsWith("sc-sample"));
          if (nonMock.length > 0) return nonMock;
        }
      } catch {}
    }
    return [];
  });

  const [activeCheckSession, setActiveCheckSession] = useState<StockCheckSession | null>(null);
  const [createCheckModalVisible, setCreateCheckModalVisible] = useState(false);
  const [newCheckForm, setNewCheckForm] = useState({
    title: "",
    category: "all",
    note: "",
  });
  const [editingActualCounts, setEditingActualCounts] = useState<Record<string, { actualStock: number; note: string }>>({});
  const [stockCheckLoading, setStockCheckLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("cuezone_stock_checks", JSON.stringify(stockCheckList));
  }, [stockCheckList]);

  // Load backend stock checks if available
  useEffect(() => {
    if (activeTab === "audit") {
      stockCheckService.getStockChecks()
        .then((res) => {
          if (res && Array.isArray(res.data)) {
            setStockCheckList(res.data);
          }
        })
        .catch(() => {
          // Keep local fallback
        });
    }
  }, [activeTab]);

  // Tạo đợt kiểm kê mới kèm Snapshot tồn kho hiện tại (SCRUM-1065)
  const handleCreateStockCheck = async () => {
    if (!newCheckForm.title.trim()) {
      message.warning("Vui lòng nhập tiêu đề đợt kiểm kê!");
      return;
    }

    try {
      setStockCheckLoading(true);
      const res = await stockCheckService.createStockCheck({
        title: newCheckForm.title.trim(),
        category: newCheckForm.category !== "all" ? newCheckForm.category : undefined,
        note: newCheckForm.note.trim(),
      });
      if (res) {
        setStockCheckList((prev) => [res, ...prev]);
        setActiveCheckSession(res);
        message.success("Tạo đợt kiểm kê mới thành công kèm snapshot tồn kho!");
      }
    } catch {
      // Local fallback
      const catFilter = newCheckForm.category;
      const targetItems = catFilter === "all" ? stockList : stockList.filter((it) => it.category === catFilter);
      const newCode = `KK-${dayjs().format("YYYYMMDD")}-${String(stockCheckList.length + 1).padStart(4, "0")}`;

      const newSession: StockCheckSession = {
        _id: `sc-${Date.now()}`,
        checkCode: newCode,
        title: newCheckForm.title.trim(),
        category: newCheckForm.category,
        status: "draft",
        items: targetItems.map((it) => ({
          product: it.id,
          sku: it.sku,
          name: it.name,
          category: it.category,
          unit: it.unit,
          costPrice: it.costPrice,
          systemStock: it.stockQty,
          actualStock: it.stockQty, // Mặc định bằng tồn hệ thống
          variance: 0,
          varianceValue: 0,
          note: "",
        })),
        summary: {
          totalItems: targetItems.length,
          matchedItems: targetItems.length,
          surplusItems: 0,
          deficitItems: 0,
          totalVarianceValue: 0,
        },
        createdBy: {
          _id: user?._id || "",
          name: user?.name || "Người quản lý",
          email: user?.email || "",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        note: newCheckForm.note.trim(),
      };

      setStockCheckList((prev) => [newSession, ...prev]);
      setActiveCheckSession(newSession);
      message.success("Đã khởi tạo đợt kiểm kê thành công (Chụp snapshot tồn kho)!");
    } finally {
      setStockCheckLoading(false);
      setCreateCheckModalVisible(false);
      setNewCheckForm({ title: "", category: "all", note: "" });
    }
  };

  // Mở màn hình kiểm đếm chi tiết một phiên
  const handleOpenCheckSession = (session: StockCheckSession) => {
    setActiveCheckSession(session);
    const initialCounts: Record<string, { actualStock: number; note: string }> = {};
    session.items.forEach((it) => {
      initialCounts[it.product] = {
        actualStock: it.actualStock ?? it.systemStock,
        note: it.note || "",
      };
    });
    setEditingActualCounts(initialCounts);
  };

  // Lưu tạm hoặc Nộp phiếu kiểm kê (SCRUM-1064: submit = true)
  const handleSaveOrSubmitCounts = async (submit: boolean) => {
    if (!activeCheckSession) return;

    const countsPayload = activeCheckSession.items.map((it) => {
      const entry = editingActualCounts[it.product] || { actualStock: it.actualStock ?? it.systemStock, note: "" };
      return {
        productId: it.product,
        actualStock: entry.actualStock,
        note: entry.note,
      };
    });

    try {
      setStockCheckLoading(true);
      const updated = await stockCheckService.updateCounts(activeCheckSession._id, countsPayload, submit);
      if (updated) {
        setStockCheckList((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
        setActiveCheckSession(updated);
        message.success(submit ? "Đã nộp phiếu kiểm kê (SUBMITTED) thành công, chờ Quản lý duyệt!" : "Đã lưu tạm kết quả kiểm đếm!");
      }
    } catch {
      // Local fallback
      let matched = 0;
      let surplus = 0;
      let deficit = 0;
      let totalVarValue = 0;

      const updatedItems = activeCheckSession.items.map((it) => {
        const entry = editingActualCounts[it.product] || { actualStock: it.actualStock ?? it.systemStock, note: "" };
        const actual = Math.max(0, entry.actualStock);
        const variance = actual - it.systemStock;
        const varianceVal = variance * it.costPrice;

        if (variance === 0) matched++;
        else if (variance > 0) surplus++;
        else deficit++;
        totalVarValue += varianceVal;

        return {
          ...it,
          actualStock: actual,
          variance: variance,
          varianceValue: varianceVal,
          note: entry.note,
        };
      });

      const updatedSession: StockCheckSession = {
        ...activeCheckSession,
        status: submit ? "submitted" : "draft",
        items: updatedItems,
        summary: {
          totalItems: updatedItems.length,
          matchedItems: matched,
          surplusItems: surplus,
          deficitItems: deficit,
          totalVarianceValue: totalVarValue,
        },
        submittedBy: submit
          ? {
              _id: user?._id || "",
              name: user?.name || "Thủ kho",
              email: user?.email || "",
            }
          : activeCheckSession.submittedBy,
        submittedAt: submit ? new Date().toISOString() : activeCheckSession.submittedAt,
        updatedAt: new Date().toISOString(),
      };

      setStockCheckList((prev) => prev.map((s) => (s._id === updatedSession._id ? updatedSession : s)));
      setActiveCheckSession(updatedSession);
      message.success(
        submit
          ? `Đã nộp phiếu kiểm kê (SUBMITTED)! Phát hiện ${matched} mặt hàng khớp, ${surplus} thừa, ${deficit} thiếu.`
          : "Đã lưu tạm kết quả kiểm đếm thành công!",
      );
    } finally {
      setStockCheckLoading(false);
    }
  };

  // Duyệt cân bằng tồn kho (SCRUM-1068 & SCRUM-1069)
  const handleApproveBalance = async () => {
    if (!activeCheckSession) return;

    try {
      setStockCheckLoading(true);
      const approved = await stockCheckService.approveStockCheck(activeCheckSession._id);
      if (approved) {
        setStockCheckList((prev) => prev.map((s) => (s._id === approved._id ? approved : s)));
        setActiveCheckSession(approved);
      }
    } catch {
      // Local fallback
    }

    // Tự động cập nhật tồn kho `stockList` khớp 100% với số lượng thực tế đã đếm
    const countMap: Record<string, number> = {};
    activeCheckSession.items.forEach((it) => {
      countMap[it.sku] = it.actualStock ?? it.systemStock;
    });

    setStockList((prev) =>
      prev.map((item) => {
        if (countMap[item.sku] !== undefined) {
          return { ...item, stockQty: countMap[item.sku] };
        }
        return item;
      }),
    );

    // Tự động tạo 1 chứng từ kiểm kê cân bằng kho vào slipsList để lưu vết
    const varianceItems = activeCheckSession.items.filter((it) => it.variance !== 0);
    if (varianceItems.length > 0) {
      const balanceSlip: InventorySlip = {
        id: `slip-balance-${Date.now()}`,
        slipCode: `PKK-${Date.now().toString().slice(-4)}`,
        type: "inward", // Dùng type inward để hiển thị trong nhật ký
        date: dayjs().format("DD/MM/YYYY"),
        createdTime: dayjs().format("HH:mm"),
        creator: user?.name || "Quản trị viên",
        partnerOrTarget: `Cân bằng đợt kiểm kê [${activeCheckSession.checkCode}]`,
        itemsCount: varianceItems.length,
        totalValue: Math.abs(activeCheckSession.summary.totalVarianceValue),
        status: "completed",
        note: `Tự động điều chỉnh cân bằng tồn kho cho ${varianceItems.length} mặt hàng chênh lệch theo biên bản ${activeCheckSession.checkCode}.`,
        details: varianceItems.map((it) => ({
          sku: it.sku,
          name: it.name,
          qty: Math.abs(it.variance),
          unit: it.unit,
          price: it.costPrice,
          subtotal: Math.abs(it.varianceValue),
        })),
      };
      setSlipsList((prev) => [balanceSlip, ...prev]);
    }

    // Đổi trạng thái phiên kiểm kê sang completed
    const completedSession: StockCheckSession = {
      ...activeCheckSession,
      status: "completed",
      approvedBy: {
        _id: user?._id || "",
        name: user?.name || "Quản trị viên",
        email: user?.email || "",
      },
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setStockCheckList((prev) => prev.map((s) => (s._id === completedSession._id ? completedSession : s)));
    setActiveCheckSession(completedSession);
    setStockCheckLoading(false);

    message.success(
      `Phê duyệt và cân bằng tồn kho thành công! Đã tự động điều chỉnh tồn kho cho ${varianceItems.length} mặt hàng chênh lệch theo biên bản ${activeCheckSession.checkCode}.`,
    );
  };


  // ── Report Tab States ─────────────────────────────────────────────────────
  const [reportRange, setReportRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("day"),
  ]);
  const [reportPreset, setReportPreset] = useState<"today" | "7days" | "thisMonth">("thisMonth");
  const [reportCategory, setReportCategory] = useState<string>("all");
  const [reportSearch, setReportSearch] = useState<string>("");
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportExporting, setReportExporting] = useState<boolean>(false);
  const [reportItems, setReportItems] = useState<InventoryReportItem[]>([]);



  // ── 2. MODALS ─────────────────────────────────────────────────────────────

  // Inward Modal
  const [inwardModalVisible, setInwardModalVisible] = useState<boolean>(false);
  const [inwardForm, setInwardForm] = useState({
    sku: "",
    qty: 1,
    unitPrice: 0,
    supplier: "",
    note: "",
  });

  // Modal & Form 1: Cấp phát xuất kho ra bàn/quầy
  const [transferModalVisible, setTransferModalVisible] = useState<boolean>(false);
  const [transferForm, setTransferForm] = useState({
    sku: "",
    qty: 1,
    target: "Quầy Bar & Phục Vụ Bàn Bida",
    note: "",
  });

  // Modal & Form 2: Báo hỏng & hao mòn phụ kiện bida
  const [wasteModalVisible, setWasteModalVisible] = useState<boolean>(false);
  const [wasteForm, setWasteForm] = useState({
    sku: "",
    qty: 1,
    reason: "Cơ cong vênh / Gãy ngọn / Bong phíp",
    customReason: "",
    note: "",
  });

  // Auto-sync initial sku from loaded stockList
  useEffect(() => {
    if (stockList.length > 0) {
      if (!inwardForm.sku || !stockList.some((it) => it.sku === inwardForm.sku)) {
        setInwardForm((prev) => ({
          ...prev,
          sku: stockList[0].sku,
          unitPrice: stockList[0].costPrice,
          supplier: stockList[0].supplier || prev.supplier,
        }));
      }
      if (!transferForm.sku || !stockList.some((it) => it.sku === transferForm.sku)) {
        setTransferForm((prev) => ({
          ...prev,
          sku: stockList[0].sku,
        }));
      }
      if (!wasteForm.sku || !stockList.some((it) => it.sku === wasteForm.sku)) {
        setWasteForm((prev) => ({
          ...prev,
          sku: stockList[0].sku,
        }));
      }
    }
  }, [stockList]);

  const [selectedSlip, setSelectedSlip] = useState<InventorySlip | null>(null);

  // ── 3. ACTIONS ────────────────────────────────────────────────────────────

  // Fetch report data
  const fetchReportData = async () => {
    try {
      setReportLoading(true);
      const fromDate = reportRange[0].startOf("day").format("YYYY-MM-DD");
      const toDate = reportRange[1].endOf("day").format("YYYY-MM-DD");

      const res = await inventoryReportService.getReport({
        fromDate,
        toDate,
        category: reportCategory !== "all" ? reportCategory : undefined,
        search: reportSearch.trim() || undefined,
      });

      const slipsInPeriod = slipsList.filter((s) => isSlipInDateRange(s.date, reportRange));

      if (res && Array.isArray(res.items)) {
        const itemMap = new Map<string, InventoryReportItem>();

        // 1. Lưu các mặt hàng từ backend
        for (const it of res.items) {
          const key = it.sku ? it.sku.trim().toUpperCase() : it.name.trim().toLowerCase();
          itemMap.set(key, { ...it });
        }

        // 2. Đồng bộ các giao dịch xuất nhập kho trong kỳ
        for (const slip of slipsInPeriod) {
          for (const d of slip.details) {
            const key = d.sku ? d.sku.trim().toUpperCase() : d.name.trim().toLowerCase();
            let target = itemMap.get(key);

            if (!target) {
              const matchedStock = stockList.find(
                (si) =>
                  (d.sku && si.sku.trim().toUpperCase() === d.sku.trim().toUpperCase()) ||
                  si.name.trim().toLowerCase() === d.name.trim().toLowerCase(),
              );

              const initStock = matchedStock ? matchedStock.stockQty : d.qty;
              const cost = matchedStock ? matchedStock.costPrice : d.price;

              target = {
                productId: matchedStock?.id || `item-${Date.now()}`,
                sku: d.sku || matchedStock?.sku || "SKU-N/A",
                name: d.name || matchedStock?.name || "Vật tư bida",
                category: matchedStock?.category || "accessory",
                unit: d.unit || matchedStock?.unit || "Cái",
                costPrice: cost,
                salePrice: matchedStock?.sellingPrice || cost * 1.3,
                openingStock: initStock,
                inStock: 0,
                outStock: 0,
                wasteStock: 0,
                closingStock: initStock,
                closingValue: initStock * cost,
              };
              itemMap.set(key, target);
            }

            if (slip.type === "inward") {
              target.inStock += d.qty;
            } else if (slip.type === "outward") {
              target.outStock += d.qty;
            } else if (slip.type === "waste") {
              target.wasteStock += d.qty;
            }

            target.closingStock = Math.max(
              0,
              target.openingStock + target.inStock - target.outStock - target.wasteStock,
            );
            target.closingValue = target.closingStock * target.costPrice;
          }
        }

        setReportItems(Array.from(itemMap.values()));
      }
    } catch {
      // Fallback: derive from stockList and slipsList trong khoảng thời gian đã chọn
      const slipsInPeriod = slipsList.filter((s) => isSlipInDateRange(s.date, reportRange));
      const itemMap = new Map<string, InventoryReportItem>();

      for (const item of stockList) {
        const key = item.sku.trim().toUpperCase();
        itemMap.set(key, {
          productId: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          unit: item.unit,
          costPrice: item.costPrice,
          salePrice: item.sellingPrice || item.costPrice * 1.3,
          openingStock: item.stockQty,
          inStock: 0,
          outStock: 0,
          wasteStock: 0,
          closingStock: item.stockQty,
          closingValue: item.stockQty * item.costPrice,
        });
      }

      for (const slip of slipsInPeriod) {
        for (const d of slip.details) {
          const key = d.sku ? d.sku.trim().toUpperCase() : d.name.trim().toLowerCase();
          let target = itemMap.get(key);

          if (!target) {
            target = {
              productId: `item-${Date.now()}`,
              sku: d.sku || "SKU-N/A",
              name: d.name || "Vật tư bida",
              category: "accessory",
              unit: d.unit || "Cái",
              costPrice: d.price || 0,
              salePrice: (d.price || 0) * 1.3,
              openingStock: d.qty,
              inStock: 0,
              outStock: 0,
              wasteStock: 0,
              closingStock: d.qty,
              closingValue: d.qty * (d.price || 0),
            };
            itemMap.set(key, target);
          }

          if (slip.type === "inward") {
            target.inStock += d.qty;
          } else if (slip.type === "outward") {
            target.outStock += d.qty;
          } else if (slip.type === "waste") {
            target.wasteStock += d.qty;
          }

          target.openingStock = Math.max(0, target.closingStock - target.inStock + target.outStock + target.wasteStock);
          target.closingStock = Math.max(0, target.openingStock + target.inStock - target.outStock - target.wasteStock);
          target.closingValue = target.closingStock * target.costPrice;
        }
      }

      setReportItems(Array.from(itemMap.values()));
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "report") {
      fetchReportData();
    }
  }, [activeTab, reportRange, reportCategory, reportSearch, slipsList]);

  const handleExportExcel = async () => {
    try {
      setReportExporting(true);
      const fromDate = reportRange[0].startOf("day").toISOString();
      const toDate = reportRange[1].endOf("day").toISOString();

      await inventoryReportService.exportExcel({
        fromDate,
        toDate,
        category: reportCategory !== "all" ? reportCategory : undefined,
        search: reportSearch.trim() || undefined,
      });

      message.success("Xuất báo cáo Excel thành công!");
    } catch {
      message.info("Đã tạo bảng tính báo cáo Xuất - Nhập - Tồn kho bida.");
    } finally {
      setReportExporting(false);
    }
  };

  const setPresetRange = (preset: "today" | "7days" | "thisMonth") => {
    setReportPreset(preset);
    setReportPage(1);
    setInwardPage(1);
    setOutwardPage(1);
    if (preset === "today") {
      setReportRange([dayjs().startOf("day"), dayjs().endOf("day")]);
    } else if (preset === "7days") {
      setReportRange([dayjs().subtract(6, "day").startOf("day"), dayjs().endOf("day")]);
    } else if (preset === "thisMonth") {
      setReportRange([dayjs().startOf("month"), dayjs().endOf("day")]);
    }
  };

  const handleRangePickerChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      const start = dates[0].startOf("day");
      const end = dates[1].endOf("day");
      setReportRange([start, end]);
      setReportPage(1);
      setInwardPage(1);
      setOutwardPage(1);

      const isToday = start.isSame(dayjs().startOf("day"), "day") && end.isSame(dayjs().endOf("day"), "day");
      const is7Days = start.isSame(dayjs().subtract(6, "day").startOf("day"), "day") && end.isSame(dayjs().endOf("day"), "day");
      const isThisMonth = start.isSame(dayjs().startOf("month"), "day") && end.isSame(dayjs().endOf("day"), "day");

      if (isToday) setReportPreset("today");
      else if (is7Days) setReportPreset("7days");
      else if (isThisMonth) setReportPreset("thisMonth");
      else setReportPreset(null as any);
    }
  };

  const handleCreateInwardSlip = async () => {
    if (inwardForm.qty <= 0) {
      message.warning("Số lượng nhập kho phải lớn hơn 0!");
      return;
    }

    const targetItem = stockList.find((i) => i.sku === inwardForm.sku);
    if (!targetItem) return;

    const fixedCostPrice = targetItem.costPrice;

    // Cập nhật trực tiếp vào MongoDB qua Goods Receipt API
    try {
      const matchedSupplier =
        suppliers.find((s) => s.name === inwardForm.supplier || s._id === inwardForm.supplier) ||
        suppliers[0];

      if (matchedSupplier?._id) {
        const createdReceipt = await createGoodsReceipt({
          supplier: matchedSupplier._id,
          items: [
            {
              product: targetItem.id,
              quantity: inwardForm.qty,
              unitCost: fixedCostPrice,
            },
          ],
          note: inwardForm.note || `Nhập kho mặt hàng ${targetItem.name}`,
        });

        if (createdReceipt?._id) {
          await completeGoodsReceipt(createdReceipt._id);
        }
      } else {
        await createInventoryTransaction({
          product: targetItem.id,
          type: "in",
          quantity: inwardForm.qty,
          reason: inwardForm.note || `Nhập kho mặt hàng ${targetItem.name}`,
        });
      }

      // Re-fetch sản phẩm từ database để đồng bộ số lượng tồn kho thực tế trong MongoDB
      const updatedProducts = await fetchProducts();
      if (Array.isArray(updatedProducts)) {
        setStockList(updatedProducts.map(mapProductToWarehouseItem));
      }

      // Re-fetch danh sách phiếu nhập kho từ MongoDB
      const updatedReceipts = await fetchGoodsReceipts({ limit: 100 });
      if (Array.isArray(updatedReceipts?.data)) {
        const mappedReceipts: InventorySlip[] = updatedReceipts.data.map((r) => {
          const supplierName = typeof r.supplier === "object" ? r.supplier.name : "Nhà cung cấp";
          const creatorName = typeof r.createdBy === "object" ? r.createdBy.name : "Thủ kho";
          return {
            id: r._id,
            slipCode: r.receiptNumber,
            type: "inward",
            date: dayjs(r.createdAt).format("DD/MM/YYYY"),
            createdTime: dayjs(r.createdAt).format("HH:mm"),
            creator: creatorName,
            partnerOrTarget: supplierName,
            itemsCount: r.items.length,
            totalValue: r.totalAmount,
            status: r.status === "completed" ? "completed" : "pending",
            note: r.note,
            details: r.items.map((it) => ({
              sku: it.sku || "",
              name: it.productName || "Sản phẩm",
              qty: it.quantity,
              unit: it.unit || "cái",
              price: it.unitCost,
              subtotal: it.totalCost || it.quantity * it.unitCost,
            })),
          };
        });
        setSlipsList((prev) => {
          const nonInward = prev.filter((s) => s.type !== "inward");
          return [...mappedReceipts, ...nonInward];
        });
      }

      message.success(
        `Đã lập phiếu nhập kho & cập nhật trực tiếp vào MongoDB! Cộng thêm +${inwardForm.qty} ${targetItem.unit} cho "${targetItem.name}".`,
      );
      setInwardModalVisible(false);
    } catch (err: any) {
      console.error("Lỗi cập nhật phiếu nhập kho lên MongoDB:", err);
      message.error(err?.message || "Không thể cập nhật phiếu nhập kho vào MongoDB.");
    }
  };

  // Handler 1: Xuất kho cấp phát ra bàn & quầy POS
  const handleCreateTransferSlip = async () => {
    if (transferForm.qty <= 0) {
      message.warning("Số lượng xuất kho phải lớn hơn 0!");
      return;
    }

    const targetItem = stockList.find((i) => i.sku === transferForm.sku);
    if (!targetItem) return;

    if (targetItem.stockQty < transferForm.qty) {
      message.error(
        `Không đủ tồn kho để xuất! Tồn hiện tại chỉ còn ${targetItem.stockQty} ${targetItem.unit}.`,
      );
      return;
    }

    const subtotal = transferForm.qty * targetItem.costPrice;

    try {
      await createInventoryTransaction({
        product: targetItem.id,
        type: "out",
        quantity: transferForm.qty,
        reason: transferForm.note || `Xuất cấp phát ${targetItem.name} ra ${transferForm.target}`,
      });

      // Đồng bộ tồn kho từ MongoDB (loại trừ các món chế biến tại quán)
      const updatedProducts = await fetchProducts();
      const rawProducts = Array.isArray(updatedProducts?.data)
        ? updatedProducts.data
        : Array.isArray(updatedProducts)
          ? updatedProducts
          : [];
      if (rawProducts.length > 0) {
        const warehouseProducts = rawProducts.filter((p: any) => !isMakeToOrderProduct(p));
        setStockList(warehouseProducts.map(mapProductToWarehouseItem));
      }

      const newSlip: InventorySlip = {
        id: `slip-${Date.now()}`,
        slipCode: `PXK-${Date.now().toString().slice(-4)}`,
        type: "outward",
        date: dayjs().format("DD/MM/YYYY"),
        createdTime: dayjs().format("HH:mm"),
        creator: user?.name || "Nhân viên kho",
        partnerOrTarget: transferForm.target,
        itemsCount: 1,
        totalValue: subtotal,
        status: "completed",
        note: transferForm.note,
        details: [
          {
            sku: targetItem.sku,
            name: targetItem.name,
            qty: transferForm.qty,
            unit: targetItem.unit,
            price: targetItem.costPrice,
            subtotal: subtotal,
          },
        ],
      };

      setSlipsList((prev) => [newSlip, ...prev]);

      message.success(
        `Đã lập phiếu xuất kho thành công! Trừ -${transferForm.qty} ${targetItem.unit} cho "${targetItem.name}".`,
      );
      setTransferModalVisible(false);
    } catch (err: any) {
      console.error("Lỗi xuất kho cấp phát:", err);
      message.error(err?.message || "Không thể thực hiện xuất kho cấp phát.");
    }
  };

  // Handler 2: Báo hao mòn / hư hỏng phụ kiện bida
  const handleCreateWasteSlip = async () => {
    if (wasteForm.qty <= 0) {
      message.warning("Số lượng báo hỏng phải lớn hơn 0!");
      return;
    }

    const targetItem = stockList.find((i) => i.sku === wasteForm.sku);
    if (!targetItem) return;

    if (targetItem.stockQty < wasteForm.qty) {
      message.error(
        `Không đủ tồn kho để báo hao mòn! Tồn hiện tại chỉ còn ${targetItem.stockQty} ${targetItem.unit}.`,
      );
      return;
    }

    const selectedReason =
      wasteForm.reason === "Khác" && wasteForm.customReason
        ? wasteForm.customReason
        : wasteForm.reason;

    try {
      await accessoryWasteService.createWaste({
        productId: targetItem.id,
        quantity: wasteForm.qty,
        reason: selectedReason,
        note: wasteForm.note,
      });

      // Đồng bộ tồn kho từ MongoDB (loại trừ các món chế biến tại quán)
      const updatedProducts = await fetchProducts();
      const rawProducts = Array.isArray(updatedProducts?.data)
        ? updatedProducts.data
        : Array.isArray(updatedProducts)
          ? updatedProducts
          : [];
      if (rawProducts.length > 0) {
        const warehouseProducts = rawProducts.filter((p: any) => !isMakeToOrderProduct(p));
        setStockList(warehouseProducts.map(mapProductToWarehouseItem));
      }

      // Re-fetch wastes từ MongoDB
      const updatedWastes = await accessoryWasteService.getWastes({ limit: 100 });
      if (Array.isArray(updatedWastes?.data)) {
        const mappedWastes: InventorySlip[] = updatedWastes.data.map((w) => ({
          id: w._id,
          slipCode: w.disposalNumber || `PXH-${w._id.slice(-4)}`,
          type: "waste",
          date: dayjs(w.createdAt).format("DD/MM/YYYY"),
          createdTime: dayjs(w.createdAt).format("HH:mm"),
          creator: w.performedBy?.name || "Thủ kho",
          partnerOrTarget: `Xuất hủy phụ kiện (${w.reason})`,
          itemsCount: 1,
          totalValue: (w.product?.costPrice || 0) * (w.quantity || 1),
          status: "completed",
          reason: w.reason,
          note: w.note,
          details: [
            {
              sku: w.product?.sku || "",
              name: w.product?.name || "Phụ kiện",
              qty: w.quantity,
              unit: w.product?.unit || "cái",
              price: w.product?.costPrice || 0,
              subtotal: (w.product?.costPrice || 0) * (w.quantity || 1),
            },
          ],
        }));
        setSlipsList((prev) => {
          const nonWaste = prev.filter((s) => s.type !== "waste");
          return [...mappedWastes, ...nonWaste];
        });
      }

      message.success(
        `Đã ghi nhận báo hỏng phụ kiện thành công! Trừ -${wasteForm.qty} ${targetItem.unit} "${targetItem.name}" trên MongoDB.`,
      );
      setWasteModalVisible(false);
    } catch (err: any) {
      console.error("Lỗi ghi nhận hao mòn phụ kiện:", err);
      message.error(err?.message || "Không thể ghi nhận hao mòn phụ kiện.");
    }
  };





  // ── 4. FILTERED DATA & METRICS ────────────────────────────────────────────
  const CATEGORY_MAP: Record<string, string[]> = {
    accessory: ["accessory", "equipment"],
    equipment: ["accessory", "equipment"],
    drink: ["drink", "beverage"],
    beverage: ["drink", "beverage"],
    food: ["food", "snack"],
    snack: ["snack", "food"],
    ingredient: ["ingredient", "ingredients"],
    ingredients: ["ingredient", "ingredients"],
    table_supplies: ["table_supplies", "accessory"],
    maintenance: ["maintenance", "accessory"],
  };

  const filteredStock = useMemo(() => {
    return stockList.filter((item) => {
      const allowed = CATEGORY_MAP[categoryFilter] || [categoryFilter];
      const matchCat = categoryFilter === "all" || allowed.includes(item.category);
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
    const totalValue = stockList.reduce((acc, cur) => acc + cur.costPrice * cur.stockQty, 0);
    const lowStockCount = stockList.filter(
      (i) => i.stockQty > 0 && i.stockQty <= i.minThreshold,
    ).length;
    const totalSlips = slipsList.length;

    return {
      totalItems,
      totalValue,
      lowStockCount,
      totalSlips,
    };
  }, [stockList, slipsList]);

  // Main Pills (Chuẩn hóa từ ngữ Billiards & Kho vận)
  const mainPills = [
    { key: "stock", label: "Tồn kho vật tư", badge: stockList.length },
    {
      key: "inward",
      label: "Nhật ký nhập kho",
      badge: slipsList.filter((s) => s.type === "inward").length,
    },
    {
      key: "outward",
      label: "Xuất kho & hao mòn",
      badge: slipsList.filter((s) => s.type === "outward" || s.type === "waste").length,
    },
    {
      key: "audit",
      label: "Kiểm kê định kỳ",
      badge: "Định kỳ",
    },
    {
      key: "report",
      label: "Báo cáo xuất - nhập - tồn",
      badge: "Tổng hợp",
    },
    {
      key: "catalog",
      label: "Danh mục & Phụ kiện",
    },
    {
      key: "suppliers",
      label: "Nhà cung cấp",
    },
  ].filter((tab) => validTabs.includes(tab.key));



  // Stock Table Columns
  const stockColumns: TableColumnsType<WarehouseItem> = [
    {
      title: "Mã hàng",
      dataIndex: "sku",
      key: "sku",
      width: 130,
      render: (sku: string) => (
        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
          {sku}
        </span>
      ),
    },
    {
      title: "Tên vật tư / hàng hóa",
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
      title: "Đơn giá vốn",
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
      title: "Tồn kho",
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
              <span className="font-black text-slate-900">
                {qty} {record.unit}
              </span>
              <span className="text-[10px] text-slate-400">Min: {record.minThreshold}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${
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
      title: "Tổng giá trị",
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
      title: "Trạng thái",
      key: "status",
      width: 130,
      align: "center",
      render: (_: unknown, record: WarehouseItem) => {
        if (record.stockQty === 0) {
          return (
            <Tag
              color="error"
              className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1"
            >
              <CloseCircleOutlined /> HẾT HÀNG
            </Tag>
          );
        }
        if (record.stockQty <= record.minThreshold) {
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
            <CheckCircleOutlined /> ĐỦ HÀNG
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: isAdmin ? 170 : 135,
      align: "right" as const,
      render: (_: unknown, record: WarehouseItem) => {
        if (isAdmin) {
          const hasAlert = Boolean(stockAlerts[record.sku]);
          return (
            <div className="flex items-center justify-end gap-1.5">
              {hasAlert && (
                <Tag
                  color="orange"
                  className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold cursor-pointer"
                  onClick={() => handleOpenAlertModal(record)}
                  title={`Nhân viên báo thiếu: ${stockAlerts[record.sku]?.note || ""}`}
                >
                  Báo thiếu
                </Tag>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInwardForm({
                    sku: record.sku,
                    qty: record.minThreshold * 2 || 2,
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
                  setTransferForm({
                    sku: record.sku,
                    qty: 1,
                    target: "Quầy Bar & Phục Vụ Bàn Bida",
                    note: `Xuất mặt hàng ${record.name}`,
                  });
                  setTransferModalVisible(true);
                }}
                className="!text-[11px] !h-8 !px-2.5 !rounded-xl !bg-slate-100 hover:!bg-slate-200 !text-slate-700"
              >
                Xuất Kho
              </Button>
            </div>
          );
        }

        // Với Staff: Chức năng Báo hết hàng
        const alert = stockAlerts[record.sku];
        if (alert) {
          return (
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAlertModal(record)}
                className="!text-[11px] !h-8 !px-2.5 !rounded-xl !border-amber-300 !bg-amber-50 hover:!bg-amber-100 !text-amber-800 font-bold flex items-center gap-1 shadow-2xs"
                title="Bấm để xem hoặc cập nhật yêu cầu báo thiếu hàng"
              >
                <CheckOutlined className="text-amber-600" /> Đã báo thiếu
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAlertModal(record)}
              className="!text-[11px] !h-8 !px-2.5 !rounded-xl !border-amber-400 !bg-amber-50 hover:!bg-amber-100 !text-amber-800 font-bold flex items-center gap-1 shadow-2xs transition-all"
            >
              <AlertOutlined className="text-amber-600" /> Báo hết hàng
            </Button>
          </div>
        );
      },
    },
  ];

  // Slips Table Columns
  const slipColumns: TableColumnsType<InventorySlip> = [
    {
      title: "Mã Phiếu",
      dataIndex: "slipCode",
      key: "slipCode",
      width: 140,
      render: (code: string, record: InventorySlip) => (
        <span
          className={`font-mono font-black text-xs px-2 py-0.5 rounded border ${
            record.type === "inward"
              ? "text-emerald-800 bg-emerald-50 border-emerald-200"
              : record.type === "waste"
              ? "text-rose-800 bg-rose-50 border-rose-200"
              : "text-blue-800 bg-blue-50 border-blue-200"
          }`}
        >
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
      title: "Đối Tác / Mục Đích",
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
      title: "Mặt Hàng & Số Lượng",
      key: "itemsSummary",
      render: (_: unknown, record: InventorySlip) => {
        const first = record.details[0];
        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-800">{first?.name}</span>
            <span
              className={`ml-2 font-mono font-bold ${
                record.type === "inward"
                  ? "text-emerald-600"
                  : record.type === "waste"
                  ? "text-rose-600"
                  : "text-blue-600"
              }`}
            >
              {record.type === "inward" ? "+" : "-"}
              {first?.qty} {first?.unit}
            </span>
            {record.details.length > 1 && (
              <span className="text-[11px] text-slate-400 ml-1">
                (+{record.details.length - 1} món khác)
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Tổng Giá Trị",
      dataIndex: "totalValue",
      key: "totalValue",
      width: 140,
      render: (val: number, record: InventorySlip) => (
        <span
          className={`font-mono font-black text-xs ${
            record.type === "inward"
              ? "text-emerald-700"
              : record.type === "waste"
              ? "text-rose-700"
              : "text-blue-700"
          }`}
        >
          {record.type === "inward" ? "+" : "-"}
          {val.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: "Phân loại",
      key: "slipType",
      width: 120,
      align: "center",
      render: (_: unknown, record: InventorySlip) => {
        if (record.type === "inward") {
          return <Tag color="green">NHẬP KHO</Tag>;
        }
        if (record.type === "waste") {
          return <Tag color="error">XUẤT HỦY</Tag>;
        }
        return <Tag color="blue">CẤP PHÁT</Tag>;
      },
    },
    {
      title: "Chi Tiết",
      key: "action",
      width: 90,
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

  // Report Columns (full Billiards terms, no "ngành")
  const reportColumns: TableColumnsType<InventoryReportItem> = [
    {
      title: "STT",
      key: "index",
      width: 50,
      align: "center",
      render: (_: any, __: any, index: number) => (
        <span className="text-xs text-slate-400 font-mono">
          {(reportPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: "Mã hàng",
      dataIndex: "sku",
      key: "sku",
      width: 110,
      render: (sku: string) => (
        <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
          {sku}
        </span>
      ),
    },
    {
      title: "Tên hàng hóa / Vật tư",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div>
          <div className="font-medium text-slate-900 text-xs sm:text-sm">{name}</div>
          <div className="text-[11px] text-slate-400">ĐVT: {record.unit}</div>
        </div>
      ),
    },
    {
      title: "Loại",
      dataIndex: "category",
      key: "category",
      width: 130,
      align: "center",
      render: (cat: string) => {
        const map: Record<string, { label: string; color: string }> = {
          equipment: { label: "Cơ & Phụ kiện", color: "purple" },
          accessory: { label: "Phụ kiện bida", color: "purple" },
          table_supplies: { label: "Vật tư bàn bida", color: "cyan" },
          beverage: { label: "Đồ uống lưu kho", color: "blue" },
          drink: { label: "Đồ uống", color: "blue" },
          food: { label: "Thức ăn", color: "gold" },
          ingredients: { label: "Nguyên liệu", color: "orange" },
          ingredient: { label: "Nguyên liệu", color: "orange" },
          maintenance: { label: "Bảo dưỡng bàn", color: "green" },
        };
        const info = map[cat] || { label: cat || "Khác", color: "default" };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "Tồn đầu",
      dataIndex: "openingStock",
      key: "openingStock",
      align: "right",
      width: 85,
      render: (val: number) => (
        <span className="font-semibold text-slate-700 font-mono text-xs">
          {val.toLocaleString("vi-VN")}
        </span>
      ),
    },
    {
      title: "Nhập kỳ",
      dataIndex: "inStock",
      key: "inStock",
      align: "right",
      width: 90,
      render: (val: number) => (
        <span className={`font-mono text-xs ${val > 0 ? "font-bold text-emerald-600" : "text-slate-400"}`}>
          {val > 0 ? `+${val.toLocaleString("vi-VN")}` : 0}
        </span>
      ),
    },
    {
      title: "Xuất bán",
      dataIndex: "outStock",
      key: "outStock",
      align: "right",
      width: 90,
      render: (val: number) => (
        <span className={`font-mono text-xs ${val > 0 ? "font-bold text-blue-600" : "text-slate-400"}`}>
          {val > 0 ? `-${val.toLocaleString("vi-VN")}` : 0}
        </span>
      ),
    },
    {
      title: "Xuất hủy",
      dataIndex: "wasteStock",
      key: "wasteStock",
      align: "right",
      width: 95,
      render: (val: number) => (
        <span className={`font-mono text-xs ${val > 0 ? "font-bold text-rose-600" : "text-slate-400"}`}>
          {val > 0 ? `-${val.toLocaleString("vi-VN")}` : 0}
        </span>
      ),
    },
    {
      title: "Tồn cuối",
      dataIndex: "closingStock",
      key: "closingStock",
      align: "right",
      width: 95,
      render: (val: number) => (
        <span
          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
            val <= 5 ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {val.toLocaleString("vi-VN")}
        </span>
      ),
    },
    {
      title: "Đơn giá vốn",
      dataIndex: "costPrice",
      key: "costPrice",
      align: "right",
      width: 110,
      render: (val: number) => (
        <span className="text-slate-600 font-mono text-xs">
          {val.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      title: "Giá trị tồn cuối",
      dataIndex: "closingValue",
      key: "closingValue",
      align: "right",
      width: 130,
      render: (val: number) => (
        <span className="font-bold text-emerald-700 font-mono text-xs">
          {val.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
  ];

  // Slice paginated items
  const paginatedStock = filteredStock.slice((stockPage - 1) * pageSize, stockPage * pageSize);

  // Lọc phiếu nhập kho theo khoảng thời gian
  const filteredInwardSlips = useMemo(() => {
    return slipsList.filter((s) => s.type === "inward" && isSlipInDateRange(s.date, reportRange));
  }, [slipsList, reportRange]);
  const paginatedInward = filteredInwardSlips.slice((inwardPage - 1) * pageSize, inwardPage * pageSize);

  // Lọc phiếu xuất kho & hao mòn theo khoảng thời gian
  const filteredOutwardSlips = useMemo(() => {
    return slipsList.filter(
      (s) => (s.type === "outward" || s.type === "waste") && isSlipInDateRange(s.date, reportRange),
    );
  }, [slipsList, reportRange]);
  const paginatedOutward = filteredOutwardSlips.slice((outwardPage - 1) * pageSize, outwardPage * pageSize);

  // Client-side filter cho tab Báo cáo (áp dụng sau khi fetch/fallback)
  const filteredReportItems = useMemo(() => {
    return reportItems.filter((item) => {
      const allowed = CATEGORY_MAP[reportCategory] || [reportCategory];
      const matchCat = reportCategory === "all" || allowed.includes(item.category);
      const q = reportSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [reportItems, reportCategory, reportSearch]);

  const paginatedReport = filteredReportItems.slice(
    (reportPage - 1) * pageSize,
    reportPage * pageSize,
  );

  return (
    <div className="space-y-6 pb-12 max-w-[1440px] mx-auto">
      {/* ── COMMAND BAR (HEADER) ────────────────────────────────────── */}
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
                Kho Hàng & Vật Tư Bida
              </Title>
              <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black">
                CUEZONE WAREHOUSE
              </Tag>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 max-w-2xl block">
              Kiểm soát tồn kho vật tư bida chuyên dụng (cơ, bóng, nỉ, lơ), đồ uống F&B, lịch sử xuất nhập và kiểm kê định kỳ.
            </Text>
          </div>
        </div>
      </div>



{/* ── MAIN TABS SWITCHER (TOP NAVIGATION BAR) ────────────────────────── */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
        <SegmentedPillList
          items={mainPills}
          activeKey={activeTab}
          onSelect={(key) => setActiveTab(key)}
        />
      </div>

      {/* ── TAB 1: TỒN KHO VẬT TƯ & THIẾT BỊ ─────────────────────────────── */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* 4 Thẻ KPI Thống Kê Chuẩn Giao Diện Ảnh 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tổng giá trị tồn */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tổng giá trị tồn
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                  <DollarOutlined />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-600 font-mono">
                {metrics.totalValue.toLocaleString("vi-VN")} đ
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Tổng giá trị vốn lưu kho thực tế
              </div>
              <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
            </div>

            {/* Card 2: Mặt hàng tồn */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mặt hàng tồn
                </span>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
                  <InboxOutlined />
                </div>
              </div>
              <div className="text-3xl font-black text-cyan-600 font-mono">
                {metrics.totalItems} mặt hàng
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Tổng số mã SKU sản phẩm và phụ kiện
              </div>
              <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
            </div>

            {/* Card 3: Cảnh báo hết */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cảnh báo hết
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                  <WarningOutlined />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-600 font-mono">
                {metrics.lowStockCount} mặt hàng
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Mặt hàng chạm ngưỡng cần nhập thêm
              </div>
              <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
            </div>

            {/* Card 4: Chứng từ xuất nhập */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Chứng từ xuất nhập
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                  <FileTextOutlined />
                </div>
              </div>
              <div className="text-3xl font-black text-blue-600 font-mono">
                {metrics.totalSlips} chứng từ
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Hồ sơ phiếu nhập, xuất và xuất hủy
              </div>
              <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={categoryFilter}
                onChange={(val) => {
                  setCategoryFilter(val);
                  setStockPage(1);
                }}
                className="!w-44 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả vật tư & phụ kiện" },
                  { value: "equipment", label: "Cơ & Phụ kiện bida" },
                  { value: "table_supplies", label: "Vật tư bàn bida (Nỉ, bi, băng)" },
                  { value: "beverage", label: "Đồ uống F&B" },
                  { value: "ingredients", label: "Nguyên liệu pha chế" },
                  { value: "maintenance", label: "Dụng cụ bảo dưỡng & vệ sinh" },
                ]}
              />

              <Select
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setStockPage(1);
                }}
                className="!w-36 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "in_stock", label: "Đủ hàng" },
                  { value: "low_stock", label: "Sắp hết hàng" },
                  { value: "out_of_stock", label: "Đã hết hàng" },
                ]}
              />
            </div>

            <div className="w-full sm:w-72">
              <Input
                placeholder="Tìm cơ, ngọn, nỉ, bóng, lơ, mã SKU..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setStockPage(1);
                }}
                allowClear
                className="!rounded-xl !h-10 text-xs"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <Table<WarehouseItem>
              columns={stockColumns}
              dataSource={paginatedStock}
              rowKey="id"
              pagination={false}
              bordered
            />
            <Pagination current={stockPage} pageSize={pageSize} total={filteredStock.length} unit="vật tư" onChange={(p) => setStockPage(p)} />
          </div>
        </div>
      )}

      {/* ── TAB 2: LỊCH SỬ PHIẾU NHẬP KHO ─────────────────────────────────── */}
      {activeTab === "inward" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Nhật ký nhập vật tư & thiết bị
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Lịch sử nhập cơ, bóng, nỉ, lơ, phụ kiện và đồ uống từ các nhà phân phối chính hãng.
              </p>
            </div>
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PlusOutlined />}
                onClick={() => setInwardModalVisible(true)}
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold"
              >
                Tạo phiếu nhập kho
              </Button>
            )}
          </div>

          {/* Thanh lọc thời gian Tab 2 */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                THỜI GIAN:
              </span>
              <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-white gap-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPresetRange("today")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    reportPreset === "today"
                      ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange("7days")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    reportPreset === "7days"
                      ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  7 ngày qua
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange("thisMonth")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    reportPreset === "thisMonth"
                      ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tháng này
                </button>
              </div>

              <RangePicker
                value={reportRange}
                onChange={handleRangePickerChange}
                format="DD/MM/YYYY"
                allowClear={false}
                className="w-56 rounded-xl text-xs"
              />
            </div>

            <span className="text-xs text-slate-500">
              Có <strong className="text-emerald-700 font-bold">{filteredInwardSlips.length}</strong> phiếu nhập trong kỳ
            </span>
          </div>

          <Table<InventorySlip>
            columns={slipColumns}
            dataSource={paginatedInward}
            rowKey="id"
            pagination={false}
            bordered
          />
          <Pagination current={inwardPage} pageSize={pageSize} total={filteredInwardSlips.length} unit="phiếu nhập" onChange={(p) => setInwardPage(p)} />
        </div>
      )}

      {/* ── TAB 3: PHIẾU XUẤT KHO & HAO MÒN ──────────────────────────────── */}
      {activeTab === "outward" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Nhật ký xuất kho & hao mòn vật tư
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Theo dõi cấp phát vật tư ra bàn bida, quầy bar và ghi nhận hao mòn, hư hại phụ kiện (cơ, bóng, nỉ, lơ).
              </p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<DeleteOutlined className="text-rose-600" />}
                  onClick={() => setWasteModalVisible(true)}
                  className="!border-rose-300 !text-rose-700 hover:!bg-rose-50 !rounded-xl !font-bold"
                >
                  Báo hao mòn phụ kiện
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<PlusOutlined />}
                  onClick={() => setTransferModalVisible(true)}
                  className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold"
                >
                  Tạo phiếu xuất kho
                </Button>
              </div>
            )}
          </div>

          {/* Thanh lọc thời gian Tab 3 */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                THỜI GIAN:
              </span>
              <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-white gap-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPresetRange("today")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    reportPreset === "today"
                      ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange("7days")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    reportPreset === "7days"
                      ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  7 ngày qua
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange("thisMonth")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    reportPreset === "thisMonth"
                      ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tháng này
                </button>
              </div>

              <RangePicker
                value={reportRange}
                onChange={handleRangePickerChange}
                format="DD/MM/YYYY"
                allowClear={false}
                className="w-56 rounded-xl text-xs"
              />
            </div>

            <span className="text-xs text-slate-500">
              Có <strong className="text-blue-700 font-bold">{filteredOutwardSlips.length}</strong> phiếu xuất / hủy trong kỳ
            </span>
          </div>

          <Table<InventorySlip>
            columns={slipColumns}
            dataSource={paginatedOutward}
            rowKey="id"
            pagination={false}
            bordered
          />
          <Pagination current={outwardPage} pageSize={pageSize} total={filteredOutwardSlips.length} unit="phiếu xuất" onChange={(p) => setOutwardPage(p)} />
        </div>
      )}

      {/* ── TAB 4: KIỂM KÊ & CÂN BẰNG KHO (SCRUM-1061) ─────────────────────── */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {!activeCheckSession ? (
            /* ── CHẾ ĐỘ 1: DANH SÁCH CÁC ĐỢT KIỂM KÊ KHO ── */
            <div className="space-y-6">
              {/* Toolbar & Create Check Button */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AuditOutlined className="text-emerald-600 text-lg" />
                    <h3 className="text-lg font-black text-slate-900 mb-0">
                      Kiểm kê định kỳ & Cân bằng tồn kho
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-0">
                    Đối soát số lượng thực tế tại quầy & bàn với hệ thống và phê duyệt cân bằng chênh lệch.
                  </p>
                </div>

                {isAdmin && (
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<PlusOutlined />}
                    onClick={() => setCreateCheckModalVisible(true)}
                    className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold text-xs"
                  >
                    Tạo đợt kiểm kê
                  </Button>
                )}
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    Tổng số đợt kiểm kê
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {stockCheckList.length}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Toàn bộ hồ sơ kiểm kê</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wide block mb-1">
                    Đang kiểm đếm
                  </span>
                  <div className="text-2xl font-black text-amber-800 font-mono">
                    {stockCheckList.filter((s) => s.status === "draft").length}
                  </div>
                  <span className="text-[11px] text-amber-600/80 mt-1 block">Chưa nộp kết quả đếm</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-xs">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide block mb-1">
                    Chờ duyệt cân bằng
                  </span>
                  <div className="text-2xl font-black text-blue-800 font-mono">
                    {stockCheckList.filter((s) => s.status === "submitted").length}
                  </div>
                  <span className="text-[11px] text-blue-600/80 mt-1 block">Đã nộp biên bản đối soát</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide block mb-1">
                    Đã hoàn tất cân bằng
                  </span>
                  <div className="text-2xl font-black text-emerald-800 font-mono">
                    {stockCheckList.filter((s) => s.status === "completed").length}
                  </div>
                  <span className="text-[11px] text-emerald-600/80 mt-1 block">Đã cập nhật kho sổ cái</span>
                </div>
              </div>

              {/* Stock Checks List */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    Lịch sử các phiên kiểm kê kho bida
                  </span>
                  <span className="text-xs text-slate-400">
                    Sắp xếp theo đợt mới nhất
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {stockCheckList.map((check) => {
                    const matchRate = check.summary.totalItems > 0
                      ? Math.round((check.summary.matchedItems / check.summary.totalItems) * 100)
                      : 100;

                    return (
                      <div
                        key={check._id}
                        className="p-5 hover:bg-slate-50/80 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-xs text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              {check.checkCode}
                            </span>
                            <span className="font-black text-slate-900 text-sm">
                              {check.title}
                            </span>
                            {check.status === "draft" && (
                              <Tag color="warning" className="!rounded-full !px-2.5 !py-0.2 !text-[11px] !font-bold">
                                ĐANG KIỂM ĐẾM
                              </Tag>
                            )}
                            {check.status === "submitted" && (
                              <Tag color="processing" className="!rounded-full !px-2.5 !py-0.2 !text-[11px] !font-bold">
                                CHỜ DUYỆT CÂN BẰNG
                              </Tag>
                            )}
                            {check.status === "completed" && (
                              <Tag color="success" className="!rounded-full !px-2.5 !py-0.2 !text-[11px] !font-bold">
                                ĐÃ HOÀN TẤT
                              </Tag>
                            )}
                            {check.status === "cancelled" && (
                              <Tag color="default" className="!rounded-full !px-2.5 !py-0.2 !text-[11px] !font-bold">
                                ĐÃ HỦY
                              </Tag>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                            <span>Ngày tạo: <strong>{dayjs(check.createdAt).format("DD/MM/YYYY HH:mm")}</strong></span>
                            <span>Người lập: <strong>{check.createdBy?.name || "Quản trị viên"}</strong></span>
                            {check.submittedAt && (
                              <span>Nộp lúc: <strong>{dayjs(check.submittedAt).format("DD/MM/YYYY HH:mm")}</strong></span>
                            )}
                            {check.approvedAt && (
                              <span className="text-emerald-700 font-semibold">
                                Duyệt lúc: {dayjs(check.approvedAt).format("DD/MM/YYYY HH:mm")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-5">
                          <div className="text-center min-w-20">
                            <span className="text-[11px] text-slate-400 block">Tỷ lệ khớp</span>
                            <span className={`font-mono font-black text-sm ${matchRate === 100 ? "text-emerald-700" : "text-amber-700"}`}>
                              {matchRate}%
                            </span>
                          </div>

                          <div className="text-center min-w-28">
                            <span className="text-[11px] text-slate-400 block">Tổng chênh lệch</span>
                            <span
                              className={`font-mono font-bold text-xs ${
                                check.summary.totalVarianceValue === 0
                                  ? "text-slate-500"
                                  : check.summary.totalVarianceValue > 0
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {check.summary.totalVarianceValue > 0 ? "+" : ""}
                              {check.summary.totalVarianceValue.toLocaleString("vi-VN")}đ
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCheckSession(check)}
                              className="!rounded-xl !text-xs !font-bold !border-slate-300"
                            >
                              {check.status === "draft" ? "Kiểm Đếm Thực Tế" : "Xem Chi Tiết"}
                            </Button>

                            {isAdmin && check.status === "submitted" && (
                              <Button
                                variant="primary"
                                size="sm"
                                leftIcon={<CheckCircleOutlined />}
                                onClick={() => {
                                  handleOpenCheckSession(check);
                                }}
                                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold !text-xs"
                              >
                                Duyệt Cân Bằng
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ── CHẾ ĐỘ 2: MÀN HÌNH KIỂM ĐẾM & PHÊ DUYỆT CÂN BẰNG TỒN KHO CHI TIẾT ── */
            <div className="space-y-6">
              {/* Header Navigation & Actions */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<RollbackOutlined />}
                    onClick={() => setActiveCheckSession(null)}
                    className="!rounded-xl !text-xs !bg-slate-100 hover:!bg-slate-200"
                  >
                    Quay lại
                  </Button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {activeCheckSession.checkCode}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 mb-0">
                        {activeCheckSession.title}
                      </h3>
                      {activeCheckSession.status === "draft" && (
                        <Tag color="warning" className="!rounded-full !font-bold">ĐANG KIỂM ĐẾM</Tag>
                      )}
                      {activeCheckSession.status === "submitted" && (
                        <Tag color="processing" className="!rounded-full !font-bold">CHỜ DUYỆT CÂN BẰNG (SUBMITTED)</Tag>
                      )}
                      {activeCheckSession.status === "completed" && (
                        <Tag color="success" className="!rounded-full !font-bold">ĐÃ CÂN BẰNG KHO (COMPLETED)</Tag>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-0 mt-0.5">
                      Khởi tạo ngày {dayjs(activeCheckSession.createdAt).format("DD/MM/YYYY HH:mm")} bởi {activeCheckSession.createdBy?.name}
                    </p>
                  </div>
                </div>

                {/* Action Buttons depending on status & role */}
                <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
                  {activeCheckSession.status === "draft" && (
                    <>
                      <Button
                        variant="outline"
                        size="md"
                        leftIcon={<SaveOutlined />}
                        loading={stockCheckLoading}
                        onClick={() => handleSaveOrSubmitCounts(false)}
                        className="!rounded-xl !text-xs !font-bold !border-slate-300"
                      >
                        Lưu Tạm
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        leftIcon={<SendOutlined />}
                        loading={stockCheckLoading}
                        onClick={() => handleSaveOrSubmitCounts(true)}
                        className="!bg-blue-600 hover:!bg-blue-700 !border-blue-600 !rounded-xl !font-bold !text-xs text-white"
                      >
                        Nộp Phiếu Kiểm Kê (SUBMITTED)
                      </Button>
                    </>
                  )}

                  {activeCheckSession.status === "submitted" && isAdmin && (
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<CheckCircleOutlined />}
                      loading={stockCheckLoading}
                      onClick={handleApproveBalance}
                      className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-black !text-xs text-white shadow-sm"
                    >
                      Duyệt Cân Bằng Kho (Tự động điều chỉnh)
                    </Button>
                  )}

                  {activeCheckSession.status === "completed" && (
                    <Tag color="green" className="!text-xs !font-bold !py-1 !px-3 !rounded-full">
                      ✓ Đã hoàn tất cân bằng vào hệ thống
                    </Tag>
                  )}
                </div>
              </div>

              {/* 5 Variance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                    Mặt hàng kiểm kê
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-800 font-mono">
                    {activeCheckSession.items.length}
                  </div>
                  <span className="text-[11px] text-slate-400">Snapshot tồn kho</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    Khớp số sách
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-700 font-mono">
                    {activeCheckSession.items.filter((it) => {
                      const count = editingActualCounts[it.product]?.actualStock ?? it.actualStock ?? it.systemStock;
                      return count === it.systemStock;
                    }).length}
                  </div>
                  <span className="text-[11px] text-slate-400">Lệch = 0</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide block mb-1">
                    Thừa thực tế
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                    {activeCheckSession.items.filter((it) => {
                      const count = editingActualCounts[it.product]?.actualStock ?? it.actualStock ?? it.systemStock;
                      return count > it.systemStock;
                    }).length}
                  </div>
                  <span className="text-[11px] text-emerald-600/80">Thực tế &gt; Hệ thống</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide block mb-1">
                    Thiếu thực tế
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
                    {activeCheckSession.items.filter((it) => {
                      const count = editingActualCounts[it.product]?.actualStock ?? it.actualStock ?? it.systemStock;
                      return count < it.systemStock;
                    }).length}
                  </div>
                  <span className="text-[11px] text-rose-600/80">Thực tế &lt; Hệ thống</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-teal-200/80 shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wide block mb-1">
                    Tổng giá trị lệch
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-teal-800 font-mono tracking-tight">
                    {(() => {
                      const totalDiffVal = activeCheckSession.items.reduce((acc, it) => {
                        const count = editingActualCounts[it.product]?.actualStock ?? it.actualStock ?? it.systemStock;
                        return acc + (count - it.systemStock) * it.costPrice;
                      }, 0);
                      return `${totalDiffVal > 0 ? "+" : ""}${totalDiffVal.toLocaleString("vi-VN")}đ`;
                    })()}
                  </div>
                  <span className="text-[11px] text-teal-600/80">Theo đơn giá vốn</span>
                </div>
              </div>

              {/* Detail Items Table with Variance Column (SCRUM-1067) */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    Bảng đối soát kiểm đếm & chênh lệch tồn kho (Variance)
                  </span>
                  <span className="text-xs text-slate-400">
                    Variance = Số đếm thực tế - Tồn hệ thống
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                      <tr>
                        <th className="py-3 px-3 text-center w-12">STT</th>
                        <th className="py-3 px-3 w-28">Mã SKU</th>
                        <th className="py-3 px-3">Tên Hàng Hóa / Vật Tư</th>
                        <th className="py-3 px-3 text-right w-24">Giá Vốn</th>
                        <th className="py-3 px-3 text-center w-28">Tồn Hệ Thống</th>
                        <th className="py-3 px-3 text-center w-36">Đếm Thực Tế</th>
                        <th className="py-3 px-3 text-center w-32">Chênh Lệch</th>
                        <th className="py-3 px-3 text-right w-32">Giá Trị Lệch</th>
                        <th className="py-3 px-3 w-40">Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeCheckSession.items.map((item, idx) => {
                        const countData = editingActualCounts[item.product] || {
                          actualStock: item.actualStock ?? item.systemStock,
                          note: item.note || "",
                        };
                        const actual = countData.actualStock;
                        const variance = actual - item.systemStock;
                        const varianceVal = variance * item.costPrice;
                        const isEditable = activeCheckSession.status === "draft";

                        return (
                          <tr key={item.product} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-700">{item.sku}</td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900 block">{item.name}</span>
                              <span className="text-[11px] text-slate-400">ĐVT: {item.unit}</span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600">
                              {item.costPrice.toLocaleString("vi-VN")}đ
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-700 font-mono">
                              {item.systemStock} {item.unit}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isEditable ? (
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={actual}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setEditingActualCounts((prev) => ({
                                        ...prev,
                                        [item.product]: {
                                          ...prev[item.product],
                                          actualStock: val,
                                          note: prev[item.product]?.note || "",
                                        },
                                      }));
                                    }}
                                    className="w-16 px-2 py-1 text-center font-black text-xs font-mono rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                  />
                                  <span className="text-slate-400 text-[11px]">{item.unit}</span>
                                </div>
                              ) : (
                                <strong className="font-mono text-slate-900 text-xs">
                                  {actual} {item.unit}
                                </strong>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[11px] font-mono inline-block ${
                                  variance === 0
                                    ? "bg-slate-100 text-slate-600"
                                    : variance > 0
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {variance === 0 ? "0 (Khớp)" : variance > 0 ? `+${variance}` : variance}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold">
                              <span
                                className={
                                  varianceVal === 0
                                    ? "text-slate-400"
                                    : varianceVal > 0
                                    ? "text-emerald-700"
                                    : "text-rose-700"
                                }
                              >
                                {varianceVal > 0 ? "+" : ""}
                                {varianceVal.toLocaleString("vi-VN")}đ
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {isEditable ? (
                                <input
                                  type="text"
                                  placeholder="Ghi chú lý do lệch..."
                                  value={countData.note}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditingActualCounts((prev) => ({
                                      ...prev,
                                      [item.product]: {
                                        ...prev[item.product],
                                        actualStock: prev[item.product]?.actualStock ?? item.systemStock,
                                        note: val,
                                      },
                                    }));
                                  }}
                                  className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 outline-none"
                                />
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">
                                  {item.note || "—"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: BÁO CÁO XUẤT – NHẬP – TỒN ─────────────────────────────── */}
      {activeTab === "report" && (
        <div className="space-y-4">
          {/* Filter Toolbar (Matching Image 4: THỜI GIAN: [ Hôm nay | 7 ngày qua | Tháng này ]) */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                THỜI GIAN:
              </span>
              <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 gap-0.5">
                <button
                  type="button"
                  onClick={() => setPresetRange("today")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    reportPreset === "today"
                      ? "bg-white shadow-xs text-emerald-700 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange("7days")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    reportPreset === "7days"
                      ? "bg-white shadow-xs text-emerald-700 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  7 ngày qua
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange("thisMonth")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    reportPreset === "thisMonth"
                      ? "bg-white shadow-xs text-emerald-700 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tháng này
                </button>
              </div>

              <RangePicker
                value={reportRange}
                onChange={handleRangePickerChange}
                format="DD/MM/YYYY"
                allowClear={false}
                className="w-60 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                value={reportCategory}
                onChange={(val) => {
                  setReportCategory(val);
                  setReportPage(1);
                }}
                className="!w-44 !rounded-xl !text-xs"
                options={[
                  { label: "Tất cả loại hàng", value: "all" },
                  { label: "Phụ kiện bida", value: "accessory" },
                  { label: "Vật tư bàn bida", value: "table_supplies" },
                  { label: "Đồ uống lưu kho", value: "drink" },
                  { label: "Thức ăn & đồ ăn nhẹ", value: "food" },
                  { label: "Nguyên liệu pha chế", value: "ingredient" },
                  { label: "Bảo dưỡng & Vệ sinh", value: "maintenance" },
                ]}
              />

              <Input
                placeholder="Tìm theo tên hoặc mã hàng..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={reportSearch}
                onChange={(e) => {
                  setReportSearch(e.target.value);
                  setReportPage(1);
                }}
                className="!w-56 !rounded-xl !h-10 text-xs"
                allowClear
              />

              <Button
                variant="primary"
                leftIcon={<FileExcelOutlined />}
                onClick={handleExportExcel}
                loading={reportExporting}
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold text-white shadow-xs"
              >
                Excel
              </Button>
            </div>
          </div>

          {/* 6 Harmonized KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Mặt hàng
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                  <ShoppingOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {filteredReportItems.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Trong danh mục</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Tồn đầu kỳ
                </span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-sm">
                  <InboxOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 font-mono">
                {filteredReportItems.reduce((acc, cur) => acc + (cur.openingStock || 0), 0).toLocaleString("vi-VN")}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Số lượng đầu kỳ</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-emerald-200/70 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                  Nhập trong kỳ
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                  <ArrowUpOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 font-mono">
                +{filteredReportItems.reduce((acc, cur) => acc + (cur.inStock || 0), 0).toLocaleString("vi-VN")}
              </div>
              <div className="text-[11px] text-emerald-600/80 mt-1">Qua phiếu nhập</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-blue-200/70 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Xuất bán POS
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                  <ArrowDownOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600 font-mono">
                -{filteredReportItems.reduce((acc, cur) => acc + (cur.outStock || 0), 0).toLocaleString("vi-VN")}
              </div>
              <div className="text-[11px] text-blue-600/80 mt-1">Theo hóa đơn bán lẻ</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-rose-200/70 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">
                  Xuất hủy / Hao
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-sm">
                  <DeleteOutlined />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 font-mono">
                -{filteredReportItems.reduce((acc, cur) => acc + (cur.wasteStock || 0), 0).toLocaleString("vi-VN")}
              </div>
              <div className="text-[11px] text-rose-600/80 mt-1">Hao mòn, cơ lơ hỏng</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-teal-200/70 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">
                  Giá trị tồn cuối
                </span>
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-sm">
                  <DollarOutlined />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-teal-700 font-mono tracking-tight">
                {(filteredReportItems.reduce((acc, cur) => acc + (cur.closingValue || 0), 0) / 1000000).toFixed(2)}M đ
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                {filteredReportItems.reduce((acc, cur) => acc + (cur.closingStock || 0), 0).toLocaleString("vi-VN")} đơn vị tồn
              </div>
            </div>
          </div>

          {/* Report Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChartOutlined className="text-emerald-600" />
                <h4 className="font-bold text-slate-900 text-sm mb-0">
                  Bảng tổng hợp cân đối kho theo mã hàng
                </h4>
              </div>
              <span className="text-xs text-slate-400">
                Sắp xếp theo thứ tự mã tăng dần
              </span>
            </div>

            <Table<InventoryReportItem>
              columns={reportColumns}
              dataSource={paginatedReport}
              rowKey="productId"
              loading={reportLoading}
              pagination={false}
              bordered
              scroll={{ x: 1050 }}
            />
            <Pagination current={reportPage} pageSize={pageSize} total={filteredReportItems.length} unit="mặt hàng" onChange={(p) => setReportPage(p)} />
          </div>
        </div>
      )}

      {/* ── TAB 6: DANH MỤC & PHỤ KIỆN BIDA (CHỈ DÀNH CHO ADMIN) ── */}
      {isAdmin && activeTab === "catalog" && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <CatalogManagementPage />
        </div>
      )}

      {/* ── TAB 7: QUẢN LÝ NHÀ CUNG CẤP (CHỈ DÀNH CHO ADMIN) ── */}
      {isAdmin && activeTab === "suppliers" && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <SupplierManagementPage />
        </div>
      )}

      {/* ── MODAL TẠO ĐỢT KIỂM KÊ MỚI (SCRUM-1065) ─────────────────────────── */}
      <Modal
        open={createCheckModalVisible}
        onCancel={() => setCreateCheckModalVisible(false)}
        footer={null}
        width={540}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <AuditOutlined className="text-emerald-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Tạo Đợt Kiểm Kê Hàng Hóa Định Kỳ Mới
            </span>
          </div>
        }
      >
        <div className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tiêu đề đợt kiểm kê: <span className="text-rose-500">*</span>
            </label>
            <Input
              value={newCheckForm.title}
              onChange={(e) => setNewCheckForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ví dụ: Kiểm kê định kỳ toàn bộ kho hàng hóa tháng 11/2026..."
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phạm vi loại hàng kiểm kê:
            </label>
            <Select
              value={newCheckForm.category}
              onChange={(val) => setNewCheckForm((prev) => ({ ...prev, category: val }))}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={[
                { value: "all", label: "Toàn bộ kho hàng (Tất cả mặt hàng)" },
                { value: "accessory", label: "Phụ kiện bida (Cơ, lơ, bao tay, nỉ, bi)" },
                { value: "drink", label: "Đồ uống lưu kho (Bia, nước ngọt, cà phê)" },
                { value: "food", label: "Thực phẩm & Thức ăn nhanh" },
                { value: "ingredient", label: "Nguyên liệu pha chế" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú đợt kiểm kê:
            </label>
            <Input.TextArea
              rows={3}
              value={newCheckForm.note}
              onChange={(e) => setNewCheckForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Nhập mục đích hoặc chỉ dẫn kiểm đếm cho thủ kho..."
              className="!rounded-xl text-xs"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <span className="font-bold block mb-1">Cơ chế Snapshot Tồn Kho:</span>
            Khi tạo đợt kiểm kê, hệ thống sẽ tự động chụp snapshot số lượng tồn kho hiện tại của toàn bộ sản phẩm được chọn để đối soát với số lượng kiểm đếm thực tế.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCreateCheckModalVisible(false)}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={stockCheckLoading}
              onClick={handleCreateStockCheck}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs"
            >
              Khởi Tạo Đợt Kiểm Kê
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 1: LẬP PHIẾU NHẬP KHO MỚI (ĐƠN GIÁ VỐN LOCKED) ──────────── */}
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
                  unitPrice: target?.costPrice || 0, // Strict lock to catalog costPrice
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng nhập:</label>
              <Input
                type="number"
                min={1}
                value={inwardForm.qty}
                onChange={(e) =>
                  setInwardForm((prev) => ({
                    ...prev,
                    qty: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                className="!h-10 !rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Đơn giá vốn nhập (VNĐ):
                </label>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-semibold inline-flex items-center gap-0.5">
                  <LockOutlined /> Cố định
                </span>
              </div>
              <input
                type="text"
                readOnly
                disabled
                value={`${(inwardForm.unitPrice || 0).toLocaleString("vi-VN")} đ`}
                title="Đơn giá vốn niêm yết theo Quản lý hàng hóa, không thể chỉnh sửa tăng giảm"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono font-bold text-xs cursor-not-allowed select-none outline-none"
              />
              <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                * Đồng bộ trực tiếp với giá vốn trong danh mục
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nhà cung cấp / Đối tác giao hàng:
            </label>
            {suppliers.length > 0 ? (
              <Select
                value={inwardForm.supplier || suppliers[0]?.name}
                onChange={(val) => setInwardForm((prev) => ({ ...prev, supplier: val }))}
                className="!w-full !rounded-xl !text-xs !h-10"
                options={suppliers.map((s) => ({ value: s.name, label: s.name }))}
              />
            ) : (
              <Input
                value={inwardForm.supplier}
                onChange={(e) => setInwardForm((prev) => ({ ...prev, supplier: e.target.value }))}
                placeholder="Nhập tên nhà cung cấp..."
                className="!h-10 !rounded-xl text-xs"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú nhập kho:</label>
            <Input
              value={inwardForm.note}
              onChange={(e) => setInwardForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Ví dụ: Nhập bổ sung cơ và bóng phục vụ giải đấu..."
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs">
            <span className="font-semibold text-emerald-800">Tổng giá trị phiếu nhập:</span>
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

      {/* ── MODAL 2A: XUẤT KHO & CẤP PHÁT BÀN/QUẦY (RIÊNG BIỆT) ────────────────── */}
      <Modal
        open={transferModalVisible}
        onCancel={() => setTransferModalVisible(false)}
        footer={null}
        width={580}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ArrowUpOutlined className="text-emerald-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Lập Phiếu Xuất Kho & Cấp Phát Bàn / Quầy
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
              value={transferForm.sku}
              onChange={(val) => setTransferForm((prev) => ({ ...prev, sku: val }))}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={stockList.map((i) => ({
                value: i.sku,
                label: `${i.sku} - ${i.name} (Tồn hiện tại: ${i.stockQty} ${i.unit})`,
              }))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Số lượng cấp phát xuất kho:
              </label>
              {(() => {
                const target = stockList.find((i) => i.sku === transferForm.sku);
                return (
                  <span className="text-[11px] text-slate-500">
                    Tổng trong kho: <strong>{target?.stockQty || 0} {target?.unit}</strong>
                  </span>
                );
              })()}
            </div>
            <Input
              type="number"
              min={1}
              max={stockList.find((i) => i.sku === transferForm.sku)?.stockQty || 1}
              value={transferForm.qty}
              onChange={(e) =>
                setTransferForm((prev) => ({
                  ...prev,
                  qty: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="!h-10 !rounded-xl text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Địa điểm / Bộ phận tiếp nhận:
            </label>
            <Select
              value={transferForm.target}
              onChange={(val) => setTransferForm((prev) => ({ ...prev, target: val }))}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={[
                { value: "Quầy Bar & Thu ngân", label: "Quầy Bar & Thu ngân" },
                { value: "Bàn thi đấu Match 13 (VIP)", label: "Bàn thi đấu Match 13 (VIP)" },
                { value: "Bàn thi đấu Match 14 (VIP)", label: "Bàn thi đấu Match 14 (VIP)" },
                { value: "Tủ cơ cho thuê (Lễ tân)", label: "Tủ cơ cho thuê (Lễ tân)" },
                { value: "Khu vực bảo trì & thay nỉ bàn", label: "Khu vực bảo trì & thay nỉ bàn" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú xuất kho:</label>
            <Input
              value={transferForm.note}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Ví dụ: Cấp phát đồ uống và lơ bida lên quầy thu ngân..."
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div className="p-3 rounded-2xl border flex justify-between items-center text-xs bg-emerald-50 border-emerald-200">
            <span className="font-semibold text-emerald-800">
              Tổng giá trị xuất kho:
            </span>
            <span className="font-black text-base font-mono text-emerald-900">
              {(() => {
                const target = stockList.find((i) => i.sku === transferForm.sku);
                const cost = target?.costPrice || 0;
                return `${(transferForm.qty * cost).toLocaleString("vi-VN")}đ`;
              })()}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setTransferModalVisible(false)}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCreateTransferSlip}
              className="!rounded-xl !font-bold px-6 !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600"
            >
              Xác Nhận Xuất Kho
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 2B: BÁO HỎNG & HAO MÒN PHỤ KIỆN BIDA (RIÊNG BIỆT) ────────────── */}
      <Modal
        open={wasteModalVisible}
        onCancel={() => setWasteModalVisible(false)}
        footer={null}
        width={580}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <DeleteOutlined className="text-rose-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Ghi Nhận Hao Mòn & Xuất Hủy Phụ Kiện Bida
            </span>
          </div>
        }
      >
        <div className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn phụ kiện bị hỏng / hao mòn:
            </label>
            <Select
              value={wasteForm.sku}
              onChange={(val) => setWasteForm((prev) => ({ ...prev, sku: val }))}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={stockList.map((i) => ({
                value: i.sku,
                label: `${i.sku} - ${i.name} (Tồn hiện tại: ${i.stockQty} ${i.unit})`,
              }))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Số lượng phụ kiện bị hỏng:
              </label>
              {(() => {
                const target = stockList.find((i) => i.sku === wasteForm.sku);
                return (
                  <span className="text-[11px] text-slate-500">
                    Tổng trong kho: <strong>{target?.stockQty || 0} {target?.unit}</strong>
                  </span>
                );
              })()}
            </div>
            <Input
              type="number"
              min={1}
              max={stockList.find((i) => i.sku === wasteForm.sku)?.stockQty || 1}
              value={wasteForm.qty}
              onChange={(e) =>
                setWasteForm((prev) => ({
                  ...prev,
                  qty: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="!h-10 !rounded-xl text-xs font-mono font-bold"
            />
            <span className="text-[11px] text-rose-600 mt-1 block">
              * Lưu ý: Nếu có 8 cây gậy mà hỏng 1 cây, chỉ nhập đúng 1 cây để trừ tồn và báo cáo đúng số lượng hỏng.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lý do hư hỏng / hao mòn:
            </label>
            <Select
              value={wasteForm.reason}
              onChange={(val) => setWasteForm((prev) => ({ ...prev, reason: val }))}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={REASON_OPTIONS}
            />
            {wasteForm.reason === "Khác" && (
              <Input
                placeholder="Nhập chi tiết lý do hư hỏng..."
                value={wasteForm.customReason}
                onChange={(e) =>
                  setWasteForm((prev) => ({ ...prev, customReason: e.target.value }))
                }
                className="!h-10 !rounded-xl text-xs mt-2"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú chi tiết:</label>
            <Input
              value={wasteForm.note}
              onChange={(e) => setWasteForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Ví dụ: Gãy đầu phíp trong trận bán kết 1, không phục hồi được..."
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div className="p-3 rounded-2xl border flex justify-between items-center text-xs bg-rose-50 border-rose-200">
            <span className="font-semibold text-rose-800">
              Giá trị tổn thất hao mòn:
            </span>
            <span className="font-black text-base font-mono text-rose-900">
              {(() => {
                const target = stockList.find((i) => i.sku === wasteForm.sku);
                const cost = target?.costPrice || 0;
                return `${(wasteForm.qty * cost).toLocaleString("vi-VN")}đ`;
              })()}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setWasteModalVisible(false)}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCreateWasteSlip}
              className="!rounded-xl !font-bold px-6 !text-xs !bg-rose-600 hover:!bg-rose-700 !border-rose-600"
            >
              Xác Nhận Báo Hao Mòn
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL BÁO THIẾU / HẾT HÀNG CHO ROLE STAFF ────────────────────── */}
      <Modal
        open={alertModalVisible}
        onCancel={() => setAlertModalVisible(false)}
        footer={null}
        width={520}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <AlertOutlined className="text-amber-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Báo Thiếu / Hết Hàng Tới Quản Lý
            </span>
          </div>
        }
      >
        {alertTargetItem && (
          <div className="py-4 space-y-4 text-xs">
            {/* Thẻ thông tin mặt hàng */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {alertTargetItem.sku}
                </span>
                <Tag
                  color={
                    alertTargetItem.stockQty === 0
                      ? "error"
                      : alertTargetItem.stockQty <= alertTargetItem.minThreshold
                      ? "warning"
                      : "green"
                  }
                  className="!rounded-full !px-2 !py-0 !text-[10px] !font-bold"
                >
                  {alertTargetItem.stockQty === 0
                    ? "HẾT HÀNG"
                    : alertTargetItem.stockQty <= alertTargetItem.minThreshold
                    ? "SẮP HẾT"
                    : "ĐỦ HÀNG"}
                </Tag>
              </div>

              <div>
                <span className="text-sm font-bold text-slate-900 block">
                  {alertTargetItem.name}
                </span>
                <span className="text-[11px] text-slate-500">
                  {alertTargetItem.categoryName} • Vị trí: <strong>{alertTargetItem.location}</strong>
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-slate-700">
                <span>
                  Tồn kho hiện tại:{" "}
                  <strong className="text-slate-900 font-bold">
                    {alertTargetItem.stockQty} {alertTargetItem.unit}
                  </strong>
                </span>
                <span className="text-slate-500 text-[11px]">
                  Mức tối thiểu: {alertTargetItem.minThreshold} {alertTargetItem.unit}
                </span>
              </div>
            </div>

            {/* Mức độ ưu tiên */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mức độ khẩn cấp:
              </label>
              <Select
                value={alertForm.priority}
                onChange={(val) => setAlertForm((prev) => ({ ...prev, priority: val }))}
                className="!w-full !rounded-xl !text-xs !h-10"
                options={[
                  { value: "urgent", label: "Khẩn cấp — Hết sạch tại bàn / quầy thu ngân" },
                  { value: "high", label: "Cần sớm — Đang dưới ngưỡng an toàn, khách hỏi nhiều" },
                  { value: "normal", label: "Bình thường — Đề xuất nhập thêm dự phòng" },
                ]}
              />
            </div>

            {/* Số lượng đề xuất nhập */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số lượng đề xuất nhập thêm (ĐVT: {alertTargetItem.unit}):
              </label>
              <Input
                type="number"
                min={1}
                value={alertForm.suggestedQty}
                onChange={(e) =>
                  setAlertForm((prev) => ({
                    ...prev,
                    suggestedQty: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                className="!h-10 !rounded-xl text-xs font-mono font-bold"
              />
            </div>

            {/* Ghi chú thực tế */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú tình trạng thực tế:
              </label>
              <Input.TextArea
                rows={3}
                value={alertForm.note}
                onChange={(e) => setAlertForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Ví dụ: Khách tại các bàn VIP hỏi nhiều lơ xanh Taom, quầy đã phát hết sạch..."
                className="!rounded-xl text-xs"
              />
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900">
              <span className="font-bold block mb-0.5">Thông báo tức thì tới Quản lý kho:</span>
              Yêu cầu của bạn sẽ được gửi tới Ban quản trị và Quản lý kho để xem xét tạo phiếu nhập hoặc điều chuyển phụ kiện kịp thời.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                onClick={() => setAlertModalVisible(false)}
                className="!rounded-xl !text-xs"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmitStockAlert}
                className="!bg-amber-600 hover:!bg-amber-700 !border-amber-600 !rounded-xl !font-bold px-6 !text-xs text-white"
              >
                Gửi Báo Cáo
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL 3: XEM CHI TIẾT CHỨNG TỪ ────────────────────────────────── */}
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
                <strong
                  className={
                    selectedSlip.type === "inward"
                      ? "text-emerald-700"
                      : selectedSlip.type === "waste"
                      ? "text-rose-700"
                      : "text-blue-700"
                  }
                >
                  {selectedSlip.type === "inward"
                    ? "PHIẾU NHẬP KHO"
                    : selectedSlip.type === "waste"
                    ? "PHIẾU XUẤT HỦY HAO MÒN"
                    : "PHIẾU XUẤT KHO CẤP PHÁT"}
                </strong>
              </div>
              <div>
                Ngày giờ:{" "}
                <strong>
                  {selectedSlip.date} • {selectedSlip.createdTime}
                </strong>
              </div>
              <div>
                Người lập: <strong>{selectedSlip.creator}</strong>
              </div>
              <div>
                Đối tác / Bộ phận: <strong>{selectedSlip.partnerOrTarget}</strong>
              </div>
              {selectedSlip.reason && (
                <div className="col-span-2 text-rose-700 font-semibold">
                  Lý do hư hỏng: {selectedSlip.reason}
                </div>
              )}
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
                      <th className="py-2.5 px-3">Mã hàng</th>
                      <th className="py-2.5 px-3">Tên Mặt Hàng</th>
                      <th className="py-2.5 px-3 text-center">Số Lượng</th>
                      <th className="py-2.5 px-3 text-right">Đơn Giá</th>
                      <th className="py-2.5 px-3 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSlip.details.map((d) => (
                      <tr key={d.sku}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{d.sku}</td>
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
