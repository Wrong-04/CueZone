import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { posService } from "../../services/pos.service";
import type { PricingTier } from "../../types";
import type { PosTable, PosOrderItem, CheckoutReceipt } from "../../types/pos";
import { calculateSplitPlayingDetails, defaultPricingTiers } from "../../utils/pricing";
import {
  ClockCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SwapOutlined,
  CoffeeOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  UserOutlined,
  PlusOutlined,
  MinusOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  PhoneOutlined,
  CalendarOutlined,
  SyncOutlined,
  WifiOutlined,
  UsergroupAddOutlined,
  AlertOutlined,
  DeleteOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Input,
  Select,
  Typography,
  message,
  Modal,
  Space,
  SegmentedPillList,
  SearchFilterInput,
  Tooltip,
} from "../../shared/ui";
import { getSocket } from "../../services/socket.service";
import { INITIAL_FNB_STOCK, type FnbStockItem } from "../../mock/posData";

const { Title, Text } = Typography;

export const PosTableFloorPage: React.FC = () => {
  const [tables, setTables] = useState<PosTable[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(defaultPricingTiers);
  const [fnbStock, setFnbStock] = useState<FnbStockItem[]>(INITIAL_FNB_STOCK);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const busy = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadTables = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tableData, pricingData] = await Promise.all([
        posService.getTables(),
        posService.getPricingTiers().catch(() => []),
      ]);
      setTables(tableData);
      if (pricingData && pricingData.length > 0) {
        setPricingTiers(pricingData);
      }
      setLoadError("");
    } catch (error: any) {
      if (!silent) {
        setLoadError(error.response?.data?.message || error.message || "Không thể tải sơ đồ bàn");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTables();

    const socket = getSocket();

    if (socket.connected) {
      setSocketConnected(true);
    }

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onTableChange = (payload: any) => {
      console.log("⚡ [Realtime] Cập nhật sơ đồ bàn qua Socket.io:", payload);
      void loadTables(true);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("table:status_changed", onTableChange);
    socket.on("table:updated", onTableChange);
    socket.on("table:timer_started", onTableChange);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("table:status_changed", onTableChange);
      socket.off("table:updated", onTableChange);
      socket.off("table:timer_started", onTableChange);
    };
  }, [loadTables]);

  const save = async (action: () => Promise<unknown>) => {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    try {
      await action();
      await loadTables();
      return true;
    } catch (error: any) {
      message.error(error.response?.data?.message || error.message || "Không thể lưu thay đổi");
      await loadTables();
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  // Current clock ticker for live duration calculation
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filters
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [selectedTable, setSelectedTable] = useState<PosTable | null>(null);

  // 1. Open Table Modal
  const [openModalVisible, setOpenModalVisible] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [sessionNote, setSessionNote] = useState<string>("");

  // 2. Transfer / Merge Table Modal
  const [transferModalVisible, setTransferModalVisible] = useState<boolean>(false);
  const [targetTableId, setTargetTableId] = useState<string>("");
  const [transferAction, setTransferAction] = useState<"transfer" | "merge">("transfer");

  // 3. F&B Order Modal
  const [fnbModalVisible, setFnbModalVisible] = useState<boolean>(false);
  const [fnbCategory, setFnbCategory] = useState<string>("all");
  const [currentOrderList, setCurrentOrderList] = useState<PosOrderItem[]>([]);

  // 4. Checkout & Payment Modal
  const [checkoutModalVisible, setCheckoutModalVisible] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"vnpay" | "cash" | "card" | "member_balance">("cash");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState<boolean>(false);
  const [paidSummary, setPaidSummary] = useState<CheckoutReceipt | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search input on '/' or 'F3'
      if ((e.key === "/" || e.key === "F3") && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(".pos-search-input input");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      // Close modal on Escape
      if (e.key === "Escape") {
        setOpenModalVisible(false);
        setTransferModalVisible(false);
        setFnbModalVisible(false);
        setCheckoutModalVisible(false);
        setReceiptModalVisible(false);
        setWaitlistModalVisible(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 5. Waitlist State (SRS UC21 & E2E-01) - Tích hợp lưu trữ LocalStorage & Chọn bàn linh hoạt
  const WAITLIST_STORAGE_KEY = "cuezone_pos_waitlist";
  const getInitialWaitlist = (): Array<{ id: string; customerName: string; phone: string; guests: number; preferredType: string; joinedTime: string; note?: string }> => {
    try {
      const raw = localStorage.getItem(WAITLIST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: "wl-1",
        customerName: "Lê Minh Trí",
        phone: "0903.112.233",
        guests: 2,
        preferredType: "Bàn Bida Lỗ (Pool)",
        joinedTime: "21:40",
        note: "Chờ bàn gần cửa sổ",
      },
      {
        id: "wl-2",
        customerName: "Nguyễn Hải Đăng",
        phone: "0988.555.777",
        guests: 4,
        preferredType: "Bàn Bida Carom (Phăng)",
        joinedTime: "22:05",
        note: "Yêu cầu bàn khu yên tĩnh",
      },
    ];
  };

  const saveWaitlistToStorage = (list: Array<{ id: string; customerName: string; phone: string; guests: number; preferredType: string; joinedTime: string; note?: string }>) => {
    try {
      localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const [waitlistModalVisible, setWaitlistModalVisible] = useState<boolean>(false);
  const [waitlist, setWaitlist] = useState(getInitialWaitlist);
  const [selectedWaitlistTable, setSelectedWaitlistTable] = useState<Record<string, string>>({});
  const [pendingWaitlistEntryId, setPendingWaitlistEntryId] = useState<string | null>(null);

  const [newWaitName, setNewWaitName] = useState("");
  const [newWaitPhone, setNewWaitPhone] = useState("");
  const [newWaitGuests, setNewWaitGuests] = useState(2);
  const [newWaitType, setNewWaitType] = useState("Bàn Bida Lỗ (Pool)");
  const [newWaitNote, setNewWaitNote] = useState("");

  const handleAddWaitlist = () => {
    if (!newWaitName.trim() || !newWaitPhone.trim()) {
      message.warning("Vui lòng nhập tên và số điện thoại khách chờ");
      return;
    }
    const newEntry = {
      id: `wl-${Date.now()}`,
      customerName: newWaitName.trim(),
      phone: newWaitPhone.trim(),
      guests: newWaitGuests,
      preferredType: newWaitType,
      joinedTime: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      note: newWaitNote.trim(),
    };
    setWaitlist((prev) => {
      const next = [...prev, newEntry];
      saveWaitlistToStorage(next);
      return next;
    });
    setNewWaitName("");
    setNewWaitPhone("");
    setNewWaitNote("");
    message.success("Đã thêm khách vào danh sách chờ bàn");
  };

  const handleAssignWaitlist = (
    entry: { id: string; customerName: string; phone: string; guests: number; preferredType: string; joinedTime: string; note?: string },
    chosenTableId?: string
  ) => {
    let targetTable: PosTable | undefined;

    // 1. Kiểm tra bàn thu ngân đã chủ động chọn từ Select
    if (chosenTableId) {
      targetTable = tables.find((t) => t.id === chosenTableId && t.status === "available");
    }

    // 2. Nếu chưa chọn hoặc bàn đó không còn khả dụng, tự động gợi ý bàn trống phù hợp
    if (!targetTable) {
      targetTable =
        tables.find((t) => t.status === "available" && (t.typeName === entry.preferredType || !entry.preferredType)) ||
        tables.find((t) => t.status === "available");
    }

    if (!targetTable) {
      message.warning(`Toàn quán hiện không còn bàn trống nào để xếp cho khách ${entry.customerName}!`);
      return;
    }

    setSelectedTable(targetTable);
    setCustomerName(entry.customerName);
    setCustomerPhone(entry.phone);
    setSessionNote(entry.note ? `Khách chờ: ${entry.note}` : "Khách từ danh sách chờ");
    setPendingWaitlistEntryId(entry.id);
    setOpenModalVisible(true);
    setWaitlistModalVisible(false);
    message.info(`Đang xếp ${targetTable.name} cho khách ${entry.customerName}. Vui lòng bấm xác nhận mở bàn!`);
  };

  const handleRemoveWaitlist = (id: string) => {
    setWaitlist((prev) => {
      const next = prev.filter((w) => w.id !== id);
      saveWaitlistToStorage(next);
      return next;
    });
    message.info("Đã xóa khách khỏi danh sách chờ");
  };

  const handleCancelBooking = (table: PosTable) => {
    Modal.confirm({
      title: `Giải phóng bàn đặt trước [${table.code}]?`,
      content: `Khách ${table.bookedInfo?.customerName || "hẹn trước"} chưa nhận bàn. Bạn có chắc muốn hủy giữ bàn này và chuyển về trạng thái Trống?`,
      okText: "Giải phóng bàn",
      okType: "danger",
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await posService.cancelBooking(table.id);
          message.success(`Đã giải phóng bàn ${table.name} thành công`);
          await loadTables();
        } catch (err: any) {
          message.error(err.message || "Không thể hủy giữ bàn");
        }
      },
    });
  };

  useEffect(() => {
    const tableId = searchParams.get("tableId");
    if (loading || loadError || !tableId) return;
    const table = tables.find(item => item.id === tableId);
    if (table?.status === "booked") {
      setSelectedTable(table);
      setCustomerName(table.bookedInfo?.customerName || "");
      setCustomerPhone(table.bookedInfo?.phone || "");
      setOpenModalVisible(true);
    } else {
      message.warning("Lịch đặt bàn đã thay đổi, vui lòng kiểm tra lại");
    }
    setSearchParams({}, { replace: true });
  }, [tables, loading, loadError, searchParams, setSearchParams]);
  // Calculate live playing minutes and cost with real-time Split Time Rate
  const calculatePlayingDetails = (table: PosTable) => {
    return calculateSplitPlayingDetails(table, pricingTiers, currentTime);
  };

  // Helper tính số phút quá giờ hẹn của bàn đặt trước (SRS XIX E2E-03 & UC26)
  const getBookingOverdueMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    const [_, hStr, mStr] = match;
    const now = new Date(currentTime);
    const bookingDate = new Date(now);
    bookingDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
    const diffMs = now.getTime() - bookingDate.getTime();
    if (diffMs <= 0) return 0;
    return Math.floor(diffMs / 60000);
  };

  // Helper chuẩn hóa tiếng Việt không dấu & loại bỏ ký tự phụ để tìm kiếm thông minh
  const normalizeSearchText = (str?: string): string => {
    return (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();
  };

  // Filtered tables (Smart Search: Hỗ trợ tìm gõ không dấu "ban 2" khớp "Bàn 02", tên khách không dấu, SĐT)
  const filteredTables = useMemo(() => {
    const qRaw = searchQuery.trim().toLowerCase();
    const qNorm = normalizeSearchText(qRaw);
    const qUnpadded = qNorm.replace(/\b0+(\d+)/g, "$1");

    return tables.filter((t) => {
      const matchArea =
        filterArea === "all" ||
        (filterArea === "standard" && (t.area?.toLowerCase().includes("phổ thông") || t.code.startsWith("STD"))) ||
        (filterArea === "vip" && (t.area?.toLowerCase().includes("vip") || t.code.startsWith("VIP"))) ||
        (filterArea === "match" && (t.area?.toLowerCase().includes("thi đấu") || t.code.startsWith("MTCH")));

      const matchType =
        filterType === "all" ||
        t.type === filterType ||
        (filterType === "pool" && (t.type === "pool" || t.typeName?.includes("Lỗ") || t.typeName?.includes("Pool"))) ||
        (filterType === "carom" && (t.type === "carom" || t.typeName?.includes("Carom") || t.typeName?.includes("Phăng"))) ||
        (filterType === "snooker" && (t.type === "snooker" || t.typeName?.includes("Snooker")));

      const matchStatus = filterStatus === "all" || t.status === filterStatus;

      if (!qRaw) return matchArea && matchType && matchStatus;

      const normName = normalizeSearchText(t.name);
      const normNameUnpadded = normName.replace(/\b0+(\d+)/g, "$1");

      const normCode = normalizeSearchText(t.code);
      const normCodeUnpadded = normCode.replace(/\b0+(\d+)/g, "$1");

      const normArea = normalizeSearchText(t.area || "");

      const normCustomer = normalizeSearchText(t.currentSession?.customerName);
      const phone = t.currentSession?.customerPhone || "";

      const normBookedCustomer = normalizeSearchText(t.bookedInfo?.customerName);
      const bookedPhone = t.bookedInfo?.phone || "";

      const matchQuery =
        // Khớp tên bàn: "ban 2", "ban 02", "bàn 2", "bàn 02"
        normName.includes(qNorm) ||
        normNameUnpadded.includes(qUnpadded) ||
        normName.includes(qRaw) ||
        // Khớp mã bàn: "mtch 1", "std 2", "vip 1"
        normCode.includes(qNorm) ||
        normCodeUnpadded.includes(qUnpadded) ||
        // Khớp khu vực / hạng bàn: "vip", "standard", "pho thong", "thi dau"
        normArea.includes(qNorm) ||
        // Khớp tên khách không dấu & có dấu: "kien" -> "Đỗ Thế Kiên", "tuan" -> "Nguyễn Anh Tuấn"
        normCustomer.includes(qNorm) ||
        // Khớp SĐT khách đang chơi
        phone.includes(qRaw) ||
        // Khớp khách đặt trước
        normBookedCustomer.includes(qNorm) ||
        bookedPhone.includes(qRaw);

      return matchArea && matchType && matchStatus && matchQuery;
    });
  }, [tables, filterArea, filterType, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = tables.length;
    let playing = 0;
    let paused = 0;
    let booked = 0;
    let available = 0;
    let standardCount = 0;
    let vipCount = 0;
    let matchCount = 0;
    let poolCount = 0;
    let caromCount = 0;
    let snookerCount = 0;
    let poolAvailable = 0;
    let caromAvailable = 0;
    let snookerAvailable = 0;
    let totalTempRevenue = 0;

    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      const isPool = t.type === "pool" || t.typeName?.includes("Lỗ") || t.typeName?.includes("Pool");
      const isCarom = t.type === "carom" || t.typeName?.includes("Carom") || t.typeName?.includes("Phăng");
      const isSnooker = t.type === "snooker" || t.typeName?.includes("Snooker");

      if (t.status === "playing") playing++;
      else if (t.status === "paused") paused++;
      else if (t.status === "booked") booked++;
      else if (t.status === "available") {
        available++;
        if (isPool) poolAvailable++;
        else if (isCarom) caromAvailable++;
        else if (isSnooker) snookerAvailable++;
      }

      if (t.code.startsWith("STD") || t.area?.toLowerCase().includes("phổ thông")) standardCount++;
      else if (t.code.startsWith("VIP") || t.area?.toLowerCase().includes("vip")) vipCount++;
      else if (t.code.startsWith("MTCH") || t.area?.toLowerCase().includes("thi đấu")) matchCount++;

      if (isPool) poolCount++;
      else if (isCarom) caromCount++;
      else if (isSnooker) snookerCount++;

      if (t.status === "playing" || t.status === "paused" || t.currentSession) {
        const { cost } = calculatePlayingDetails(t);
        const fnbCost = t.currentSession?.orders?.reduce((acc, cur) => acc + cur.price * cur.quantity, 0) || 0;
        totalTempRevenue += cost + fnbCost;
      }
    }

    const activeCount = playing + paused;
    const occupancyRate = total > 0 ? Math.round((activeCount / total) * 100) : 0;

    return {
      total,
      playing,
      paused,
      booked,
      available,
      activeCount,
      occupancyRate,
      standardCount,
      vipCount,
      matchCount,
      poolCount,
      caromCount,
      snookerCount,
      poolAvailable,
      caromAvailable,
      snookerAvailable,
      totalTempRevenue,
    };
  }, [tables, currentTime]);

  const isTypeFull = useMemo(() => {
    if (filterType === "pool") return stats.poolCount > 0 && stats.poolAvailable === 0;
    if (filterType === "carom") return stats.caromCount > 0 && stats.caromAvailable === 0;
    if (filterType === "snooker") return stats.snookerCount > 0 && stats.snookerAvailable === 0;
    if (filterStatus === "available") return stats.total > 0 && stats.available === 0;
    return false;
  }, [filterType, filterStatus, stats]);

  const areaOptions = [
    { value: "all", label: `Tất cả khu vực (${stats.total})` },
    { value: "standard", label: `Khu Standard (${stats.standardCount})` },
    { value: "vip", label: `Khu VIP (${stats.vipCount})` },
    { value: "match", label: `Khu Thi Đấu (${stats.matchCount})` },
  ];

  const tableTypeOptions = [
    { value: "all", label: `Tất cả thể loại (${stats.total})` },
    { value: "pool", label: `Bida Lỗ - Pool (${stats.poolCount})` },
    { value: "carom", label: `Bida Carom / Phăng (${stats.caromCount})` },
    { value: "snooker", label: `Bida Snooker (${stats.snookerCount})` },
  ];

  // Segmented Pill Items for status filtering (Interactive 1-Touch KPIs)
  const statusPillItems = [
    { key: "all", label: "Tất cả", badge: stats.total },
    { key: "playing", label: "Đang chơi", badge: stats.playing, dotClassName: "bg-emerald-500" },
    { key: "paused", label: "Tạm dừng", badge: stats.paused, dotClassName: "bg-amber-500" },
    { key: "booked", label: "Đã đặt", badge: stats.booked, dotClassName: "bg-blue-500" },
    { key: "available", label: "Bàn trống", badge: stats.available, dotClassName: "bg-slate-400" },
  ];

  const availableTables = useMemo(() => tables.filter((t) => t.status === "available"), [tables]);

  const getTableOptionsForGuest = (preferredType: string) => {
    if (availableTables.length === 0) return [];

    const matching = availableTables.filter((t) => t.typeName === preferredType || !preferredType);
    const others = availableTables.filter((t) => t.typeName !== preferredType && preferredType);

    const groups: Array<{ label: string; options: Array<{ value: string; label: string }> }> = [];

    if (matching.length > 0) {
      groups.push({
        label: `⭐ Phù hợp nhất (${matching.length} bàn)`,
        options: matching.map((t) => ({
          value: t.id,
          label: `${t.name} (${t.typeName}) • ${t.pricePerHour.toLocaleString("vi-VN")}đ/h`,
        })),
      });
    }

    if (others.length > 0) {
      groups.push({
        label: `Các bàn trống khác (${others.length} bàn)`,
        options: others.map((t) => ({
          value: t.id,
          label: `${t.name} (${t.typeName}) • ${t.pricePerHour.toLocaleString("vi-VN")}đ/h`,
        })),
      });
    }

    return groups;
  };

  // Handler: Open Table & Start Session
  const handleOpenTable = async () => {
    if (!selectedTable) return;
    if (selectedTable.status !== "available" && selectedTable.status !== "booked") {
      message.warning("Bàn này không ở trạng thái sẵn sàng để mở!");
      return;
    }

    const saved = await save(() => posService.open(selectedTable.id, {
      customerName: customerName.trim(), customerPhone: customerPhone.trim(), note: sessionNote.trim(),
      bookingId: selectedTable.bookedInfo?.bookingId,
    }));
    if (!saved) return;

    if (pendingWaitlistEntryId) {
      setWaitlist((prev) => {
        const next = prev.filter((w) => w.id !== pendingWaitlistEntryId);
        saveWaitlistToStorage(next);
        return next;
      });
      setPendingWaitlistEntryId(null);
    }

    message.success(`Đã mở ${selectedTable.name} & bắt đầu tính giờ thành công!`);
    setOpenModalVisible(false);
    setSelectedTable(null);
    setCustomerName("");
    setCustomerPhone("");
    setSessionNote("");
  };

  // Handler: Pause / Resume Table
  const handleTogglePause = async (table: PosTable) => {
    if (!table.currentSession) return;
    if (await save(() => posService.pause(table))) {
      message.success(table.currentSession.isPaused ? `Đã tiếp tục tính giờ ${table.name}` : `Đã tạm dừng tính giờ ${table.name}`);
    }
  };

  // Handler: Transfer / Merge Table
  const handleTransferOrMerge = async () => {
    if (!selectedTable || !selectedTable.currentSession || !targetTableId) {
      message.warning("Vui lòng chọn bàn đích!");
      return;
    }

    const targetTable = tables.find((t) => t.id === targetTableId);
    if (!targetTable) return;

    if (!await save(() => posService.move(selectedTable, targetTableId, transferAction))) return;
    message.success(`Đã ${transferAction === "transfer" ? "chuyển" : "gộp"} ${selectedTable.name} sang ${targetTable.name}!`);

    setTransferModalVisible(false);
    setSelectedTable(null);
    setTargetTableId("");
  };

  // Handler: Manage F&B Order
  const handleOpenFnbModal = (table: PosTable) => {
    setSelectedTable(table);
    setCurrentOrderList(table.currentSession?.orders || []);
    setFnbModalVisible(true);
  };

  const handleAddFnbItem = (stockItem: FnbStockItem) => {
    if (stockItem.stockQuantity <= 0) {
      message.warning(`Món "${stockItem.name}" đã hết hàng trong kho!`);
      return;
    }

    setCurrentOrderList((prev) => {
      const existing = prev.find((o) => o.id === stockItem.id);
      if (existing) {
        return prev.map((o) =>
          o.id === stockItem.id ? { ...o, quantity: o.quantity + 1 } : o
        );
      }
      return [
        ...prev,
        {
          id: stockItem.id,
          name: stockItem.name,
          price: stockItem.price,
          quantity: 1,
          category: stockItem.category,
          orderTime: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          status: "served",
        },
      ];
    });

    // Reduce stock locally
    setFnbStock((prev) =>
      prev.map((item) =>
        item.id === stockItem.id ? { ...item, stockQuantity: item.stockQuantity - 1 } : item
      )
    );
  };

  const handleUpdateOrderItemQty = (itemId: string, delta: number) => {
    setCurrentOrderList((prev) => {
      return prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosOrderItem[];
    });

    // Restore or reduce stock
    setFnbStock((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, stockQuantity: Math.max(0, item.stockQuantity - delta) } : item
      )
    );
  };

  const handleConfirmFnbOrder = async () => {
    if (!selectedTable?.currentSession) return;
    const saved = await save(async () => {
      await posService.updateOrders(
        selectedTable.id,
        selectedTable.currentSession!.sessionId,
        currentOrderList
      );
    });
    if (!saved) return;
    setFnbModalVisible(false);
    message.success(`Đã cập nhật danh sách món cho ${selectedTable.name}!`);
  };

  // Handler: Open Checkout Modal
  const handleOpenCheckout = (table: PosTable) => {
    setSelectedTable(table);
    setDiscountPercent(table.currentSession?.isMember ? 10 : 0);
    setPaymentMethod("cash");
    setCashReceived(null);
    setCheckoutModalVisible(true);
  };

  // Handler: Confirm Checkout & Print Receipt
  const handleConfirmCheckout = async () => {
    if (!selectedTable?.currentSession) return;
    const saved = await save(async () => {
      setPaidSummary(await posService.checkout(selectedTable, discountPercent, paymentMethod));
    });
    if (!saved) return;
    setCheckoutModalVisible(false);
    setReceiptModalVisible(true);
    message.success(
      `Đã lưu hóa đơn thanh toán (${paymentMethod === "vnpay" ? "Chuyển khoản QR" : "Tiền mặt"}) cho ${selectedTable.name}!`
    );
  };

  return (
    <div className="space-y-4">
      {/* ── TOP UNIFIED COMPACT COMMAND BAR (TIÊU ĐỀ, HÀNH ĐỘNG & BỘ LỌC 1-CHẠM) ───────── */}
      <Card styles={{ body: { padding: "12px 18px" } }} className="!rounded-2xl !border-slate-200 shadow-2xs bg-white">
        {/* Row 1: Header, Socket indicator, Occupancy & Tạm tính sàn */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`flex h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
            <Title level={4} className="!text-lg !font-black !text-slate-900 !mb-0 tracking-tight">
              Sơ Đồ Bàn Trực Tiếp
            </Title>
            <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0">
              TOÀN QUÁN • {stats.total} BÀN
            </Tag>
            <Tag color={stats.occupancyRate > 70 ? "volcano" : "blue"} className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0">
              LẤP ĐẦY: {stats.occupancyRate}%
            </Tag>
            {socketConnected ? (
              <Tag color="cyan" className="!rounded-full !px-2 !py-0.5 !text-[10px] !font-semibold !m-0 hidden sm:inline-flex items-center gap-1">
                <WifiOutlined /> Đồng bộ trực tiếp
              </Tag>
            ) : (
              <Tag color="warning" className="!rounded-full !px-2 !py-0.5 !text-[10px] !font-semibold !m-0 hidden sm:inline-flex items-center gap-1">
                <SyncOutlined spin /> Đang kết nối...
              </Tag>
            )}
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            {/* Real-time temporary revenue badge */}
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200/90 flex items-center gap-2 shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-800">Doanh thu tạm tính:</span>
              <span className="text-base font-black text-emerald-700 font-mono">
                {stats.totalTempRevenue.toLocaleString("vi-VN")}đ
              </span>
            </div>

            <Tooltip title={isFullscreen ? "Thoát toàn màn hình" : "Mở rộng toàn màn hình (Kiosk POS)"}>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                className="!rounded-xl !text-xs !h-8"
              >
                {isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
              </Button>
            </Tooltip>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTables()}
              loading={loading}
              disabled={saving}
              icon={<SyncOutlined />}
              className="!rounded-xl !text-xs !h-8"
            >
              Tải lại
            </Button>
          </div>
        </div>

        {/* Row 2: Thanh điều khiển & Bộ lọc tương tác 1-chạm (Cùng một hàng ngang thẳng tắp) */}
        <div className="pt-2.5 flex items-center justify-between gap-3 overflow-x-auto">
          {/* Cụm trái: Khu vực, Thể loại & Trạng thái bàn thẳng hàng */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Khu vực:</span>
            <Select
              value={filterArea}
              onChange={(val) => setFilterArea(val as string)}
              className="w-32 sm:w-36 !text-xs font-semibold shrink-0"
              options={areaOptions}
            />

            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Thể loại:</span>
            <Select
              value={filterType}
              onChange={(val) => setFilterType(val as string)}
              className="w-32 sm:w-36 !text-xs font-semibold shrink-0"
              options={tableTypeOptions}
            />

            <div className="h-5 w-px bg-slate-200 shrink-0 mx-1" />

            {/* Clickable Status KPI Pills */}
            <SegmentedPillList
              items={statusPillItems}
              activeKey={filterStatus}
              onSelect={(key) => setFilterStatus(key)}
              className="shrink-0"
            />
          </div>

          {/* Cụm phải: Danh sách chờ & Tìm kiếm nhanh */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWaitlistModalVisible(true)}
              leftIcon={<UsergroupAddOutlined />}
              className="!rounded-xl !text-xs !h-8 !px-3 !border-emerald-300 !text-emerald-700 !bg-emerald-50/70 hover:!bg-emerald-100/80 font-semibold shrink-0"
            >
              DS Chờ ({waitlist.length})
            </Button>

            <SearchFilterInput
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder="Tìm số bàn, khách... (Phím /)"
              width={210}
              className="pos-search-input [&_.ant-input-affix-wrapper]:!h-8 [&_.ant-input-affix-wrapper]:!py-0 shrink-0"
            />
          </div>
        </div>
      </Card>

      {loadError && (
        <div className="p-4 bg-red-50/90 border border-red-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 text-red-700 text-xs font-semibold">
            <ExclamationCircleOutlined className="text-base text-red-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTables()}
            className="!rounded-xl !text-xs !border-red-300 !text-red-700 hover:!bg-red-100/70 font-bold shrink-0"
          >
            Thử tải lại
          </Button>
        </div>
      )}

      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <SyncOutlined spin className="text-emerald-600 text-3xl" />
          <span className="text-slate-600 font-bold text-xs tracking-wide">
            Đang tải dữ liệu sơ đồ bàn trực tiếp từ máy chủ...
          </span>
        </div>
      )}

      {!loading && !loadError && filteredTables.length === 0 && (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
            🔍
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 text-sm mb-0">Không tìm thấy bàn nào phù hợp</h4>
            <p className="text-xs text-slate-500 mb-0">
              {filterStatus === "available"
                ? "Hiện tại không còn bàn trống theo tiêu chí này. Bạn có thể thêm khách vào danh sách chờ."
                : "Vui lòng thử điều chỉnh bộ lọc khu vực, thể loại hoặc từ khóa tìm kiếm."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterArea("all");
                setFilterType("all");
                setFilterStatus("all");
                setSearchQuery("");
              }}
              className="!rounded-xl !text-xs !border-slate-300 !text-slate-700 font-semibold"
            >
              Đặt lại tất cả bộ lọc
            </Button>
            <Button
              type="primary"
              size="sm"
              onClick={() => {
                if (filterType === "pool") setNewWaitType("Bàn Bida Lỗ (Pool)");
                else if (filterType === "carom") setNewWaitType("Bàn Bida Carom (Phăng)");
                else if (filterType === "snooker") setNewWaitType("Bàn Bida Snooker");
                setWaitlistModalVisible(true);
              }}
              className="!rounded-xl !text-xs !bg-amber-600 hover:!bg-amber-700 !border-none font-bold"
            >
              📋 Thêm vào danh sách chờ
            </Button>
          </div>
        </div>
      )}

      {/* ── CẢNH BÁO HẾT BÀN & GỢI Ý DANH SÁCH CHỜ (SCRUM-92 & SRS UC21) ────────── */}
      {isTypeFull && !loading && !loadError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg shrink-0">
              ⚠️
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-sm mb-0.5">
                {filterType === "pool" ? "Toàn bộ Bàn Bida Lỗ (Pool) hiện đã kín khách!" :
                 filterType === "carom" ? "Toàn bộ Bàn Bida Carom (Phăng) hiện đã kín khách!" :
                 filterType === "snooker" ? "Toàn bộ Bàn Bida Snooker hiện đã kín khách!" :
                 "Hiện tại toàn bộ bàn trong câu lạc bộ đã kín khách!"}
              </h5>
              <p className="text-xs text-slate-600 mb-0">
                Khách walk-in cần loại bàn này? Hãy thêm khách vào <strong>Danh Sách Chờ (Waitlist)</strong> để tự động xếp bàn ngay khi có bàn trống.
              </p>
            </div>
          </div>
          <Button
            type="primary"
            className="!bg-amber-600 hover:!bg-amber-700 !border-none !rounded-xl !text-xs font-bold shrink-0 shadow-xs"
            onClick={() => {
              if (filterType === "pool") setNewWaitType("Bàn Bida Lỗ (Pool)");
              else if (filterType === "carom") setNewWaitType("Bàn Bida Carom (Phăng)");
              else if (filterType === "snooker") setNewWaitType("Bàn Bida Snooker");
              setWaitlistModalVisible(true);
            }}
          >
            📋 Thêm Khách Vào DS Chờ
          </Button>
        </div>
      )}

      {/* ── SƠ ĐỒ LƯỚI BÀN (ERGONOMIC TABLE CARDS GRID) ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const { cost, formattedTime, minutes, timeSlots, isCrossed } = calculatePlayingDetails(table);
          const fnbTotal = table.currentSession?.orders.reduce(
            (acc, cur) => acc + cur.price * cur.quantity,
            0
          ) || 0;
          const totalTableBill = cost + fnbTotal;

          const isPlaying = table.status === "playing";
          const isPaused = table.status === "paused";
          const isBooked = table.status === "booked";
          const isAvailable = table.status === "available";
          const isMaintenance = table.status === "maintenance";
          const overdueMinutes = isBooked ? getBookingOverdueMinutes(table.bookedInfo?.time) : 0;

          return (
            <Card
              key={table.id}
              styles={{
                body: {
                  padding: 0,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                },
              }}
              className={`!rounded-2xl transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-md h-full flex flex-col [&>.ant-card-body]:!flex [&>.ant-card-body]:!flex-col [&>.ant-card-body]:!h-full [&>.ant-card-body]:!flex-1 [&>.ant-card-body]:!justify-between ${
                isPlaying
                  ? "!border-emerald-400/80 !bg-white ring-1 ring-emerald-500/15"
                  : isPaused
                  ? "!border-amber-400/80 !bg-white ring-1 ring-amber-400/20"
                  : isBooked
                  ? overdueMinutes >= 15
                    ? "!border-red-400/80 !bg-white ring-1 ring-red-400/30"
                    : "!border-blue-400/80 !bg-white ring-1 ring-blue-400/20"
                  : isMaintenance
                  ? "!border-slate-200 !bg-slate-50 opacity-60"
                  : "!border-slate-200 !bg-white hover:!border-emerald-300 hover:shadow-sm"
              }`}
            >
              {/* 0. Top Accent Color Strip (Nhận diện trạng thái cực nhanh từ xa) */}
              <div
                className={`h-1.5 w-full shrink-0 ${
                  isPlaying
                    ? "bg-emerald-500"
                    : isPaused
                    ? "bg-amber-400"
                    : isBooked
                    ? overdueMinutes >= 15
                      ? "bg-red-500"
                      : "bg-blue-500"
                    : isMaintenance
                    ? "bg-rose-400"
                    : "bg-slate-200"
                }`}
              />

              {/* 1. Header: Tách 2 dòng chống cắt chữ */}
              <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                      {table.code}
                    </span>
                    <span className="font-extrabold text-sm text-slate-900 truncate">
                      {table.code.startsWith("VIP")
                        ? `BÀN VIP ${table.code.replace("VIP-", "")}`
                        : table.code.startsWith("MTCH")
                        ? `BÀN THI ĐẤU ${table.code.replace("MTCH-", "")}`
                        : `BÀN ${table.code.replace("STD-", "")}`}
                    </span>
                  </div>
                  <div
                    className="text-[10.5px] text-slate-500 mt-0.5 leading-tight line-clamp-1 font-medium"
                    title={`${table.typeName} • ${table.area || "Khu chính"}`}
                  >
                    {table.typeName} • {table.area || "Khu chính"}
                  </div>
                </div>

                <div className="shrink-0 pt-0.5">
                  {isPlaying && (
                    <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ĐANG CHƠI
                    </Tag>
                  )}
                  {isPaused && (
                    <Tag color="orange" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1">
                      <PauseCircleOutlined className="text-[10px]" />
                      TẠM DỪNG
                    </Tag>
                  )}
                  {isBooked && (
                    overdueMinutes >= 15 ? (
                      <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1 animate-pulse">
                        <AlertOutlined className="text-[10px]" />
                        QUÁ HẠN {overdueMinutes}P
                      </Tag>
                    ) : overdueMinutes > 0 ? (
                      <Tag color="warning" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1">
                        <ClockCircleOutlined className="text-[10px]" />
                        TRỄ {overdueMinutes}P
                      </Tag>
                    ) : (
                      <Tag color="blue" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1">
                        <CalendarOutlined className="text-[10px]" />
                        HẸN TRƯỚC
                      </Tag>
                    )
                  )}
                  {isAvailable && (
                    <Tag color="default" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 !bg-slate-100 !text-slate-600 border border-slate-200">
                      BÀN TRỐNG
                    </Tag>
                  )}
                  {isMaintenance && (
                    <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0">
                      BẢO TRÌ
                    </Tag>
                  )}
                </div>
              </div>

              {/* 2. Body: Thông tin phiên chơi & chi tiết bàn */}
              <div className="p-3.5 flex-1 flex flex-col justify-between min-h-[135px]">
                {isPlaying || isPaused ? (
                  <div className="space-y-2.5">
                    {/* Timer row */}
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-center gap-1.5">
                        <ClockCircleOutlined className={isPaused ? "text-amber-500 text-sm" : "text-emerald-600 text-sm"} />
                        <span className={`text-xl font-black font-mono tracking-wider ${isPaused ? "text-amber-600" : "text-slate-900"}`}>
                          {formattedTime}
                        </span>
                        {minutes >= 180 && (
                          <Tag color="warning" className="!rounded-md !px-1.5 !py-0 !text-[9px] !font-bold !m-0 font-mono">
                            {minutes >= 240 ? "> 4h" : "> 3h"}
                          </Tag>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Từ {table.currentSession?.sessionStart || "19:45"}
                      </span>
                    </div>

                    {/* Customer & Breakdown */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <UserOutlined className="text-slate-400 text-xs shrink-0" />
                          <span className="font-bold text-slate-800 truncate max-w-[125px]">
                            {table.currentSession?.customerName || "Khách vãng lai"}
                          </span>
                          {table.currentSession?.isMember && (
                            <Tag color="gold" className="!text-[9px] !px-1.5 !py-0 !border-0 !m-0 !font-bold !rounded">
                              {table.currentSession.memberRank || "VIP"}
                            </Tag>
                          )}
                        </div>
                        <span className="text-slate-500 font-mono text-[11px] font-medium">
                          Tiền giờ: {cost.toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px] flex items-center gap-1">
                          <CoffeeOutlined className="text-slate-400 text-[10px]" />
                          Đồ uống & Món ({table.currentSession?.orders.length || 0}):
                        </span>
                        <span className="text-emerald-700 font-mono font-semibold text-[11px]">
                          {fnbTotal.toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    </div>

                    {/* Grand Total */}
                    <div className="flex items-baseline justify-between pt-2 border-t border-dashed border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-600">Tạm tính:</span>
                        {isCrossed && (
                          <Tag color="purple" className="!rounded-md !px-1.5 !py-0 !text-[9px] !font-bold !m-0 border border-purple-200 shadow-2xs">
                            ⚡ {timeSlots.length} Khung Giờ
                          </Tag>
                        )}
                      </div>
                      <span className="text-base font-black text-emerald-700 font-mono tracking-tight">
                        {totalTableBill.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                ) : isBooked ? (
                  /* Bàn đặt trước */
                  <div className="space-y-2 py-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <UserOutlined className="text-blue-600 text-xs shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {table.bookedInfo?.customerName || "Khách hẹn trước"}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-slate-500 shrink-0">
                        {table.bookedInfo?.phone || "09xxxxxxx"}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-blue-50/80 border border-blue-200/70 text-[11px] space-y-1">
                      <div className="flex justify-between items-center text-blue-900">
                        <span className="text-slate-600">Giờ hẹn:</span>
                        <span className="font-bold text-blue-800 font-mono">
                          {table.bookedInfo?.time ? table.bookedInfo.time.replace(/\s*\(?hôm nay\)?\s*/gi, "").trim() : "20:30"} (Hôm nay)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-blue-900">
                        <span className="text-slate-600">Giữ bàn tối đa:</span>
                        <span className="font-medium text-blue-800 text-[10px]">15 phút</span>
                      </div>
                      {overdueMinutes > 0 && (
                        <div className={`flex justify-between items-center text-[10px] font-bold pt-1 border-t border-blue-200/60 ${overdueMinutes >= 15 ? "text-red-600" : "text-amber-700"}`}>
                          <span>Tình trạng:</span>
                          <span>{overdueMinutes >= 15 ? `Quá hạn ${overdueMinutes} phút (Khách chưa đến)` : `Trễ hẹn ${overdueMinutes} phút`}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block text-center italic">
                      {overdueMinutes >= 15
                        ? "Đã quá hạn giữ bàn 15 phút. Có thể hủy để đón khách mới!"
                        : "Khách đến? Bấm \"Khách Nhận Bàn\" bên dưới"}
                    </span>
                  </div>
                ) : (
                  /* Bàn trống: Chạm vào thân thẻ để mở nhanh */
                  <div
                    onClick={() => {
                      setSelectedTable(table);
                      setCustomerName("");
                      setCustomerPhone("");
                      setOpenModalVisible(true);
                    }}
                    className="py-1 space-y-2 flex-1 flex flex-col justify-center cursor-pointer group"
                    title="Chạm để mở bàn tính giờ"
                  >
                    <div className="flex items-baseline justify-between p-2.5 rounded-xl bg-slate-50/90 border border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/20 transition-all">
                      <span className="text-xs font-semibold text-slate-500">
                        Đơn giá giờ:
                      </span>
                      <span className="text-base font-black font-mono text-emerald-700">
                        {table.pricePerHour.toLocaleString("vi-VN")}đ<span className="text-xs font-normal text-slate-400">/h</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircleOutlined className="text-emerald-600 text-xs" /> Bàn sẵn sàng đón khách
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 group-hover:text-emerald-600 transition-colors">
                        Bấm mở bàn ➔
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Footer: Action Buttons (Ghim đáy cố định, các nút luôn thẳng hàng ngang tuyệt đối) */}
              <div className="px-3.5 py-2.5 bg-slate-50/80 border-t border-slate-100 shrink-0 mt-auto">
                {isBooked ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedTable(table);
                        if (table.bookedInfo) {
                          setCustomerName(table.bookedInfo.customerName);
                          setCustomerPhone(table.bookedInfo.phone);
                        }
                        setOpenModalVisible(true);
                      }}
                      leftIcon={<PlayCircleOutlined />}
                      className="!flex-1 !rounded-xl !bg-blue-600 hover:!bg-blue-700 !border-blue-600 font-bold !text-xs !h-9 shadow-2xs text-white"
                    >
                      Khách Nhận Bàn
                    </Button>
                    <Tooltip title="Hủy giữ bàn và chuyển về trạng thái Trống">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelBooking(table)}
                        disabled={saving}
                        className="!rounded-xl !text-xs !h-9 !px-2.5 !border-red-200 !text-red-600 hover:!border-red-500 hover:!bg-red-50 font-medium"
                      >
                        Hủy Giữ Bàn
                      </Button>
                    </Tooltip>
                  </div>
                ) : isAvailable ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedTable(table);
                      setCustomerName("");
                      setCustomerPhone("");
                      setOpenModalVisible(true);
                    }}
                    leftIcon={<PlayCircleOutlined />}
                    className="!w-full !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs !h-9 shadow-2xs text-white"
                  >
                    Mở Bàn Tính Giờ
                  </Button>
                ) : isPlaying || isPaused ? (
                  <div className="flex items-center gap-1.5">
                    {/* Primary checkout button */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenCheckout(table)}
                      leftIcon={<DollarOutlined />}
                      className="!flex-1 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs !h-9 text-white shadow-2xs"
                    >
                      Thanh Toán
                    </Button>

                    {/* F&B button (Gọi món nhanh) */}
                    <Tooltip title="Gọi thêm đồ uống & món">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenFnbModal(table)}
                        leftIcon={<CoffeeOutlined />}
                        className="!rounded-xl !text-xs !h-9 !px-2.5 !border-slate-300 !text-slate-700 hover:!border-emerald-600 hover:!bg-emerald-50/50 font-semibold"
                      >
                        Gọi Món ({table.currentSession?.orders.length || 0})
                      </Button>
                    </Tooltip>

                    {/* Pause/Resume button (Kích thước 36px an toàn) */}
                    <Tooltip title={isPaused ? "Tiếp tục tính giờ bàn này" : "Tạm dừng tính giờ"}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePause(table)}
                        disabled={saving || loading || !!loadError}
                        leftIcon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                        className={`!rounded-xl !text-xs !h-9 !w-9 !p-0 !min-w-0 ${
                          isPaused
                            ? "!bg-amber-100 !border-amber-400 !text-amber-900"
                            : "!border-slate-300 !text-slate-700 hover:!border-emerald-600"
                        }`}
                        aria-label={isPaused ? "Tiếp tục tính giờ" : "Tạm dừng"}
                      />
                    </Tooltip>

                    {/* Transfer/Merge button (Kích thước 36px an toàn) */}
                    <Tooltip title="Chuyển bàn hoặc gộp hóa đơn">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTable(table);
                          setTransferModalVisible(true);
                        }}
                        leftIcon={<SwapOutlined />}
                        className="!rounded-xl !text-xs !h-9 !w-9 !p-0 !min-w-0 !border-slate-300 !text-slate-700 hover:!border-emerald-600"
                        aria-label="Đổi hoặc gộp bàn"
                      />
                    </Tooltip>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="!w-full !rounded-xl !text-xs !h-9 !text-slate-400"
                  >
                    Bàn đang bảo trì
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── MODAL 1: MỞ BÀN TÍNH GIỜ (Open Table & Start Session) ────────────── */}
      <Modal
        open={openModalVisible}
        onCancel={() => {
          setOpenModalVisible(false);
          setPendingWaitlistEntryId(null);
        }}
        footer={null}
        title={
          <Space align="center" size={8}>
            <PlayCircleOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Mở Bàn Tính Giờ - {selectedTable?.name}
            </span>
          </Space>
        }
      >
        <div className="py-3 space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1">
            <div className="flex justify-between">
              <span>Thể loại:</span>
              <strong className="font-bold">{selectedTable?.typeName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Giá theo giờ:</span>
              <strong className="font-bold text-emerald-700 font-mono">
                {selectedTable?.pricePerHour.toLocaleString("vi-VN")}đ / giờ
              </strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên khách hàng / Hội viên:
            </label>
            <Input
              placeholder="Nhập tên khách hoặc số thẻ hội viên..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              prefix={<UserOutlined className="text-slate-400" />}
              className="!h-10 !rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số điện thoại (tùy chọn):
            </label>
            <Input
              placeholder="0912 345 678"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              prefix={<PhoneOutlined className="text-slate-400" />}
              className="!h-10 !rounded-xl"
            />
          </div>

          <Text type="secondary">💡 Thu ngân có thể chọn giảm giá hội viên hoặc áp dụng giờ vàng khi thanh toán.</Text>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ghi chú (tùy chọn):
            </label>
            <Input.TextArea
              rows={2}
              placeholder="Mượn găng tay, cơ cá nhân, nước uống trước..."
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              className="!rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpenModalVisible(false);
                setPendingWaitlistEntryId(null);
              }}
              className="!rounded-xl"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenTable}
              loading={saving}
              disabled={loading || !!loadError}
              leftIcon={<PlayCircleOutlined />}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              Xác Nhận Mở Bàn
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 2: ĐỔI BÀN / GỘP BÀN (Transfer / Merge Table) ──────────────── */}
      <Modal
        open={transferModalVisible}
        onCancel={() => setTransferModalVisible(false)}
        footer={null}
        title={
          <Space align="center" size={8}>
            <SwapOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Chuyển Bàn / Gộp Bàn - {selectedTable?.name}
            </span>
          </Space>
        }
      >
        <div className="py-3 space-y-4">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <Button
              variant={transferAction === "transfer" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setTransferAction("transfer")}
              className={`!flex-1 !rounded-lg !text-xs !h-8 ${
                transferAction === "transfer"
                  ? "!bg-white !text-emerald-800 !border-0 shadow-2xs font-bold"
                  : "!text-slate-500 hover:!text-slate-800"
              }`}
            >
              Chuyển Bàn (Sang bàn trống)
            </Button>
            <Button
              variant={transferAction === "merge" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setTransferAction("merge")}
              className={`!flex-1 !rounded-lg !text-xs !h-8 ${
                transferAction === "merge"
                  ? "!bg-white !text-emerald-800 !border-0 shadow-2xs font-bold"
                  : "!text-slate-500 hover:!text-slate-800"
              }`}
            >
              Gộp Bàn (Vào bàn đang chơi)
            </Button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chọn bàn chuyển đến:
            </label>
            <Select
              placeholder="-- Chọn bàn tiếp nhận --"
              value={targetTableId}
              onChange={(val) => setTargetTableId(val)}
              className="!w-full !rounded-xl"
              options={tables
                .filter((t) => t.id !== selectedTable?.id)
                .filter((t) =>
                  transferAction === "transfer" ? t.status === "available" : t.status === "playing"
                )
                .map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.typeName}) - ${
                    t.status === "available" ? "Bàn trống" : "Đang chơi"
                  }`,
                }))}
            />
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            {transferAction === "transfer" ? (
              <p className="mb-0">
                Khi chuyển bàn, toàn bộ thời gian chơi và các món đã gọi của <strong>{selectedTable?.name}</strong> sẽ được chuyển sang bàn mới. Bàn hiện tại sẽ trở về trạng thái bàn trống.
              </p>
            ) : (
              <p className="mb-0">
                Khi gộp bàn, tiền giờ và các món đã gọi của <strong>{selectedTable?.name}</strong> sẽ được dồn vào hóa đơn bàn đích. Bàn hiện tại sẽ kết thúc phiên và trở về trạng thái bàn trống.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTransferModalVisible(false)}
              className="!rounded-xl"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleTransferOrMerge}
              loading={saving}
              disabled={loading || !!loadError}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              Xác Nhận Thực Hiện
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 3: GỌI MÓN & ĐỒ UỐNG (Manage Orders) ─────────────────── */}
      <Modal
        open={fnbModalVisible}
        onCancel={() => setFnbModalVisible(false)}
        footer={null}
        width={780}
        title={
          <div className="flex items-center justify-between pr-4">
            <Space align="center" size={8}>
              <CoffeeOutlined className="text-emerald-600 text-lg" />
              <span className="font-bold text-slate-900 text-base">
                Gọi Món & Đồ Uống - {selectedTable?.name}
              </span>
            </Space>
            <Tag color="green" className="!font-bold">
              {currentOrderList.reduce((acc, cur) => acc + cur.quantity, 0)} món đã chọn
            </Tag>
          </div>
        }
      >
        <div className="py-2 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Cột Trái (7 cols): Thực Đơn & Danh Mục */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Thực đơn & Đồ uống:</span>
              <Select
                value={fnbCategory}
                onChange={(val) => setFnbCategory(val)}
                className="!w-36 !rounded-lg !text-xs"
                options={[
                  { value: "all", label: "Tất cả danh mục" },
                  { value: "coffee", label: "Cà phê" },
                  { value: "tea", label: "Trà & Nước ngọt" },
                  { value: "beer", label: "Bia & Nước có cồn" },
                  { value: "food", label: "Đồ ăn chính" },
                  { value: "snack", label: "Đồ ăn vặt" },
                  { value: "equipment", label: "Phụ kiện bi-a" },
                ]}
              />
            </div>

            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
              {fnbStock
                .filter((item) => fnbCategory === "all" || item.category === fnbCategory)
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{item.name}</span>
                        {item.stockQuantity <= 0 ? (
                          <Tag color="error" className="!text-[9px] !px-1.5 !py-0 !border-0">HẾT HÀNG</Tag>
                        ) : item.stockQuantity < 10 ? (
                          <Tag color="warning" className="!text-[9px] !px-1.5 !py-0 !border-0">Còn {item.stockQuantity}</Tag>
                        ) : (
                          <Tag color="default" className="!text-[9px] !px-1.5 !py-0 !border-0 !bg-slate-100">Còn {item.stockQuantity}</Tag>
                        )}
                      </div>
                      <span className="text-xs font-bold text-emerald-600 block mt-0.5 font-mono">
                        {item.price.toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={item.stockQuantity <= 0}
                      onClick={() => handleAddFnbItem(item)}
                      leftIcon={<PlusOutlined />}
                      className="!text-xs !h-8 !px-3 !rounded-xl !border-emerald-300 !text-emerald-800 hover:!bg-emerald-50"
                    >
                      Thêm
                    </Button>
                  </div>
                ))}
            </div>
          </div>

          {/* Cột Phải (5 cols): Danh Sách Món Đang Chọn */}
          <div className="md:col-span-5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                <span className="text-xs font-bold text-slate-800">Danh sách món đã chọn:</span>
                <span className="text-xs font-mono text-slate-500">
                  {currentOrderList.length} loại
                </span>
              </div>

              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                {currentOrderList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Chưa có món nào. Bấm &quot;Thêm&quot; từ thực đơn bên trái.
                  </div>
                ) : (
                  currentOrderList.map((order) => (
                    <div
                      key={order.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs flex items-center justify-between"
                    >
                      <div className="pr-2 max-w-[130px]">
                        <span className="font-semibold text-slate-800 block truncate">{order.name}</span>
                        <span className="text-[11px] text-emerald-700 font-bold font-mono">
                          {(order.price * order.quantity).toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      <Space size={4} align="center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateOrderItemQty(order.id, -1)}
                          className="!h-7 !w-7 !p-0 !min-w-0 !rounded-lg !border-slate-300 !text-slate-700"
                        >
                          <MinusOutlined className="text-xs" />
                        </Button>
                        <span className="font-bold text-xs w-5 text-center font-mono">{order.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateOrderItemQty(order.id, 1)}
                          className="!h-7 !w-7 !p-0 !min-w-0 !rounded-lg !border-emerald-300 !bg-emerald-50/50 !text-emerald-800"
                        >
                          <PlusOutlined className="text-xs" />
                        </Button>
                      </Space>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total & Submit */}
            <div className="pt-3 border-t border-slate-200 mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Tổng tiền đồ uống & món:</span>
                <span className="text-base text-emerald-700 font-black font-mono">
                  {currentOrderList
                    .reduce((acc, cur) => acc + cur.price * cur.quantity, 0)
                    .toLocaleString("vi-VN")}
                  đ
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmFnbOrder}
                loading={saving}
                disabled={loading}
                className="!w-full !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold text-xs !h-9 shadow-xs"
              >
                Xác Nhận Thêm Món ({currentOrderList.reduce((acc, cur) => acc + cur.quantity, 0)} phần)
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 4: THANH TOÁN (Checkout & Process Payment) ────────────────── */}
      <Modal
        open={checkoutModalVisible}
        onCancel={() => setCheckoutModalVisible(false)}
        footer={null}
        width={560}
        title={
          <Space align="center" size={8}>
            <DollarOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Thanh Toán Bàn - {selectedTable?.name}
            </span>
          </Space>
        }
      >
        {selectedTable && selectedTable.currentSession && (
          <div className="py-2 space-y-4 text-xs">
            {/* Breakdown Bill Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-800 text-sm">{selectedTable.name}</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {calculatePlayingDetails(selectedTable).formattedTime}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Khách hàng:</span>
                <strong className="text-slate-900">{selectedTable.currentSession.customerName}</strong>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Tiền giờ chơi ({calculatePlayingDetails(selectedTable).minutes} phút):</span>
                <strong className="text-slate-900 font-mono">
                  {calculatePlayingDetails(selectedTable).cost.toLocaleString("vi-VN")}đ
                </strong>
              </div>

              {/* Split Time Rate Breakdown */}
              {calculatePlayingDetails(selectedTable).timeSlots && calculatePlayingDetails(selectedTable).timeSlots.length > 0 && (
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 space-y-1.5 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-indigo-700">
                      <ClockCircleOutlined /> Chi tiết tính tiền theo khung giờ:
                    </span>
                    {calculatePlayingDetails(selectedTable).isCrossed && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200">
                        ⚡ Qua {calculatePlayingDetails(selectedTable).timeSlots.length} khung giờ
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    {calculatePlayingDetails(selectedTable).timeSlots.map((slot, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{slot.tierName}</span>
                          <span className="text-slate-400 font-mono text-[10px] shrink-0">({slot.startTime} – {slot.endTime})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-slate-500 font-mono text-[10px]">{slot.minutes}p × {slot.pricePerHour.toLocaleString()}đ</span>
                          <span className="font-mono font-bold text-slate-900">{slot.cost.toLocaleString()}đ</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Tiền đồ uống & món ({selectedTable.currentSession.orders.length} món):</span>
                <strong className="text-slate-900 font-mono">
                  {selectedTable.currentSession.orders
                    .reduce((acc, cur) => acc + cur.price * cur.quantity, 0)
                    .toLocaleString("vi-VN")}
                  đ
                </strong>
              </div>

              {/* Discount selection */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600">Giảm giá / Ưu đãi:</span>
                <Select
                  value={discountPercent}
                  onChange={(val) => setDiscountPercent(val)}
                  className="!w-36 !rounded-lg !text-xs"
                  options={[
                    { value: 0, label: "0% (Không giảm)" },
                    { value: 5, label: "5% (Khách quen)" },
                    { value: 10, label: "10% (Hội viên VIP)" },
                    { value: 20, label: "20% (Khung Giờ Vàng)" },
                  ]}
                />
              </div>

              <Text>Tiền đặt cọc: {(selectedTable.currentSession.deposit || 0).toLocaleString("vi-VN")}đ</Text>
              <Text type="secondary">💡 Tiền cọc (nếu có) sẽ được trừ trực tiếp vào hóa đơn. Số dư cọc sẽ được hoàn lại cho khách.</Text>
              {(() => {
                const playingDetailsObj = calculatePlayingDetails(selectedTable);
                const fnbTotal = selectedTable.currentSession.orders.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const subtotal = playingDetailsObj.cost + fnbTotal;
                const discountAmount = Math.round(subtotal * (discountPercent / 100));
                const depositAmount = selectedTable.currentSession.deposit || 0;
                const finalAmount = Math.max(0, subtotal - discountAmount - depositAmount);

                return (
                  <>
                    {/* Final Amount */}
                    <div className="flex justify-between items-center pt-2 border-t-2 border-slate-200 font-bold text-sm text-slate-900">
                      <span>TỔNG CỘNG THANH TOÁN:</span>
                      <span className="text-xl font-black text-emerald-700 font-mono">
                        {finalAmount.toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-800 mb-2">
                        Phương thức thanh toán:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Button
                          variant={paymentMethod === "cash" ? "primary" : "outline"}
                          size="sm"
                          onClick={() => setPaymentMethod("cash")}
                          leftIcon={<DollarOutlined />}
                          className={`!h-12 !flex-col !gap-1 !rounded-xl ${
                            paymentMethod === "cash"
                              ? "!bg-emerald-600 !border-emerald-600 text-white shadow-xs"
                              : "!border-slate-200 !text-slate-700 hover:!border-slate-300"
                          }`}
                        >
                          <span className="text-[11px] font-bold">Tiền Mặt</span>
                        </Button>

                        <Button
                          variant={paymentMethod === "vnpay" ? "primary" : "outline"}
                          size="sm"
                          onClick={() => setPaymentMethod("vnpay")}
                          leftIcon={<QrcodeOutlined />}
                          className={`!h-12 !flex-col !gap-1 !rounded-xl ${
                            paymentMethod === "vnpay"
                              ? "!bg-emerald-600 !border-emerald-600 text-white shadow-xs"
                              : "!border-slate-200 !text-slate-700 hover:!border-slate-300"
                          }`}
                        >
                          <span className="text-[11px] font-bold">Chuyển Khoản QR</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          title="Cổng quẹt thẻ đang bảo trì"
                          leftIcon={<SafetyCertificateOutlined />}
                          className="!h-12 !flex-col !gap-1 !rounded-xl !border-slate-200 !text-slate-400 opacity-50 cursor-not-allowed"
                        >
                          <span className="text-[11px] font-bold">Quẹt Thẻ</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          title="Ví hội viên đang cập nhật"
                          leftIcon={<UserOutlined />}
                          className="!h-12 !flex-col !gap-1 !rounded-xl !border-slate-200 !text-slate-400 opacity-50 cursor-not-allowed"
                        >
                          <span className="text-[11px] font-bold">Ví Hội Viên</span>
                        </Button>
                      </div>
                    </div>

                    {/* Máy tính tiền thối khi chọn Tiền Mặt */}
                    {paymentMethod === "cash" && (
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800">Tiền khách đưa:</span>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              placeholder="0"
                              value={cashReceived !== null ? cashReceived : ""}
                              onChange={(e) => setCashReceived(e.target.value ? Number(e.target.value) : null)}
                              className="!w-36 !h-8 !text-right font-mono font-bold !text-slate-900"
                            />
                            <span className="text-xs font-semibold text-slate-500">đ</span>
                          </div>
                        </div>

                        {/* Phím gợi ý tiền chẵn nhanh */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setCashReceived(finalAmount)}
                            className="px-2.5 py-1 text-[11px] rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                          >
                            Đủ tiền ({finalAmount.toLocaleString("vi-VN")}đ)
                          </button>
                          {[100000, 200000, 500000, 1000000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCashReceived(amt)}
                              className="px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:border-emerald-400 hover:text-emerald-700 transition-colors font-mono"
                            >
                              {(amt / 1000).toLocaleString("vi-VN")}k
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setCashReceived(null)}
                            className="px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                          >
                            Xóa
                          </button>
                        </div>

                        {/* Tính tiền thừa trả lại */}
                        {cashReceived !== null && (
                          <div
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              cashReceived >= finalAmount
                                ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                                : "bg-amber-50/90 border-amber-200 text-amber-900"
                            }`}
                          >
                            <span className="font-semibold text-xs">
                              {cashReceived >= finalAmount ? "Tiền thừa trả khách:" : "Khách đưa còn thiếu:"}
                            </span>
                            <span className="font-mono font-black text-sm">
                              {Math.abs(cashReceived - finalAmount).toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chuyển khoản VietQR hiển thị khi chọn QR */}
                    {paymentMethod === "vnpay" && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 space-y-2.5">
                        <div className="flex items-center gap-3.5">
                          <div className="h-28 w-28 bg-white rounded-xl p-1 shadow-xs border border-emerald-300 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={`https://img.vietqr.io/image/MB-0901234567-compact2.png?amount=${finalAmount}&addInfo=CueZone%20${selectedTable.code}&accountName=CLB%20BIDA%20CUEZONE`}
                              alt="VietQR Chuyển Khoản"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Tag color="green" className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold !m-0">
                                VIETQR 24/7
                              </Tag>
                              <span className="font-extrabold text-slate-900 text-xs">MB Bank (Quân Đội)</span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              STK: <strong className="font-mono text-slate-900 font-bold">0901 234 567</strong>
                            </div>
                            <div className="text-[11px] text-slate-600 truncate">
                              Chủ TK: <strong className="text-slate-900 font-bold">CLB BIDA CUEZONE</strong>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Số tiền: <strong className="font-mono text-emerald-700 font-black text-sm">{finalAmount.toLocaleString("vi-VN")}đ</strong>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Nội dung: <strong>CueZone {selectedTable.code}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-white/80 border border-emerald-200/80 text-[11px] text-emerald-800 flex items-center gap-1.5">
                          <CheckCircleOutlined className="text-emerald-600 shrink-0" />
                          <span>Khách quét mã chuyển khoản thành công, nhấn <strong>Xác Nhận & In Hóa Đơn</strong> để hoàn tất.</span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCheckoutModalVisible(false)}
                className="!rounded-xl"
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmCheckout}
                loading={saving}
                disabled={loading || !!loadError}
                leftIcon={<PrinterOutlined />}
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
              >
                Xác Nhận & In Hóa Đơn
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL 5: PHIẾU HÓA ĐƠN IN NHIỆT (Print Receipt) ─────────────────── */}
      <Modal
        open={receiptModalVisible}
        onCancel={() => setReceiptModalVisible(false)}
        footer={null}
        width={420}
        title={
          <div className="flex items-center justify-between pr-4">
            <span className="font-bold text-slate-900 text-sm">Hóa Đơn Thanh Toán</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.print();
                message.success("Đang gửi lệnh in tới máy in nhiệt quầy thu ngân...");
              }}
              leftIcon={<PrinterOutlined />}
              className="!text-xs !h-8 !rounded-xl"
            >
              In Hóa Đơn
            </Button>
          </div>
        }
      >
        {paidSummary && (
          <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 font-mono text-xs space-y-3">
            <div className="text-center pb-2 border-b border-slate-200">
              <span className="text-sm font-black text-slate-900 block">CUEZONE BILLIARDS LOUNGE</span>
              <span className="text-[10px] text-slate-500 block">123 Nguyễn Thị Minh Khai, Q.3, TP.HCM</span>
              <span className="text-[10px] text-slate-500 block">Hotline: 1900 6868</span>
              <span className="text-[11px] font-bold text-slate-800 block mt-1">
                HÓA ĐƠN THANH TOÁN ({paidSummary.invoiceCode})
              </span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Bàn:</span>
                <strong>{paidSummary.tableName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Khách hàng:</span>
                <strong>{paidSummary.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Thời gian chơi:</span>
                <strong>{paidSummary.sessionStart} - {paidSummary.sessionEnd} ({paidSummary.durationFormatted})</strong>
              </div>
              {paidSummary.timeSlots && paidSummary.timeSlots.length > 1 ? (
                <div className="py-1 my-1 border-y border-dashed border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Chi tiết tính tiền theo khung giờ:</span>
                  {paidSummary.timeSlots.map((slot, idx) => (
                    <div key={idx} className="flex justify-between text-[10.5px]">
                      <span>{slot.tierName} ({slot.startTime}–{slot.endTime}): {slot.minutes}p × {slot.pricePerHour.toLocaleString()}đ</span>
                      <span className="font-bold">{slot.cost.toLocaleString()}đ</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between">
                  <span>Đơn giá giờ:</span>
                  <span>{paidSummary.pricePerHour.toLocaleString("vi-VN")}đ/h</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t border-slate-100">
                <span>Tiền giờ chơi:</span>
                <span>{paidSummary.playingCost.toLocaleString("vi-VN")}đ</span>
              </div>
            </div>

            {paidSummary.orders && paidSummary.orders.length > 0 && (
              <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
                <span className="font-bold block mb-1">ĐỒ UỐNG & MÓN ĐÃ DÙNG:</span>
                {paidSummary.orders.map((item: PosOrderItem, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{(item.price * item.quantity).toLocaleString("vi-VN")}đ</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1 border-t border-slate-100">
                  <span>Tổng đồ uống & món:</span>
                  <span>{paidSummary.fnbTotal.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t-2 border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Tổng tiền dịch vụ:</span>
                <span>{paidSummary.subtotal.toLocaleString("vi-VN")}đ</span>
              </div>
              {paidSummary.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Giảm giá ({paidSummary.discountPercent}%):</span>
                  <span>-{paidSummary.discountAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              )}
              <Text>Tiền cọc đã trừ: {paidSummary.deposit.toLocaleString("vi-VN")}đ</Text>
              {paidSummary.refundAmount > 0 && <Text type="danger">Cần hoàn lại khách: {paidSummary.refundAmount.toLocaleString("vi-VN")}đ</Text>}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200 text-slate-900">
                <span>TỔNG THANH TOÁN:</span>
                <span className="text-emerald-700">{paidSummary.finalAmount.toLocaleString("vi-VN")}đ</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Hình thức thanh toán:</span>
                <span className="uppercase">{paidSummary.paymentMethod}</span>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-slate-200 text-[10px] text-slate-400">
              Cảm ơn quý khách đã sử dụng dịch vụ tại CueZone!
              <br />
              Hẹn gặp lại quý khách!
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL 6: QUẢN LÝ DANH SÁCH KHÁCH ĐANG CHỜ BÀN ── */}
      <Modal
        open={waitlistModalVisible}
        onCancel={() => setWaitlistModalVisible(false)}
        footer={null}
        width={760}
        title={
          <div className="flex items-center gap-2 flex-wrap pr-4">
            <UsergroupAddOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Danh Sách Khách Đang Chờ Bàn
            </span>
            <Tag color="green" className="!rounded-full !px-2 !font-bold">
              {waitlist.length} khách đang đợi
            </Tag>
            <Tag color={availableTables.length > 0 ? "blue" : "volcano"} className="!rounded-full !px-2 !font-bold">
              Toàn quán: {availableTables.length} bàn trống
            </Tag>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          {/* Form thêm khách vào hàng chờ */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-xs text-slate-800 block mb-2.5">
              + Thêm khách vào danh sách chờ bàn
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Tên khách <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newWaitName}
                  onChange={(e) => setNewWaitName(e.target.value)}
                  placeholder="VD: Anh Nam"
                  size="small"
                  className="!rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newWaitPhone}
                  onChange={(e) => setNewWaitPhone(e.target.value)}
                  placeholder="09xx..."
                  size="small"
                  className="!rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Số lượng khách
                </label>
                <Select
                  value={newWaitGuests}
                  onChange={(val) => setNewWaitGuests(val)}
                  size="small"
                  className="w-full !rounded-lg"
                  options={[
                    { value: 1, label: "1 người" },
                    { value: 2, label: "2 người" },
                    { value: 3, label: "3 người" },
                    { value: 4, label: "4 người" },
                    { value: 6, label: "6+ người" },
                  ]}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Thể loại bàn mong muốn
                </label>
                <Select
                  value={newWaitType}
                  onChange={(val) => setNewWaitType(val)}
                  size="small"
                  className="w-full !rounded-lg"
                  options={[
                    { value: "Bàn Bida Lỗ (Pool)", label: "Bàn Bida Lỗ (Pool)" },
                    { value: "Bàn Bida Carom (Phăng)", label: "Bàn Bida Carom (Phăng)" },
                    { value: "Bàn Bida Snooker", label: "Bàn Bida Snooker" },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-2.5 pt-2 border-t border-slate-200/80">
              <div className="flex-1 w-full">
                <Input
                  value={newWaitNote}
                  onChange={(e) => setNewWaitNote(e.target.value)}
                  placeholder="Ghi chú (yêu cầu vị trí, đồ uống trước...)"
                  size="small"
                  className="!rounded-lg w-full"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddWaitlist}
                leftIcon={<PlusOutlined />}
                className="!rounded-lg !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs !h-7.5 whitespace-nowrap"
              >
                Thêm Vào Danh Sách
              </Button>
            </div>
          </div>

          {/* Danh sách khách đang chờ */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <span className="font-bold text-xs text-slate-800">
                Khách đang chờ (Thứ tự ưu tiên theo thời gian đến)
              </span>
              <span className="text-[11px] text-slate-500">
                💡 Thu ngân có thể chọn bàn trống muốn xếp hoặc bấm &quot;Xếp Bàn&quot; để xếp nhanh
              </span>
            </div>

            {waitlist.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Text className="!text-slate-400 text-xs">
                  Hiện không có khách nào trong danh sách chờ.
                </Text>
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {waitlist.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {item.customerName}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            ({item.phone})
                          </span>
                          <Tag color="cyan" className="!rounded-full !px-1.5 !py-0 !text-[10px] !m-0">
                            {item.guests} người
                          </Tag>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>Nhu cầu bàn: <strong className="text-slate-700">{item.preferredType}</strong></span>
                          <span>•</span>
                          <span>Thời gian vào: <strong className="text-slate-700 font-mono">{item.joinedTime}</strong></span>
                          {item.note && (
                            <>
                              <span>•</span>
                              <span className="italic text-slate-400 truncate max-w-[150px]">"{item.note}"</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Chọn bàn cụ thể muốn xếp cho khách */}
                      <Select
                        placeholder={availableTables.length > 0 ? "-- Chọn bàn xếp khách --" : "Hết bàn trống"}
                        value={
                          selectedWaitlistTable[item.id] ||
                          (availableTables.find((t) => t.typeName === item.preferredType)?.id ?? availableTables[0]?.id)
                        }
                        onChange={(val) => setSelectedWaitlistTable((prev) => ({ ...prev, [item.id]: val }))}
                        disabled={availableTables.length === 0}
                        className="w-48 sm:w-60 !text-xs !h-8 font-medium"
                        options={getTableOptionsForGuest(item.preferredType)}
                      />

                      <Button
                        variant="primary"
                        size="sm"
                        disabled={availableTables.length === 0}
                        onClick={() => {
                          const chosenId =
                            selectedWaitlistTable[item.id] ||
                            (availableTables.find((t) => t.typeName === item.preferredType)?.id ?? availableTables[0]?.id);
                          handleAssignWaitlist(item, chosenId);
                        }}
                        leftIcon={<PlayCircleOutlined />}
                        className="!rounded-lg !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs !h-8 shadow-2xs whitespace-nowrap"
                      >
                        Xếp Bàn
                      </Button>
                      <Tooltip title="Xóa khỏi danh sách chờ">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveWaitlist(item.id)}
                          leftIcon={<DeleteOutlined />}
                          className="!rounded-lg !text-xs !h-8 !w-8 !p-0 !border-slate-200 !text-slate-400 hover:!text-red-600 hover:!border-red-300 shrink-0"
                        />
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PosTableFloorPage;
