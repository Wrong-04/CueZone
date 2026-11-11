import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ToolOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined,
  ClearOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Input,
  Select,
  Typography,
  Table,
  Modal,
  Space,
  SegmentedPillList,
  SearchFilterInput,
  Pagination,
  Tooltip,
  message,
} from "../../shared/ui";
import { InputNumber } from "antd";
import type { BilliardTable, PricingTier, TableType } from "../../types";
import { tableAdminService, pricingAdminService } from "../../services/pos.service";

const { Title, Text } = Typography;

const QUICK_PRICE_PRESETS = [40000, 50000, 60000, 70000, 80000, 100000, 120000];

export function getTableTypeLabel(type: TableType | string): string {
  if (type === "carom") return "Bàn Bida Carom (Phăng)";
  if (type === "snooker") return "Bàn Bida Snooker";
  return "Bàn Bida Lỗ (Pool)";
}
export function getActivePricingTier(
  pricingTiers: PricingTier[],
  now = Date.now(),
): PricingTier | null {
  if (!pricingTiers || pricingTiers.length === 0) return null;
  const date = new Date(now);
  const vnTimeStr = date.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [hStr, mStr] = vnTimeStr.split(":");
  const currentMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
  const vnDateStr = date.toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const dayOfWeek = new Date(vnDateStr).getDay();

  for (const tier of pricingTiers) {
    if (tier.isActive === false) continue;
    if (tier.daysOfWeek && tier.daysOfWeek.length > 0 && !tier.daysOfWeek.includes(dayOfWeek))
      continue;

    const [startH, startM] = tier.startTime.split(":").map(Number);
    const [endH, endM] = tier.endTime === "24:00" ? [24, 0] : tier.endTime.split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal <= endTotal) {
      if (currentMins >= startTotal && currentMins < endTotal) {
        return tier;
      }
    } else {
      if (currentMins >= startTotal || currentMins < endTotal) {
        return tier;
      }
    }
  }

  const activeOnly = pricingTiers.filter((t) => t.isActive !== false);
  return activeOnly.find((t) => t.isCurrentlyActive) || null;
}

export function formatActivePricingLabel(tier: PricingTier | null): string {
  if (!tier) return "Biểu giá chuẩn bàn";
  const cleanName = tier.name.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  return `${cleanName} (${tier.startTime} – ${tier.endTime})`;
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  if (timeStr === "24:00") return 1440;
  const parts = timeStr.trim().split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1] || "0", 10) || 0;
  return h * 60 + m;
}

export function formatDaysOfWeek(tier: PricingTier): string {
  if (tier.dayType === "all" || (tier.daysOfWeek && tier.daysOfWeek.length === 7)) {
    return "Áp dụng: Tất cả các ngày trong tuần";
  }
  if (
    tier.dayType === "weekend" ||
    (tier.daysOfWeek &&
      tier.daysOfWeek.length === 2 &&
      tier.daysOfWeek.includes(0) &&
      tier.daysOfWeek.includes(6))
  ) {
    return "Áp dụng: Thứ 7 & Chủ Nhật hàng tuần";
  }
  if (
    tier.dayType === "weekday" ||
    (tier.daysOfWeek &&
      tier.daysOfWeek.length === 5 &&
      !tier.daysOfWeek.includes(0) &&
      !tier.daysOfWeek.includes(6))
  ) {
    return "Áp dụng: Thứ 2 đến Thứ 6 hàng tuần";
  }
  return "Áp dụng: Theo lịch cấu hình";
}

export const TablesManagementPage: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab: tables | pricing | automation
  const [activeTab, setActiveTab] = useState<string>("tables");

  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  const [tables, setTables] = useState<BilliardTable[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const activePricingTier = useMemo(() => {
    return getActivePricingTier(pricingTiers, currentTime);
  }, [pricingTiers, currentTime]);

  const [timelineDayFilter, setTimelineDayFilter] = useState<"today" | "weekday" | "weekend">("today");

  const timelineSegments = useMemo(() => {
    const todayDay = new Date(currentTime).getDay(); // 0: CN, 1: T2, ..., 6: T7
    const targetDays =
      timelineDayFilter === "today"
        ? [todayDay]
        : timelineDayFilter === "weekday"
          ? [1, 2, 3, 4, 5]
          : [0, 6];

    // Lọc các tier active và áp dụng cho ngày được chọn
    const activeTiersForDay = pricingTiers
      .filter((t) => {
        if (t.isActive === false) return false;
        if (!t.daysOfWeek || t.daysOfWeek.length === 0) return true;
        return t.daysOfWeek.some((d) => targetDays.includes(d));
      })
      .map((t) => {
        const startM = parseTimeToMinutes(t.startTime);
        let endM = parseTimeToMinutes(t.endTime);
        if (endM <= startM) endM = 1440;
        return {
          tier: t,
          startM,
          endM,
        };
      })
      .sort((a, b) => a.startM - b.startM);

    const nowM = (() => {
      const date = new Date(currentTime);
      const vnTimeStr = date.toLocaleTimeString("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
      const [h, m] = vnTimeStr.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    })();

    if (activeTiersForDay.length === 0) {
      return [
        {
          name: "Biểu giá chuẩn bàn",
          startTime: "00:00",
          endTime: "24:00",
          widthPercent: 100,
          isCurrent: timelineDayFilter === "today",
          isFallback: true,
          bgColor: "bg-slate-400",
        },
      ];
    }

    const segments: Array<{
      name: string;
      startTime: string;
      endTime: string;
      widthPercent: number;
      isCurrent: boolean;
      isFallback: boolean;
      bgColor: string;
      tier?: PricingTier;
    }> = [];

    let currentPointer = 0;

    activeTiersForDay.forEach(({ tier, startM, endM }) => {
      // Nếu có khoảng trống trước tier
      if (startM > currentPointer) {
        const gapM = startM - currentPointer;
        const startStr = `${String(Math.floor(currentPointer / 60)).padStart(2, "0")}:${String(currentPointer % 60).padStart(2, "0")}`;
        const endStr = `${String(Math.floor(startM / 60)).padStart(2, "0")}:${String(startM % 60).padStart(2, "0")}`;
        const isCurrentGap =
          timelineDayFilter === "today" &&
          !activePricingTier &&
          nowM >= currentPointer &&
          nowM < startM;
        segments.push({
          name: "Biểu giá chuẩn bàn",
          startTime: startStr,
          endTime: endStr,
          widthPercent: (gapM / 1440) * 100,
          isCurrent: isCurrentGap,
          isFallback: true,
          bgColor: isCurrentGap ? "bg-slate-400 text-slate-800" : "bg-slate-300 text-slate-700",
        });
        currentPointer = startM;
      }

      // Khung giờ chính thức
      const durationM = Math.max(0, endM - currentPointer);
      if (durationM > 0) {
        const isCurrent = tier._id === activePricingTier?._id && timelineDayFilter === "today";
        let bg = "bg-teal-600/90";
        if (startM < 480) {
          bg = "bg-indigo-600/90"; // Đêm khuya
        } else if (startM >= 1020) {
          bg = "bg-amber-600/90"; // Chiều tối / cao điểm
        } else {
          bg = "bg-emerald-600/90"; // Ban ngày
        }

        segments.push({
          name: tier.name,
          startTime: tier.startTime,
          endTime: tier.endTime,
          widthPercent: (durationM / 1440) * 100,
          isCurrent,
          isFallback: false,
          bgColor: bg,
          tier,
        });
        currentPointer = endM;
      }
    });

    // Khoảng trống sau tier cuối cùng đến 24:00 (1440 phút)
    if (currentPointer < 1440) {
      const gapM = 1440 - currentPointer;
      const startStr = `${String(Math.floor(currentPointer / 60)).padStart(2, "0")}:${String(currentPointer % 60).padStart(2, "0")}`;
      const isCurrentGap =
        timelineDayFilter === "today" &&
        !activePricingTier &&
        nowM >= currentPointer &&
        nowM < 1440;
      segments.push({
        name: "Biểu giá chuẩn bàn",
        startTime: startStr,
        endTime: "24:00",
        widthPercent: (gapM / 1440) * 100,
        isCurrent: isCurrentGap,
        isFallback: true,
        bgColor: isCurrentGap ? "bg-slate-400 text-slate-800" : "bg-slate-300 text-slate-700",
      });
    }

    return segments;
  }, [pricingTiers, currentTime, timelineDayFilter, activePricingTier]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      localStorage.removeItem("cuezone_tables_catalog");
      localStorage.removeItem("cuezone_pricing_tiers");
      localStorage.removeItem("cuezone_pos_tables");

      const [tablesData, pricingData] = await Promise.all([
        tableAdminService.getAll(),
        pricingAdminService.getAll(),
      ]);
      setTables(tablesData);
      setPricingTiers(pricingData);
    } catch (err: any) {
      console.error("Lỗi tải danh mục bàn:", err);
      message.error(err.message || "Không thể tải danh mục bàn từ máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const [filterType, setFilterType] = useState<string>("all");
  const [filterFloor, setFilterFloor] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [tableModalVisible, setTableModalVisible] = useState<boolean>(false);
  const [editingTable, setEditingTable] = useState<BilliardTable | null>(null);
  const [tableCode, setTableCode] = useState<string>("");
  const [tableName, setTableName] = useState<string>("");
  const [tableType, setTableType] = useState<TableType>("pool");
  const [tableArea, setTableArea] = useState<string>("Tầng 1 - Khu C");
  const [tableFloor, setTableFloor] = useState<number>(1);
  const [tablePrice, setTablePrice] = useState<number>(50000);

  const [pricingModalVisible, setPricingModalVisible] = useState<boolean>(false);
  const [editingPricing, setEditingPricing] = useState<PricingTier | null>(null);
  const [pricingName, setPricingName] = useState<string>("");
  const [pricingDayType, setPricingDayType] = useState<string>("weekday");
  const [pricingStartTime, setPricingStartTime] = useState<string>("08:00");
  const [pricingEndTime, setPricingEndTime] = useState<string>("14:00");
  const [pricingStandardPrice, setPricingStandardPrice] = useState<number>(60000);
  const [pricingVipPrice, setPricingVipPrice] = useState<number>(120000);
  const [pricingMatchPrice, setPricingMatchPrice] = useState<number>(100000);
  const [pricingIsActive, setPricingIsActive] = useState<boolean>(true);

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: "table" | "pricing";
    name: string;
  } | null>(null);

  const distinctFloors = useMemo(() => {
    const set = new Set<number>();
    tables.forEach((t) => {
      if (typeof t.floor === "number" && !isNaN(t.floor)) set.add(t.floor);
    });
    const arr = Array.from(set).sort((a, b) => a - b);
    return arr.length > 0 ? arr : [1, 2];
  }, [tables]);

  const distinctAreas = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      if (t.area && t.area.trim()) set.add(t.area.trim());
    });
    return Array.from(set).sort();
  }, [tables]);

  const stats = useMemo(() => {
    const total = tables.length;
    const pool = tables.filter((t) => t.type === "pool").length;
    const carom = tables.filter((t) => t.type === "carom").length;
    const snooker = tables.filter((t) => t.type === "snooker").length;
    const maintenance = tables.filter((t) => t.status === "maintenance").length;
    const playing = tables.filter((t) => t.status === "playing").length;
    const paused = tables.filter((t) => t.status === "paused").length;
    const booked = tables.filter((t) => t.status === "booked").length;
    const available = tables.filter((t) => t.status === "available").length;
    const floorBreakdown = distinctFloors.map((f) => ({
      floor: f,
      count: tables.filter((t) => t.floor === f).length,
    }));
    return { total, pool, carom, snooker, maintenance, playing, paused, booked, available, floorBreakdown };
  }, [tables, distinctFloors]);

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchType = filterType === "all" || t.type === filterType;
      const matchFloor = filterFloor === "all" || String(t.floor) === String(filterFloor);
      const matchArea = filterArea === "all" || t.area === filterArea;
      const matchStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "maintenance"
            ? t.status === "maintenance"
            : filterStatus === "playing"
              ? t.status === "playing"
              : filterStatus === "booked"
                ? t.status === "booked"
                : t.status === "available";
      const matchQuery =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.area.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchFloor && matchArea && matchStatus && matchQuery;
    });
  }, [tables, filterType, filterFloor, filterArea, filterStatus, searchQuery]);

  const isFiltering =
    filterType !== "all" ||
    filterFloor !== "all" ||
    filterArea !== "all" ||
    filterStatus !== "all" ||
    searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setFilterType("all");
    setFilterFloor("all");
    setFilterArea("all");
    setFilterStatus("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleFilterTypeChange = (type: string) => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handleFilterFloorChange = (floor: string) => {
    setFilterFloor(floor);
    setCurrentPage(1);
  };

  const handleFilterAreaChange = (area: string) => {
    setFilterArea(area);
    setCurrentPage(1);
  };

  const handleFilterStatusChange = (status: string) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const tabPills = [
    {
      key: "tables",
      label: "Danh Sách Bàn",
      badge: stats.total,
      dotClassName: "bg-emerald-500",
    },
    {
      key: "pricing",
      label: "Bảng Giá Theo Khung Giờ",
      badge: pricingTiers.length,
      dotClassName: "bg-blue-500",
    },
  ];

  // ── Handlers: Table CRUD ────────────────────────────────────────────────────
  const handleOpenAddTable = () => {
    setEditingTable(null);
    setTableCode(`T${tables.length + 1 < 10 ? "0" + (tables.length + 1) : tables.length + 1}`);
    setTableName(`Bàn ${tables.length + 1 < 10 ? "0" + (tables.length + 1) : tables.length + 1}`);
    setTableType("pool");
    setTableFloor(distinctFloors[0] ?? 1);
    setTableArea(distinctAreas[0] ?? "Khu Tiêu Chuẩn");
    setTablePrice(50000);
    setTableModalVisible(true);
  };

  const handleOpenEditTable = (table: BilliardTable) => {
    if (table.status === "playing" || table.status === "booked") {
      message.warning("Bàn đang có khách chơi hoặc đã được đặt trước, không thể chỉnh sửa!");
      return;
    }
    setEditingTable(table);
    setTableCode(table.code);
    setTableName(table.name);
    setTableType(table.type);
    setTableArea(table.area);
    setTableFloor(table.floor);
    setTablePrice(table.pricePerHour);
    setTableModalVisible(true);
  };

  const handleSaveTable = async () => {
    if (!tableName.trim() || !tableCode.trim()) {
      message.warning("Vui lòng điền đầy đủ Mã bàn và Tên bàn!");
      return;
    }

    setSaving(true);
    try {
      if (editingTable) {
        await tableAdminService.update(editingTable._id, {
          code: tableCode.trim(),
          name: tableName.trim(),
          type: tableType,
          area: tableArea.trim(),
          floor: Number(tableFloor),
          pricePerHour: Number(tablePrice),
        });
        message.success(`Đã cập nhật thông số ${tableName} thành công!`);
      } else {
        await tableAdminService.create({
          code: tableCode.trim(),
          name: tableName.trim(),
          type: tableType,
          area: tableArea.trim(),
          floor: Number(tableFloor),
          pricePerHour: Number(tablePrice),
        });
        message.success(`Đã thêm ${tableName} vào danh mục bàn thành công!`);
      }
      setTableModalVisible(false);
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Không thể lưu thông tin bàn!";
      message.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async (table: BilliardTable) => {
    if (table.status === "playing" || table.status === "booked") {
      message.warning(
        "Bàn đang có khách chơi hoặc đã được đặt trước, không thể chuyển sang bảo trì!",
      );
      return;
    }
    const isMaintenance = table.status === "maintenance";
    const nextStatus = isMaintenance ? "available" : "maintenance";
    try {
      await tableAdminService.updateStatus(table._id, nextStatus);
      if (!isMaintenance) {
        message.info(`Đã chuyển ${table.name} sang chế độ bảo trì nỉ!`);
      } else {
        message.success(`Đã hoàn tất bảo trì, ${table.name} sẵn sàng hoạt động!`);
      }
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Không thể đổi trạng thái bàn!";
      message.error(errMsg);
    }
  };

  // ── Handlers: Pricing CRUD ──────────────────────────────────────────────────
  const handleOpenAddPricing = () => {
    setEditingPricing(null);
    setPricingName("");
    setPricingDayType("all");
    setPricingStartTime("08:00");
    setPricingEndTime("17:00");
    setPricingStandardPrice(60000);
    setPricingVipPrice(120000);
    setPricingMatchPrice(100000);
    setPricingIsActive(true);
    setPricingModalVisible(true);
  };

  const handleOpenEditPricing = (tier: PricingTier) => {
    setEditingPricing(tier);
    setPricingName(tier.name);
    let dType = tier.dayType || "weekday";
    if (dType === "peak") dType = "weekday";
    if (tier.daysOfWeek && tier.daysOfWeek.length === 7) dType = "all";
    setPricingDayType(dType);
    setPricingStartTime(tier.startTime);
    setPricingEndTime(tier.endTime);
    setPricingStandardPrice(tier.prices.standard);
    setPricingVipPrice(tier.prices.vip);
    setPricingMatchPrice(tier.prices.match ?? tier.prices.vip + 10000);
    setPricingIsActive(tier.isActive !== false);
    setPricingModalVisible(true);
  };

  const handleToggleTierActive = async (tier: PricingTier) => {
    const isCurrentlyRunning = tier._id === activePricingTier?._id;
    if (isCurrentlyRunning && tier.isActive !== false) {
      message.warning(
        "Khung giờ này đang áp dụng tính tiền trực tiếp cho khách, không thể tạm ngưng!",
      );
      return;
    }
    const newActiveState = tier.isActive === false;
    setSaving(true);
    try {
      await pricingAdminService.update(tier._id, { isActive: newActiveState });
      if (newActiveState) {
        message.success(`Đã kích hoạt "${tier.name}" tham gia lịch tính tiền tự động!`);
      } else {
        message.info(`Đã tạm ngưng "${tier.name}" khỏi lịch tính tiền!`);
      }
      await loadData();
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message || err.message || "Không thể cập nhật trạng thái khung giờ!";
      message.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricing = async () => {
    if (!pricingName.trim()) {
      message.warning("Vui lòng nhập tên khung giờ!");
      return;
    }

    const resolvedDays =
      pricingDayType === "weekday"
        ? [1, 2, 3, 4, 5]
        : pricingDayType === "weekend"
          ? [0, 6]
          : [0, 1, 2, 3, 4, 5, 6];

    setSaving(true);
    try {
      if (editingPricing) {
        await pricingAdminService.update(editingPricing._id, {
          name: pricingName.trim(),
          dayType: pricingDayType as any,
          startTime: pricingStartTime,
          endTime: pricingEndTime,
          daysOfWeek: resolvedDays,
          isActive: pricingIsActive,
          prices: {
            standard: Number(pricingStandardPrice),
            vip: Number(pricingVipPrice),
            match: Number(pricingMatchPrice),
          },
        });
        message.success(`Đã cập nhật biểu giá khung giờ "${pricingName}"!`);
      } else {
        await pricingAdminService.create({
          name: pricingName.trim(),
          dayType: pricingDayType as any,
          startTime: pricingStartTime,
          endTime: pricingEndTime,
          daysOfWeek: resolvedDays,
          isActive: pricingIsActive,
          prices: {
            standard: Number(pricingStandardPrice),
            vip: Number(pricingVipPrice),
            match: Number(pricingMatchPrice),
          },
        });
        message.success(`Đã thêm khung giờ "${pricingName}" vào hệ thống!`);
      }
      setPricingModalVisible(false);
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Không thể lưu khung giờ!";
      message.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "pricing" && deleteTarget.id === activePricingTier?._id) {
      message.warning("Khung giờ đang áp dụng tính tiền trực tiếp cho khách, không thể xóa!");
      setDeleteConfirmVisible(false);
      return;
    }

    setSaving(true);
    try {
      if (deleteTarget.type === "table") {
        await tableAdminService.delete(deleteTarget.id);
        message.success(`Đã xóa bàn ${deleteTarget.name} khỏi danh mục!`);
      } else {
        await pricingAdminService.delete(deleteTarget.id);
        message.success(`Đã xóa khung giờ "${deleteTarget.name}"!`);
      }
      setDeleteConfirmVisible(false);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Không thể xóa!";
      message.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const tableColumns = [
    {
      title: "Mã & Tên Bàn",
      key: "name",
      render: (_: any, record: BilliardTable) => (
        <div className="flex items-center gap-2.5">
          <span
            className={`min-w-[72px] px-2 py-1 rounded-md flex items-center justify-center font-mono font-bold text-xs whitespace-nowrap shrink-0 border ${
              record.type === "snooker"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : record.type === "carom"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-cyan-50 text-cyan-800 border-cyan-200"
            }`}
          >
            {record.code}
          </span>
          <div>
            <strong className="text-sm text-slate-900 block font-semibold hover:text-emerald-700 transition-colors">
              {record.name}
            </strong>
            <span className="text-[11px] text-slate-400 font-mono">
              Ngày tạo: {record.createdAt}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Loại Bàn",
      key: "type",
      render: (_: any, record: BilliardTable) => {
        const color =
          record.type === "snooker" ? "purple" : record.type === "carom" ? "gold" : "cyan";
        return (
          <Tag color={color} className="!font-semibold !px-2.5 !py-0.5 !rounded-full">
            {getTableTypeLabel(record.type)}
          </Tag>
        );
      },
    },
    {
      title: "Khu Vực",
      dataIndex: "area",
      key: "area",
      render: (area: string, record: BilliardTable) => {
        const isVip = area?.toLowerCase().includes("vip");
        const isMatch = area?.toLowerCase().includes("thi đấu");
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Tag
              className={`!rounded-md !px-2 !py-0.5 !m-0 !font-semibold ${
                isMatch
                  ? "!bg-amber-50 !text-amber-800 !border-amber-200"
                  : isVip
                    ? "!bg-purple-50 !text-purple-700 !border-purple-200"
                    : "!bg-slate-100 !text-slate-700 !border-slate-200"
              }`}
            >
              {area || "Phổ thông"}
            </Tag>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold whitespace-nowrap">
              Tầng {record.floor}
            </span>
          </div>
        );
      },
    },
    {
      title: "Giá Giờ",
      key: "pricePerHour",
      render: (_: any, record: BilliardTable) => (
        <span className="font-mono font-bold text-emerald-700 text-sm">
          {record.pricePerHour.toLocaleString("vi-VN")}đ
          <span className="text-xs font-normal text-slate-400">/h</span>
        </span>
      ),
    },
    {
      title: "Trạng Thái",
      key: "status",
      render: (_: any, record: BilliardTable) => (
        <div>
          {record.status === "maintenance" ? (
            <Tag
              color="error"
              className="!rounded-full !px-2.5 !py-0.5 !font-bold inline-flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Bảo trì
            </Tag>
          ) : record.status === "playing" ? (
            <Tag
              color="error"
              className="!rounded-full !px-2.5 !py-0.5 !font-bold !bg-rose-50 !text-rose-700 !border-rose-200 inline-flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Đang chơi
            </Tag>
          ) : record.status === "booked" ? (
            <Tag
              color="blue"
              className="!rounded-full !px-2.5 !py-0.5 !font-bold !bg-blue-50 !text-blue-700 !border-blue-200 inline-flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Đã đặt
            </Tag>
          ) : (
            <Tag
              color="green"
              className="!rounded-full !px-2.5 !py-0.5 !font-bold inline-flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Trống
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Thao Tác",
      key: "actions",
      align: "right" as const,
      render: (_: any, record: BilliardTable) => {
        const isLocked =
          record.status === "playing" ||
          record.status === "paused" ||
          record.status === "booked";

        return (
          <Space size={4}>
            <Tooltip
              title={
                isLocked
                  ? "Bàn đang có khách chơi hoặc đã đặt, không thể sửa thông số"
                  : "Chỉnh sửa thông số bàn"
              }
            >
              <span className={isLocked ? "inline-block cursor-not-allowed" : ""}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLocked}
                  onClick={() => handleOpenEditTable(record)}
                  leftIcon={<EditOutlined />}
                  className={`!h-7 !px-2.5 !rounded-lg !text-xs font-medium ${
                    isLocked
                      ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                      : "!border-slate-300 !text-slate-700 hover:!border-emerald-600 hover:!text-emerald-700"
                  }`}
                >
                  Sửa
                </Button>
              </span>
            </Tooltip>

            <Tooltip
              title={
                record.status === "maintenance"
                  ? "Mở lại bàn vào hoạt động"
                  : isLocked
                    ? "Bàn đang có khách hoặc đã đặt, không thể chuyển bảo trì"
                    : "Chuyển bàn sang bảo trì nỉ"
              }
            >
              <span className={isLocked ? "inline-block cursor-not-allowed" : ""}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLocked}
                  onClick={() => handleToggleMaintenance(record)}
                  leftIcon={<ToolOutlined />}
                  className={`!h-7 !px-2.5 !rounded-lg !text-xs font-medium ${
                    record.status === "maintenance"
                      ? "!bg-emerald-50 !border-emerald-300 !text-emerald-800"
                      : isLocked
                        ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                        : "!border-amber-300 !bg-amber-50/60 !text-amber-800 hover:!bg-amber-100"
                  }`}
                >
                  {record.status === "maintenance" ? "Mở Lại" : "Bảo Trì"}
                </Button>
              </span>
            </Tooltip>

            <Tooltip
              title={
                isLocked
                  ? "Không thể xóa khi bàn đang có khách chơi hoặc đã đặt trước"
                  : "Xóa bàn khỏi hệ thống"
              }
            >
              <span className={isLocked ? "inline-block cursor-not-allowed" : ""}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return;
                    setDeleteTarget({
                      id: record._id,
                      type: "table",
                      name: `${record.name} (${record.code})`,
                    });
                    setDeleteConfirmVisible(true);
                  }}
                  leftIcon={
                    <DeleteOutlined className={isLocked ? "!text-slate-400" : "text-rose-500"} />
                  }
                  className={`!h-7 !px-2.5 !rounded-lg !text-xs font-medium ${
                    isLocked
                      ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                      : "!border-slate-300 !text-rose-600 hover:!border-rose-300 hover:!bg-rose-50"
                  }`}
                >
                  Xóa
                </Button>
              </span>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const paginatedTables = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTables.slice(start, start + pageSize);
  }, [filteredTables, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* ── 1. HEADER & TOP CONTROLS ────────────────────────────────────────── */}
      <Card
        styles={{ body: { padding: 0 } }}
        className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
      >
        <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <Title
                level={3}
                className="!text-lg sm:!text-xl md:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight"
              >
                Quản Lý Bàn & Bảng Giá
              </Title>

              {/* Realtime Active Pricing Pill đặt cạnh tiêu đề gọn gàng */}
              <div className="px-2.5 py-1 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-center gap-1.5 shadow-2xs shrink-0">
                <ClockCircleOutlined className="text-emerald-700 text-xs shrink-0" />
                <span className="text-xs text-emerald-900 font-semibold flex items-center gap-1.5">
                  <span>
                    Đang áp dụng: <strong>{formatActivePricingLabel(activePricingTier)}</strong>
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                </span>
              </div>
            </div>
            <Text className="!text-xs !text-slate-500 block">
              Quản lý danh sách bàn bida, phân khu và thiết lập đơn giá giờ chơi theo khung giờ
            </Text>
          </div>

          {/* Các nút thao tác luôn thẳng hàng ngang ở góc phải */}
          <div className="flex items-center gap-2 shrink-0 self-start xl:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/pos")}
              leftIcon={<ThunderboltOutlined />}
              className="!h-9 !rounded-xl !border-slate-300 !text-slate-700 hover:!border-emerald-600 font-medium !text-xs shadow-2xs whitespace-nowrap"
            >
              Mở Sơ Đồ Bàn POS
            </Button>

            {activeTab === "tables" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddTable}
                leftIcon={<PlusOutlined />}
                className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white shadow-2xs whitespace-nowrap"
              >
                Thêm Bàn Mới
              </Button>
            ) : activeTab === "pricing" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddPricing}
                leftIcon={<PlusOutlined />}
                className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white shadow-2xs whitespace-nowrap"
              >
                Thêm Khung Giờ Mới
              </Button>
            ) : null}
          </div>
        </div>

        {/* Tab Selector using SegmentedPillList */}
        <div className="px-4 py-2.5 bg-slate-50/70">
          <SegmentedPillList
            items={tabPills}
            activeKey={activeTab}
            onSelect={(key) => setActiveTab(key)}
          />
        </div>
      </Card>

      {activeTab === "tables" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 mb-1">Tổng Số Bàn</span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {stats.total} Bàn
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                {stats.floorBreakdown.length > 0
                  ? stats.floorBreakdown.map((fb) => `Tầng ${fb.floor}: ${fb.count}`).join(" • ")
                  : "Chưa phân tầng"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-200/70 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-cyan-800 mb-1">Bàn Bida Lỗ (Pool)</span>
              <span className="text-2xl font-black text-cyan-900 font-mono">{stats.pool} Bàn</span>
              <span className="text-[11px] text-cyan-700/80 mt-1">
                {stats.total > 0 ? Math.round((stats.pool / stats.total) * 100) : 0}% tổng số bàn
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-amber-800 mb-1">
                Bàn Bida Carom (Phăng)
              </span>
              <span className="text-2xl font-black text-amber-900 font-mono">
                {stats.carom} Bàn
              </span>
              <span className="text-[11px] text-amber-700/80 mt-1">
                {stats.total > 0 ? Math.round((stats.carom / stats.total) * 100) : 0}% tổng số bàn
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/70 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-purple-800 mb-1">Bàn Bida Snooker</span>
              <span className="text-2xl font-black text-purple-900 font-mono">
                {stats.snooker} Bàn
              </span>
              <span className="text-[11px] text-purple-700/80 mt-1">
                {stats.total > 0 ? Math.round((stats.snooker / stats.total) * 100) : 0}% tổng số bàn
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-xs font-semibold text-slate-500 mb-1">Tình trạng vận hành</span>
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-xl font-black text-emerald-700 font-mono">
                  {stats.available} Trống
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-base font-bold text-rose-600 font-mono">
                  {stats.playing} Chơi
                </span>
                {stats.paused > 0 && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-sm font-bold text-amber-600 font-mono">
                      {stats.paused} Tạm dừng
                    </span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-slate-500 mt-1">
                Đã đặt: {stats.booked} • Bảo trì: {stats.maintenance}
              </span>
            </div>
          </div>

          <Card
            styles={{ body: { padding: 0 } }}
            className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white"
          >
            <div className="p-3.5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-2.5">
                <Select
                  value={filterType}
                  onChange={handleFilterTypeChange}
                  className="!w-44 !rounded-xl !text-xs"
                  options={[
                    { value: "all", label: "Tất cả loại bàn" },
                    { value: "pool", label: "Bàn Bida Lỗ (Pool)" },
                    { value: "carom", label: "Bàn Bida Carom (Phăng)" },
                    { value: "snooker", label: "Bàn Bida Snooker" },
                  ]}
                />

                <Select
                  value={filterFloor}
                  onChange={handleFilterFloorChange}
                  className="!w-36 !rounded-xl !text-xs"
                  options={[
                    { value: "all", label: "Tất cả tầng" },
                    ...distinctFloors.map((f) => ({
                      value: String(f),
                      label: `Tầng ${f} (${tables.filter((t) => t.floor === f).length} bàn)`,
                    })),
                  ]}
                />

                <Select
                  value={filterArea}
                  onChange={handleFilterAreaChange}
                  className="!w-40 !rounded-xl !text-xs"
                  options={[
                    { value: "all", label: "Tất cả khu vực" },
                    ...distinctAreas.map((a) => ({
                      value: a,
                      label: `${a} (${tables.filter((t) => t.area === a).length})`,
                    })),
                  ]}
                />

                <Select
                  value={filterStatus}
                  onChange={handleFilterStatusChange}
                  className="!w-36 !rounded-xl !text-xs"
                  options={[
                    { value: "all", label: "Tất cả trạng thái" },
                    { value: "available", label: "Bàn trống" },
                    { value: "playing", label: "Đang chơi" },
                    { value: "booked", label: "Đã đặt trước" },
                    { value: "maintenance", label: "Bảo trì" },
                  ]}
                />

                {isFiltering && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    leftIcon={<ClearOutlined />}
                    className="!h-8 !px-2.5 !rounded-lg !text-xs !border-slate-300 !text-slate-500 hover:!text-slate-800"
                  >
                    Đặt lại
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2.5 self-end lg:self-center">
                <SearchFilterInput
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Tìm mã bàn, tên bàn, khu vực..."
                  width={260}
                />

                <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                  <Tooltip title="Xem dạng bảng">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                        viewMode === "table"
                          ? "bg-white text-emerald-700 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <UnorderedListOutlined className="text-xs" />
                      <span>Bảng</span>
                    </button>
                  </Tooltip>
                  <Tooltip title="Xem dạng thẻ sàn">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                        viewMode === "grid"
                          ? "bg-white text-emerald-700 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <AppstoreOutlined className="text-xs" />
                      <span>Thẻ Sàn</span>
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              {(() => {
                const totalCount = filteredTables.length;
                const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
                const endItem = Math.min(currentPage * pageSize, totalCount);
                return (
                  <span>
                    Hiển thị{" "}
                    <strong className="text-slate-900 font-mono">
                      {startItem}–{endItem}
                    </strong>{" "}
                    / <strong className="text-slate-900 font-mono">{totalCount}</strong> bàn bida
                  </span>
                );
              })()}
              {isFiltering && (
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Đang lọc
                </span>
              )}
            </div>

            {/* ── 2C. DATA VIEW (TABLE OR GRID) ───────────────────────────────── */}
            {viewMode === "table" ? (
              <div className="overflow-x-auto">
                <Table
                  dataSource={filteredTables.map((t) => ({ ...t, key: t._id }))}
                  columns={tableColumns}
                  loading={loading}
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: filteredTables.length,
                    onChange: (page) => setCurrentPage(page),
                    showTotal: (total, range) =>
                      `Hiển thị ${range[0]}–${range[1]} / ${total} bàn bida`,
                  }}
                  className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-tbody_td]:!py-3"
                />
              </div>
            ) : (
              <div className="p-4">
                {filteredTables.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <AppstoreOutlined className="text-4xl mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Không tìm thấy bàn nào phù hợp với bộ lọc</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                      className="mt-2"
                    >
                      Xóa bộ lọc
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {paginatedTables.map((table) => {
                        const isMaintenance = table.status === "maintenance";
                        const isPlaying = table.status === "playing";
                        const isBooked = table.status === "booked";
                        const isLocked =
                          table.status === "playing" ||
                          table.status === "paused" ||
                          table.status === "booked";

                        return (
                          <div
                            key={table._id}
                            className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md ${
                              isPlaying
                                ? "bg-rose-50/20 border-rose-200"
                                : isBooked
                                  ? "bg-blue-50/20 border-blue-200"
                                  : isMaintenance
                                    ? "bg-slate-50 border-slate-200"
                                    : "bg-white border-slate-200 hover:border-emerald-300"
                            }`}
                          >
                            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`min-w-[64px] px-2 py-0.5 rounded-md font-mono font-bold text-xs text-center whitespace-nowrap shrink-0 border ${
                                    table.type === "snooker"
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : table.type === "carom"
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-cyan-50 text-cyan-800 border-cyan-200"
                                  }`}
                                >
                                  {table.code}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  Tầng {table.floor}
                                </span>
                              </div>

                              {isMaintenance ? (
                                <Tag
                                  color="error"
                                  className="!rounded-full !px-2.5 !py-0.5 !font-bold text-[11px]"
                                >
                                  Bảo trì
                                </Tag>
                              ) : isPlaying ? (
                                <Tag
                                  color="error"
                                  className="!rounded-full !px-2.5 !py-0.5 !font-bold !bg-rose-50 !text-rose-700 !border-rose-200 text-[11px] inline-flex items-center gap-1"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  Đang chơi
                                </Tag>
                              ) : isBooked ? (
                                <Tag
                                  color="blue"
                                  className="!rounded-full !px-2.5 !py-0.5 !font-bold !bg-blue-50 !text-blue-700 !border-blue-200 text-[11px]"
                                >
                                  Đã đặt
                                </Tag>
                              ) : (
                                <Tag
                                  color="green"
                                  className="!rounded-full !px-2.5 !py-0.5 !font-bold text-[11px]"
                                >
                                  Trống
                                </Tag>
                              )}
                            </div>

                            <div className="p-3.5 space-y-2.5 flex-1">
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <h4 className="text-base font-bold text-slate-900 mb-0">
                                    {table.name}
                                  </h4>
                                  <Tag
                                    color={
                                      table.type === "snooker"
                                        ? "purple"
                                        : table.type === "carom"
                                          ? "gold"
                                          : "cyan"
                                    }
                                    className="!rounded-full !px-2 !py-0.5 !font-semibold !text-[11px] !m-0"
                                  >
                                    {getTableTypeLabel(table.type)}
                                  </Tag>
                                </div>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mb-0">
                                  <EnvironmentOutlined className="text-slate-400" />
                                  <span>{table.area}</span>
                                </p>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-baseline justify-between">
                                <span className="text-xs text-slate-500 font-medium">Giá giờ:</span>
                                <span className="font-mono font-bold text-emerald-700 text-base">
                                  {table.pricePerHour.toLocaleString("vi-VN")}đ
                                  <span className="text-xs font-normal text-slate-400">/h</span>
                                </span>
                              </div>
                            </div>

                            <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                              <Tooltip
                                title={
                                  isLocked
                                    ? "Bàn đang có khách chơi hoặc đã đặt, không thể sửa thông số"
                                    : "Chỉnh sửa thông số bàn"
                                }
                              >
                                <span className={`flex-1 ${isLocked ? "inline-block cursor-not-allowed" : ""}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isLocked}
                                    onClick={() => handleOpenEditTable(table)}
                                    leftIcon={<EditOutlined />}
                                    className={`!h-8 !w-full !rounded-xl !text-xs font-medium ${
                                      isLocked
                                        ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                                        : "!border-slate-300 hover:!border-emerald-600"
                                    }`}
                                  >
                                    Sửa
                                  </Button>
                                </span>
                              </Tooltip>

                              <Tooltip
                                title={
                                  isMaintenance
                                    ? "Mở lại bàn vào hoạt động"
                                    : isLocked
                                      ? "Bàn đang có khách hoặc đã đặt, không thể chuyển bảo trì"
                                      : "Chuyển bàn sang bảo trì nỉ"
                                }
                              >
                                <span className={isLocked ? "inline-block cursor-not-allowed" : ""}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isLocked}
                                    onClick={() => handleToggleMaintenance(table)}
                                    leftIcon={<ToolOutlined />}
                                    className={`!h-8 !px-2.5 !rounded-xl !text-xs font-medium ${
                                      isMaintenance
                                        ? "!bg-emerald-50 !border-emerald-300 !text-emerald-800"
                                        : isLocked
                                          ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                                          : "!border-amber-300 !bg-amber-50/60 !text-amber-800 hover:!bg-amber-100"
                                    }`}
                                  >
                                    {isMaintenance ? "Mở Lại" : "Bảo Trì"}
                                  </Button>
                                </span>
                              </Tooltip>

                              <Tooltip
                                title={
                                  isLocked
                                    ? "Không thể xóa khi bàn đang có khách chơi hoặc đã đặt trước"
                                    : "Xóa bàn khỏi hệ thống"
                                }
                              >
                                <span className={isLocked ? "inline-block cursor-not-allowed" : ""}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isLocked}
                                    onClick={() => {
                                      if (isLocked) return;
                                      setDeleteTarget({
                                        id: table._id,
                                        type: "table",
                                        name: `${table.name} (${table.code})`,
                                      });
                                      setDeleteConfirmVisible(true);
                                    }}
                                    leftIcon={
                                      <DeleteOutlined
                                        className={isLocked ? "!text-slate-400" : "text-rose-500"}
                                      />
                                    }
                                    className={`!h-8 !px-2.5 !rounded-xl !text-xs font-medium ${
                                      isLocked
                                        ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400 pointer-events-none"
                                        : "!border-slate-300 !text-rose-600 hover:!border-rose-300 hover:!bg-rose-50"
                                    }`}
                                  >
                                    Xóa
                                  </Button>
                                </span>
                              </Tooltip>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredTables.length > pageSize && (
                      <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                        <Pagination
                          current={currentPage}
                          pageSize={pageSize}
                          total={filteredTables.length}
                          onChange={(page) => setCurrentPage(page)}
                          showTotal={(total, range) =>
                            `Hiển thị ${range[0]}–${range[1]} / ${total} bàn bida`
                          }
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "pricing" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Title level={4} className="!text-base !font-black !text-slate-900 !mb-0">
                Biểu Giá Giờ Chơi Theo Khung Giờ
              </Title>
              <Text className="!text-xs !text-slate-500">
                Tự động áp dụng mức giá tương ứng theo thời gian khách mở bàn tại quầy POS
              </Text>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ClockCircleOutlined className="text-emerald-600" />
                  Sơ Đồ Phân Bổ 24 Giờ Trong Ngày (Dữ Liệu Thực Tế)
                </span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTimelineDayFilter("today")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      timelineDayFilter === "today"
                        ? "bg-white text-emerald-700 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineDayFilter("weekday")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      timelineDayFilter === "weekday"
                        ? "bg-white text-emerald-700 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Ngày thường (T2–T6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineDayFilter("weekend")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      timelineDayFilter === "weekend"
                        ? "bg-white text-emerald-700 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Cuối tuần (T7–CN)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[11px]">
                  Thời gian:{" "}
                  <strong className="text-slate-900 font-mono">
                    {new Date(currentTime).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                  {" • "}Đang áp dụng:{" "}
                  <strong className="text-emerald-700">
                    {formatActivePricingLabel(activePricingTier)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Thanh Timeline 24H ĐỘNG từ Database */}
            <div className="h-7 w-full rounded-lg overflow-hidden flex text-[10px] font-bold text-white shadow-inner bg-slate-100">
              {timelineSegments.map((seg, idx) => (
                <Tooltip
                  key={idx}
                  title={`${seg.name}: ${seg.startTime} – ${seg.endTime} (${seg.isFallback ? "Tính theo đơn giá chuẩn bàn" : "Áp dụng biểu giá khung giờ"})`}
                >
                  <div
                    style={{ width: `${seg.widthPercent}%` }}
                    className={`${seg.bgColor} flex items-center justify-center truncate px-1 transition-all cursor-pointer relative ${
                      seg.isCurrent ? "ring-2 ring-white ring-inset font-black" : ""
                    }`}
                  >
                    {seg.widthPercent > 10 && (
                      <span className="truncate">
                        {seg.startTime}–{seg.endTime} {seg.widthPercent > 18 ? `(${seg.name.replace(/Khung Giờ\s*/gi, "")})` : ""}
                      </span>
                    )}
                  </div>
                </Tooltip>
              ))}
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 font-mono px-0.5">
              <span>00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
              <span>24:00</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pricingTiers.map((tier) => {
              const isTierActive = tier._id === activePricingTier?._id;
              const isPaused = tier.isActive === false;

              return (
                <Card
                  key={tier._id}
                  styles={{ body: { padding: 0 } }}
                  className={`!rounded-2xl border transition-all overflow-hidden shadow-2xs hover:shadow-sm ${
                    isPaused
                      ? "!border-slate-200 bg-slate-50/60 opacity-80"
                      : isTierActive
                        ? "!border-emerald-500 bg-white ring-2 ring-emerald-500/20"
                        : "!border-slate-200 bg-white"
                  }`}
                >
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
                          isPaused
                            ? "bg-slate-200 text-slate-500"
                            : isTierActive
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <ClockCircleOutlined className="text-base" />
                      </div>
                      <div>
                        <strong
                          className={`text-sm block ${isPaused ? "text-slate-500 line-through" : "text-slate-900"}`}
                        >
                          {tier.name}
                        </strong>
                        <span className="font-mono text-xs text-slate-500 font-bold">
                          {tier.startTime} – {tier.endTime}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPaused ? (
                        <Tag
                          color="default"
                          className="!rounded-full !px-3 !py-1 !font-bold inline-flex items-center gap-1.5 shadow-2xs text-slate-600 bg-slate-100 border-slate-300"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          TẠM NGƯNG
                        </Tag>
                      ) : isTierActive ? (
                        <Tag
                          color="green"
                          className="!rounded-full !px-3 !py-1 !font-bold inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ĐANG ÁP DỤNG
                        </Tag>
                      ) : (
                        <Tag
                          color="blue"
                          className="!rounded-full !px-3 !py-1 !font-bold inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          THEO LỊCH
                        </Tag>
                      )}
                      {tier.dayType === "peak" && (
                        <Tag color="gold" className="!rounded-full !px-2.5 !py-0.5 !font-bold">
                          GIỜ VÀNG
                        </Tag>
                      )}
                      {tier.dayType === "weekend" && (
                        <Tag color="blue" className="!rounded-full !px-2.5 !py-0.5 !font-bold">
                          CUỐI TUẦN
                        </Tag>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-[11px] text-slate-700 font-bold block mb-1">
                          Bàn Tiêu Chuẩn
                        </span>
                        <strong className="text-sm font-black text-slate-900 font-mono">
                          {tier.prices.standard.toLocaleString("vi-VN")}đ
                        </strong>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Khu thường (Pool / Carom)
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                        <span className="text-[11px] text-amber-900 font-bold block mb-1">
                          Bàn Khu VIP
                        </span>
                        <strong className="text-sm font-black text-amber-900 font-mono">
                          {tier.prices.vip.toLocaleString("vi-VN")}đ
                        </strong>
                        <span className="text-[10px] text-amber-700/80 block mt-0.5">
                          Pool VIP / Carom VIP
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80">
                        <span className="text-[11px] text-purple-900 font-bold block mb-1">
                          Bàn Thi Đấu / Snooker
                        </span>
                        <strong className="text-sm font-black text-purple-900 font-mono">
                          {(tier.prices.match ?? tier.prices.vip + 10000).toLocaleString("vi-VN")}đ
                        </strong>
                        <span className="text-[10px] text-purple-700/80 block mt-0.5">
                          Bàn Match / 12FT
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500">{formatDaysOfWeek(tier)}</span>

                      <Space size={6}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditPricing(tier)}
                          leftIcon={<EditOutlined />}
                          className="!h-7 !px-2.5 !rounded-lg !text-xs !border-slate-300 hover:!border-emerald-600"
                        >
                          Sửa Giá
                        </Button>
                        <Tooltip
                          title={
                            isTierActive
                              ? "Khung giờ đang áp dụng tính tiền trực tiếp cho khách, không thể tạm ngưng"
                              : isPaused
                                ? "Kích hoạt lại khung giờ này vào lịch tính tiền tự động"
                                : "Tạm ngưng khung giờ này (sẽ bỏ qua khi tính tiền)"
                          }
                        >
                          <span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isTierActive}
                              onClick={() => handleToggleTierActive(tier)}
                              leftIcon={
                                isPaused ? (
                                  <PlayCircleOutlined className="text-emerald-600" />
                                ) : (
                                  <PauseCircleOutlined
                                    className={isTierActive ? "text-slate-400" : "text-amber-600"}
                                  />
                                )
                              }
                              className={`!h-7 !px-2.5 !rounded-lg !text-xs font-medium !border-slate-300 ${
                                isTierActive
                                  ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400"
                                  : isPaused
                                    ? "!text-emerald-700 hover:!border-emerald-500 hover:!bg-emerald-50"
                                    : "!text-amber-700 hover:!border-amber-500 hover:!bg-amber-50"
                              }`}
                            >
                              {isPaused ? "Bật Lại" : "Tạm Ngưng"}
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            isTierActive
                              ? "Khung giờ đang áp dụng tính tiền cho khách, không thể xóa"
                              : "Xóa khung giờ khỏi danh mục"
                          }
                        >
                          <span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isTierActive}
                              onClick={() => {
                                setDeleteTarget({ id: tier._id, type: "pricing", name: tier.name });
                                setDeleteConfirmVisible(true);
                              }}
                              leftIcon={
                                <DeleteOutlined
                                  className={isTierActive ? "text-slate-400" : "text-rose-500"}
                                />
                              }
                              className={`!h-7 !px-2.5 !rounded-lg !text-xs font-medium !border-slate-300 ${
                                isTierActive
                                  ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400"
                                  : "!text-rose-600 hover:!border-rose-300 hover:!bg-rose-50"
                              }`}
                            >
                              Xóa
                            </Button>
                          </span>
                        </Tooltip>
                      </Space>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={tableModalVisible}
        onCancel={() => setTableModalVisible(false)}
        footer={null}
        width={540}
        title={
          <Space align="center" size={10}>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <AppstoreOutlined className="text-base" />
            </div>
            <span className="font-bold text-slate-900 text-base">
              {editingTable ? `Chỉnh Sửa ${editingTable.name}` : "Thêm Bàn Bida Mới"}
            </span>
          </Space>
        }
      >
        <div className="py-2 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mã bàn:</label>
              <Input
                placeholder="T01, V09, M13..."
                value={tableCode}
                onChange={(e) => setTableCode(e.target.value)}
                className="!h-9 !rounded-xl font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tên hiển thị:</label>
              <Input
                placeholder="Bàn 01, Bàn VIP 09..."
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="!h-9 !rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Loại bàn:</label>
              <Select
                value={tableType}
                onChange={(val) => setTableType(val as TableType)}
                className="!w-full !rounded-xl"
                options={[
                  { value: "pool", label: "Bàn Bida Lỗ (Pool)" },
                  { value: "carom", label: "Bàn Bida Carom (Phăng)" },
                  { value: "snooker", label: "Bàn Bida Snooker" },
                ]}
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tầng:</label>
              <Select
                value={tableFloor}
                onChange={(val) => setTableFloor(Number(val))}
                className="!w-full !rounded-xl"
                options={[
                  ...distinctFloors.map((f) => ({
                    value: f,
                    label: `Tầng ${f}`,
                  })),
                  ...[1, 2, 3, 4, 5]
                    .filter((f) => !distinctFloors.includes(f))
                    .map((f) => ({
                      value: f,
                      label: `Tầng ${f} (Mở rộng)`,
                    })),
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Khu vực đặt bàn:</label>
            <Input
              placeholder="VD: Khu VIP, Tầng 1 - Khu A, Khu Hút Thuốc..."
              value={tableArea}
              onChange={(e) => setTableArea(e.target.value)}
              className="!h-9 !rounded-xl"
            />
            {distinctAreas.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                <span className="text-[10.5px] text-slate-400 mr-1">Gợi ý nhanh:</span>
                {distinctAreas.slice(0, 6).map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setTableArea(area)}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200 transition-colors"
                  >
                    {area}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold">Giá giờ chuẩn (VNĐ/h):</label>
              <span className="text-[11px] text-slate-400">Chọn nhanh mức giá:</span>
            </div>
            <InputNumber
              min={0}
              step={500}
              value={tablePrice}
              onChange={(val) => setTablePrice(Number(val) || 0)}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, "") || 0)}
              className="!w-full !h-9 !rounded-xl font-mono text-emerald-800 font-bold mb-2"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_PRICE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTablePrice(preset)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                    tablePrice === preset
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {(preset / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTableModalVisible(false)}
              className="!rounded-xl"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              onClick={handleSaveTable}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              Lưu Thông Tin
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={pricingModalVisible}
        onCancel={() => setPricingModalVisible(false)}
        footer={null}
        width={620}
        title={
          <Space align="center" size={10}>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ClockCircleOutlined className="text-base" />
            </div>
            <span className="font-bold text-slate-900 text-base">
              {editingPricing ? `Cập Nhật ${editingPricing.name}` : "Thêm Khung Giờ Mới"}
            </span>
          </Space>
        }
      >
        <div className="py-2 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Tên khung giờ:</label>
            <Input
              placeholder="Khung Giờ Sáng, Giờ Vàng Tối..."
              value={pricingName}
              onChange={(e) => setPricingName(e.target.value)}
              className="!h-9 !rounded-xl"
            />
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ngày áp dụng:</label>
              <Select
                value={pricingDayType}
                onChange={(val) => setPricingDayType(val)}
                className="!w-full !rounded-xl"
                options={[
                  { value: "all", label: "Cả tuần (T2–CN)" },
                  { value: "weekday", label: "Ngày thường (T2–T6)" },
                  { value: "weekend", label: "Cuối tuần (T7 & CN)" },
                ]}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Từ giờ:</label>
              <Input
                placeholder="08:00"
                value={pricingStartTime}
                onChange={(e) => setPricingStartTime(e.target.value)}
                className="!h-9 !rounded-xl font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Đến giờ:</label>
              <Input
                placeholder="17:00"
                value={pricingEndTime}
                onChange={(e) => setPricingEndTime(e.target.value)}
                className="!h-9 !rounded-xl font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Trạng thái:</label>
              <Select
                value={pricingIsActive ? "active" : "inactive"}
                onChange={(val) => setPricingIsActive(val === "active")}
                className="!w-full !rounded-xl"
                options={[
                  { value: "active", label: "Hoạt Động" },
                  { value: "inactive", label: "Tạm Ngưng" },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-xs whitespace-nowrap">
                Bàn Tiêu Chuẩn (đ/h):
              </label>
              <InputNumber
                min={0}
                step={500}
                value={pricingStandardPrice}
                onChange={(val) => setPricingStandardPrice(Number(val) || 0)}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, "") || 0)}
                className="!w-full !h-9 !rounded-xl font-mono text-center font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-xs whitespace-nowrap">
                Bàn Khu VIP (đ/h):
              </label>
              <InputNumber
                min={0}
                step={500}
                value={pricingVipPrice}
                onChange={(val) => setPricingVipPrice(Number(val) || 0)}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, "") || 0)}
                className="!w-full !h-9 !rounded-xl font-mono text-center font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-xs whitespace-nowrap">
                Bàn Thi Đấu / Snooker (đ/h):
              </label>
              <InputNumber
                min={0}
                step={500}
                value={pricingMatchPrice}
                onChange={(val) => setPricingMatchPrice(Number(val) || 0)}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, "") || 0)}
                className="!w-full !h-9 !rounded-xl font-mono text-center font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-[11px] text-blue-800 flex items-start gap-2">
            <InfoCircleOutlined className="text-blue-600 mt-0.5 shrink-0" />
            <span>
              <strong>Lưu ý nghiệp vụ:</strong> Mức giá mới sẽ áp dụng cho các lượt mở bàn tiếp theo.
              Các bàn đang có khách chơi vẫn được giữ nguyên đơn giá niêm yết tại thời điểm mở bàn.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPricingModalVisible(false)}
              className="!rounded-xl"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              onClick={handleSavePricing}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              Lưu Biểu Giá
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteConfirmVisible}
        onCancel={() => setDeleteConfirmVisible(false)}
        footer={null}
        width={400}
        title={
          <Space align="center" size={8}>
            <ExclamationCircleOutlined className="text-rose-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">Xác Nhận Xóa</span>
          </Space>
        }
      >
        <div className="py-2 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed mb-0">
            Bạn có chắc chắn muốn xóa <strong>{deleteTarget?.name}</strong> khỏi danh mục? Thao tác
            này không thể hoàn tác.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmVisible(false)}
              className="!rounded-xl"
            >
              Hủy Bỏ
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={saving}
              onClick={handleConfirmDelete}
              className="!rounded-xl font-bold px-4"
            >
              Xác Nhận Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TablesManagementPage;
