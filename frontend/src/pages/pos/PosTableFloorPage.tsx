import clsx from "clsx";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { posService } from "../../services/pos.service";
import type { PricingTier } from "../../types";
import type {
  PosTable,
  PosOrderItem,
  CheckoutReceipt,
  EligibleMoveTargetsResponse,
} from "../../types/pos";
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
  GiftOutlined,
  SearchOutlined,
  RollbackOutlined,
  HistoryOutlined,
  BranchesOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  ShoppingOutlined,
  UnorderedListOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Input,
  Select,
  Typography,
  message,
  notification,
  Modal,
  Space,
  SegmentedPillList,
  SearchFilterInput,
  Tooltip,
} from "../../shared/ui";
import { getSocket } from "../../services/socket.service";
import { productService } from "../../services/product.service";
import { waitlistService } from "../../services/waitlist.service";

export interface FnbStockItem {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryName: string;
  price: number;
  priceFormatted: string;
  stockQuantity: number;
  minThreshold: number;
  unit: string;
  image?: string;
}
import BookingQrScanner from "../../components/booking/BookingQrScanner";
import CustomerPaymentRequests from "../../components/pos/CustomerPaymentRequests";
import CustomerOrderDrawer from "../../components/pos/CustomerOrderDrawer";
import type { CustomerOrder } from "../../services/customer-order.service";

const { Title, Text } = Typography;

export const PosTableFloorPage: React.FC = () => {
  const [tables, setTables] = useState<PosTable[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(defaultPricingTiers);
  const [fnbStock, setFnbStock] = useState<FnbStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingOrdersByTable, setPendingOrdersByTable] = useState<Record<string, number>>({});

  const handleOrdersUpdated = useCallback((orders: CustomerOrder[]) => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.status === "pending") {
        map[o.tableId] = (map[o.tableId] || 0) + 1;
      }
    });
    setPendingOrdersByTable(map);
  }, []);
  const [saving, setSaving] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [bookingQrScannerOpen, setBookingQrScannerOpen] = useState(false);
  const busy = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadTables = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tableData, pricingData, productsData] = await Promise.all([
        posService.getTables(),
        posService.getPricingTiers().catch(() => []),
        productService.getFnbMenu().catch(() => []),
      ]);
      setTables(tableData);
      setSelectedTable((prev) => prev ? (tableData.find((t) => t.id === prev.id) || prev) : null);
      if (pricingData && pricingData.length > 0) {
        setPricingTiers(pricingData);
      }
      if (Array.isArray(productsData)) {
        const mappedStock: FnbStockItem[] = productsData.map((p) => {
          const cat = (p.category || "").toLowerCase();
          let categoryName = "Bao Tay & Tiện Ích";
          if (cat === "drink" || cat === "coffee" || cat === "tea" || cat === "beer") categoryName = "Đồ Uống";
          else if (cat === "food") categoryName = "Đồ Ăn";
          else if (cat === "snack") categoryName = "Ăn Vặt";

          return {
            id: String(p._id),
            code: p.sku || `PRD-${String(p._id).slice(-4).toUpperCase()}`,
            name: p.name,
            category: p.category,
            categoryName,
            price: p.salePrice,
            priceFormatted: `${p.salePrice.toLocaleString("vi-VN")}đ`,
            stockQuantity: p.stock ?? 0,
            minThreshold: 10,
            unit: (p as any).unit || "Phần",
            image: p.imageUrl,
          };
        });
        setFnbStock(mappedStock);
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
      const errorMessage = error.response?.data?.message || error.message || "Không thể lưu thay đổi";
      const errorCode = error.response?.data?.code;
      message.error(errorCode === "WAL001" ? `${errorCode}: ${errorMessage}` : errorMessage);
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
  const [isCheckInMode, setIsCheckInMode] = useState<boolean>(false);
  const [isMemberCustomer, setIsMemberCustomer] = useState<boolean>(false);
  const [openModalMemberInfo, setOpenModalMemberInfo] = useState<{
    name: string;
    phone: string;
    rank?: string;
    walletBalance?: number;
  } | null>(null);
  const [isSearchingOpenMember, setIsSearchingOpenMember] = useState<boolean>(false);

  // 2. Transfer / Merge Table Modal (SCRUM-863)
  const [transferModalVisible, setTransferModalVisible] = useState<boolean>(false);
  const [targetTableId, setTargetTableId] = useState<string>("");
  const [transferAction, setTransferAction] = useState<"transfer" | "merge">("transfer");
  const [transferReason, setTransferReason] = useState<string>("");
  const [eligibleMoveData, setEligibleMoveData] = useState<EligibleMoveTargetsResponse | null>(null);
  const [loadingMoveTargets, setLoadingMoveTargets] = useState<boolean>(false);

  // 3. F&B Order & Cancellation (SCRUM-864)
  const [fnbModalVisible, setFnbModalVisible] = useState<boolean>(false);
  const [fnbTab, setFnbTab] = useState<"order" | "manage">("order");
  const [fnbCategory, setFnbCategory] = useState<string>("all");
  const [fnbSearchText, setFnbSearchText] = useState<string>("");
  const [newOrderList, setNewOrderList] = useState<PosOrderItem[]>([]);

  // Cancel item modal states
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [cancellingItem, setCancellingItem] = useState<PosOrderItem | null>(null);
  const [cancelQty, setCancelQty] = useState<number>(1);
  const [cancelReason, setCancelReason] = useState<string>("Khách đổi ý / Chưa dùng");
  const [customCancelReason, setCustomCancelReason] = useState<string>("");
  const [restoreStock, setRestoreStock] = useState<boolean>(true);

  // 4. Checkout & Payment Modal
  const [checkoutModalVisible, setCheckoutModalVisible] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "vnpay" | "cash" | "card" | "member_balance" | "split"
  >("cash");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showTimeSlots, setShowTimeSlots] = useState<boolean>(false);
  const [checkoutPhone, setCheckoutPhone] = useState<string>("");
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<{
    name: string;
    phone: string;
    rank?: string;
    walletBalance?: number;
    walletPoints?: number;
    availableVouchers?: Array<{
      code: string;
      description?: string;
      discountType: "percent" | "fixed";
      discountValue: number;
      minOrderAmount: number;
    }>;
  } | null>(null);
  const [isSearchingMember, setIsSearchingMember] = useState<boolean>(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
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
      if (
        (e.key === "/" || e.key === "F3") &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
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

  const [waitlistModalVisible, setWaitlistModalVisible] = useState<boolean>(false);
  const [waitlist, setWaitlist] = useState<Array<{
    id: string;
    _id?: string;
    customerName: string;
    phone: string;
    guests: number;
    preferredType: string;
    joinedTime: string;
    note?: string;
  }>>([]);
  const fetchWaitlist = useCallback(async () => {
    try {
      const list = await waitlistService.getAll();
      setWaitlist(
        list.map((w) => ({
          ...w,
          id: String(w._id || w.id),
        })),
      );
    } catch (e) {
      console.error("Lỗi tải danh sách chờ:", e);
    }
  }, []);

  useEffect(() => {
    fetchWaitlist();
    const socket = getSocket();
    const handleSync = () => {
      fetchWaitlist();
    };
    socket.on("waitlist:updated", handleSync);
    window.addEventListener("waitlist:updated", handleSync);
    return () => {
      socket.off("waitlist:updated", handleSync);
      window.removeEventListener("waitlist:updated", handleSync);
    };
  }, [fetchWaitlist]);

  const [selectedWaitlistTable, setSelectedWaitlistTable] = useState<Record<string, string>>({});
  const [pendingWaitlistEntryId, setPendingWaitlistEntryId] = useState<string | null>(null);

  const [newWaitName, setNewWaitName] = useState("");
  const [newWaitPhone, setNewWaitPhone] = useState("");
  const [newWaitGuests, setNewWaitGuests] = useState(2);
  const [newWaitType, setNewWaitType] = useState("Bàn Bida Lỗ (Pool)");
  const [newWaitNote, setNewWaitNote] = useState("");

  const handleAddWaitlist = async () => {
    if (!newWaitName.trim() || !newWaitPhone.trim()) {
      message.warning("Vui lòng nhập tên và số điện thoại khách chờ");
      return;
    }
    try {
      await waitlistService.create({
        customerName: newWaitName.trim(),
        phone: newWaitPhone.trim(),
        guests: newWaitGuests,
        preferredType: newWaitType,
        note: newWaitNote.trim(),
      });
      setNewWaitName("");
      setNewWaitPhone("");
      setNewWaitNote("");
      message.success("Đã thêm khách vào danh sách chờ bàn");
      fetchWaitlist();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || "Không thể thêm khách chờ");
    }
  };

  const handleAssignWaitlist = (
    entry: {
      id: string;
      customerName: string;
      phone: string;
      guests: number;
      preferredType: string;
      joinedTime: string;
      note?: string;
    },
    chosenTableId?: string,
  ) => {
    let targetTable: PosTable | undefined;

    if (chosenTableId) {
      targetTable = tables.find((t) => t.id === chosenTableId && t.status === "available");
    }

    if (!targetTable) {
      targetTable =
        tables.find(
          (t) =>
            t.status === "available" &&
            (t.typeName === entry.preferredType || !entry.preferredType),
        ) || tables.find((t) => t.status === "available");
    }

    if (!targetTable) {
      message.warning(
        `Toàn quán hiện không còn bàn trống nào để xếp cho khách ${entry.customerName}!`,
      );
      return;
    }

    setSelectedTable(targetTable);
    setCustomerName(entry.customerName);
    setCustomerPhone(entry.phone);
    setSessionNote(entry.note ? `Khách chờ: ${entry.note}` : "Khách từ danh sách chờ");
    setPendingWaitlistEntryId(entry.id);
    setOpenModalVisible(true);
    setWaitlistModalVisible(false);
    message.info(
      `Đang xếp ${targetTable.name} cho khách ${entry.customerName}. Vui lòng bấm xác nhận mở bàn!`,
    );
  };

  const handleRemoveWaitlist = async (id: string) => {
    try {
      await waitlistService.remove(id);
      message.info("Đã xóa khách khỏi danh sách chờ");
      fetchWaitlist();
    } catch {
      message.error("Không thể xóa khỏi danh sách chờ");
    }
  };

  const handleCancelBooking = (table: PosTable) => {
    Modal.confirm({
      title: `Hủy giữ bàn đặt trước [${table.code}]?`,
      content: `Khách ${table.bookedInfo?.customerName || "hẹn trước"} chưa nhận bàn. Bạn có chắc muốn hủy giữ bàn này và chuyển về trạng thái Trống?`,
      okText: "Hủy giữ bàn",
      okType: "danger",
      cancelText: "Bỏ qua",
      onOk: async () => {
        try {
          await posService.cancelBooking(table.id);
          message.success(`Đã hủy giữ bàn ${table.name} thành công`);
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
    const table = tables.find((item) => item.id === tableId);
    if (table?.status === "booked") {
      setSelectedTable(table);
      setCustomerName(table.bookedInfo?.customerName || "");
      setCustomerPhone(table.bookedInfo?.phone || "");
      setIsCheckInMode(true);
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

  // Helper to parse booking date and time
  const parseBookingDateTime = (timeStr?: string, refTime = currentTime): Date | null => {
    if (!timeStr) return null;
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return null;
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);

    const bookingDate = new Date(refTime);
    const dateMatch = timeStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      bookingDate.setFullYear(
        parseInt(dateMatch[1], 10),
        parseInt(dateMatch[2], 10) - 1,
        parseInt(dateMatch[3], 10),
      );
    }
    bookingDate.setHours(h, m, 0, 0);
    return bookingDate;
  };

  const getBookingOverdueMinutes = (timeStr?: string): number => {
    const bDate = parseBookingDateTime(timeStr, currentTime);
    if (!bDate) return 0;
    const diffMs = currentTime - bDate.getTime();
    return diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
  };

  const getBookingUpcomingMinutes = (timeStr?: string): number => {
    const bDate = parseBookingDateTime(timeStr, currentTime);
    if (!bDate) return -1;
    const diffMs = bDate.getTime() - currentTime;
    return diffMs > 0 ? Math.floor(diffMs / 60000) : -1;
  };

  // Ref lưu các mốc thông báo đã bắn để tránh hiển thị lặp lại
  const notifiedUpcomingRef = useRef<Set<string>>(new Set());

  // Tự động kiểm tra và bắn thông báo cảnh báo khi bàn đang chơi sắp đến giờ có khách đặt
  useEffect(() => {
    tables.forEach((table) => {
      // Chỉ kiểm tra các bàn đang có khách chơi hoặc tạm dừng và có thông tin đặt trước
      if (
        (table.status === "playing" || table.status === "paused") &&
        table.bookedInfo?.time
      ) {
        const upcomingMin = getBookingUpcomingMinutes(table.bookedInfo.time);
        if (upcomingMin < 0) return;

        const customerName = table.bookedInfo.customerName || "Khách hẹn";
        const bookingTime = table.bookedInfo.time.split(" ")[0] || table.bookedInfo.time;

        // Mốc 1: Còn <= 30 phút (và > 15 phút) - Cảnh báo chuẩn bị
        if (upcomingMin <= 30 && upcomingMin > 15) {
          const key30 = `${table.id}-${table.bookedInfo.time}-30`;
          if (!notifiedUpcomingRef.current.has(key30)) {
            notifiedUpcomingRef.current.add(key30);
            notification.warning({
              message: `Nhắc lịch hẹn sắp tới • ${table.name}`,
              description: `Bàn ${table.name} sắp có khách đặt (${customerName} lúc ${bookingTime}), còn ${upcomingMin} phút. Vui lòng nhắc khách đang chơi hoặc chuẩn bị bàn trống thay thế nếu khách muốn chơi tiếp!`,
              placement: "topRight",
              duration: 8,
            });
          }
        }

        // Mốc 2: Còn <= 15 phút - Cảnh báo khẩn cấp sắp đến giờ
        if (upcomingMin <= 15) {
          const key15 = `${table.id}-${table.bookedInfo.time}-15`;
          if (!notifiedUpcomingRef.current.has(key15)) {
            notifiedUpcomingRef.current.add(key15);
            notification.error({
              message: `KHẨN CẤP: Sắp đến giờ hẹn • ${table.name}`,
              description: `Chỉ còn ${upcomingMin} phút nữa đến giờ hẹn của ${customerName} (${bookingTime}). Vui lòng tiến hành thanh toán / hỗ trợ chuyển bàn cho khách đang chơi để sẵn sàng đón khách đặt!`,
              placement: "topRight",
              duration: 12,
            });
          }
        }
      }
    });
  }, [tables, currentTime]);

  // Helper format giờ mở bàn thực tế (hiển thị kèm ngày nếu bắt đầu từ ngày hôm trước)
  const formatSessionStartTime = (startedAt?: number, sessionStartFallback?: string): string => {
    if (!startedAt) return sessionStartFallback || "19:45";
    const date = new Date(startedAt);
    const now = new Date(currentTime);
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    if (isToday) return timeStr;
    const dateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    return `${timeStr} (${dateStr})`;
  };

  const normalizeSearchText = (str?: string): string => {
    return (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();
  };

  const filteredTables = useMemo(() => {
    const qRaw = searchQuery.trim().toLowerCase();
    const qNorm = normalizeSearchText(qRaw);
    const qUnpadded = qNorm.replace(/\b0+(\d+)/g, "$1");

    return tables.filter((t) => {
      const matchArea =
        filterArea === "all" ||
        (filterArea === "standard" &&
          (t.area?.toLowerCase().includes("phổ thông") || t.code.startsWith("STD"))) ||
        (filterArea === "vip" &&
          (t.area?.toLowerCase().includes("vip") || t.code.startsWith("VIP"))) ||
        (filterArea === "match" &&
          (t.area?.toLowerCase().includes("thi đấu") || t.code.startsWith("MTCH")));

      const matchType =
        filterType === "all" ||
        t.type === filterType ||
        (filterType === "pool" &&
          (t.type === "pool" || t.typeName?.includes("Lỗ") || t.typeName?.includes("Pool"))) ||
        (filterType === "carom" &&
          (t.type === "carom" || t.typeName?.includes("Carom") || t.typeName?.includes("Phăng"))) ||
        (filterType === "snooker" && (t.type === "snooker" || t.typeName?.includes("Snooker")));

      const isBookedTable = t.status === "booked";
      const upMinTable = isBookedTable ? getBookingUpcomingMinutes(t.bookedInfo?.time) : -1;
      const overMinTable = isBookedTable ? getBookingOverdueMinutes(t.bookedInfo?.time) : 0;
      const isHoldingTable =
        isBookedTable &&
        ((upMinTable >= 0 && upMinTable <= 45) || (overMinTable > 0 && overMinTable <= 15));
      const isAvailableForPlay = t.status === "available" || (isBookedTable && !isHoldingTable);

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "available" && isAvailableForPlay) ||
        (filterStatus === "playing" && t.status === "playing") ||
        (filterStatus === "paused" && t.status === "paused") ||
        (filterStatus === "booked" && isHoldingTable) ||
        t.status === filterStatus;

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
        normName.includes(qNorm) ||
        normNameUnpadded.includes(qUnpadded) ||
        normName.includes(qRaw) ||
        normCode.includes(qNorm) ||
        normCodeUnpadded.includes(qUnpadded) ||
        normArea.includes(qNorm) ||
        normCustomer.includes(qNorm) ||
        phone.includes(qRaw) ||
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
      const isPool =
        t.type === "pool" || t.typeName?.includes("Lỗ") || t.typeName?.includes("Pool");
      const isCarom =
        t.type === "carom" || t.typeName?.includes("Carom") || t.typeName?.includes("Phăng");
      const isSnooker = t.type === "snooker" || t.typeName?.includes("Snooker");

      const isBookedItem = t.status === "booked";
      const upMinItem = isBookedItem ? getBookingUpcomingMinutes(t.bookedInfo?.time) : -1;
      const overMinItem = isBookedItem ? getBookingOverdueMinutes(t.bookedInfo?.time) : 0;
      const isHoldingItem =
        isBookedItem &&
        ((upMinItem >= 0 && upMinItem <= 45) || (overMinItem > 0 && overMinItem <= 15));

      if (t.status === "playing") playing++;
      else if (t.status === "paused") paused++;
      else if (t.status === "booked") {
        if (isHoldingItem) {
          booked++;
        } else {
          available++;
          booked++;
        }
      }
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
        const fnbCost =
          (t.currentSession?.orders || []).reduce(
            (acc, cur) =>
              cur.status !== "cancelled"
                ? acc + (Number(cur.price) || 0) * (Number(cur.quantity) || 0)
                : acc,
            0,
          );
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
    { value: "all", label: `Tất cả loại bàn (${stats.total})` },
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

  const handlePhoneChangeInOpenModal = async (phoneInput: string) => {
    setCustomerPhone(phoneInput);
    const clean = phoneInput.trim().replace(/[\s.-]/g, "");
    if (clean.length >= 8) {
      setIsSearchingOpenMember(true);
      try {
        const res = await posService.lookupCustomer(clean);
        if (res.success && res.data) {
          setOpenModalMemberInfo({
            name: res.data.name,
            phone: res.data.phone,
            rank: res.data.rank,
            walletBalance: res.data.walletBalance,
          });
          setCustomerName(res.data.name);
          setIsMemberCustomer(true);
        } else {
          setOpenModalMemberInfo(null);
          setIsMemberCustomer(false);
        }
      } catch {
        setOpenModalMemberInfo(null);
        setIsMemberCustomer(false);
      } finally {
        setIsSearchingOpenMember(false);
      }
    } else {
      setOpenModalMemberInfo(null);
      setIsMemberCustomer(false);
    }
  };

  // Handler: Open Table & Start Session
  const handleOpenTable = async () => {
    if (!selectedTable) return;
    if (selectedTable.status !== "available" && selectedTable.status !== "booked") {
      message.warning("Bàn này không ở trạng thái sẵn sàng để mở!");
      return;
    }

    const saved = await save(() =>
      posService.open(selectedTable.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        note: sessionNote.trim(),
        bookingId: isCheckInMode ? selectedTable.bookedInfo?.bookingId : undefined,
        isMember: isMemberCustomer,
      }),
    );
    if (!saved) return;

    if (pendingWaitlistEntryId) {
      waitlistService
        .updateStatus(pendingWaitlistEntryId, "seated", selectedTable.id)
        .then(() => fetchWaitlist())
        .catch(() => {});
      setPendingWaitlistEntryId(null);
    }

    message.success(`Đã mở ${selectedTable.name} & bắt đầu tính giờ thành công!`);
    setOpenModalVisible(false);
    setSelectedTable(null);
    setCustomerName("");
    setCustomerPhone("");
    setSessionNote("");
    setIsMemberCustomer(false);
    setOpenModalMemberInfo(null);
    setIsCheckInMode(false);
  };

  // Handler: Pause / Resume Table
  const handleTogglePause = async (table: PosTable) => {
    if (!table.currentSession) return;
    if (await save(() => posService.pause(table))) {
      message.success(
        table.currentSession.isPaused
          ? `Đã tiếp tục tính giờ ${table.name}`
          : `Đã tạm dừng tính giờ ${table.name}`,
      );
    }
  };

  // Handlers: Transfer / Merge Table (SCRUM-863)
  const handleOpenTransferModal = async (table: PosTable, action: "transfer" | "merge" = "transfer") => {
    setSelectedTable(table);
    setTransferAction(action);
    setTargetTableId("");
    setTransferReason("");
    setTransferModalVisible(true);
    setLoadingMoveTargets(true);
    try {
      const res = await posService.getMoveTargets(table.id, action);
      setEligibleMoveData(res);
    } catch (err: any) {
      console.error("Lỗi lấy danh sách bàn khả dụng:", err);
      setEligibleMoveData(null);
    } finally {
      setLoadingMoveTargets(false);
    }
  };

  const handleSwitchTransferAction = async (action: "transfer" | "merge") => {
    setTransferAction(action);
    setTargetTableId("");
    if (!selectedTable) return;
    setLoadingMoveTargets(true);
    try {
      const res = await posService.getMoveTargets(selectedTable.id, action);
      setEligibleMoveData(res);
    } catch (err: any) {
      console.error("Lỗi đổi hành động chuyển/gộp bàn:", err);
      setEligibleMoveData(null);
    } finally {
      setLoadingMoveTargets(false);
    }
  };

  const handleTransferOrMerge = async () => {
    if (!selectedTable || !selectedTable.currentSession || !targetTableId) {
      message.warning("Vui lòng chọn bàn đích!");
      return;
    }

    const targetTable =
      tables.find((t) => t.id === targetTableId) ||
      eligibleMoveData?.targets?.find((t) => t.id === targetTableId);
    if (!targetTable) return;

    const saved = await save(() =>
      posService.move(selectedTable, targetTableId, transferAction, {
        reason: transferReason.trim() || undefined,
        pricingOption: "target_table",
      }),
    );
    if (!saved) return;

    message.success(
      `Đã ${transferAction === "transfer" ? "chuyển" : "gộp"} ${selectedTable.name} sang ${targetTable.name}!`,
    );

    setTransferModalVisible(false);
    setSelectedTable(null);
    setTargetTableId("");
    setTransferReason("");
    setEligibleMoveData(null);
    await loadTables();
  };

    // Active & Cancelled orders for selectedTable
  const fnbCategoryOptions = useMemo(() => {
    const cats = Array.from(new Set(fnbStock.map((item) => item.category).filter(Boolean)));
    const options = [{ value: "all", label: "Tất cả danh mục" }];
    const labelMap: Record<string, string> = {
      drink: "Đồ uống",
      coffee: "Cà phê",
      tea: "Trà & Nước ngọt",
      beer: "Bia & Đồ có cồn",
      food: "Đồ ăn chính",
      snack: "Đồ ăn vặt",
      accessory: "Bao tay & Tiện ích",
      equipment: "Bao tay & Tiện ích",
    };
    for (const c of cats) {
      options.push({ value: c, label: labelMap[c] || c });
    }
    return options;
  }, [fnbStock]);

  const filteredFnbStock = useMemo(() => {
    return fnbStock.filter((item) => {
      const matchCategory = fnbCategory === "all" || item.category === fnbCategory;
      const matchSearch =
        !fnbSearchText.trim() ||
        item.name.toLowerCase().includes(fnbSearchText.toLowerCase().trim());
      return matchCategory && matchSearch;
    });
  }, [fnbStock, fnbCategory, fnbSearchText]);

  const activeServedOrders = useMemo(() => {
    return (
      selectedTable?.currentSession?.orders?.filter(
        (o) => o.status !== "cancelled" && (Number(o.quantity) || 0) > 0,
      ) || []
    );
  }, [selectedTable]);

  const cancelledOrders = useMemo(() => {
    return (
      selectedTable?.currentSession?.orders?.filter(
        (o) => o.status === "cancelled" || (Number(o.cancelledQuantity) || 0) > 0,
      ) || []
    );
  }, [selectedTable]);

  const activeFnbTotal = useMemo(() => {
    return activeServedOrders.reduce(
      (acc, cur) => acc + (Number(cur.price) || 0) * (Number(cur.quantity) || 0),
      0,
    );
  }, [activeServedOrders]);

  // Handler: Manage F&B Order
  const handleOpenFnbModal = async (table: PosTable) => {
    setSelectedTable(table);
    setNewOrderList([]);
    setFnbSearchText("");
    setFnbCategory("all");
    const hasExisting =
      table.currentSession?.orders &&
      table.currentSession.orders.some((o) => o.status !== "cancelled" && o.quantity > 0);
    setFnbTab(hasExisting ? "manage" : "order");
    setFnbModalVisible(true);

    try {
      const liveProducts = await productService.getFnbMenu();
      if (Array.isArray(liveProducts)) {
        const mappedStock: FnbStockItem[] = liveProducts.map((p) => {
          const cat = (p.category || "").toLowerCase();
          let categoryName = "Bao Tay & Tiện Ích";
          if (cat === "drink" || cat === "coffee" || cat === "tea" || cat === "beer") categoryName = "Đồ Uống";
          else if (cat === "food") categoryName = "Đồ Ăn";
          else if (cat === "snack") categoryName = "Ăn Vặt";

          return {
            id: String(p._id),
            code: p.sku || `PRD-${String(p._id).slice(-4).toUpperCase()}`,
            name: p.name,
            category: p.category,
            categoryName,
            price: p.salePrice,
            priceFormatted: `${p.salePrice.toLocaleString("vi-VN")}đ`,
            stockQuantity: p.stock ?? 0,
            minThreshold: 10,
            unit: (p as any).unit || "Phần",
            image: p.imageUrl,
          };
        });
        setFnbStock(mappedStock);
      }
    } catch (err) {
      console.error("Lỗi cập nhật tồn kho F&B trực tiếp:", err);
    }
  };

  const handleAddFnbItem = (stockItem: FnbStockItem) => {
    if (stockItem.stockQuantity <= 0) {
      message.warning(`Món "${stockItem.name}" đã hết hàng trong kho!`);
      return;
    }

    setNewOrderList((prev) => {
      const existing = prev.find((o) => o.id === stockItem.id);
      if (existing) {
        return prev.map((o) => (o.id === stockItem.id ? { ...o, quantity: o.quantity + 1 } : o));
      }
      return [
        ...prev,
        {
          id: stockItem.id,
          productId: stockItem.id,
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
        item.id === stockItem.id ? { ...item, stockQuantity: item.stockQuantity - 1 } : item,
      ),
    );
  };

  const handleUpdateNewOrderItemQty = (itemId: string, delta: number) => {
    setNewOrderList((prev) => {
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

    setFnbStock((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, stockQuantity: Math.max(0, item.stockQuantity - delta) }
          : item,
      ),
    );
  };

  const handleRemoveNewOrderItem = (itemId: string) => {
    const itemToRemove = newOrderList.find((o) => o.id === itemId);
    if (!itemToRemove) return;
    setNewOrderList((prev) => prev.filter((o) => o.id !== itemId));
    setFnbStock((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, stockQuantity: item.stockQuantity + itemToRemove.quantity }
          : item,
      ),
    );
  };

  const handleConfirmAddFnbOrder = async () => {
    if (!selectedTable?.currentSession) return;
    if (newOrderList.length === 0) return;

    const existingOrders = selectedTable.currentSession.orders || [];
    const mergedOrders: PosOrderItem[] = [...existingOrders];

    for (const newItem of newOrderList) {
      const match = mergedOrders.find((o) => o.id === newItem.id && o.status !== "cancelled");
      if (match) {
        match.quantity += newItem.quantity;
      } else {
        mergedOrders.push(newItem);
      }
    }

    const saved = await save(async () => {
      await posService.updateOrders(
        selectedTable.id,
        selectedTable.currentSession!.sessionId,
        mergedOrders,
      );
    });
    if (!saved) return;
    message.success(`Đã thêm món vào ${selectedTable.name}!`);
    setNewOrderList([]);
    setFnbTab("manage");
    await loadTables();
  };

  const isPackagedItem = (item?: PosOrderItem | null) => {
    if (!item) return false;
    const cat = item.category?.toLowerCase() || "";
    if (cat === "beer" || cat === "snack" || cat === "equipment") return true;
    if (cat === "coffee" || cat === "tea" || cat === "food") return false;
    const name = item.name.toLowerCase();
    if (
      name.includes("cà phê") ||
      name.includes("bạc xỉu") ||
      name.includes("trà ") ||
      name.includes("nước ép") ||
      name.includes("mì ") ||
      name.includes("bò khô")
    ) {
      return false;
    }
    return true;
  };

  const handleOpenCancelModal = (item: PosOrderItem) => {
    setCancellingItem(item);
    setCancelQty(item.quantity);
    const defaultReason = "Khách đổi ý / Chưa dùng";
    setCancelReason(defaultReason);
    setCustomCancelReason("");
    setRestoreStock(isPackagedItem(item));
    setCancelModalVisible(true);
  };

  const handleSelectCancelReason = (reasonOption: string) => {
    setCancelReason(reasonOption);
    // Intelligent real-world automation:
    if (reasonOption === "Món lỗi / Hỏng / Đổ vỡ" || reasonOption === "Quán hết món / Thiếu đồ") {
      setRestoreStock(false);
    } else {
      setRestoreStock(isPackagedItem(cancellingItem));
    }
  };

  const handleConfirmCancelItem = async () => {
    if (!selectedTable?.currentSession || !cancellingItem) return;
    const finalReason = cancelReason === "Khác" ? customCancelReason.trim() : cancelReason;
    if (!finalReason) {
      message.warning("Vui lòng chọn hoặc nhập lý do hủy món");
      return;
    }

    const saved = await save(async () => {
      await posService.cancelOrderItem(
        selectedTable.id,
        selectedTable.currentSession!.sessionId,
        cancellingItem.id,
        cancelQty,
        finalReason,
        restoreStock,
      );
    });

    if (!saved) return;
    message.success(
      restoreStock
        ? `Đã hủy ${cancelQty}x "${cancellingItem.name}" và hoàn trả tồn kho!`
        : `Đã hủy ${cancelQty}x "${cancellingItem.name}" (ghi nhận hao hụt)!`,
    );
    setCancelModalVisible(false);
    setCancellingItem(null);
    await loadTables();
  };


  // Handler: Open Checkout Modal
  const handleSearchLoyaltyCustomer = async () => {
    const phoneTrimmed = checkoutPhone.trim();
    if (!phoneTrimmed || phoneTrimmed.length < 8) {
      message.warning("Vui lòng nhập số điện thoại hợp lệ (tối thiểu 8 số)");
      setLoyaltyCustomer(null);
      setDiscountPercent(0);
      return;
    }

    setIsSearchingMember(true);
    try {
      const res = await posService.lookupCustomer(phoneTrimmed);
      if (res.success && res.data) {
        setLoyaltyCustomer({
          name: res.data.name,
          phone: res.data.phone,
          rank: res.data.rank,
          walletBalance: res.data.walletBalance,
          walletPoints: res.data.walletPoints,
          availableVouchers: res.data.availableVouchers || [],
        });
        setDiscountPercent(10);
        const voucherCount = res.data.availableVouchers?.length || 0;
        message.success(
          `Đã tìm thấy hội viên ${res.data.name}! Tự động giảm 10% tiền giờ${
            voucherCount > 0 ? ` (và ${voucherCount} voucher trong ví)` : ""
          }.`,
        );
      } else {
        setLoyaltyCustomer(null);
        setDiscountPercent(0);
        message.info(res.message || "Không tìm thấy hội viên với số điện thoại này. Áp dụng giá chuẩn.");
      }
    } catch {
      setLoyaltyCustomer(null);
      setDiscountPercent(0);
      message.info("Không tìm thấy hội viên với số điện thoại này.");
    } finally {
      setIsSearchingMember(false);
    }
  };

  const handleOpenCheckout = (table: PosTable) => {
    setSelectedTable(table);
    const sessionPhone = table.currentSession?.customerPhone || "";
    setCheckoutPhone(sessionPhone);
    setShowTimeSlots(false);
    setVoucherCode("");
    setAppliedVoucher(null);
    setPaymentMethod("cash");
    setCashReceived(null);

    // Khởi tạo theo phiên hiện tại (nếu phiên đã có cờ isMember từ trước)
    if (table.currentSession?.isMember) {
      setLoyaltyCustomer({
        name: table.currentSession.customerName || "Hội viên CLB",
        phone: sessionPhone,
        rank: "VIP",
        walletBalance: 0,
      });
      setDiscountPercent(10);

      // Tự động tải danh sách voucher và số dư ví nếu có số điện thoại
      if (sessionPhone) {
        void posService.lookupCustomer(sessionPhone).then((res) => {
          if (res.success && res.data) {
            setLoyaltyCustomer({
              name: res.data.name,
              phone: res.data.phone,
              rank: res.data.rank,
              walletBalance: res.data.walletBalance,
              walletPoints: res.data.walletPoints,
              availableVouchers: res.data.availableVouchers || [],
            });
          }
        });
      }
    } else {
      setLoyaltyCustomer(null);
      setDiscountPercent(0);
    }

    setCheckoutModalVisible(true);
  };

  // Handler: Confirm Checkout & Print Receipt
  const handleConfirmCheckout = async () => {
    if (!selectedTable?.currentSession) return;
    const saved = await save(async () => {
      setPaidSummary(
        await posService.checkout(
          selectedTable,
          appliedVoucher ? 0 : discountPercent,
          paymentMethod,
          appliedVoucher?.code,
        ),
      );
    });
    if (!saved) return;
    setCheckoutModalVisible(false);
    setReceiptModalVisible(true);
    message.success(
      `Đã lưu hóa đơn thanh toán (${paymentMethod === "vnpay" ? "Chuyển khoản QR" : "Tiền mặt"}) cho ${selectedTable.name}!`,
    );
  };

  const handleValidateVoucher = async (codeOverride?: string) => {
    const code = (codeOverride || voucherCode).trim();
    if (!selectedTable?.currentSession || !code) {
      message.warning("Vui lòng chọn voucher.");
      return;
    }
    const subtotal =
      calculatePlayingDetails(selectedTable).cost +
      (selectedTable.currentSession.orders || []).reduce(
        (sum, item) =>
          item.status !== "cancelled"
            ? sum + (Number(item.price) || 0) * (Number(item.quantity) || 0)
            : sum,
        0,
      );
    try {
      const voucher = await posService.validateVoucher(code, subtotal);
      setVoucherCode(voucher.code);
      setAppliedVoucher({ code: voucher.code, discountAmount: voucher.discountAmount });
      setDiscountPercent(0);
      message.success(`Đã áp dụng voucher ${voucher.code}`);
    } catch (error) {
      setAppliedVoucher(null);
      message.error(
        error instanceof Error ? error.message : "Không thể áp dụng voucher này.",
      );
    }
  };

  const handleSelectCustomerVoucher = async (code: string) => {
    if (appliedVoucher?.code === code) {
      setAppliedVoucher(null);
      setVoucherCode("");
      if (loyaltyCustomer) setDiscountPercent(10);
      message.info(`Đã gỡ voucher ${code}`);
      return;
    }
    setVoucherCode(code);
    await handleValidateVoucher(code);
  };

  return (
    <div className="space-y-4">
      <Card
        styles={{ body: { padding: "12px 18px" } }}
        className="!rounded-2xl !border-slate-200 shadow-2xs bg-white"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`flex h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}
            />
            <Title level={4} className="!text-lg !font-black !text-slate-900 !mb-0 tracking-tight">
              Sơ Đồ Bàn Trực Tiếp
            </Title>
            <Tag
              color="green"
              className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0"
            >
              TOÀN QUÁN • {stats.total} BÀN
            </Tag>
            <Tag
              color={stats.occupancyRate > 70 ? "volcano" : "blue"}
              className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0"
            >
              LẤP ĐẦY: {stats.occupancyRate}%
            </Tag>
            {socketConnected ? (
              <Tag
                color="cyan"
                className="!rounded-full !px-2 !py-0.5 !text-[10px] !font-semibold !m-0 hidden sm:inline-flex items-center gap-1"
              >
                <WifiOutlined /> Đồng bộ trực tiếp
              </Tag>
            ) : (
              <Tag
                color="warning"
                className="!rounded-full !px-2 !py-0.5 !text-[10px] !font-semibold !m-0 hidden sm:inline-flex items-center gap-1"
              >
                <SyncOutlined spin /> Đang kết nối...
              </Tag>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-center shrink-0">
            {/* Tiếp nhận & Phê duyệt Đơn gọi món trực tuyến tại bàn (SCRUM-941, SCRUM-942) */}
            <CustomerOrderDrawer onOrdersUpdated={handleOrdersUpdated} />

            {/* Yêu cầu thanh toán tại bàn */}
            <CustomerPaymentRequests />

            {/* Quét QR Nhận Bàn */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBookingQrScannerOpen(true)}
              leftIcon={<QrcodeOutlined className="text-indigo-600 text-sm" />}
              className="!rounded-xl !text-xs !h-8 !px-3 font-bold !border-indigo-200 !bg-indigo-50/80 !text-indigo-800 hover:!bg-indigo-100 hover:!border-indigo-300 shadow-2xs"
            >
              Quét QR Nhận Bàn
            </Button>

            {/* Danh sách khách chờ */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWaitlistModalVisible(true)}
              leftIcon={<UsergroupAddOutlined />}
              className={`!rounded-xl !text-xs !h-8 !px-3 font-semibold ${
                waitlist.length > 0
                  ? "!border-amber-400 !text-amber-800 !bg-amber-50 hover:!bg-amber-100 font-bold"
                  : "!border-slate-200 !text-slate-700 hover:!border-slate-300"
              }`}
            >
              DS Chờ {waitlist.length > 0 ? `(${waitlist.length})` : ""}
            </Button>

            {/* Doanh thu tạm tính */}
            <div className="px-3 py-1 rounded-xl bg-emerald-50/90 border border-emerald-200/90 flex items-center gap-1.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-800">
                Doanh thu tạm tính:
              </span>
              <span className="text-sm font-black text-emerald-700 font-mono">
                {stats.totalTempRevenue.toLocaleString("vi-VN")}đ
              </span>
            </div>

            {/* Tiện ích: Toàn màn hình & Tải lại dạng icon button */}
            <Tooltip title={isFullscreen ? "Thu nhỏ cửa sổ" : "Toàn màn hình (Kiosk POS)"}>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                className="!rounded-xl !h-8 !w-8 !p-0 !min-w-0 !border-slate-200 text-slate-600 hover:!border-emerald-600 hover:text-emerald-700"
                aria-label="Toàn màn hình"
              />
            </Tooltip>

            <Tooltip title="Tải lại dữ liệu">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadTables()}
                loading={loading}
                disabled={saving}
                icon={<SyncOutlined />}
                className="!rounded-xl !h-8 !w-8 !p-0 !min-w-0 !border-slate-200 text-slate-600 hover:!border-emerald-600 hover:text-emerald-700"
                aria-label="Tải lại"
              />
            </Tooltip>
          </div>
        </div>

        {/* Filter bar - compact unified single row, no empty gaps */}
        <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2">
          {/* Status KPI 1-Touch Filter Pills (compact) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <SegmentedPillList
              items={statusPillItems}
              activeKey={filterStatus}
              onSelect={(key) => setFilterStatus(key)}
              className="[&_button]:!px-2.5 [&_button]:!py-1 [&_button]:!text-xs"
            />
          </div>

          {/* Area, Table Type, and Search Filter (neatly balanced on right) */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Select
              value={filterArea}
              onChange={(val) => setFilterArea(val as string)}
              className="w-36 !text-xs font-semibold"
              options={areaOptions}
            />

            <Select
              value={filterType}
              onChange={(val) => setFilterType(val as string)}
              className="w-36 !text-xs font-semibold"
              options={tableTypeOptions}
            />

            <SearchFilterInput
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder="Tìm số bàn, khách... (Phím /)"
              width={175}
              className="pos-search-input [&_.ant-input-affix-wrapper]:!h-8 [&_.ant-input-affix-wrapper]:!py-0"
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
            <SearchOutlined />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 text-sm mb-0">
              Không tìm thấy bàn nào phù hợp
            </h4>
            <p className="text-xs text-slate-500 mb-0">
              {filterStatus === "available"
                ? "Hiện tại không còn bàn trống theo tiêu chí này. Bạn có thể thêm khách vào danh sách chờ."
                : "Vui lòng thử điều chỉnh bộ lọc khu vực, loại bàn hoặc từ khóa tìm kiếm."}
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
              <UnorderedListOutlined className="mr-1" /> Thêm vào danh sách chờ
            </Button>
          </div>
        </div>
      )}

      {isTypeFull && !loading && !loadError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg shrink-0">
              <WarningOutlined />
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-sm mb-0.5">
                {filterType === "pool"
                  ? "Toàn bộ Bàn Bida Lỗ (Pool) hiện đã kín bàn!"
                  : filterType === "carom"
                    ? "Toàn bộ Bàn Bida Carom (Phăng) hiện đã kín bàn!"
                    : filterType === "snooker"
                      ? "Toàn bộ Bàn Bida Snooker hiện đã kín bàn!"
                      : "Hiện tại toàn bộ bàn trong câu lạc bộ đã kín bàn!"}
              </h5>
              <p className="text-xs text-slate-600 mb-0">
                Khách đến quán chưa có bàn trống? Hãy thêm khách vào{" "}
                <strong>Danh Sách Chờ</strong> để tự động xếp bàn ngay khi có bàn trống.
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
            <UnorderedListOutlined className="mr-1" /> Thêm Khách Vào DS Chờ
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const { cost, formattedTime, minutes, timeSlots, isCrossed } =
            calculatePlayingDetails(table);
          const fnbTotal =
            (table.currentSession?.orders || []).reduce(
              (acc, cur) =>
                cur.status !== "cancelled"
                  ? acc + (Number(cur.price) || 0) * (Number(cur.quantity) || 0)
                  : acc,
              0,
            );
          const totalTableBill = cost + fnbTotal;

          const isPlaying = table.status === "playing";
          const isPaused = table.status === "paused";
          const isBooked = table.status === "booked";
          const isAvailable = table.status === "available";
          const isMaintenance = table.status === "maintenance";
          const overdueMinutes = isBooked ? getBookingOverdueMinutes(table.bookedInfo?.time) : 0;
          const upcomingMinutes = isBooked ? getBookingUpcomingMinutes(table.bookedInfo?.time) : -1;
          const isUpcoming = isBooked && upcomingMinutes >= 0 && upcomingMinutes <= 45;
          const isOverdue = isBooked && overdueMinutes > 0;
          const isExpiredHold = isBooked && overdueMinutes > 15;
          const isHoldingForBooking = isBooked && (isUpcoming || (isOverdue && !isExpiredHold));
          const hasAdvanceBooking = isBooked && upcomingMinutes > 45;

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
                    : isExpiredHold
                      ? "!border-red-400/80 !bg-white ring-1 ring-red-400/30"
                      : isHoldingForBooking
                        ? "!border-amber-400 !bg-amber-50/20 ring-2 ring-amber-400 shadow-sm"
                        : hasAdvanceBooking
                          ? "!border-blue-200/90 !bg-white hover:!border-emerald-300 hover:shadow-sm"
                        : isMaintenance
                          ? "!border-slate-200 !bg-slate-50 opacity-60"
                          : "!border-slate-200 !bg-white hover:!border-emerald-300 hover:shadow-sm"
              }`}
            >
              <div
                className={`h-1.5 w-full shrink-0 ${
                  isPlaying
                    ? "bg-emerald-500"
                    : isPaused
                      ? "bg-amber-400"
                      : isExpiredHold
                        ? "bg-red-500"
                        : isHoldingForBooking
                          ? "bg-amber-500"
                          : hasAdvanceBooking
                            ? "bg-blue-400"
                          : isMaintenance
                            ? "bg-rose-400"
                            : "bg-slate-200"
                }`}
              />

              <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[11px] font-black text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0 shadow-2xs">
                      {table.code}
                    </span>
                    <span className="font-extrabold text-sm text-slate-900 truncate" title={table.name}>
                      {table.name}
                    </span>
                  </div>
                  <div
                    className="text-[10.5px] text-slate-500 mt-0.5 leading-tight line-clamp-1 font-medium"
                    title={`${table.typeName} • ${table.area || "Khu chính"}`}
                  >
                    {table.typeName} • {table.area || "Khu chính"}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {/* Tác vụ nhanh trên Header: Tạm dừng & Chuyển bàn */}
                  {(isPlaying || isPaused) && (
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                      <Tooltip title={isPaused ? "Tiếp tục tính giờ" : "Tạm dừng tính giờ"}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePause(table);
                          }}
                          disabled={saving || loading || !!loadError}
                          className={`h-6 w-6 rounded flex items-center justify-center text-xs transition-colors cursor-pointer ${
                            isPaused
                              ? "bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold"
                              : "hover:bg-slate-100 text-slate-500 hover:text-amber-600"
                          }`}
                          aria-label={isPaused ? "Tiếp tục" : "Tạm dừng"}
                        >
                          {isPaused ? (
                            <PlayCircleOutlined className="text-[12px] text-amber-700" />
                          ) : (
                            <PauseCircleOutlined className="text-[12px]" />
                          )}
                        </button>
                      </Tooltip>

                      <Tooltip title="Chuyển bàn hoặc gộp bàn">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleOpenTransferModal(table, "transfer");
                          }}
                          className="h-6 w-6 rounded flex items-center justify-center text-xs hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                          aria-label="Chuyển bàn"
                        >
                          <SwapOutlined className="text-[11px]" />
                        </button>
                      </Tooltip>
                    </div>
                  )}

                  {/* Tag trạng thái */}
                  {isPlaying && (
                    <Tag
                      color="green"
                      className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1 shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ĐANG CHƠI
                    </Tag>
                  )}
                  {isPaused && (
                    <Tag
                      color="orange"
                      className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1"
                    >
                      <PauseCircleOutlined className="text-[10px]" />
                      TẠM DỪNG
                    </Tag>
                  )}
                  {hasAdvanceBooking ? (
                    <div className="flex items-center gap-1">
                      <Tag
                        color="default"
                        className="!rounded-full !px-2 !py-0.5 !text-[10px] !font-bold !m-0 !bg-slate-100 !text-slate-600 border border-slate-200"
                      >
                        BÀN TRỐNG
                      </Tag>
                      <Tag
                        color="blue"
                        className="!rounded-full !px-2 !py-0.5 !text-[9.5px] !font-bold !m-0 border border-blue-200 shadow-2xs"
                      >
                        ⏰ Hẹn {table.bookedInfo?.time ? table.bookedInfo.time.split(" ")[0] : ""}
                      </Tag>
                    </div>
                  ) : isExpiredHold ? (
                    <Tag
                      color="error"
                      className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1 animate-pulse"
                    >
                      <AlertOutlined className="text-[10px]" />
                      QUÁ HẠN {overdueMinutes}P (HẾT GIỮ)
                    </Tag>
                  ) : isHoldingForBooking ? (
                    overdueMinutes > 0 ? (
                      <Tag
                        color="warning"
                        className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1"
                      >
                        <ClockCircleOutlined className="text-[10px]" />
                        TRỄ {overdueMinutes}P
                      </Tag>
                    ) : (
                      <Tag
                        color="blue"
                        className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 inline-flex items-center gap-1 animate-pulse"
                      >
                        <CalendarOutlined className="text-[10px]" />
                        GIỮ BÀN ĐÓN KHÁCH
                      </Tag>
                    )
                  ) : isBooked ? (
                    <Tag
                      color="default"
                      className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0"
                    >
                      ĐÃ ĐẶT
                    </Tag>
                  ) : null}
                  {isAvailable && (
                    <Tag
                      color="default"
                      className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0 !bg-slate-100 !text-slate-600 border border-slate-200"
                    >
                      BÀN TRỐNG
                    </Tag>
                  )}
                  {isMaintenance && (
                    <Tag
                      color="error"
                      className="!rounded-full !px-2.5 !py-0.5 !text-[10px] !font-bold !m-0"
                    >
                      BẢO TRÌ
                    </Tag>
                  )}
                </div>
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between min-h-[135px]">
                {isPlaying || isPaused ? (
                  <div className="space-y-2.5">
                    {/* Timer row */}
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-center gap-1.5">
                        <ClockCircleOutlined
                          className={
                            isPaused ? "text-amber-500 text-sm" : "text-emerald-600 text-sm"
                          }
                        />
                        <span
                          className={`text-xl font-black font-mono tracking-wider ${isPaused ? "text-amber-600" : "text-slate-900"}`}
                        >
                          {formattedTime}
                        </span>
                        {minutes >= 180 && (
                          <Tag
                            color={minutes >= 1440 ? "error" : "warning"}
                            className="!rounded-md !px-1.5 !py-0 !text-[9px] !font-bold !m-0 font-mono"
                          >
                            {minutes >= 1440
                              ? `> ${Math.floor(minutes / 1440)} ngày`
                              : minutes >= 240
                                ? "> 4h"
                                : "> 3h"}
                          </Tag>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Từ{" "}
                        {formatSessionStartTime(
                          table.currentSession?.startedAt,
                          table.currentSession?.sessionStart,
                        )}
                      </span>
                    </div>

                    {/* Customer & Breakdown */}
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <UserOutlined className="text-slate-400 text-xs shrink-0" />
                          <span
                            className="font-bold text-slate-800 truncate"
                            title={table.currentSession?.customerName || "Khách lẻ"}
                          >
                            {table.currentSession?.customerName || "Khách lẻ"}
                          </span>
                          {table.currentSession?.isMember && (
                            <Tag
                              color="gold"
                              className="!text-[9px] !px-1.5 !py-0 !border-0 !m-0 !font-bold !rounded shrink-0 whitespace-nowrap"
                            >
                              {table.currentSession.memberRank || "VIP"}
                            </Tag>
                          )}
                        </div>
                        <span className="text-slate-500 font-mono text-[11px] font-medium whitespace-nowrap shrink-0">
                          {cost.toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <span className="text-slate-500 text-[11px] flex items-center gap-1 whitespace-nowrap">
                          <CoffeeOutlined className="text-slate-400 text-[10px]" />
                          Đồ uống (
                          {(table.currentSession?.orders || []).filter(
                            (o) => o.status !== "cancelled" && (Number(o.quantity) || 0) > 0,
                          ).length}
                          ):
                        </span>
                        <span className="text-emerald-700 font-mono font-semibold text-[11px] whitespace-nowrap shrink-0">
                          {fnbTotal.toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      {/* Badge cảnh báo đơn gọi món mới tại bàn */}
                      {pendingOrdersByTable[table.id] > 0 && (
                        <div className="p-1 px-2 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-[11px] font-bold flex items-center justify-between animate-pulse shadow-2xs">
                          <span className="flex items-center gap-1.5">
                            <ShoppingOutlined className="text-rose-600 animate-bounce text-xs" />
                            <span>{pendingOrdersByTable[table.id]} đơn món chờ duyệt!</span>
                          </span>
                          <span className="text-[10px] text-rose-600 font-semibold underline">
                            Mở Drawer ➔
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Grand Total */}
                    <div className="flex items-baseline justify-between pt-2 border-t border-dashed border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-600">Tạm tính:</span>
                        {isCrossed && (
                          <Tag
                            color="purple"
                            className="!rounded-md !px-1.5 !py-0 !text-[9px] !font-bold !m-0 border border-purple-200 shadow-2xs"
                          >
                            ⚡ {timeSlots.length} Khung Giờ
                          </Tag>
                        )}
                      </div>
                      <span className="text-base font-black text-emerald-700 font-mono tracking-tight">
                        {totalTableBill.toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    {/* Cảnh báo lịch hẹn sắp tới khi bàn đang có khách chơi */}
                    {table.bookedInfo && (
                      <div
                        className={`mt-2 p-1.5 rounded-xl border text-[11px] flex items-center justify-between gap-1.5 ${
                          upcomingMinutes >= 0 && upcomingMinutes <= 45
                            ? "bg-amber-50/95 border-amber-300 text-amber-900 shadow-2xs"
                            : "bg-blue-50/70 border-blue-200 text-blue-900"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <AlertOutlined
                            className={
                              upcomingMinutes >= 0 && upcomingMinutes <= 45
                                ? "text-amber-600 animate-bounce text-xs shrink-0"
                                : "text-blue-600 text-xs shrink-0"
                            }
                          />
                          <span className="truncate">
                            Hẹn: <strong>{table.bookedInfo.time?.split(" ")[0]}</strong> ({table.bookedInfo.customerName})
                          </span>
                        </div>
                        {upcomingMinutes >= 0 && upcomingMinutes <= 45 ? (
                          <span className="font-bold text-amber-800 whitespace-nowrap text-[10px] bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                            Còn {upcomingMinutes}p
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : isHoldingForBooking || isExpiredHold ? (
                  <div className="space-y-2 py-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <UserOutlined className="text-blue-600 text-xs shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {table.bookedInfo?.customerName || "Khách hẹn trước"}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-slate-500 shrink-0">
                        {table.bookedInfo?.phone || "—"}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                        isExpiredHold
                          ? "bg-red-50/80 border-red-200/80"
                          : "bg-blue-50/80 border-blue-200/70"
                      }`}
                    >
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="text-slate-600">Giờ hẹn:</span>
                        <span className="font-bold text-blue-800 font-mono">
                          {table.bookedInfo?.time
                            ? table.bookedInfo.time.replace(/\s*\(?hôm nay\)?\s*/gi, "").trim()
                            : "Chưa rõ"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="text-slate-600">Giữ bàn tối đa:</span>
                        <span className="font-medium text-slate-800 text-[10px]">15 phút</span>
                      </div>
                      {isExpiredHold ? (
                        <div className="flex justify-between items-center text-[10px] font-bold pt-1 border-t border-red-200 text-red-600 bg-red-100/60 -mx-1 px-1.5 py-0.5 rounded">
                          <span className="flex items-center gap-1">
                            <AlertOutlined className="text-red-600" />
                            Tình trạng:
                          </span>
                          <span>Quá hạn {overdueMinutes} phút (Khách không đến)</span>
                        </div>
                      ) : overdueMinutes > 0 ? (
                        <div className="flex justify-between items-center text-[10px] font-bold pt-1 border-t border-amber-200 text-amber-800 bg-amber-100/60 -mx-1 px-1.5 py-0.5 rounded">
                          <span>Tình trạng:</span>
                          <span>Trễ hẹn {overdueMinutes} phút (Chờ tối đa 15p)</span>
                        </div>
                      ) : isUpcoming ? (
                        <div className="flex justify-between items-center text-[10px] font-bold pt-1 border-t border-amber-200 text-amber-800 bg-amber-100/60 -mx-1 px-1.5 py-0.5 rounded">
                          <span className="flex items-center gap-1">
                            <AlertOutlined className="text-amber-600 animate-bounce" />
                            Khung giờ giữ bàn:
                          </span>
                          <span>Đang giữ bàn chờ khách (còn {upcomingMinutes}p)</span>
                        </div>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-slate-400 block text-center italic">
                      {isExpiredHold
                        ? "Đã quá hạn giữ bàn. Bấm Hủy giữ bàn để giải phóng!"
                        : 'Khách đến? Bấm "Khách Nhận Bàn" bên dưới'}
                    </span>
                  </div>
                ) : hasAdvanceBooking ? (
                  <div
                    onClick={() => {
                      setSelectedTable(table);
                      setCustomerName("");
                      setCustomerPhone("");
                      setOpenModalMemberInfo(null);
                      setIsMemberCustomer(false);
                      setOpenModalVisible(true);
                    }}
                    className="py-1 space-y-2 flex-1 flex flex-col justify-between cursor-pointer group"
                    title="Bàn đang trống • Chạm để mở bàn tính giờ cho khách chơi nhanh"
                  >
                    <div className="flex items-baseline justify-between p-2 rounded-xl bg-slate-50/90 border border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/20 transition-all">
                      <span className="text-xs font-semibold text-slate-500">Đơn giá giờ:</span>
                      <span className="text-base font-black font-mono text-emerald-700">
                        {table.pricePerHour.toLocaleString("vi-VN")}đ
                        <span className="text-xs font-normal text-slate-400">/h</span>
                      </span>
                    </div>

                    {/* Banner nhắc lịch hẹn trước */}
                    <div className="p-2 rounded-xl bg-blue-50/80 border border-blue-200/70 text-[11px] text-blue-900 space-y-0.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1 text-blue-800">
                          <CalendarOutlined className="text-blue-600 text-xs" /> Khách hẹn:
                        </span>
                        <span className="font-bold truncate max-w-[120px]">
                          {table.bookedInfo?.customerName || "Khách hẹn"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] text-slate-600">
                        <span>Nhận bàn lúc:</span>
                        <strong className="text-blue-800 font-mono">
                          {table.bookedInfo?.time || ""}
                        </strong>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold pt-0.5 border-t border-blue-100/70">
                        ✓ Còn {Math.floor(upcomingMinutes / 60) > 0 ? `${Math.floor(upcomingMinutes / 60)}h` : ""}{upcomingMinutes % 60}p • Đón khách vãng lai chơi nhanh
                      </div>
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
                ) : (
                  <div
                    onClick={() => {
                      setSelectedTable(table);
                      setCustomerName("");
                      setCustomerPhone("");
                      setOpenModalMemberInfo(null);
                      setIsMemberCustomer(false);
                      setOpenModalVisible(true);
                    }}
                    className="py-1 space-y-2 flex-1 flex flex-col justify-center cursor-pointer group"
                    title="Chạm để mở bàn tính giờ"
                  >
                    <div className="flex items-baseline justify-between p-2.5 rounded-xl bg-slate-50/90 border border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/20 transition-all">
                      <span className="text-xs font-semibold text-slate-500">Đơn giá giờ:</span>
                      <span className="text-base font-black font-mono text-emerald-700">
                        {table.pricePerHour.toLocaleString("vi-VN")}đ
                        <span className="text-xs font-normal text-slate-400">/h</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircleOutlined className="text-emerald-600 text-xs" /> Bàn sẵn sàng
                        đón khách
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 group-hover:text-emerald-600 transition-colors">
                        Bấm mở bàn ➔
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-3.5 py-2.5 bg-slate-50/80 border-t border-slate-100 shrink-0 mt-auto">
                {isHoldingForBooking ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedTable(table);
                        if (table.bookedInfo) {
                          setCustomerName(table.bookedInfo.customerName);
                          setCustomerPhone(table.bookedInfo.phone);
                          if (table.bookedInfo.phone) {
                            void handlePhoneChangeInOpenModal(table.bookedInfo.phone);
                          }
                        } else {
                          setOpenModalMemberInfo(null);
                          setIsMemberCustomer(false);
                        }
                        setIsCheckInMode(true);
                        setOpenModalVisible(true);
                      }}
                      leftIcon={<PlayCircleOutlined />}
                      className="!flex-1 !rounded-xl !bg-blue-600 hover:!bg-blue-700 !border-blue-600 font-bold !text-xs !h-9 shadow-2xs text-white"
                    >
                      Khách Nhận Bàn
                    </Button>
                    <Tooltip title="Quét mã QR đặt bàn của khách">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBookingQrScannerOpen(true)}
                        icon={<QrcodeOutlined className="text-sm text-indigo-600" />}
                        className="!rounded-xl !border-indigo-200 hover:!bg-indigo-50 !h-9 !w-9 !p-0 shrink-0"
                        aria-label="Quét QR nhận bàn"
                      />
                    </Tooltip>
                    <Tooltip title="Hủy giữ bàn và chuyển về trạng thái Trống">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelBooking(table)}
                        disabled={saving}
                        className="!rounded-xl !text-xs !h-9 !px-2.5 !border-red-200 !text-red-600 hover:!border-red-500 hover:!bg-red-50 font-medium"
                      >
                        Hủy
                      </Button>
                    </Tooltip>
                  </div>
                ) : isExpiredHold ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelBooking(table)}
                      disabled={saving}
                      className="!flex-1 !rounded-xl !text-xs !h-9 !px-2.5 !border-red-300 !text-red-700 hover:!bg-red-50 font-bold"
                    >
                      Hủy / Giải Phóng Bàn
                    </Button>
                    <Tooltip title="Mở bàn tính giờ cho khách mới">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedTable(table);
                          setCustomerName("");
                          setCustomerPhone("");
                          setOpenModalMemberInfo(null);
                          setIsMemberCustomer(false);
                          setOpenModalVisible(true);
                        }}
                        leftIcon={<PlayCircleOutlined />}
                        className="!rounded-xl !bg-emerald-600 hover:!bg-emerald-700 font-bold !text-xs !h-9 !px-3 text-white shrink-0"
                      >
                        Mở Bàn Mới
                      </Button>
                    </Tooltip>
                  </div>
                ) : hasAdvanceBooking ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedTable(table);
                        setCustomerName("");
                        setCustomerPhone("");
                        setOpenModalMemberInfo(null);
                        setIsMemberCustomer(false);
                        setIsCheckInMode(false);
                        setOpenModalVisible(true);
                      }}
                      leftIcon={<PlayCircleOutlined />}
                      className="!flex-1 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs !h-9 shadow-2xs text-white"
                    >
                      Mở Bàn Tính Giờ
                    </Button>
                    <Tooltip title="Khách đặt trước đến sớm nhận bàn">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTable(table);
                          if (table.bookedInfo) {
                            setCustomerName(table.bookedInfo.customerName);
                            setCustomerPhone(table.bookedInfo.phone);
                            if (table.bookedInfo.phone) {
                              void handlePhoneChangeInOpenModal(table.bookedInfo.phone);
                            }
                          }
                          setIsCheckInMode(true);
                          setOpenModalVisible(true);
                        }}
                        className="!rounded-xl !border-blue-300 !text-blue-700 hover:!bg-blue-50 font-bold !text-xs !h-9 !px-2.5 shrink-0"
                      >
                        Nhận Bàn
                      </Button>
                    </Tooltip>
                    <Tooltip title="Quét mã QR nhận bàn">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBookingQrScannerOpen(true)}
                        icon={<QrcodeOutlined className="text-sm text-indigo-600" />}
                        className="!rounded-xl !border-indigo-200 hover:!bg-indigo-50 !h-9 !w-9 !p-0 shrink-0"
                        aria-label="Quét QR nhận bàn"
                      />
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
                      setOpenModalMemberInfo(null);
                      setIsMemberCustomer(false);
                      setOpenModalVisible(true);
                    }}
                    leftIcon={<PlayCircleOutlined />}
                    className="!w-full !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs !h-9 shadow-2xs text-white"
                  >
                    Mở Bàn Tính Giờ
                  </Button>
                ) : isPlaying || isPaused ? (
                  <div className="flex items-center gap-2">
                    {/* 1. Nút Thanh Toán: To rõ ràng, nổi bật nhất quầy */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenCheckout(table)}
                      leftIcon={<DollarOutlined />}
                      className="!flex-1 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-black !text-xs !h-9 text-white shadow-2xs tracking-wide"
                    >
                      Thanh Toán
                    </Button>

                    {/* 2. Nút Gọi Món: Tinh tế, hiện badge số lượng món */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenFnbModal(table)}
                      leftIcon={<CoffeeOutlined className="text-emerald-700" />}
                      className="!rounded-xl !text-xs !h-9 !px-3 !border-slate-200 hover:!border-emerald-500 !bg-white hover:!bg-emerald-50/50 !text-slate-800 font-bold shadow-2xs"
                    >
                      <span>Gọi Món</span>
                      {(() => {
                        const totalQty = (table.currentSession?.orders || [])
                          .filter((o) => o.status !== "cancelled")
                          .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                        if (totalQty <= 0) return null;
                        return (
                          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black font-mono">
                            {totalQty}
                          </span>
                        );
                      })()}
                    </Button>
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

      <Modal
        open={openModalVisible}
        onCancel={() => {
          setOpenModalVisible(false);
          setIsCheckInMode(false);
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
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
            <div className="flex justify-between">
              <span>Loại bàn:</span>
              <strong className="font-bold text-slate-900">{selectedTable?.typeName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Đơn giá giờ:</span>
              <strong className="font-bold text-emerald-700 font-mono">
                {selectedTable?.pricePerHour.toLocaleString("vi-VN")}đ / giờ
              </strong>
            </div>
          </div>

          {/* Box xác nhận nhận bàn nếu khách hẹn đến */}
          {isCheckInMode && selectedTable?.bookedInfo && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-xs text-blue-900">
                <CheckCircleOutlined className="text-blue-600 text-sm shrink-0" />
                <span>XÁC NHẬN KHÁCH HẸN ĐẾN NHẬN BÀN</span>
              </div>
              <div className="text-xs text-blue-800 leading-relaxed">
                Khách đặt: <strong>{selectedTable.bookedInfo.customerName}</strong>
                {selectedTable.bookedInfo.phone ? ` (${selectedTable.bookedInfo.phone})` : ""} · Giờ hẹn:{" "}
                <strong>{selectedTable.bookedInfo.time.split(" ")[0]}</strong>.
              </div>
            </div>
          )}

          {/* Cảnh báo bàn có lịch đặt trước khi mở cho khách vãng lai */}
          {!isCheckInMode && selectedTable?.bookedInfo && (() => {
            const modalUpcomingMin = getBookingUpcomingMinutes(selectedTable.bookedInfo?.time);
            if (modalUpcomingMin > 0) {
              return (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                    <AlertOutlined className="text-amber-600 animate-bounce text-sm shrink-0" />
                    <span>CHÚ Ý: Bàn đã có khách hẹn đặt trước!</span>
                  </div>
                  <div className="text-xs text-amber-800 leading-relaxed">
                    Khách <strong>{selectedTable.bookedInfo.customerName}</strong>
                    {selectedTable.bookedInfo.phone ? ` (${selectedTable.bookedInfo.phone})` : ""} đã đặt bàn này lúc{" "}
                    <strong>{selectedTable.bookedInfo.time.split(" ")[0]}</strong> (còn khoảng{" "}
                    <strong>
                      {Math.floor(modalUpcomingMin / 60) > 0
                        ? `${Math.floor(modalUpcomingMin / 60)} giờ `
                        : ""}
                      {modalUpcomingMin % 60} phút
                    </strong>{" "}
                    nữa).
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-100/70 p-2 rounded-lg border border-amber-200/80">
                    <BulbOutlined className="text-amber-600 shrink-0 text-xs" />
                    <span><strong>Nhắc nhở thu ngân:</strong> Vui lòng trao đổi trước với khách vãng lai về thời gian có thể chơi để tránh trùng lịch đón khách đã đặt.</span>
                  </div>
                </div>
              );
            }
            return (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-950 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-xs text-red-900">
                  <AlertOutlined className="text-red-600 text-sm shrink-0" />
                  <span>CẢNH BÁO: Đang trong khung giờ giữ bàn hẹn!</span>
                </div>
                <div className="text-xs text-red-800 leading-relaxed">
                  Bàn này đang được giữ cho khách <strong>{selectedTable.bookedInfo.customerName}</strong> hẹn lúc{" "}
                  <strong>{selectedTable.bookedInfo.time.split(" ")[0]}</strong>. Nếu mở cho khách vãng lai khác, vui lòng kiểm tra kỹ hoặc hủy lịch giữ bàn trước.
                </div>
              </div>
            );
          })()}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số điện thoại khách (tùy chọn):
            </label>
            <Input
              placeholder="Nhập SĐT để tự động nhận diện hội viên..."
              value={customerPhone}
              onChange={(e) => void handlePhoneChangeInOpenModal(e.target.value)}
              prefix={<PhoneOutlined className="text-slate-400" />}
              className="!h-10 !rounded-xl font-mono text-xs"
            />
          </div>

          {openModalMemberInfo ? (
            <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between transition-all">
              <div className="flex items-center gap-2.5">
                <CheckCircleOutlined className="text-emerald-600 text-lg shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 flex-wrap">
                    <span className="whitespace-nowrap">Hội viên:</span>
                    <span className="truncate">{openModalMemberInfo.name}</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
                      Hạng {openModalMemberInfo.rank || "VIP"}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium whitespace-nowrap">
                    ⭐ Đã nhận diện! Tự động giảm 10% tiền giờ khi thanh toán
                  </div>
                </div>
              </div>
              {openModalMemberInfo.walletBalance !== undefined && (
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-500">Số dư ví:</div>
                  <div className="text-xs font-bold font-mono text-emerald-800">
                    {openModalMemberInfo.walletBalance.toLocaleString("vi-VN")}đ
                  </div>
                </div>
              )}
            </div>
          ) : isSearchingOpenMember ? (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <SyncOutlined spin className="text-emerald-600" />
              <span>Đang kiểm tra tài khoản hội viên...</span>
            </div>
          ) : customerPhone.trim().length >= 8 ? (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Số điện thoại chưa đăng ký hội viên (áp dụng giá tiêu chuẩn)</span>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên khách hàng:
            </label>
            <Input
              placeholder="Để trống mặc định là 'Khách lẻ'..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              prefix={<UserOutlined className="text-slate-400" />}
              className="!h-10 !rounded-xl"
            />
          </div>

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
                setOpenModalMemberInfo(null);
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

      <Modal
        open={transferModalVisible}
        onCancel={() => setTransferModalVisible(false)}
        footer={null}
        width={640}
        destroyOnClose
        title={
          <div className="flex items-center justify-between pr-4">
            <Space align="center" size={8}>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                {transferAction === "transfer" ? <SwapOutlined className="text-base" /> : <BranchesOutlined className="text-base" />}
              </div>
              <div>
                <span className="font-bold text-slate-900 text-base block">
                  {transferAction === "transfer" ? "Chuyển Bàn Chơi" : "Gộp Bàn Chơi"}
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  {transferAction === "transfer"
                    ? "Chuyển thời gian chơi và dịch vụ F&B sang bàn trống mới"
                    : "Dồn tiền giờ và F&B của bàn này vào bàn khác"}
                </span>
              </div>
            </Space>
          </div>
        }
      >
        <div className="py-2 space-y-4">
          {/* Action Tabs: Chuyển bàn vs Gộp bàn */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => void handleSwitchTransferAction("transfer")}
              className={clsx(
                "!flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                transferAction === "transfer"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              <SwapOutlined />
              Đổi Sang Bàn Trống
            </button>
            <button
              type="button"
              onClick={() => void handleSwitchTransferAction("merge")}
              className={clsx(
                "!flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                transferAction === "merge"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              <BranchesOutlined />
              Gộp Vào Bàn Khác
            </button>
          </div>

          {/* Source Table Summary Card */}
          {selectedTable?.currentSession && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-800">
                    Bàn hiện tại: <strong className="text-emerald-700">{selectedTable.name}</strong> ({selectedTable.typeName})
                  </span>
                  <Tag color="green" className="!text-[10px] !px-1.5 !py-0 !m-0 font-medium">
                    {selectedTable.status === "paused" ? "Tạm dừng" : "Đang chơi"}
                  </Tag>
                </div>
                <span className="text-[11px] text-slate-500">
                  Khách hàng: <strong className="text-slate-700">{selectedTable.currentSession.customerName || "Khách lẻ"}</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Thời gian đã chơi</span>
                  <span className="font-bold font-mono text-slate-800 text-xs">
                    {(() => {
                      const now = Date.now();
                      const elapsed = Math.max(
                        0,
                        now -
                          selectedTable.currentSession.startedAt -
                          (selectedTable.currentSession.totalPausedMs || 0),
                      );
                      const mins = Math.floor(elapsed / 60000);
                      const hrs = Math.floor(mins / 60);
                      const remMins = mins % 60;
                      return hrs > 0 ? `${hrs}h ${remMins}p` : `${remMins} phút`;
                    })()}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Tiền giờ tạm tính</span>
                  <span className="font-bold font-mono text-emerald-700 text-xs">
                    {(() => {
                      const now = Date.now();
                      const elapsed = Math.max(
                        0,
                        now -
                          selectedTable.currentSession.startedAt -
                          (selectedTable.currentSession.totalPausedMs || 0),
                      );
                      const mins = Math.floor(elapsed / 60000);
                      const rate =
                        selectedTable.currentSession.pricePerHour || selectedTable.pricePerHour;
                      const cost = Math.round((mins * rate) / 60);
                      return `${cost.toLocaleString("vi-VN")}đ`;
                    })()}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">F&B đang dùng</span>
                  <span className="font-bold font-mono text-slate-800 text-xs">
                    {(() => {
                      const orders = (selectedTable.currentSession.orders || []).filter(
                        (o) => o.status !== "cancelled",
                      );
                      const count = orders.reduce((sum, o) => sum + o.quantity, 0);
                      const fnbCost = orders.reduce((sum, o) => sum + o.price * o.quantity, 0);
                      return `${count} món (${fnbCost.toLocaleString("vi-VN")}đ)`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Target Table Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {transferAction === "transfer" ? "Chuyển đến bàn:" : "Gộp vào bàn:"}
              </label>
              {loadingMoveTargets && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <SyncOutlined spin className="text-[10px]" /> Đang kiểm tra bàn khả dụng...
                </span>
              )}
            </div>

            <Select
              placeholder={
                transferAction === "transfer"
                  ? "-- Chọn bàn trống muốn chuyển đến --"
                  : "-- Chọn bàn đang chơi để gộp vào --"
              }
              value={targetTableId || undefined}
              onChange={(val) => setTargetTableId(val)}
              className="!w-full !rounded-xl"
              options={
                eligibleMoveData?.targets?.length
                  ? eligibleMoveData.targets.map((t) => {
                      const typeLabel =
                        t.type === "pool"
                          ? "Bida Lỗ"
                          : t.type === "carom"
                            ? "Bida Phăng"
                            : t.type === "snooker"
                              ? "Bida Snooker"
                              : t.type || "Bàn";

                      if (transferAction === "transfer") {
                        const diffText =
                          t.priceDiffPerHour && t.priceDiffPerHour !== 0
                            ? ` (${t.priceDiffPerHour > 0 ? "+" : ""}${t.priceDiffPerHour.toLocaleString("vi-VN")}đ/h)`
                            : "";
                        return {
                          value: t.id,
                          label: `${t.name} (${typeLabel}) • ${t.pricePerHour.toLocaleString("vi-VN")}đ/h${diffText}`,
                        };
                      } else {
                        const mins = t.durationMinutes || 0;
                        const hrs = Math.floor(mins / 60);
                        const remMins = mins % 60;
                        const durationText = hrs > 0 ? `${hrs}h ${remMins}p` : `${remMins}p`;
                        return {
                          value: t.id,
                          label: `${t.name} (${typeLabel}) • Khách: ${t.customerName || "Khách lẻ"} • Chơi ${durationText} • ${(t.currentCost || 0).toLocaleString("vi-VN")}đ`,
                        };
                      }
                    })
                  : tables
                      .filter((t) => t.id !== selectedTable?.id)
                      .filter((t) =>
                        transferAction === "transfer"
                          ? t.status === "available"
                          : t.status === "playing" || t.status === "paused",
                      )
                      .map((t) => ({
                        value: t.id,
                        label: `${t.name} (${t.typeName}) • ${t.pricePerHour.toLocaleString("vi-VN")}đ/h`,
                      }))
              }
            />
          </div>

          {/* Pricing Option (When Transferring to a table with different rate) */}
          {transferAction === "transfer" && targetTableId && (() => {
            const target =
              tables.find((t) => t.id === targetTableId) ||
              eligibleMoveData?.targets.find((t) => t.id === targetTableId);
            const sourceRate =
              selectedTable?.currentSession?.pricePerHour || selectedTable?.pricePerHour || 0;
            const targetRate = target?.pricePerHour || 0;
            const isDiff = targetRate !== sourceRate && targetRate > 0;

            if (!isDiff) return null;

            return (
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>Chênh lệch đơn giá bàn:</span>
                  <span className="font-mono text-blue-800">
                    {sourceRate.toLocaleString("vi-VN")}đ/h ➜ {targetRate.toLocaleString("vi-VN")}đ/h (
                    {targetRate > sourceRate
                      ? `+${(targetRate - sourceRate).toLocaleString("vi-VN")}đ/h`
                      : `${(targetRate - sourceRate).toLocaleString("vi-VN")}đ/h`}
                    )
                  </span>
                </div>
                <p className="text-[11px] text-blue-700 mb-0 leading-relaxed">
                  Hệ thống <strong>tự động tính theo giá từng bàn</strong>: Giờ chơi ở bàn cũ tính theo giá <strong>{sourceRate.toLocaleString("vi-VN")}đ/h</strong>, thời gian tiếp theo tại bàn mới tính theo giá <strong>{targetRate.toLocaleString("vi-VN")}đ/h</strong>.
                </p>
              </div>
            );
          })()}

          {/* Merge Summary Preview (When Merging into a playing table) */}
          {transferAction === "merge" && targetTableId && (() => {
            const target = tables.find((t) => t.id === targetTableId);
            if (!target || !target.currentSession) return null;

            const now = Date.now();
            // Source cost
            const sElapsed = Math.max(
              0,
              now -
                (selectedTable?.currentSession?.startedAt || now) -
                (selectedTable?.currentSession?.totalPausedMs || 0),
            );
            const sMins = Math.floor(sElapsed / 60000);
            const sRate =
              selectedTable?.currentSession?.pricePerHour || selectedTable?.pricePerHour || 0;
            const sPlayingCost =
              Math.round((sMins * sRate) / 60) + (selectedTable?.currentSession?.carriedCost || 0);
            const sOrders = (selectedTable?.currentSession?.orders || []).filter(
              (o) => o.status !== "cancelled",
            );
            const sFnbCost = sOrders.reduce((sum, o) => sum + o.price * o.quantity, 0);

            // Target cost
            const tElapsed = Math.max(
              0,
              now -
                (target.currentSession?.startedAt || now) -
                (target.currentSession?.totalPausedMs || 0),
            );
            const tMins = Math.floor(tElapsed / 60000);
            const tRate = target.currentSession?.pricePerHour || target.pricePerHour || 0;
            const tPlayingCost =
              Math.round((tMins * tRate) / 60) + (target.currentSession?.carriedCost || 0);
            const tOrders = (target.currentSession?.orders || []).filter(
              (o) => o.status !== "cancelled",
            );
            const tFnbCost = tOrders.reduce((sum, o) => sum + o.price * o.quantity, 0);

            const totalEstimated = sPlayingCost + sFnbCost + tPlayingCost + tFnbCost;

            return (
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-950 space-y-2">
                <div className="flex items-center justify-between font-bold border-b border-purple-200 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <BranchesOutlined className="text-purple-700" /> Xem trước kết quả sau khi gộp:
                  </span>
                  <Tag color="purple" className="!m-0 !font-bold">
                    Hóa đơn tổng {target.name}
                  </Tag>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tiền giờ chốt từ {selectedTable?.name}:</span>
                    <span className="font-mono font-bold text-slate-800">
                      +{sPlayingCost.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tiền giờ hiện tại ({target.name}):</span>
                    <span className="font-mono font-bold text-slate-800">
                      +{tPlayingCost.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      Món F&B chuyển sang ({sOrders.length} món từ {selectedTable?.name}):
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      +{sFnbCost.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      Món F&B hiện có tại {target.name} ({tOrders.length} món):
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      +{tFnbCost.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1.5 border-t border-purple-200 text-purple-900">
                    <span>TỔNG HÓA ĐƠN DỰ KIẾN:</span>
                    <span className="font-mono text-emerald-700 text-sm">
                      {totalEstimated.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick Reasons Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {transferAction === "transfer" ? "Lý do chuyển bàn (Chọn nhanh):" : "Lý do gộp bàn (Chọn nhanh):"}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(transferAction === "transfer"
                ? [
                    "Khách đổi bàn VIP",
                    "Khách đổi góc thoáng hơn",
                    "Bàn gặp sự cố kỹ thuật",
                    "Khách đổi thể loại bàn",
                    "Theo yêu cầu của khách",
                  ]
                : [
                    "Khách gộp nhóm bạn",
                    "Thanh toán chung hóa đơn",
                    "Khách chuyển sang chơi chung",
                    "Theo yêu cầu của khách",
                  ]
              ).map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setTransferReason(reason)}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer",
                    transferReason === reason
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>
            <Input
              placeholder="Hoặc nhập lý do chi tiết..."
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              className="!rounded-lg !text-xs"
            />
          </div>

          {/* Operational Notice */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
            <InfoCircleOutlined className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px]">
              {transferAction === "transfer" ? (
                <span>
                  Phiên chơi sẽ chuyển sang bàn mới. Bàn cũ (
                  <strong>{selectedTable?.name}</strong>) sẽ kết thúc và tự động chuyển về trạng thái{" "}
                  <strong>Trống</strong> để đón khách mới.
                </span>
              ) : (
                <span>
                  Sau khi gộp, toàn bộ tiền giờ và món F&B của{" "}
                  <strong>{selectedTable?.name}</strong> sẽ được chuyển vào{" "}
                  <strong>
                    {tables.find((t) => t.id === targetTableId)?.name || "bàn mới"}
                  </strong>
                  . Bàn cũ (<strong>{selectedTable?.name}</strong>) sẽ kết thúc phiên và tự động chuyển
                  về trạng thái <strong>Trống</strong> để đón khách mới.
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
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
              disabled={loading || !!loadError || !targetTableId}
              leftIcon={<SwapOutlined />}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              {transferAction === "transfer" ? "Xác Nhận Chuyển Bàn" : "Xác Nhận Gộp Bàn"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={fnbModalVisible}
        onCancel={() => setFnbModalVisible(false)}
        footer={null}
        width={840}
        title={
          <div className="flex items-center justify-between pr-4">
            <Space align="center" size={8}>
              <CoffeeOutlined className="text-emerald-600 text-lg" />
              <span className="font-bold text-slate-900 text-base">
                F&B - {selectedTable?.name}
              </span>
            </Space>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFnbTab("manage")}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  fnbTab === "manage"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                <CoffeeOutlined />
                Món Trên Bàn ({activeServedOrders.reduce((sum, i) => sum + i.quantity, 0)})
              </button>
              <button
                type="button"
                onClick={() => setFnbTab("order")}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  fnbTab === "order"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                <PlusOutlined />
                Gọi Thêm Món {newOrderList.length > 0 && `(${newOrderList.reduce((sum, i) => sum + i.quantity, 0)})`}
              </button>
            </div>
          </div>
        }
      >
        {fnbTab === "order" ? (
          <div className="py-2 grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left: Menu & Search */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                  placeholder="Tìm tên món nhanh..."
                  value={fnbSearchText}
                  onChange={(e) => setFnbSearchText(e.target.value)}
                  allowClear
                  size="small"
                  className="!rounded-lg !text-xs flex-1"
                />
                <Select
                  value={fnbCategory}
                  onChange={(val) => setFnbCategory(val)}
                  className="!w-36 !rounded-lg !text-xs shrink-0"
                  options={fnbCategoryOptions}
                />
              </div>

              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                {filteredFnbStock.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Không tìm thấy món nào phù hợp.
                  </div>
                ) : (
                  filteredFnbStock.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white flex items-center justify-between gap-3 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">{item.name}</span>
                          {item.stockQuantity <= 0 ? (
                            <Tag color="error" className="!text-[9px] !px-1.5 !py-0 !border-0">
                              HẾT HÀNG
                            </Tag>
                          ) : item.stockQuantity < 10 ? (
                            <Tag color="warning" className="!text-[9px] !px-1.5 !py-0 !border-0">
                              Còn {item.stockQuantity}
                            </Tag>
                          ) : (
                            <Tag
                              color="default"
                              className="!text-[9px] !px-1.5 !py-0 !border-0 !bg-slate-100"
                            >
                              Còn {item.stockQuantity}
                            </Tag>
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
                  ))
                )}
              </div>
            </div>

            {/* Right: New Order Draft Cart */}
            <div className="md:col-span-5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                  <span className="text-xs font-bold text-slate-800">Món mới chuẩn bị thêm:</span>
                  <span className="text-xs font-mono text-slate-500">
                    {newOrderList.length} loại
                  </span>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {newOrderList.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Chưa chọn món mới nào. Bấm &quot;Thêm&quot; từ thực đơn bên trái.
                    </div>
                  ) : (
                    newOrderList.map((order) => (
                      <div
                        key={order.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0 pr-1">
                          <span
                            className="font-semibold text-slate-800 block truncate"
                            title={order.name}
                          >
                            {order.name}
                          </span>
                          <span className="text-[11px] text-emerald-700 font-bold font-mono">
                            {(order.price * order.quantity).toLocaleString("vi-VN")}đ
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Space size={3} align="center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateNewOrderItemQty(order.id, -1)}
                              className="!h-7 !w-7 !p-0 !min-w-0 !rounded-lg !border-slate-300 !text-slate-700 hover:!border-slate-400"
                            >
                              <MinusOutlined className="text-xs" />
                            </Button>
                            <span className="font-bold text-xs w-5 text-center font-mono">
                              {order.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateNewOrderItemQty(order.id, 1)}
                              className="!h-7 !w-7 !p-0 !min-w-0 !rounded-lg !border-emerald-300 !bg-emerald-50/50 !text-emerald-800 hover:!bg-emerald-100"
                            >
                              <PlusOutlined className="text-xs" />
                            </Button>
                          </Space>

                          <button
                            type="button"
                            onClick={() => handleRemoveNewOrderItem(order.id)}
                            title="Bỏ món này khỏi giỏ"
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-1 cursor-pointer"
                          >
                            <DeleteOutlined className="text-xs" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total & Submit */}
              <div className="pt-3 border-t border-slate-200 mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Tổng tiền thêm mới:</span>
                  <span className="text-base text-emerald-700 font-black font-mono">
                    {newOrderList
                      .reduce((acc, cur) => acc + cur.price * cur.quantity, 0)
                      .toLocaleString("vi-VN")}
                    đ
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmAddFnbOrder}
                  loading={saving}
                  disabled={loading || newOrderList.length === 0}
                  className="!w-full !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold text-xs !h-9 shadow-xs"
                >
                  Xác Nhận Thêm Món ({newOrderList.reduce((acc, cur) => acc + cur.quantity, 0)} món)
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Tab: Món Đang Phục Vụ & Hủy Món */
          <div className="py-2 space-y-4">
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-800 font-medium block">
                  Tổng tiền món đang phục vụ trên bàn:
                </span>
                <span className="text-base font-black text-emerald-700 font-mono">
                  {activeFnbTotal.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <Tag
                color="green"
                className="!font-bold font-mono !text-xs !px-2.5 !py-1 !rounded-lg !border-emerald-300 !bg-emerald-100/70 !text-emerald-800"
              >
                {activeServedOrders.length} loại • {activeServedOrders.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)} món
              </Tag>
            </div>

            {/* List active items */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Danh sách món đang phục vụ ({activeServedOrders.length} loại • {activeServedOrders.reduce((sum, i) => sum + i.quantity, 0)} món):
              </span>

              {activeServedOrders.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Bàn hiện chưa có món nào đang phục vụ. Bấm tab &quot;Gọi Thêm Món&quot; để thêm.
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {activeServedOrders.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{item.name}</span>
                          <Tag color="green" className="!text-[10px] !px-1.5 !py-0 !border-0 font-medium">
                            Đang dùng x{item.quantity}
                          </Tag>
                          {item.originTableName && (
                            <Tag color="purple" className="!text-[10px] !px-1.5 !py-0 !border-0 font-medium">
                              Gộp từ {item.originTableName}
                            </Tag>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span>
                            Đơn giá:{" "}
                            <strong className="text-slate-700 font-mono">
                              {item.price.toLocaleString("vi-VN")}đ
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Thành tiền:{" "}
                            <strong className="text-emerald-700 font-mono">
                              {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                            </strong>
                          </span>
                          {item.orderTime && (
                            <>
                              <span>•</span>
                              <span>Gọi lúc: {item.orderTime}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCancelModal(item)}
                        leftIcon={<RollbackOutlined />}
                        className="!text-xs !h-8 !px-3 !rounded-xl !border-rose-300 !text-rose-700 hover:!bg-rose-50"
                      >
                        Trả / Hủy
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* List cancelled items history */}
            {cancelledOrders.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <HistoryOutlined />
                  Lịch sử món đã hủy / trả lại ({cancelledOrders.length} món):
                </span>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {cancelledOrders.map((cItem, idx) => (
                    <div
                      key={`cancel-${cItem.id}-${idx}`}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-500"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700 line-through">
                            {cItem.name}
                          </span>
                          <Tag color="error" className="!text-[9px] !px-1.5 !py-0 !border-0 font-bold">
                            Đã hủy x{cItem.cancelledQuantity || cItem.quantity}
                          </Tag>
                          {cItem.stockRestored === false ? (
                            <Tag color="warning" className="!text-[9px] !px-1.5 !py-0 !border-0 font-medium">
                              Hao hụt (Không nhập kho)
                            </Tag>
                          ) : (
                            <Tag color="cyan" className="!text-[9px] !px-1.5 !py-0 !border-0 font-medium">
                              Đã hoàn kho
                            </Tag>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Lý do: <strong className="text-slate-700">{cItem.cancelReason || "Khách trả lại"}</strong>
                          {cItem.cancelledBy && ` • Bởi ${cItem.cancelledBy}`}
                          {cItem.cancelledAt &&
                            ` • Lúc ${new Date(cItem.cancelledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`}
                        </div>
                      </div>
                      <span className="text-xs font-mono line-through text-slate-400">
                        {((cItem.price * (cItem.cancelledQuantity || cItem.quantity))).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Xác Nhận Hủy Món (SCRUM-874, SCRUM-875) */}
      <Modal
        open={cancelModalVisible}
        onCancel={() => setCancelModalVisible(false)}
        footer={null}
        width={460}
        title={
          <Space align="center" size={8}>
            <RollbackOutlined className="text-rose-600 text-base" />
            <span className="font-bold text-slate-900 text-sm">
              Xác Nhận Trả / Hủy Món
            </span>
          </Space>
        }
      >
        {cancellingItem && (
          <div className="py-2 space-y-4">
            {/* Item Info Card */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900 block">{cancellingItem.name}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Đang phục vụ: {cancellingItem.quantity} • Đơn giá: {cancellingItem.price.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <Tag color="default" className="!font-bold font-mono !text-xs !border-slate-300">
                {(cancellingItem.price * cancelQty).toLocaleString("vi-VN")}đ
              </Tag>
            </div>

            {/* Quantity Selector */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Số lượng hủy / trả lại:
              </label>
              {cancellingItem.quantity > 1 ? (
                <div className="flex items-center gap-3">
                  <Space size={6} align="center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancelQty <= 1}
                      onClick={() => setCancelQty((q) => Math.max(1, q - 1))}
                      className="!h-8 !w-8 !p-0 !rounded-lg"
                    >
                      <MinusOutlined className="text-xs" />
                    </Button>
                    <span className="font-bold text-sm w-8 text-center font-mono text-slate-900">
                      {cancelQty}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancelQty >= cancellingItem.quantity}
                      onClick={() => setCancelQty((q) => Math.min(cancellingItem.quantity, q + 1))}
                      className="!h-8 !w-8 !p-0 !rounded-lg"
                    >
                      <PlusOutlined className="text-xs" />
                    </Button>
                  </Space>
                  <span className="text-xs text-slate-500">
                    (Tối đa {cancellingItem.quantity} món)
                  </span>
                </div>
              ) : (
                <Tag color="blue" className="!font-bold !text-xs !px-2.5 !py-0.5 !rounded-lg">
                  1 món
                </Tag>
              )}
            </div>

            {/* Quick Reason selector: 6 balanced buttons (3 rows x 2 cols) */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Lý do hủy món (Chọn nhanh):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Khách đổi ý / Chưa dùng",
                  "Khách đổi sang món khác",
                  "Pha nhầm / Bưng nhầm bàn",
                  "Món lỗi / Hỏng / Đổ vỡ",
                  "Quán hết món / Thiếu đồ",
                  "Khác",
                ].map((reasonOption) => (
                  <button
                    key={reasonOption}
                    type="button"
                    onClick={() => handleSelectCancelReason(reasonOption)}
                    className={clsx(
                      "p-2 rounded-xl text-xs text-left border transition-all cursor-pointer",
                      cancelReason === reasonOption
                        ? "bg-rose-50 border-rose-400 text-rose-800 font-bold shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300",
                    )}
                  >
                    {reasonOption}
                  </button>
                ))}
              </div>

              {cancelReason === "Khác" && (
                <div className="mt-2">
                  <Input
                    placeholder="Gõ lý do cụ thể..."
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    size="small"
                    className="!rounded-lg !text-xs"
                  />
                </div>
              )}
            </div>

            {/* Consolidated Summary & Stock Restore Card */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-xs font-semibold text-slate-700">Khấu trừ tiền trên hóa đơn bàn:</span>
                <span className="text-sm font-black text-rose-600 font-mono">
                  -{(cancellingItem.price * cancelQty).toLocaleString("vi-VN")}đ
                </span>
              </div>

              <div
                className="flex items-start justify-between gap-3 cursor-pointer select-none"
                onClick={() => setRestoreStock((s) => !s)}
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {restoreStock ? "✓ Hoàn trả vào tồn kho hàng hóa" : "✕ Không nhập kho (Hủy hao hụt)"}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {restoreStock
                      ? `Cộng trả lại +${cancelQty} vào kho (Dành cho đồ đóng lon / nguyên gói chưa khui)`
                      : `Không cộng kho (Dành cho đồ pha chế / nấu chín đã làm hoặc món hỏng/đổ bỏ)`}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={restoreStock}
                  onChange={(e) => setRestoreStock(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModalVisible(false)}
                className="!rounded-xl !text-xs"
              >
                Bỏ qua
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmCancelItem}
                loading={saving}
                disabled={loading}
                className="!rounded-xl font-bold !text-xs !px-4"
              >
                Xác Nhận Hủy Món
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={checkoutModalVisible}
        onCancel={() => setCheckoutModalVisible(false)}
        footer={null}
        width={620}
        title={
          <Space align="center" size={8}>
            <DollarOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Thanh Toán Bàn - {selectedTable?.name}
            </span>
          </Space>
        }
      >
        {selectedTable && selectedTable.currentSession && (() => {
          const playingDetailsObj = calculatePlayingDetails(selectedTable);
          const fnbTotal = (selectedTable.currentSession.orders || []).reduce(
            (sum, item) =>
              item.status !== "cancelled"
                ? sum + (Number(item.price) || 0) * (Number(item.quantity) || 0)
                : sum,
            0,
          );
          const subtotal = playingDetailsObj.cost + fnbTotal;
          const memberDiscountAmount =
            !appliedVoucher && discountPercent > 0
              ? Math.round(subtotal * (discountPercent / 100))
              : 0;
          const voucherDiscountAmount = appliedVoucher ? appliedVoucher.discountAmount : 0;
          const totalDiscount = memberDiscountAmount + voucherDiscountAmount;
          const depositAmount = selectedTable.currentSession.deposit || 0;
          const finalAmount = Math.max(0, subtotal - totalDiscount - depositAmount);
          const earnedPoints = Math.floor(finalAmount / 10000);

          return (
            <div className="py-2 space-y-3.5 text-xs">
              {/* Card Tổng quan hóa đơn */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                {/* Header bàn & thời gian */}
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-sm whitespace-nowrap">{selectedTable.name}</span>
                    <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                      • {selectedTable.type === "pool" ? "Bàn Lỗ (Pool)" : selectedTable.type === "carom" ? "Bàn Carom" : "Bàn Snooker"}
                    </span>
                  </div>
                  <span className="font-mono text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 whitespace-nowrap shrink-0">
                    ⏱ {playingDetailsObj.formattedTime} ({playingDetailsObj.minutes} phút)
                  </span>
                </div>

                {/* KHỐI 1: KHÁCH HÀNG & HỘI VIÊN */}
                <div className="p-3 rounded-xl bg-white border border-emerald-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                      <UserOutlined className="text-emerald-600" />
                      Khách hàng & Hội viên:
                    </span>
                    {loyaltyCustomer ? (
                      <Tag color="gold" className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold !m-0 whitespace-nowrap">
                        ⭐ HỘI VIÊN VIP (-10% Giờ)
                      </Tag>
                    ) : (
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">Khách vãng lai</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhập SĐT khách hàng tích điểm..."
                      value={checkoutPhone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCheckoutPhone(val);
                        if (loyaltyCustomer && val.trim() !== loyaltyCustomer.phone) {
                          setLoyaltyCustomer(null);
                          setDiscountPercent(0);
                        }
                      }}
                      onPressEnter={handleSearchLoyaltyCustomer}
                      prefix={<PhoneOutlined className="text-slate-400 text-xs" />}
                      className="!h-9 !rounded-xl !text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSearchLoyaltyCustomer}
                      loading={isSearchingMember}
                      className="!h-9 !px-3 !rounded-xl !text-xs font-bold shrink-0"
                    >
                      Áp dụng
                    </Button>
                  </div>

                {loyaltyCustomer ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-all">
                      <span className="flex items-center gap-1 font-medium">
                        <CheckCircleOutlined className="text-emerald-600" />
                        Hội viên: <strong className="text-emerald-950 font-bold">{loyaltyCustomer.name}</strong>
                        {loyaltyCustomer.rank && (
                          <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-bold ml-1">
                            Hạng {loyaltyCustomer.rank}
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-emerald-700 font-mono">
                        +100 Điểm (SPA Loyalty)
                      </span>
                    </div>

                      {/* Customer Available Vouchers in Wallet */}
                      {loyaltyCustomer.availableVouchers && loyaltyCustomer.availableVouchers.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-50/70 to-teal-50/60 border border-emerald-200/90 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                            <span className="flex items-center gap-1.5">
                              <GiftOutlined className="text-emerald-600" />
                              Voucher trong ví của khách ({loyaltyCustomer.availableVouchers.length}):
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              Bấm để áp dụng nhanh
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {loyaltyCustomer.availableVouchers.map((v) => {
                              const isApplied = appliedVoucher?.code === v.code;
                              return (
                                <button
                                  key={v.code}
                                  type="button"
                                  onClick={() => void handleSelectCustomerVoucher(v.code)}
                                  title={v.description || v.code}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-all cursor-pointer select-none text-left ${
                                    isApplied
                                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs font-bold"
                                      : "bg-white border-emerald-200 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50"
                                  }`}
                                >
                                  <span className="font-bold">{v.code}</span>
                                  <span
                                    className={`text-[10px] ${
                                      isApplied ? "text-emerald-100" : "text-emerald-700 font-semibold"
                                    }`}
                                  >
                                    ({v.discountType === "percent" ? `-${v.discountValue}%` : `-${(v.discountValue / 1000).toLocaleString("vi-VN")}k`})
                                  </span>
                                  {isApplied ? (
                                    <CheckCircleOutlined className="text-white text-xs ml-0.5" />
                                  ) : (
                                    <span className="text-[9px] text-slate-400 font-sans">
                                      [Dùng]
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : checkoutPhone.trim().length >= 8 ? (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span>Chưa xác thực hội viên cho số <strong>{checkoutPhone}</strong></span>
                      <button
                        type="button"
                        onClick={handleSearchLoyaltyCustomer}
                        className="text-emerald-600 font-bold hover:underline cursor-pointer"
                      >
                        Bấm để tra cứu
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* KHỐI 2: BẢNG KÊ DỊCH VỤ SỬ DỤNG (GIỜ CHƠI + ĐỒ UỐNG LIỀN MẠCH) */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                  <span className="font-bold text-xs text-slate-800 block">
                    Bảng kê dịch vụ sử dụng:
                  </span>

                  {/* 1. Tiền giờ chơi */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <ClockCircleOutlined className="text-indigo-600" />
                        Tiền giờ chơi ({playingDetailsObj.minutes} phút):
                      </span>
                      <strong className="text-slate-900 font-mono text-sm">
                        {playingDetailsObj.cost.toLocaleString("vi-VN")}đ
                      </strong>
                    </div>

                    {selectedTable.currentSession.carriedCost > 0 && (
                      <div className="flex justify-between items-center text-[11px] text-purple-700 bg-purple-50/70 px-2 py-1 rounded-lg border border-purple-100">
                        <span className="flex items-center gap-1 font-medium">
                          <SwapOutlined className="text-purple-600" />
                          Tiền giờ chuyển / gộp từ bàn trước:
                        </span>
                        <strong className="font-mono font-bold">
                          +{selectedTable.currentSession.carriedCost.toLocaleString("vi-VN")}đ
                        </strong>
                      </div>
                    )}

                    {/* Collapsible Split Time Slots */}
                    {playingDetailsObj.timeSlots && playingDetailsObj.timeSlots.length > 0 && (
                      <div className="p-2 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-1">
                        <div
                          className="text-[11px] font-bold text-slate-700 flex items-center justify-between cursor-pointer select-none"
                          onClick={() => setShowTimeSlots(!showTimeSlots)}
                        >
                          <span className="flex items-center gap-1.5 text-indigo-900">
                            ⚡ Chi tiết khung giờ
                            {playingDetailsObj.isCrossed && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold">
                                {playingDetailsObj.timeSlots.length} khung
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800">
                            {showTimeSlots ? "Thu gọn ▴" : "Xem chi tiết ▾"}
                          </span>
                        </div>

                        {showTimeSlots && (
                          <div className="max-h-36 overflow-y-auto space-y-1 pt-1 border-t border-indigo-100 pr-1">
                            {playingDetailsObj.timeSlots.map((slot, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-[10.5px] text-slate-600 bg-white/90 px-2 py-1 rounded"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                  <span className="font-semibold text-slate-800 truncate">
                                    {slot.tierName}
                                  </span>
                                  <span className="text-slate-400 font-mono text-[10px] shrink-0">
                                    ({slot.startTime} – {slot.endTime})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-slate-500 font-mono text-[10px]">
                                    {slot.minutes}p × {slot.pricePerHour.toLocaleString()}đ
                                  </span>
                                  <span className="font-mono font-bold text-slate-900">
                                    {slot.cost.toLocaleString()}đ
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Tiền đồ uống & dịch vụ */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <CoffeeOutlined className="text-amber-600" />
                        Tiền đồ uống & dịch vụ (
                        {(selectedTable.currentSession.orders || []).filter(
                          (o) => o.status !== "cancelled",
                        ).length}{" "}
                        món):
                      </span>
                      <strong className="text-slate-900 font-mono text-sm">
                        {fnbTotal.toLocaleString("vi-VN")}đ
                      </strong>
                    </div>

                    {(selectedTable.currentSession.orders || []).filter(
                      (o) => o.status !== "cancelled",
                    ).length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                        {(selectedTable.currentSession.orders || [])
                          .filter((o) => o.status !== "cancelled")
                          .map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-[11px] text-slate-600"
                            >
                              <span className="flex items-center gap-1.5">
                                <span>
                                  {item.name || "Món F&B"}{" "}
                                  <strong className="text-slate-800">
                                    x{Number(item.quantity) || 1}
                                  </strong>
                                </span>
                                {item.originTableName && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">
                                    {item.originTableName}
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-slate-900 font-medium">
                                {(
                                  (Number(item.price) || 0) * (Number(item.quantity) || 1)
                                ).toLocaleString("vi-VN")}
                                đ
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* KHỐI 3: BẢNG TÍNH TỔNG TIỀN & GIẢM TRỪ */}
                <div className="bg-slate-100/90 p-3.5 rounded-xl space-y-1.5 text-[11px] border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Tổng tiền dịch vụ:</span>
                    <span className="font-mono font-medium text-slate-800">
                      {subtotal.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  {memberDiscountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Ưu đãi Hội viên VIP (-{discountPercent}%):</span>
                      <span className="font-mono">
                        -{memberDiscountAmount.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  )}
                  {voucherDiscountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold items-center">
                      <span>Voucher hội viên ({appliedVoucher?.code}):</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono">
                          -{voucherDiscountAmount.toLocaleString("vi-VN")}đ
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedVoucher(null);
                            setVoucherCode("");
                            if (loyaltyCustomer) setDiscountPercent(10);
                          }}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer font-sans"
                        >
                          [Gỡ]
                        </button>
                      </div>
                    </div>
                  )}
                  {depositAmount > 0 && (
                    <div className="flex justify-between text-amber-700 font-semibold">
                      <span>Khấu trừ tiền cọc:</span>
                      <span className="font-mono">
                        -{depositAmount.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                    <span>TỔNG CỘNG THANH TOÁN:</span>
                    <span className="text-xl font-black text-emerald-700 font-mono">
                      {finalAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>

                {depositAmount > 0 && (
                  <p className="text-[11px] text-slate-500 italic flex items-center gap-1">
                    <InfoCircleOutlined className="text-emerald-600 shrink-0" />
                    <span>
                      Tiền cọc {depositAmount.toLocaleString("vi-VN")}đ đã được khấu trừ trực tiếp.{" "}
                      {finalAmount === 0 && depositAmount > subtotal - totalDiscount
                        ? `Thừa ${(depositAmount - (subtotal - totalDiscount)).toLocaleString("vi-VN")}đ hoàn lại cho khách.`
                        : ""}
                    </span>
                  </p>
                )}

                {/* KHỐI 4: PHƯƠNG THỨC THANH TOÁN */}
                <div className="pt-1">
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
                      variant={paymentMethod === "split" ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setPaymentMethod("split")}
                      leftIcon={<SwapOutlined />}
                      className={`!h-12 !flex-col !gap-1 !rounded-xl ${
                        paymentMethod === "split"
                          ? "!bg-emerald-600 !border-emerald-600 text-white shadow-xs"
                          : "!border-slate-200 !text-slate-700 hover:!border-slate-300"
                      }`}
                    >
                      <span className="text-[11px] font-bold">Tiền Mặt + QR</span>
                    </Button>

                    <Button
                      variant={paymentMethod === "member_balance" ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setPaymentMethod("member_balance")}
                      leftIcon={<UserOutlined />}
                      className={`!h-12 !flex-col !gap-0.5 !rounded-xl ${
                        paymentMethod === "member_balance"
                          ? "!bg-emerald-600 !border-emerald-600 text-white shadow-xs"
                          : "!border-slate-200 !text-slate-700 hover:!border-slate-300"
                      }`}
                    >
                      <span className="text-[11px] font-bold">Ví Hội Viên</span>
                      {loyaltyCustomer && loyaltyCustomer.walletBalance !== undefined && (
                        <span
                          className={`text-[9px] font-mono ${
                            paymentMethod === "member_balance"
                              ? "text-emerald-100 font-semibold"
                              : "text-emerald-700 font-bold"
                          }`}
                        >
                          {(loyaltyCustomer.walletBalance / 1000).toLocaleString("vi-VN")}k
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Chi tiết theo từng phương thức thanh toán */}
                {paymentMethod === "cash" && (
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-xs text-slate-800 whitespace-nowrap">
                        Tiền mặt khách đưa:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          placeholder={finalAmount.toString()}
                          value={cashReceived !== null ? cashReceived : finalAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCashReceived(val === "" ? null : Number(val));
                          }}
                          className="!w-40 !h-9 !text-right font-mono font-bold !text-slate-900 !text-sm"
                        />
                        <span className="text-xs font-semibold text-slate-500">đ</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCashReceived(finalAmount)}
                          title="Điền đúng số tiền hóa đơn"
                          className="!h-9 !px-2.5 !rounded-xl !text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 shrink-0"
                        >
                          Đủ tiền
                        </Button>
                      </div>
                    </div>

                    {(() => {
                      const actualReceived = cashReceived !== null ? cashReceived : finalAmount;
                      if (actualReceived === finalAmount) {
                        return (
                          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] flex items-center justify-between border border-emerald-200 font-medium">
                            <span className="flex items-center gap-1.5">
                              <CheckCircleOutlined className="text-emerald-600" />
                              Khách trả đủ tiền mặt ({finalAmount.toLocaleString("vi-VN")}đ)
                            </span>
                            <span className="font-bold font-mono">Tiền thừa: 0đ</span>
                          </div>
                        );
                      }
                      if (actualReceived > finalAmount) {
                        return (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-950">
                            <span className="font-semibold text-xs">Tiền thừa trả khách:</span>
                            <span className="font-mono font-black text-base text-emerald-700">
                              {(actualReceived - finalAmount).toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                        );
                      }
                      const missing = finalAmount - actualReceived;
                      return (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-amber-950">
                            <span className="font-bold">Khách đưa còn thiếu: </span>
                            <strong className="font-mono text-rose-600 font-bold text-xs">
                              {missing.toLocaleString("vi-VN")}đ
                            </strong>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setPaymentMethod("split");
                              setCashReceived(actualReceived);
                            }}
                            leftIcon={<QrcodeOutlined />}
                            className="!h-7 !px-2.5 !rounded-lg !bg-indigo-600 hover:!bg-indigo-700 !border-indigo-600 !text-xs font-bold text-white shrink-0"
                          >
                            Quét QR phần thiếu ({missing.toLocaleString("vi-VN")}đ)
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                )}

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
                              <Tag
                                color="green"
                                className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold !m-0"
                              >
                                VIETQR 24/7
                              </Tag>
                              <span className="font-extrabold text-slate-900 text-xs">
                                MB Bank (Quân Đội)
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              STK:{" "}
                              <strong className="font-mono text-slate-900 font-bold">
                                0901 234 567
                              </strong>
                            </div>
                            <div className="text-[11px] text-slate-600 truncate">
                              Chủ TK:{" "}
                              <strong className="text-slate-900 font-bold">CLB BIDA CUEZONE</strong>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Số tiền:{" "}
                              <strong className="font-mono text-emerald-700 font-black text-sm">
                                {finalAmount.toLocaleString("vi-VN")}đ
                              </strong>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Nội dung: <strong>CueZone {selectedTable.code}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-white/80 border border-emerald-200/80 text-[11px] text-emerald-800 flex items-center gap-1.5">
                          <CheckCircleOutlined className="text-emerald-600 shrink-0" />
                          <span>
                            Khách quét mã chuyển khoản thành công, nhấn{" "}
                            <strong>Xác Nhận & In Hóa Đơn</strong> để hoàn tất.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Thanh toán kết hợp: Tiền Mặt + QR */}
                    {paymentMethod === "split" && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-200 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                          <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                            <SwapOutlined className="text-indigo-600" /> Thanh toán kết hợp: Tiền Mặt + QR
                          </span>
                          <Tag color="purple" className="!rounded-md !px-1.5 !text-[10px] !font-bold !m-0">
                            TỰ ĐỘNG CHIA TIỀN
                          </Tag>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Cột 1: Thu tiền mặt */}
                          <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-700 block">
                              1. Số tiền mặt nhận:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                value={cashReceived !== null ? cashReceived : Math.floor(finalAmount / 2)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCashReceived(val === "" ? 0 : Math.max(0, Math.min(finalAmount, Number(val))));
                                }}
                                className="!h-8 !text-right font-mono font-bold !text-slate-900 !text-xs"
                              />
                              <span className="text-xs font-semibold text-slate-500">đ</span>
                            </div>
                            <div className="flex items-center gap-1 pt-0.5">
                              <button
                                type="button"
                                onClick={() => setCashReceived(Math.floor(finalAmount / 2))}
                                className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium cursor-pointer"
                              >
                                50% ({Math.floor(finalAmount / 2).toLocaleString("vi-VN")}đ)
                              </button>
                              <button
                                type="button"
                                onClick={() => setCashReceived(0)}
                                className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium cursor-pointer"
                              >
                                0đ
                              </button>
                            </div>
                          </div>

                          {/* Cột 2: Phần còn lại quét QR */}
                          {(() => {
                            const cashPart = cashReceived !== null ? cashReceived : Math.floor(finalAmount / 2);
                            const qrPart = Math.max(0, finalAmount - cashPart);
                            return (
                              <div className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-center gap-2.5">
                                <div className="h-20 w-20 bg-white rounded-lg p-0.5 shadow-2xs border border-indigo-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={`https://img.vietqr.io/image/MB-0901234567-compact2.png?amount=${qrPart}&addInfo=CueZone%20${selectedTable.code}&accountName=CLB%20BIDA%20CUEZONE`}
                                    alt="VietQR Còn Thiếu"
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-0.5 text-[11px]">
                                  <span className="text-[10px] font-bold text-indigo-700 uppercase">
                                    2. Quét QR còn lại:
                                  </span>
                                  <div className="font-mono font-black text-indigo-900 text-sm">
                                    {qrPart.toLocaleString("vi-VN")}đ
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    MB: <strong>0901 234 567</strong>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Thanh toán Ví Hội Viên */}
                    {paymentMethod === "member_balance" && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 space-y-2.5 text-xs">
                        {loyaltyCustomer ? (
                          <>
                            <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                              <span className="font-semibold text-slate-700">Hội viên:</span>
                              <strong className="text-slate-900 font-bold">{loyaltyCustomer.name} ({loyaltyCustomer.phone})</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-700">Số dư ví hiện tại:</span>
                              <strong className="font-mono text-emerald-800 text-sm font-bold">
                                {(loyaltyCustomer.walletBalance ?? 0).toLocaleString("vi-VN")}đ
                              </strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-700">Số tiền thanh toán:</span>
                              <strong className="font-mono text-slate-900 font-bold">
                                {finalAmount.toLocaleString("vi-VN")}đ
                              </strong>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                              <span className="font-semibold text-slate-700">Số dư sau thanh toán:</span>
                              <strong
                                className={`font-mono font-black text-sm ${
                                  (loyaltyCustomer.walletBalance ?? 0) >= finalAmount
                                    ? "text-emerald-700"
                                    : "text-rose-600"
                                }`}
                              >
                                {((loyaltyCustomer.walletBalance ?? 0) - finalAmount).toLocaleString("vi-VN")}đ
                              </strong>
                            </div>

                            {(loyaltyCustomer.walletBalance ?? 0) < finalAmount ? (
                              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5 font-medium">
                                <ExclamationCircleOutlined className="text-rose-600 shrink-0" />
                                <span>
                                  Số dư ví không đủ để thanh toán. Vui lòng nạp thêm vào ví hoặc chọn phương thức khác.
                                </span>
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-900 text-[11px] flex items-center gap-1.5 font-medium">
                                <CheckCircleOutlined className="text-emerald-600 shrink-0" />
                                <span>
                                  Ví đủ số dư. Thanh toán thành công sẽ cộng thêm{" "}
                                  <strong>+{earnedPoints} điểm</strong> tích lũy.
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                            <ExclamationCircleOutlined className="text-amber-600 text-base shrink-0" />
                            <span>Bàn này chưa liên kết Hội viên. Vui lòng nhập SĐT hội viên ở phần trên để thanh toán bằng ví.</span>
                          </div>
                        )}
                      </div>
                    )}
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
              );
            })()}
          </Modal>

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
              <span className="text-sm font-black text-slate-900 block">
                CUEZONE BILLIARDS LOUNGE
              </span>
              <span className="text-[10px] text-slate-500 block">
                123 Nguyễn Thị Minh Khai, Q.3, TP.HCM
              </span>
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
                <strong>
                  {paidSummary.sessionStart} - {paidSummary.sessionEnd} (
                  {paidSummary.durationFormatted})
                </strong>
              </div>
              {paidSummary.timeSlots && paidSummary.timeSlots.length > 1 ? (
                <div className="py-1 my-1 border-y border-dashed border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Chi tiết tính tiền theo khung giờ:
                  </span>
                  {paidSummary.timeSlots.map((slot, idx) => (
                    <div key={idx} className="flex justify-between text-[10.5px]">
                      <span>
                        {slot.tierName} ({slot.startTime}–{slot.endTime}): {slot.minutes}p ×{" "}
                        {slot.pricePerHour.toLocaleString()}đ
                      </span>
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
              {paidSummary.carriedCost > 0 && (
                <div className="flex justify-between font-bold pt-1 border-t border-slate-100 text-purple-700">
                  <span>Tiền giờ chuyển / gộp bàn:</span>
                  <span>+{paidSummary.carriedCost.toLocaleString("vi-VN")}đ</span>
                </div>
              )}
            </div>

            {paidSummary.orders && paidSummary.orders.length > 0 && (
              <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
                <span className="font-bold block mb-1">ĐỒ UỐNG & MÓN ĐÃ DÙNG:</span>
                {paidSummary.orders.map((item: PosOrderItem, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <span>{item.name || "Món F&B"} x{Number(item.quantity) || 1}</span>
                      {item.originTableName && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">
                          [{item.originTableName}]
                        </span>
                      )}
                    </span>
                    <span>{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString("vi-VN")}đ</span>
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
                  <span>
                    Giảm giá{" "}
                    {paidSummary.voucherCode
                      ? `(${paidSummary.voucherCode})`
                      : `(${paidSummary.discountPercent}%)`}
                    :
                  </span>
                  <span>-{paidSummary.discountAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              )}
              {paidSummary.deposit > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Tiền cọc đã trừ:</span>
                  <span className="font-mono">-{paidSummary.deposit.toLocaleString("vi-VN")}đ</span>
                </div>
              )}
              {paidSummary.refundAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Cần hoàn lại khách:</span>
                  <span className="font-mono">{paidSummary.refundAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200 text-slate-900">
                <span>TỔNG THANH TOÁN:</span>
                <span className="text-emerald-700">
                  {paidSummary.finalAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Hình thức thanh toán:</span>
                <span className="uppercase">{paidSummary.paymentMethod}</span>
              </div>
              {(paidSummary.pointsAwarded ?? paidSummary.earnedPoints ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Điểm thưởng ví hội viên:</span>
                  <span>+{(paidSummary.pointsAwarded ?? paidSummary.earnedPoints ?? 0)}</span>
                </div>
              )}
            </div>

            <div className="text-center pt-3 border-t border-slate-200 text-[10px] text-slate-400">
              Cảm ơn quý khách đã sử dụng dịch vụ tại CueZone!
              <br />
              Hẹn gặp lại quý khách!
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={waitlistModalVisible}
        onCancel={() => setWaitlistModalVisible(false)}
        footer={null}
        width={760}
        title={
          <div className="flex items-center gap-2 flex-wrap pr-4">
            <UsergroupAddOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">Danh Sách Khách Đang Chờ Bàn</span>
            <Tag color="green" className="!rounded-full !px-2 !font-bold">
              {waitlist.length} khách đang đợi
            </Tag>
            <Tag
              color={availableTables.length > 0 ? "blue" : "volcano"}
              className="!rounded-full !px-2 !font-bold"
            >
              Toàn quán: {availableTables.length} bàn trống
            </Tag>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
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
                  Loại bàn mong muốn
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

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <span className="font-bold text-xs text-slate-800">
                Khách đang chờ (Thứ tự ưu tiên theo thời gian đến)
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <InfoCircleOutlined className="text-emerald-600 shrink-0" />
                <span>Thu ngân có thể chọn bàn trống muốn xếp hoặc bấm &quot;Xếp Bàn&quot; để xếp nhanh</span>
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
                          <Tag
                            color="cyan"
                            className="!rounded-full !px-1.5 !py-0 !text-[10px] !m-0"
                          >
                            {item.guests} người
                          </Tag>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>
                            Nhu cầu bàn:{" "}
                            <strong className="text-slate-700">{item.preferredType}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Thời gian vào:{" "}
                            <strong className="text-slate-700 font-mono">{item.joinedTime}</strong>
                          </span>
                          {item.note && (
                            <>
                              <span>•</span>
                              <span className="italic text-slate-400 truncate max-w-[150px]">
                                "{item.note}"
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-end sm:self-center shrink-0">
                      <Select
                        placeholder={
                          availableTables.length > 0 ? "-- Chọn bàn xếp khách --" : "Hết bàn trống"
                        }
                        value={
                          selectedWaitlistTable[item.id] ||
                          (availableTables.find((t) => t.typeName === item.preferredType)?.id ??
                            availableTables[0]?.id)
                        }
                        onChange={(val) =>
                          setSelectedWaitlistTable((prev) => ({ ...prev, [item.id]: val }))
                        }
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
                            (availableTables.find((t) => t.typeName === item.preferredType)?.id ??
                              availableTables[0]?.id);
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
      <BookingQrScanner
        open={bookingQrScannerOpen}
        onClose={() => setBookingQrScannerOpen(false)}
      />
    </div>
  );
};

export default PosTableFloorPage;
