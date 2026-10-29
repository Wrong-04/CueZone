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
  CheckCircleOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  BulbOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined,
  ClearOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
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
import type { BilliardTable, PricingTier, TableType } from "../../types";
import { tableAdminService, pricingAdminService } from "../../services/pos.service";

const { Title, Text } = Typography;

const QUICK_PRICE_PRESETS = [40000, 50000, 60000, 70000, 80000, 100000, 120000];

const getEquipmentDetails = (type: TableType) => {
  if (type === "snooker") {
    return {
      cloth: "Nỉ Strachan 6811 Gold",
      ball: "Bi Aramith Tournament Champion",
      cushion: "Băng Northern Rubber",
    };
  }
  if (type === "carom") {
    return {
      cloth: "Nỉ Simonis 300 Rapide",
      ball: "Bi Aramith Super Pro Carom",
      cushion: "Băng sưởi nhiệt Klematch P37",
    };
  }
  return {
    cloth: "Nỉ Simonis 860 HR",
    ball: "Bi Aramith Pro Cup TV",
    cushion: "Băng cao su K-Steel",
  };
};

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
  return activeOnly.find((t) => t.isCurrentlyActive) || activeOnly[0] || pricingTiers[0] || null;
}

export function formatActivePricingLabel(tier: PricingTier | null): string {
  if (!tier) return "Biểu giá chuẩn";
  const cleanName = tier.name.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  return `${cleanName} (${tier.startTime} – ${tier.endTime})`;
}

export function formatDaysOfWeek(tier: PricingTier): string {
  if (tier.daysOfWeek && tier.daysOfWeek.length === 7) {
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

  const stats = useMemo(() => {
    const total = tables.length;
    const pool = tables.filter((t) => t.type === "pool").length;
    const carom = tables.filter((t) => t.type === "carom").length;
    const snooker = tables.filter((t) => t.type === "snooker").length;
    const maintenance = tables.filter((t) => t.status === "maintenance").length;
    const playing = tables.filter((t) => t.status === "playing").length;
    const booked = tables.filter((t) => t.status === "booked").length;
    const available = tables.filter((t) => t.status === "available").length;
    const floor1 = tables.filter((t) => t.floor === 1).length;
    const floor2 = tables.filter((t) => t.floor === 2).length;
    return { total, pool, carom, snooker, maintenance, playing, booked, available, floor1, floor2 };
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchType = filterType === "all" || t.type === filterType;
      const matchFloor = filterFloor === "all" || String(t.floor) === String(filterFloor);
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
      return matchType && matchFloor && matchStatus && matchQuery;
    });
  }, [tables, filterType, filterFloor, filterStatus, searchQuery]);

  const isFiltering =
    filterType !== "all" ||
    filterFloor !== "all" ||
    filterStatus !== "all" ||
    searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setFilterType("all");
    setFilterFloor("all");
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
      label: "Danh Mục Bàn Bida",
      badge: stats.total,
      dotClassName: "bg-emerald-500",
    },
    {
      key: "pricing",
      label: "Cấu Hình Bảng Giá Khung Giờ",
      badge: pricingTiers.length,
      dotClassName: "bg-blue-500",
    },
    { key: "automation", label: "Quy Tắc Tính Giờ & Tự Động Hóa", dotClassName: "bg-amber-500" },
  ];

  // ── Handlers: Table CRUD ────────────────────────────────────────────────────
  const handleOpenAddTable = () => {
    setEditingTable(null);
    setTableCode(`T${tables.length + 1 < 10 ? "0" + (tables.length + 1) : tables.length + 1}`);
    setTableName(`Bàn ${tables.length + 1 < 10 ? "0" + (tables.length + 1) : tables.length + 1}`);
    setTableType("pool");
    setTableArea("Tầng 1 - Khu C");
    setTableFloor(1);
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
    setPricingDayType("weekday");
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
    setPricingDayType(tier.dayType);
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

    setSaving(true);
    try {
      if (editingPricing) {
        await pricingAdminService.update(editingPricing._id, {
          name: pricingName.trim(),
          dayType: pricingDayType as any,
          startTime: pricingStartTime,
          endTime: pricingEndTime,
          daysOfWeek: editingPricing.daysOfWeek,
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
      render: (area: string, record: BilliardTable) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <EnvironmentOutlined className="text-slate-400 text-xs shrink-0" />
          <span>{area}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold whitespace-nowrap">
            Tầng {record.floor}
          </span>
        </div>
      ),
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
      title: "Quy Cách Nỉ & Bi",
      key: "equipment",
      render: (_: any, record: BilliardTable) => {
        const eq = getEquipmentDetails(record.type);
        return (
          <div className="text-[11px] text-slate-500 space-y-0.5 max-w-[240px]">
            <div className="truncate" title={eq.cloth}>
              • {eq.cloth}
            </div>
            <div className="truncate text-slate-400" title={eq.ball}>
              • {eq.ball}
            </div>
          </div>
        );
      },
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
        const isLocked = record.status === "playing" || record.status === "booked";

        return (
          <Space size={4}>
            <Tooltip
              title={
                isLocked
                  ? "Bàn đang có khách chơi hoặc đã đặt, không thể sửa thông số"
                  : "Chỉnh sửa thông số bàn"
              }
            >
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLocked}
                  onClick={() => handleOpenEditTable(record)}
                  leftIcon={<EditOutlined />}
                  className={`!h-7 !px-2.5 !rounded-lg !text-xs font-medium ${
                    isLocked
                      ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400"
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
              <span>
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
                        ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400"
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
                  ? "Không thể xóa bàn đang hoạt động hoặc đã đặt trước"
                  : "Xóa bàn khỏi hệ thống"
              }
            >
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLocked}
                  onClick={() => {
                    setDeleteTarget({
                      id: record._id,
                      type: "table",
                      name: `${record.name} (${record.code})`,
                    });
                    setDeleteConfirmVisible(true);
                  }}
                  leftIcon={
                    <DeleteOutlined className={isLocked ? "text-slate-400" : "text-rose-500"} />
                  }
                  className={`!h-7 !px-2.5 !rounded-lg !text-xs font-medium ${
                    isLocked
                      ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400"
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
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Title
                level={3}
                className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight"
              >
                Quản Lý Danh Mục Bàn & Cấu Hình Bảng Giá
              </Title>
            </div>
            <Text className="!text-xs !text-slate-500 block">
              Quản lý danh sách bàn bida, khu vực và cấu hình bảng giá giờ chơi theo khung giờ
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Realtime Active Pricing Pill */}
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-center gap-2 shadow-2xs">
              <ClockCircleOutlined className="text-emerald-700 text-xs" />
              <span className="text-xs text-emerald-900 font-semibold flex items-center gap-1.5">
                <span>
                  Đang áp dụng: <strong>{formatActivePricingLabel(activePricingTier)}</strong>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/pos")}
              leftIcon={<ThunderboltOutlined />}
              className="!h-9 !rounded-xl !border-slate-300 !text-slate-700 hover:!border-emerald-600 font-medium !text-xs shadow-2xs"
            >
              Mở Sơ Đồ Bàn POS
            </Button>

            {activeTab === "tables" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddTable}
                leftIcon={<PlusOutlined />}
                className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white shadow-2xs"
              >
                Thêm Bàn Mới
              </Button>
            ) : activeTab === "pricing" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddPricing}
                leftIcon={<PlusOutlined />}
                className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white shadow-2xs"
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
              <span className="text-xs font-semibold text-slate-500 mb-1">Tổng quy mô sàn</span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {stats.total} Bàn
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Tầng 1: {stats.floor1} • Tầng 2: {stats.floor2}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-200/70 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-cyan-800 mb-1">Bàn Bida Lỗ (Pool)</span>
              <span className="text-2xl font-black text-cyan-900 font-mono">{stats.pool} Bàn</span>
              <span className="text-[11px] text-cyan-700/80 mt-1">15 bàn 9FT tiêu chuẩn</span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-amber-800 mb-1">
                Bàn Bida Carom (Phăng)
              </span>
              <span className="text-2xl font-black text-amber-900 font-mono">
                {stats.carom} Bàn
              </span>
              <span className="text-[11px] text-amber-700/80 mt-1">8 bàn Phăng / 3 Băng</span>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/70 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-semibold text-purple-800 mb-1">Bàn Bida Snooker</span>
              <span className="text-2xl font-black text-purple-900 font-mono">
                {stats.snooker} Bàn
              </span>
              <span className="text-[11px] text-purple-700/80 mt-1">4 bàn 12FT thi đấu</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-xs font-semibold text-slate-500 mb-1">Tình trạng vận hành</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {stats.available} Trống
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-lg font-bold text-rose-600 font-mono">
                  {stats.playing} Chơi
                </span>
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
                    { value: "1", label: "Tầng 1 (19 bàn)" },
                    { value: "2", label: "Tầng 2 (8 bàn)" },
                  ]}
                />

                <Select
                  value={filterStatus}
                  onChange={handleFilterStatusChange}
                  className="!w-40 !rounded-xl !text-xs"
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
                        const eq = getEquipmentDetails(table.type);
                        const isMaintenance = table.status === "maintenance";
                        const isPlaying = table.status === "playing";
                        const isBooked = table.status === "booked";
                        const isLocked = isPlaying || isBooked;

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

                              <div className="space-y-0.5 text-[11px] text-slate-500 pt-0.5">
                                <div className="truncate" title={eq.cloth}>
                                  • {eq.cloth}
                                </div>
                                <div className="truncate text-slate-400" title={eq.ball}>
                                  • {eq.ball}
                                </div>
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
                                <span className="flex-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isLocked}
                                    onClick={() => handleOpenEditTable(table)}
                                    leftIcon={<EditOutlined />}
                                    className={`!h-8 !w-full !rounded-xl !text-xs font-medium ${
                                      isLocked
                                        ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400"
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
                                <span>
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
                                          ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400"
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
                                    ? "Không thể xóa bàn đang hoạt động hoặc đã đặt trước"
                                    : "Xóa bàn khỏi hệ thống"
                                }
                              >
                                <span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isLocked}
                                    onClick={() => {
                                      setDeleteTarget({
                                        id: table._id,
                                        type: "table",
                                        name: `${table.name} (${table.code})`,
                                      });
                                      setDeleteConfirmVisible(true);
                                    }}
                                    leftIcon={
                                      <DeleteOutlined
                                        className={isLocked ? "text-slate-400" : "text-rose-500"}
                                      />
                                    }
                                    className={`!h-8 !px-2.5 !rounded-xl !text-xs font-medium ${
                                      isLocked
                                        ? "!opacity-50 !cursor-not-allowed !bg-slate-100 !border-slate-200 !text-slate-400"
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

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <ClockCircleOutlined className="text-emerald-600" />
                Sơ Đồ Phân Bổ 24 Giờ Trong Ngày
              </span>
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

            {/* Thanh Timeline 24H */}
            <div className="h-6 w-full rounded-lg overflow-hidden flex text-[10px] font-bold text-white shadow-inner">
              <div
                style={{ width: "33.33%" }}
                className="bg-indigo-600/90 flex items-center justify-center truncate px-1 transition-all"
                title="Khung Giờ Đêm (00:00 - 08:00)"
              >
                00:00 – 08:00 (Đêm)
              </div>
              <div
                style={{ width: "37.5%" }}
                className="bg-emerald-600/90 flex items-center justify-center truncate px-1 transition-all"
                title="Khung Giờ Tiêu Chuẩn (08:00 - 17:00)"
              >
                08:00 – 17:00 (Ngày)
              </div>
              <div
                style={{ width: "29.17%" }}
                className="bg-amber-600/90 flex items-center justify-center truncate px-1 transition-all"
                title="Khung Giờ Cao Điểm (17:00 - 24:00)"
              >
                17:00 – 24:00 (Tối)
              </div>
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
                          LÊN LỊCH SẴN
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
                          Bàn Bida Lỗ (Pool)
                        </span>
                        <strong className="text-sm font-black text-slate-900 font-mono">
                          {tier.prices.standard.toLocaleString("vi-VN")}đ
                        </strong>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Tiêu chuẩn 9FT
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                        <span className="text-[11px] text-amber-900 font-bold block mb-1">
                          Bàn Bida Carom (Phăng)
                        </span>
                        <strong className="text-sm font-black text-amber-900 font-mono">
                          {tier.prices.vip.toLocaleString("vi-VN")}đ
                        </strong>
                        <span className="text-[10px] text-amber-700/80 block mt-0.5">
                          Khu VIP / 3 Băng
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80">
                        <span className="text-[11px] text-purple-900 font-bold block mb-1">
                          Bàn Bida Snooker
                        </span>
                        <strong className="text-sm font-black text-purple-900 font-mono">
                          {(tier.prices.match ?? tier.prices.vip + 10000).toLocaleString("vi-VN")}đ
                        </strong>
                        <span className="text-[10px] text-purple-700/80 block mt-0.5">
                          Thi đấu 12FT
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

      {activeTab === "automation" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Title level={4} className="!text-base !font-black !text-slate-900 !mb-0">
                Quy Tắc Thu Ngân & Tự Động Hóa Thông Minh
              </Title>
              <Text className="!text-xs !text-slate-500">
                Các thuật toán tính tiền giờ, phân bổ block và cơ chế đồng bộ rơ-le thiết bị sàn
                bida
              </Text>
            </div>
            <Tag
              color="cyan"
              className="!rounded-full !px-3 !py-1 !font-bold self-start sm:self-center shadow-2xs"
            >
              ● 4 Quy Tắc Cốt Lõi Đang Hoạt Động
            </Tag>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              styles={{ body: { padding: "18px" } }}
              className="!rounded-2xl !border-slate-200 shadow-2xs bg-white space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                    <ClockCircleOutlined className="text-base" />
                  </div>
                  <div>
                    <strong className="text-sm text-slate-900 block">
                      Quy Tắc Block 15 Phút Đầu Tiên
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Mức thời gian tối thiểu của phiên chơi
                    </span>
                  </div>
                </div>
                <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !font-bold">
                  Mặc định hệ thống
                </Tag>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-0">
                Khi mở bàn tính giờ, hệ thống áp dụng mức tính tối thiểu là 15 phút đầu tiên. Trường
                hợp khách chơi dưới 15 phút, hóa đơn tạm tính tự động làm tròn đủ 15 phút nhằm bù
                đắp chi phí bảo dưỡng nỉ, vệ sinh bi và công chuẩn bị bàn ban đầu.
              </p>

              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-mono">
                <span className="text-emerald-900 font-semibold">Thời gian chơi &lt; 15 phút:</span>
                <span className="text-emerald-800 font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs self-start sm:self-auto">
                  Làm tròn = 15 phút × (Đơn giá / 60)
                </span>
              </div>
            </Card>

            <Card
              styles={{ body: { padding: "18px" } }}
              className="!rounded-2xl !border-slate-200 shadow-2xs bg-white space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                    <SettingOutlined className="text-base" />
                  </div>
                  <div>
                    <strong className="text-sm text-slate-900 block">
                      Tự Động Tính Tiền Lũy Tiến Tuyến Tính
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Thuật toán phân bổ theo từng 1 phút
                    </span>
                  </div>
                </div>
                <Tag color="blue" className="!rounded-full !px-2.5 !py-0.5 !font-bold">
                  Chuẩn SRS BD-07
                </Tag>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-0">
                Từ phút thứ 16 trở đi, hệ thống tính chuẩn xác theo từng 1 phút (block 1 phút = Đơn
                giá giờ / 60). Cơ chế lũy tiến tuyến tính loại bỏ hoàn toàn sai số làm tròn, đảm bảo
                tính công bằng và minh bạch tuyệt đối với khách hàng.
              </p>

              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-mono">
                <span className="text-blue-900 font-semibold">Từ phút thứ 16 trở đi:</span>
                <span className="text-blue-800 font-bold bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs self-start sm:self-auto">
                  Tiền giờ = (Số phút thực tế × Đơn giá) / 60
                </span>
              </div>
            </Card>

            <Card
              styles={{ body: { padding: "18px" } }}
              className="!rounded-2xl !border-slate-200 shadow-2xs bg-white space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                    <BulbOutlined className="text-base" />
                  </div>
                  <div>
                    <strong className="text-sm text-slate-900 block">
                      Rơ-Le Điều Khiển Đèn Tự Động (IoT Smart Relay)
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Tự động hóa đồng bộ thiết bị sàn
                    </span>
                  </div>
                </div>
                <Tag color="gold" className="!rounded-full !px-2.5 !py-0.5 !font-bold">
                  Đồng bộ POS & IoT
                </Tag>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-0">
                Khi thu ngân bấm <strong>Bật Bàn Tính Giờ</strong> trên POS, rơ-le thông minh tự
                động cấp nguồn cho đèn chụp bàn tương ứng. Khi hoàn tất thanh toán, hệ thống duy trì
                trễ 30 giây (Buffer Time) hỗ trợ khách thu dọn phụ kiện/bao cơ trước khi ngắt hẳn.
              </p>

              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-mono">
                <span className="text-amber-900 font-semibold">Quy trình rơ-le:</span>
                <span className="text-amber-800 font-bold bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs text-[11px] self-start sm:self-auto">
                  Mở bàn ➔ Bật đèn | Đóng bàn ➔ Trễ 30s ➔ Tắt nguồn
                </span>
              </div>
            </Card>

            <Card
              styles={{ body: { padding: "18px" } }}
              className="!rounded-2xl !border-slate-200 shadow-2xs bg-white space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                    <SafetyCertificateOutlined className="text-base" />
                  </div>
                  <div>
                    <strong className="text-sm text-slate-900 block">
                      Tự Động Phân Tách Khung Giờ (Split-Time Rate)
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Thuật toán vắt qua các mốc biểu giá
                    </span>
                  </div>
                </div>
                <Tag color="purple" className="!rounded-full !px-2.5 !py-0.5 !font-bold">
                  Tự động chuyển giá
                </Tag>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-0">
                Khi phiên chơi giao thoa giữa các khung giờ giá khác nhau, thuật toán tự động phân
                tách chính xác số phút theo từng mốc giá và cộng dồn vào hóa đơn cuối cùng mà thu
                ngân không cần thao tác tính nhẩm hay can thiệp thủ công.
              </p>

              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-mono">
                <span className="text-purple-900 font-semibold">
                  Ví dụ chơi 17:00 – 19:30 (Mốc 18:00):
                </span>
                <span className="text-purple-800 font-bold bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs text-[11px] self-start sm:self-auto">
                  [60p × Giá Ngày] + [90p × Giá Giờ Vàng]
                </span>
              </div>
            </Card>
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
                  { value: 1, label: "Tầng 1 (Khu Sàn)" },
                  { value: 2, label: "Tầng 2 (Khu VIP & Match)" },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Khu vực đặt bàn:</label>
            <Input
              placeholder="Tầng 1 - Khu A, Tầng 2 - Phòng VIP..."
              value={tableArea}
              onChange={(e) => setTableArea(e.target.value)}
              className="!h-9 !rounded-xl"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold">Giá giờ chuẩn (VNĐ/h):</label>
              <span className="text-[11px] text-slate-400">Chọn nhanh mức giá:</span>
            </div>
            <Input
              type="number"
              value={tablePrice}
              onChange={(e) => setTablePrice(Number(e.target.value))}
              className="!h-9 !rounded-xl font-mono text-emerald-800 font-bold mb-2"
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

          {(() => {
            const eq = getEquipmentDetails(tableType);
            return (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
                <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                  <CheckCircleOutlined className="text-emerald-600" />
                  Quy cách trang bị chuẩn ({getTableTypeLabel(tableType)}):
                </span>
                <div className="text-[11px] text-slate-600 space-y-0.5 pl-4">
                  <div>
                    • Nỉ: <strong>{eq.cloth}</strong>
                  </div>
                  <div>
                    • Bi: <strong>{eq.ball}</strong>
                  </div>
                  <div>
                    • Băng: <strong>{eq.cushion}</strong>
                  </div>
                </div>
              </div>
            );
          })()}

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
              <label className="block text-slate-700 font-semibold mb-1">Loại ngày:</label>
              <Select
                value={pricingDayType}
                onChange={(val) => setPricingDayType(val)}
                className="!w-full !rounded-xl"
                options={[
                  { value: "weekday", label: "Ngày Thường" },
                  { value: "peak", label: "Giờ Cao Điểm" },
                  { value: "weekend", label: "Cuối Tuần" },
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
                Bàn Lỗ - Pool (đ/h):
              </label>
              <Input
                type="number"
                value={pricingStandardPrice}
                onChange={(e) => setPricingStandardPrice(Number(e.target.value))}
                className="!h-9 !rounded-xl font-mono text-center font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-xs whitespace-nowrap">
                Bàn Carom - Phăng (đ/h):
              </label>
              <Input
                type="number"
                value={pricingVipPrice}
                onChange={(e) => setPricingVipPrice(Number(e.target.value))}
                className="!h-9 !rounded-xl font-mono text-center font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-xs whitespace-nowrap">
                Bàn Snooker (đ/h):
              </label>
              <Input
                type="number"
                value={pricingMatchPrice}
                onChange={(e) => setPricingMatchPrice(Number(e.target.value))}
                className="!h-9 !rounded-xl font-mono text-center font-bold text-slate-800"
              />
            </div>
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
