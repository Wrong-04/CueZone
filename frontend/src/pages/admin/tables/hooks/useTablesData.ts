import { useState, useEffect, useMemo, useCallback } from "react";
import { message } from "../../../../shared/ui";
import { tableAdminService, pricingAdminService } from "../../../../services/pos.service";
import type { BilliardTable, PricingTier, TableType } from "../../../../types";
import {
  getActivePricingTier,
  type TablesStats,
} from "../types/tables.types";
import { generateTimelineSegments } from "../utils/timeline.utils";

/**
 * Custom Hook: useTablesData
 * Quản lý toàn bộ dữ liệu và logic nghiệp vụ cho màn hình Quản Lý Bàn & Bảng Giá:
 * 1. Nạp danh mục bàn bida và danh sách khung giờ bảng giá từ máy chủ.
 * 2. Phân loại, tìm kiếm, lọc theo loại bàn (Pool/Carom/Snooker), theo tầng, khu vực và trạng thái.
 * 3. Tính toán thống kê số lượng bàn bida (tổng bàn, loại bàn, trạng thái hoạt động).
 * 4. Xác định khung giờ giá hiện hành theo thời gian thực và tạo các đoạn timeline 24h.
 * 5. Các hành động CRUD: Thêm/Sửa/Xóa bàn, Chuyển bảo trì, Thêm/Sửa/Xóa khung giờ giá.
 */
export function useTablesData() {
  // ── 1. State: Điều hướng Tab, Chế độ xem & Phân trang ──────────────────────
  const [activeTab, setActiveTab] = useState<string>("tables");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // ── 2. State: Dữ liệu chính từ máy chủ ────────────────────────────────────
  const [tables, setTables] = useState<BilliardTable[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // ── 3. State: Bộ lọc tìm kiếm & Phân khu ──────────────────────────────────
  const [filterType, setFilterType] = useState<string>("all");
  const [filterFloor, setFilterFloor] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [timelineDayFilter, setTimelineDayFilter] = useState<"today" | "weekday" | "weekend">("today");

  // ── 4. State: Form Modal Bàn Bida ─────────────────────────────────────────
  const [tableModalVisible, setTableModalVisible] = useState<boolean>(false);
  const [editingTable, setEditingTable] = useState<BilliardTable | null>(null);
  const [tableCode, setTableCode] = useState<string>("");
  const [tableName, setTableName] = useState<string>("");
  const [tableType, setTableType] = useState<TableType>("pool");
  const [tableArea, setTableArea] = useState<string>("Tầng 1 - Khu C");
  const [tableFloor, setTableFloor] = useState<number>(1);
  const [tablePrice, setTablePrice] = useState<number>(50000);

  // ── 5. State: Form Modal Khung Giờ Bảng Giá ───────────────────────────────
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

  // ── 6. State: Modal Xác Nhận Xóa ──────────────────────────────────────────
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: "table" | "pricing";
    name: string;
  } | null>(null);

  // Đồng hồ cập nhật định kỳ mỗi 15 giây để kiểm tra khung giờ giá hiện hành
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // ── 7. Tải dữ liệu danh mục bàn và bảng giá từ Backend ───────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Dọn dẹp cache cũ nếu có để đảm bảo lấy dữ liệu mới nhất
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

  // ── 8. Derived State (useMemo): Tính toán số liệu thống kê & bộ lọc ────────
  // Xác định khung giờ giá đang có hiệu lực tại thời điểm hiện tại
  const activePricingTier = useMemo(() => {
    return getActivePricingTier(pricingTiers, currentTime);
  }, [pricingTiers, currentTime]);

  // Trích xuất danh sách các tầng có trong danh mục bàn
  const distinctFloors = useMemo(() => {
    const set = new Set<number>();
    tables.forEach((t) => {
      if (typeof t.floor === "number" && !isNaN(t.floor)) set.add(t.floor);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [tables]);

  // Trích xuất danh sách các khu vực có trong danh mục bàn
  const distinctAreas = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      if (t.area && t.area.trim()) set.add(t.area.trim());
    });
    return Array.from(set).sort();
  }, [tables]);

  // Tổng hợp chỉ số thống kê phục vụ 5 thẻ KPI
  const stats: TablesStats = useMemo(() => {
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
    return {
      total,
      pool,
      carom,
      snooker,
      maintenance,
      playing,
      paused,
      booked,
      available,
      floorBreakdown,
    };
  }, [tables, distinctFloors]);

  // Lọc danh sách bàn theo từ khóa tìm kiếm và các tiêu chí lọc
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchType = filterType === "all" || t.type === filterType;
      const matchFloor = filterFloor === "all" || String(t.floor) === String(filterFloor);
      const matchArea = filterArea === "all" || t.area === filterArea;
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.area.toLowerCase().includes(q);
      return matchType && matchFloor && matchArea && matchStatus && matchSearch;
    });
  }, [tables, filterType, filterFloor, filterArea, filterStatus, searchQuery]);

  // Kiểm tra xem người dùng có đang áp dụng bất kỳ bộ lọc nào không
  const isFiltering = useMemo(() => {
    return (
      filterType !== "all" ||
      filterFloor !== "all" ||
      filterArea !== "all" ||
      filterStatus !== "all" ||
      Boolean(searchQuery.trim())
    );
  }, [filterType, filterFloor, filterArea, filterStatus, searchQuery]);

  // Tạo các dải thời gian hiển thị trên thanh timeline 24h của bảng giá
  const timelineSegments = useMemo(() => {
    return generateTimelineSegments(pricingTiers, currentTime, timelineDayFilter, activePricingTier);
  }, [pricingTiers, currentTime, timelineDayFilter, activePricingTier]);

  // ── 9. Handlers: Các hành động tương tác ──────────────────────────────────
  // Đặt lại toàn bộ bộ lọc về mặc định
  const handleResetFilters = useCallback(() => {
    setFilterType("all");
    setFilterFloor("all");
    setFilterArea("all");
    setFilterStatus("all");
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  // Tự động gán đơn giá giờ tương ứng khi người dùng chọn khu vực bàn
  const handleSelectArea = useCallback(
    (area: string) => {
      setTableArea(area);
      const isMatch = area.toLowerCase().includes("thi đấu");
      const isVip = area.toLowerCase().includes("vip");
      const defaultTier = activePricingTier || pricingTiers[0];
      if (defaultTier) {
        if (isMatch) {
          setTablePrice(defaultTier.prices.match ?? defaultTier.prices.vip + 10000);
        } else if (isVip) {
          setTablePrice(defaultTier.prices.vip);
        } else {
          setTablePrice(defaultTier.prices.standard);
        }
      }
    },
    [activePricingTier, pricingTiers],
  );

  // Mở modal tạo bàn bida mới và tự động đề xuất mã bàn, tên bàn
  const handleOpenAddTable = useCallback(() => {
    setEditingTable(null);
    const poolCount = tables.filter((t) => t.type === "pool").length;
    const nextNum = String(poolCount + 1).padStart(2, "0");
    setTableCode(`STD-${nextNum}`);
    setTableName(`Bàn ${nextNum} • Phổ Thông`);
    setTableType("pool");
    setTableArea("Phổ thông");
    setTableFloor(1);
    const standardPrice = activePricingTier?.prices.standard || 60000;
    setTablePrice(standardPrice);
    setTableModalVisible(true);
  }, [tables, activePricingTier]);

  // Mở modal chỉnh sửa bàn bida (chặn nếu bàn đang có khách chơi hoặc đã đặt)
  const handleOpenEditTable = useCallback((table: BilliardTable) => {
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
  }, []);

  // Lưu thông tin bàn bida (Tạo mới hoặc Cập nhật)
  const handleSaveTable = useCallback(async () => {
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
        message.success(`Đã lưu bàn ${tableName}!`);
      } else {
        await tableAdminService.create({
          code: tableCode.trim(),
          name: tableName.trim(),
          type: tableType,
          area: tableArea.trim(),
          floor: Number(tableFloor),
          pricePerHour: Number(tablePrice),
        });
        message.success(`Đã thêm bàn ${tableName}!`);
      }
      setTableModalVisible(false);
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Không thể lưu thông tin bàn!";
      message.error(errMsg);
    } finally {
      setSaving(false);
    }
  }, [editingTable, tableCode, tableName, tableType, tableArea, tableFloor, tablePrice, loadData]);

  // Đổi trạng thái bàn sang bảo trì nỉ hoặc mở lại hoạt động
  const handleToggleMaintenance = useCallback(
    async (table: BilliardTable) => {
      if (table.status === "playing" || table.status === "booked") {
        message.warning("Bàn đang có khách chơi hoặc đã được đặt trước, không thể chuyển sang bảo trì!");
        return;
      }
      const isMaintenance = table.status === "maintenance";
      const nextStatus = isMaintenance ? "available" : "maintenance";
      try {
        await tableAdminService.updateStatus(table._id, nextStatus);
        if (!isMaintenance) {
          message.info(`Đã chuyển ${table.name} sang bảo trì!`);
        } else {
          message.success(`${table.name} sẵn sàng hoạt động!`);
        }
        await loadData();
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.message || "Không thể đổi trạng thái bàn!";
        message.error(errMsg);
      }
    },
    [loadData],
  );

  // Mở modal thêm khung giờ giá mới
  const handleOpenAddPricing = useCallback(() => {
    setEditingPricing(null);
    setPricingName("Khung Giờ Mới");
    setPricingDayType("weekday");
    setPricingStartTime("14:00");
    setPricingEndTime("18:00");
    setPricingStandardPrice(70000);
    setPricingVipPrice(140000);
    setPricingMatchPrice(120000);
    setPricingIsActive(true);
    setPricingModalVisible(true);
  }, []);

  // Mở modal sửa khung giờ giá
  const handleOpenEditPricing = useCallback((tier: PricingTier) => {
    setEditingPricing(tier);
    setPricingName(tier.name);
    const hasWeekend = tier.daysOfWeek?.includes(0) || tier.daysOfWeek?.includes(6);
    const hasWeekday = tier.daysOfWeek?.some((d) => d >= 1 && d <= 5);
    if (hasWeekend && !hasWeekday) {
      setPricingDayType("weekend");
    } else if (hasWeekend && hasWeekday) {
      setPricingDayType("all");
    } else {
      setPricingDayType("weekday");
    }
    setPricingStartTime(tier.startTime);
    setPricingEndTime(tier.endTime);
    setPricingStandardPrice(tier.prices.standard);
    setPricingVipPrice(tier.prices.vip);
    setPricingMatchPrice(tier.prices.match ?? tier.prices.vip);
    setPricingIsActive(tier.isActive);
    setPricingModalVisible(true);
  }, []);

  // Lưu thông tin khung giờ bảng giá (Kiểm tra format giờ HH:mm và giá hợp lệ)
  const handleSavePricing = useCallback(async () => {
    if (!pricingName.trim()) {
      message.warning("Vui lòng nhập tên khung giờ!");
      return;
    }

    if (editingPricing && editingPricing._id === activePricingTier?._id) {
      message.warning("Khung giờ đang dùng cho bàn đang chơi, không thể sửa!");
      return;
    }

    const timeRegex = /^([01]?[0-9]|2[0-4]):[0-5][0-9]$/;
    if (!timeRegex.test(pricingStartTime.trim()) || !timeRegex.test(pricingEndTime.trim())) {
      message.warning("Vui lòng chọn giờ theo định dạng HH:mm (VD: 08:00, 24:00)");
      return;
    }

    if (pricingStandardPrice <= 0 || pricingVipPrice <= 0 || pricingMatchPrice <= 0) {
      message.warning("Vui lòng nhập đơn giá giờ chơi lớn hơn 0 cho tất cả các khu vực!");
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
      const payload = {
        name: pricingName.trim(),
        dayType: pricingDayType as any,
        startTime: pricingStartTime,
        endTime: pricingEndTime,
        daysOfWeek: resolvedDays,
        prices: {
          standard: Number(pricingStandardPrice),
          vip: Number(pricingVipPrice),
          match: Number(pricingMatchPrice),
        },
        isActive: pricingIsActive,
      };

      if (editingPricing) {
        await pricingAdminService.update(editingPricing._id, payload);
        message.success(`Đã lưu khung giờ "${pricingName}"!`);
      } else {
        await pricingAdminService.create(payload);
        message.success(`Đã thêm khung giờ "${pricingName}"!`);
      }
      setPricingModalVisible(false);
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Không thể lưu khung giờ!";
      message.error(errMsg);
    } finally {
      setSaving(false);
    }
  }, [
    editingPricing,
    pricingName,
    pricingDayType,
    pricingStartTime,
    pricingEndTime,
    pricingStandardPrice,
    pricingVipPrice,
    pricingMatchPrice,
    pricingIsActive,
    activePricingTier,
    loadData,
  ]);

  // Bật/tắt trạng thái áp dụng của một khung giờ giá
  const handleToggleTierActive = useCallback(
    async (tier: PricingTier) => {
      if (tier._id === activePricingTier?._id) {
        message.warning("Khung giờ đang dùng cho bàn đang chơi, không thể tạm dừng!");
        return;
      }
      const nextActive = !tier.isActive;
      try {
        await pricingAdminService.update(tier._id, { isActive: nextActive });
        if (nextActive) {
          message.success(`Đã kích hoạt khung giờ "${tier.name}"!`);
        } else {
          message.info(`Đã tạm dừng khung giờ "${tier.name}"!`);
        }
        await loadData();
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.message || "Không thể thay đổi trạng thái khung giờ!";
        message.error(errMsg);
      }
    },
    [activePricingTier, loadData],
  );

  // Xác nhận xóa bàn hoặc khung giờ giá
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "pricing" && deleteTarget.id === activePricingTier?._id) {
      message.warning("Khung giờ đang dùng cho bàn đang chơi, không thể xóa!");
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
  }, [deleteTarget, activePricingTier, loadData]);

  // ── 10. Trả về toàn bộ dữ liệu & hàm xử lý cho TablesManagementPage ────────
  return {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    currentPage,
    setCurrentPage,
    pageSize,
    tables,
    pricingTiers,
    loading,
    saving,
    currentTime,
    filterType,
    setFilterType,
    filterFloor,
    setFilterFloor,
    filterArea,
    setFilterArea,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    timelineDayFilter,
    setTimelineDayFilter,
    tableModalVisible,
    setTableModalVisible,
    editingTable,
    tableCode,
    setTableCode,
    tableName,
    setTableName,
    tableType,
    setTableType,
    tableArea,
    setTableArea,
    tableFloor,
    setTableFloor,
    tablePrice,
    setTablePrice,
    pricingModalVisible,
    setPricingModalVisible,
    editingPricing,
    pricingName,
    setPricingName,
    pricingDayType,
    setPricingDayType,
    pricingStartTime,
    setPricingStartTime,
    pricingEndTime,
    setPricingEndTime,
    pricingStandardPrice,
    setPricingStandardPrice,
    pricingVipPrice,
    setPricingVipPrice,
    pricingMatchPrice,
    setPricingMatchPrice,
    pricingIsActive,
    setPricingIsActive,
    deleteConfirmVisible,
    setDeleteConfirmVisible,
    deleteTarget,
    setDeleteTarget,
    activePricingTier,
    distinctFloors,
    distinctAreas,
    stats,
    filteredTables,
    isFiltering,
    timelineSegments,
    loadData,
    handleResetFilters,
    handleSelectArea,
    handleOpenAddTable,
    handleOpenEditTable,
    handleSaveTable,
    handleToggleMaintenance,
    handleOpenAddPricing,
    handleOpenEditPricing,
    handleSavePricing,
    handleToggleTierActive,
    handleConfirmDelete,
  };
}
