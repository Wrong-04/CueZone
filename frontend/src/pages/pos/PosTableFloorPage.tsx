import React, { useState, useEffect, useMemo } from "react";
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SwapOutlined,
  CoffeeOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  SearchOutlined,
  UserOutlined,
  PlusOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tag,
  Input,
  Select,
  Typography,
  message,
  Modal,
} from "../../shared/ui";
import {
  INITIAL_POS_TABLES,
  INITIAL_FNB_STOCK,
  type PosTable,
  type PosOrderItem,
  type FnbStockItem,
} from "../../mock/posData";

const { Title, Text } = Typography;

export const PosTableFloorPage: React.FC = () => {
  const [tables, setTables] = useState<PosTable[]>(() => {
    const saved = localStorage.getItem("cuezone_pos_tables");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_POS_TABLES;
  });

  const [fnbStock, setFnbStock] = useState<FnbStockItem[]>(() => {
    const saved = localStorage.getItem("cuezone_fnb_stock");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_FNB_STOCK;
  });

  // Current clock ticker for live duration calculation
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save changes
  useEffect(() => {
    localStorage.setItem("cuezone_pos_tables", JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem("cuezone_fnb_stock", JSON.stringify(fnbStock));
  }, [fnbStock]);

  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [selectedTable, setSelectedTable] = useState<PosTable | null>(null);

  // 1. Open Table Modal
  const [openModalVisible, setOpenModalVisible] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [isMember, setIsMember] = useState<boolean>(true);
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
  const [paymentMethod, setPaymentMethod] = useState<"vnpay" | "cash" | "card" | "member_balance">("vnpay");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [receiptModalVisible, setReceiptModalVisible] = useState<boolean>(false);
  const [paidSummary, setPaidSummary] = useState<any>(null);

  // 5. Incoming Online Order Mock Alert
  const [incomingOrderAlert, setIncomingOrderAlert] = useState<{
    tableId: string;
    tableName: string;
    items: PosOrderItem[];
  } | null>(null);

  // Calculate live playing minutes and cost
  const calculatePlayingDetails = (table: PosTable) => {
    if (!table.currentSession) return { minutes: 0, cost: 0, formattedTime: "00:00:00" };
    const session = table.currentSession;
    const effectiveNow = session.isPaused && session.pausedAt ? session.pausedAt : currentTime;
    const totalElapsedMs = Math.max(0, effectiveNow - session.startedAt - (session.totalPausedMs || 0));
    const totalMinutes = Math.max(1, Math.round(totalElapsedMs / 60000));

    const hours = Math.floor(totalElapsedMs / 3600000);
    const mins = Math.floor((totalElapsedMs % 3600000) / 60000);
    const secs = Math.floor((totalElapsedMs % 60000) / 1000);

    const formattedTime = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const playingCost = Math.round((totalMinutes / 60) * table.pricePerHour);

    return { minutes: totalMinutes, cost: playingCost, formattedTime };
  };

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchType = filterType === "all" || t.type === filterType;
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      const matchQuery =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.currentSession?.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchStatus && matchQuery;
    });
  }, [tables, filterType, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = tables.length;
    const playing = tables.filter((t) => t.status === "playing").length;
    const paused = tables.filter((t) => t.status === "paused").length;
    const booked = tables.filter((t) => t.status === "booked").length;
    const available = tables.filter((t) => t.status === "available").length;

    let totalTempRevenue = 0;
    tables.forEach((t) => {
      if (t.currentSession) {
        const { cost } = calculatePlayingDetails(t);
        const fnbCost = t.currentSession.orders.reduce((acc, cur) => acc + cur.price * cur.quantity, 0);
        totalTempRevenue += cost + fnbCost;
      }
    });

    return { total, playing, paused, booked, available, totalTempRevenue };
  }, [tables, currentTime]);

  // Handler: Open Table & Start Session
  const handleOpenTable = () => {
    if (!selectedTable) return;
    if (selectedTable.status !== "available" && selectedTable.status !== "booked") {
      message.warning("Bàn này không ở trạng thái sẵn sàng để mở!");
      return;
    }

    const newSession = {
      sessionStart: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      startedAt: Date.now(),
      isPaused: false,
      totalPausedMs: 0,
      customerName: customerName.trim() || "Khách Vãng Lai",
      customerPhone: customerPhone.trim() || undefined,
      isMember: isMember,
      memberRank: isMember ? ("Gold" as const) : undefined,
      orders: [],
      note: sessionNote.trim() || undefined,
    };

    setTables((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id
          ? {
              ...t,
              status: "playing" as const,
              bookedInfo: undefined,
              currentSession: newSession,
            }
          : t
      )
    );

    message.success(`Đã mở ${selectedTable.name} & bắt đầu tính giờ thành công!`);
    setOpenModalVisible(false);
    setSelectedTable(null);
    setCustomerName("");
    setCustomerPhone("");
    setSessionNote("");
  };

  // Handler: Pause / Resume Table
  const handleTogglePause = (table: PosTable) => {
    if (!table.currentSession) return;

    const isCurrentlyPaused = table.currentSession.isPaused;
    const updatedTables = tables.map((t) => {
      if (t.id === table.id && t.currentSession) {
        if (!isCurrentlyPaused) {
          // Pause table
          return {
            ...t,
            status: "paused" as const,
            currentSession: {
              ...t.currentSession,
              isPaused: true,
              pausedAt: Date.now(),
            },
          };
        } else {
          // Resume table
          const pausedDuration = Date.now() - (t.currentSession.pausedAt || Date.now());
          return {
            ...t,
            status: "playing" as const,
            currentSession: {
              ...t.currentSession,
              isPaused: false,
              pausedAt: undefined,
              totalPausedMs: (t.currentSession.totalPausedMs || 0) + pausedDuration,
            },
          };
        }
      }
      return t;
    });

    setTables(updatedTables);
    if (!isCurrentlyPaused) {
      message.info(`Đã tạm dừng tính giờ ${table.name}`);
    } else {
      message.success(`Đã tiếp tục tính giờ ${table.name}`);
    }
  };

  // Handler: Transfer / Merge Table
  const handleTransferOrMerge = () => {
    if (!selectedTable || !selectedTable.currentSession || !targetTableId) {
      message.warning("Vui lòng chọn bàn đích!");
      return;
    }

    const targetTable = tables.find((t) => t.id === targetTableId);
    if (!targetTable) return;

    if (transferAction === "transfer") {
      // Transfer to an available table
      if (targetTable.status !== "available") {
        message.error("Bàn đích phải là bàn đang trống để chuyển!");
        return;
      }

      setTables((prev) =>
        prev.map((t) => {
          if (t.id === selectedTable.id) {
            return { ...t, status: "available" as const, currentSession: undefined };
          }
          if (t.id === targetTable.id) {
            return {
              ...t,
              status: "playing" as const,
              currentSession: selectedTable.currentSession,
            };
          }
          return t;
        })
      );
      message.success(`Đã chuyển toàn bộ thời gian & món từ ${selectedTable.name} sang ${targetTable.name}!`);
    } else {
      // Merge table
      if (!targetTable.currentSession) {
        message.error("Bàn đích cũng phải đang có phiên chơi để gộp hóa đơn!");
        return;
      }

      const mergedOrders = [
        ...targetTable.currentSession.orders,
        ...selectedTable.currentSession.orders,
      ];

      setTables((prev) =>
        prev.map((t) => {
          if (t.id === selectedTable.id) {
            return { ...t, status: "available" as const, currentSession: undefined };
          }
          if (t.id === targetTable.id && t.currentSession) {
            return {
              ...t,
              currentSession: {
                ...t.currentSession,
                orders: mergedOrders,
                note: `${t.currentSession.note || ""} (Gộp từ ${selectedTable.name})`,
              },
            };
          }
          return t;
        })
      );
      message.success(`Đã gộp hóa đơn của ${selectedTable.name} vào ${targetTable.name}!`);
    }

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

  const handleConfirmFnbOrder = () => {
    if (!selectedTable || !selectedTable.currentSession) return;

    setTables((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id && t.currentSession
          ? {
              ...t,
              currentSession: {
                ...t.currentSession,
                orders: currentOrderList,
              },
            }
          : t
      )
    );

    message.success(`Đã cập nhật thực đơn và chuyển bếp cho ${selectedTable.name}!`);
    setFnbModalVisible(false);
  };

  // Handler: Approve Online Order (from customer QR)
  const handleApproveOnlineOrder = () => {
    if (!incomingOrderAlert) return;
    const { tableId, items } = incomingOrderAlert;

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId && t.currentSession) {
          return {
            ...t,
            currentSession: {
              ...t.currentSession,
              orders: [...t.currentSession.orders, ...items],
            },
          };
        }
        return t;
      })
    );

    message.success(`Đã duyệt đơn gọi món online và cộng vào hóa đơn ${incomingOrderAlert.tableName}!`);
    setIncomingOrderAlert(null);
  };

  // Handler: Trigger Mock Online Order for testing
  const triggerMockOnlineOrder = (table: PosTable) => {
    if (!table.currentSession) {
      message.info("Chỉ có thể test gọi món trên bàn đang có khách chơi!");
      return;
    }
    setIncomingOrderAlert({
      tableId: table.id,
      tableName: table.name,
      items: [
        {
          id: "fnb-01",
          name: "Cà Phê Muối CueZone Signature",
          price: 35000,
          quantity: 2,
          category: "coffee",
          orderTime: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          status: "pending",
        },
        {
          id: "fnb-09",
          name: "Bò Khô Cháy Tỏi Chanh Ớt",
          price: 65000,
          quantity: 1,
          category: "snack",
          orderTime: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          status: "pending",
        },
      ],
    });
  };

  // Handler: Open Checkout Modal
  const handleOpenCheckout = (table: PosTable) => {
    setSelectedTable(table);
    setDiscountPercent(table.currentSession?.isMember ? 10 : 0);
    setPaymentMethod("vnpay");
    setCheckoutModalVisible(true);
  };

  // Handler: Confirm Checkout & Print Receipt
  const handleConfirmCheckout = () => {
    if (!selectedTable || !selectedTable.currentSession) return;

    const { minutes, cost, formattedTime } = calculatePlayingDetails(selectedTable);
    const fnbTotal = selectedTable.currentSession.orders.reduce(
      (acc, cur) => acc + cur.price * cur.quantity,
      0
    );
    const subtotal = cost + fnbTotal;
    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const finalAmount = Math.max(0, subtotal - discountAmount);

    const summary = {
      tableName: selectedTable.name,
      typeName: selectedTable.typeName,
      customerName: selectedTable.currentSession.customerName,
      customerPhone: selectedTable.currentSession.customerPhone,
      sessionStart: selectedTable.currentSession.sessionStart,
      sessionEnd: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      durationFormatted: formattedTime,
      durationMinutes: minutes,
      pricePerHour: selectedTable.pricePerHour,
      playingCost: cost,
      orders: selectedTable.currentSession.orders,
      fnbTotal: fnbTotal,
      subtotal: subtotal,
      discountPercent: discountPercent,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      paymentMethod: paymentMethod,
      invoiceCode: `HD-${Math.floor(100000 + Math.random() * 900000)}`,
      checkoutTime: new Date().toLocaleString("vi-VN"),
    };

    setPaidSummary(summary);

    // Free the table
    setTables((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id
          ? { ...t, status: "available" as const, currentSession: undefined }
          : t
      )
    );

    setCheckoutModalVisible(false);
    setReceiptModalVisible(true);
    message.success(`Thanh toán thành công ${finalAmount.toLocaleString("vi-VN")}đ cho ${selectedTable.name}!`);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & STATS ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <Title level={2} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                POS Sơ Đồ Bàn & Thu Ngân Trực Tiếp
              </Title>
              <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-xs !font-bold">
                REALTIME FLOOR
              </Tag>
            </div>
            <Text className="!text-xs !text-slate-500">
              Quản lý mở bàn, tạm dừng, đổi/gộp bàn, order F&B tại bàn và thanh toán đa kênh (VNPay/Tiền mặt)
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const playingTable = tables.find((t) => t.status === "playing");
                if (playingTable) {
                  triggerMockOnlineOrder(playingTable);
                } else {
                  message.info("Cần ít nhất 1 bàn đang chơi để giả lập khách gọi món!");
                }
              }}
              leftIcon={<BellOutlined className="text-amber-500" />}
              className="!text-xs !rounded-xl !border-amber-300 !bg-amber-50/50 !text-amber-800"
            >
              Giả lập Khách quét QR gọi F&B
            </Button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Tổng số bàn</span>
            <span className="text-xl font-black text-slate-900">{stats.total} bàn</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80">
            <span className="text-[11px] font-semibold text-emerald-700 block mb-0.5">Đang chơi</span>
            <span className="text-xl font-black text-emerald-800">{stats.playing} bàn</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80">
            <span className="text-[11px] font-semibold text-amber-700 block mb-0.5">Tạm dừng</span>
            <span className="text-xl font-black text-amber-800">{stats.paused} bàn</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/80">
            <span className="text-[11px] font-semibold text-blue-700 block mb-0.5">Đã đặt trước</span>
            <span className="text-xl font-black text-blue-800">{stats.booked} bàn</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">Bàn trống</span>
            <span className="text-xl font-black text-slate-800">{stats.available} bàn</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-900 text-white">
            <span className="text-[11px] font-medium text-emerald-300 block mb-0.5">Tiền giờ & F&B tạm tính</span>
            <span className="text-lg font-black text-white truncate block">
              {stats.totalTempRevenue.toLocaleString("vi-VN")}đ
            </span>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION BANNER: KHÁCH QUÉT QR GỌI MÓN (Approve Online Order) ── */}
      {incomingOrderAlert && (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/90 p-4 shadow-md animate-bounce-once flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <QrcodeOutlined className="text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Text strong className="!text-sm !text-emerald-950">
                  Yêu Cầu Gọi Món Mới Tại: {incomingOrderAlert.tableName}
                </Text>
                <Tag color="green" className="!font-bold !text-[10px]">QR ONLINE</Tag>
              </div>
              <div className="text-xs text-emerald-800 mt-0.5">
                Khách vừa quét mã QR tại bàn gọi:{" "}
                <strong>
                  {incomingOrderAlert.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                </strong>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIncomingOrderAlert(null)}
              className="!text-xs !rounded-xl"
            >
              Bỏ qua
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApproveOnlineOrder}
              leftIcon={<CheckCircleOutlined />}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl text-xs font-bold shadow-xs"
            >
              Duyệt & Thêm Vào Bill
            </Button>
          </div>
        </div>
      )}

      {/* ── BỘ LỌC BÀN & TÌM KIẾM ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc loại bàn */}
          <Select
            value={filterType}
            onChange={(val) => setFilterType(val)}
            className="!w-44 !rounded-xl"
            options={[
              { value: "all", label: "Tất cả loại bàn" },
              { value: "standard", label: "Bàn Thường 9FT" },
              { value: "vip", label: "Bàn VIP Bank Pool" },
              { value: "match", label: "Bàn Match K-Steel" },
            ]}
          />

          {/* Lọc trạng thái */}
          <Select
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            className="!w-40 !rounded-xl"
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "playing", label: "Đang chơi" },
              { value: "available", label: "Bàn trống" },
              { value: "paused", label: "Tạm dừng" },
              { value: "booked", label: "Đã đặt trước" },
            ]}
          />
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Tìm tên bàn, số bàn, khách..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            className="!rounded-xl"
          />
        </div>
      </div>

      {/* ── SƠ ĐỒ LƯỚI BÀN (TABLE GRID) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const { cost, formattedTime } = calculatePlayingDetails(table);
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

          return (
            <div
              key={table.id}
              className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                isPlaying
                  ? "bg-white border-emerald-500/80 ring-2 ring-emerald-500/10"
                  : isPaused
                  ? "bg-amber-50/40 border-amber-300"
                  : isBooked
                  ? "bg-blue-50/30 border-blue-300"
                  : isMaintenance
                  ? "bg-slate-100/80 border-slate-300 opacity-70"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Header Card */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-400">{table.code}</span>
                    <Text strong className="!text-base !text-slate-900">
                      {table.name}
                    </Text>
                  </div>
                  <span className="text-[11px] text-slate-500 block">{table.typeName}</span>
                </div>

                <div>
                  {isPlaying && (
                    <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-xs !font-bold">
                      ĐANG CHƠI
                    </Tag>
                  )}
                  {isPaused && (
                    <Tag color="orange" className="!rounded-full !px-2.5 !py-0.5 !text-xs !font-bold">
                      TẠM DỪNG
                    </Tag>
                  )}
                  {isBooked && (
                    <Tag color="blue" className="!rounded-full !px-2.5 !py-0.5 !text-xs !font-bold">
                      ĐẶT TRƯỚC
                    </Tag>
                  )}
                  {isAvailable && (
                    <Tag color="default" className="!rounded-full !px-2.5 !py-0.5 !text-xs !font-bold !bg-slate-100 !text-slate-600">
                      TRỐNG
                    </Tag>
                  )}
                  {isMaintenance && (
                    <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !text-xs !font-bold">
                      BẢO TRÌ
                    </Tag>
                  )}
                </div>
              </div>

              {/* Body Card */}
              <div className="p-4 flex-1">
                {isPlaying || isPaused ? (
                  <div className="space-y-3">
                    {/* Live Timer Display */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-white font-mono">
                      <div className="flex items-center gap-2">
                        <ClockCircleOutlined className="text-emerald-400 text-base" />
                        <span className="text-xs text-slate-300">Thời gian:</span>
                      </div>
                      <span className="text-base font-bold text-emerald-400 tracking-wider">
                        {formattedTime}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="text-xs space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Khách chơi:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[130px]">
                          {table.currentSession?.customerName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Giờ vào:</span>
                        <span className="text-slate-700 font-mono">{table.currentSession?.sessionStart}</span>
                      </div>
                      {table.currentSession?.orders && table.currentSession.orders.length > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                          <span className="text-slate-500">Món F&B ({table.currentSession.orders.length}):</span>
                          <span className="font-semibold text-emerald-700">
                            {fnbTotal.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Temporary Total */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500">Tạm tính (Giờ + F&B):</span>
                      <span className="text-sm font-black text-emerald-600">
                        {totalTableBill.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                ) : isBooked ? (
                  <div className="space-y-2 py-2">
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-1">
                      <div className="font-bold text-blue-900">{table.bookedInfo?.customerName}</div>
                      <div className="text-blue-700">{table.bookedInfo?.phone}</div>
                      <div className="text-blue-600 font-medium pt-1 border-t border-blue-200">
                        Lịch đến: {table.bookedInfo?.time}
                      </div>
                    </div>
                    <Text className="!text-[11px] !text-slate-500 block text-center">
                      Khách đã đến quán? Bấm Mở bàn để đón khách.
                    </Text>
                  </div>
                ) : (
                  <div className="py-6 text-center space-y-2">
                    <span className="inline-block p-3 rounded-2xl bg-slate-100 text-slate-400">
                      <AppstoreOutlined className="text-2xl" />
                    </span>
                    <Text className="!text-xs !text-slate-500 block">
                      Đơn giá: {table.pricePerHour.toLocaleString("vi-VN")}đ/giờ
                    </Text>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                {isAvailable || isBooked ? (
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
                    className="!w-full !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs !h-9"
                  >
                    Mở Bàn Bắt Đầu Chơi
                  </Button>
                ) : isPlaying || isPaused ? (
                  <>
                    {/* Pause/Resume button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePause(table)}
                      leftIcon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                      className={`!flex-1 !rounded-xl !text-xs !h-8 ${
                        isPaused
                          ? "!bg-amber-100 !border-amber-400 !text-amber-900"
                          : "!border-slate-300 !text-slate-700"
                      }`}
                    >
                      {isPaused ? "Tiếp tục" : "Tạm dừng"}
                    </Button>

                    {/* Order F&B button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenFnbModal(table)}
                      leftIcon={<CoffeeOutlined />}
                      className="!flex-1 !rounded-xl !text-xs !h-8 !border-emerald-300 !bg-emerald-50/60 !text-emerald-800"
                    >
                      Gọi món ({table.currentSession?.orders.length || 0})
                    </Button>

                    {/* Transfer/Merge button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTable(table);
                        setTransferModalVisible(true);
                      }}
                      leftIcon={<SwapOutlined />}
                      className="!rounded-xl !text-xs !h-8 !px-2.5 !border-slate-300 !text-slate-700"
                      title="Đổi hoặc gộp bàn"
                    />

                    {/* Checkout Button */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenCheckout(table)}
                      leftIcon={<DollarOutlined />}
                      className="!w-full !rounded-xl !bg-emerald-700 hover:!bg-emerald-800 !border-emerald-700 font-bold !text-xs !h-9 mt-1 text-white shadow-xs"
                    >
                      Thanh Toán & In Bill ({totalTableBill.toLocaleString("vi-VN")}đ)
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="!w-full !rounded-xl !text-xs !h-8 !text-slate-400"
                  >
                    Bàn đang bảo trì
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL 1: MỞ BÀN TÍNH GIỜ (Open Table & Start Session) ────────────── */}
      <Modal
        open={openModalVisible}
        onCancel={() => setOpenModalVisible(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2">
            <PlayCircleOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Mở Bàn & Bắt Đầu Phiên Chơi ({selectedTable?.name})
            </span>
          </div>
        }
      >
        <div className="py-3 space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="flex justify-between">
              <span>Loại bàn:</span>
              <strong className="font-bold">{selectedTable?.typeName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Đơn giá giờ chơi:</span>
              <strong className="font-bold text-emerald-700">
                {selectedTable?.pricePerHour.toLocaleString("vi-VN")}đ / giờ
              </strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Họ tên khách hàng / Hội viên:
            </label>
            <Input
              placeholder="Nhập tên khách hoặc quẹt thẻ hội viên..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              prefix={<UserOutlined className="text-slate-400" />}
              className="!h-10 !rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số điện thoại khách (tùy chọn):
            </label>
            <Input
              placeholder="0912 345 678"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="!h-10 !rounded-xl"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Áp dụng quyền lợi Hội viên</span>
              <span className="text-[11px] text-slate-500">Tích điểm ELO và giảm 10% tổng hóa đơn</span>
            </div>
            <input
              type="checkbox"
              checked={isMember}
              onChange={(e) => setIsMember(e.target.checked)}
              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ghi chú phiên chơi:
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
              onClick={() => setOpenModalVisible(false)}
              className="!rounded-xl"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenTable}
              leftIcon={<PlayCircleOutlined />}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              Bật Bàn & Tính Giờ
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
          <div className="flex items-center gap-2">
            <SwapOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Chuyển Bàn hoặc Gộp Bàn ({selectedTable?.name})
            </span>
          </div>
        }
      >
        <div className="py-3 space-y-4">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTransferAction("transfer")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                transferAction === "transfer"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Chuyển sang bàn mới (Đổi bàn)
            </button>
            <button
              type="button"
              onClick={() => setTransferAction("merge")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                transferAction === "merge"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Gộp hóa đơn vào bàn khác
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chọn bàn đích tiếp nhận:
            </label>
            <Select
              placeholder="-- Chọn bàn đích --"
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
                  label: `${t.name} (${t.typeName}) - Trạng thái: ${
                    t.status === "available" ? "Trống" : "Đang chơi"
                  }`,
                }))}
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            {transferAction === "transfer" ? (
              <p className="mb-0">
                Khi đổi bàn, toàn bộ số phút đã chơi và các món F&B đã gọi của <strong>{selectedTable?.name}</strong> sẽ được chuyển sang bàn đích. Bàn hiện tại sẽ trở về trạng thái Trống.
              </p>
            ) : (
              <p className="mb-0">
                Khi gộp bàn, danh sách món F&B của <strong>{selectedTable?.name}</strong> sẽ được dồn vào bàn đích. Bàn hiện tại sẽ đóng phiên và trở về trạng thái Trống.
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
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              Xác Nhận Thao Tác
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 3: GỌI MÓN F&B TẠI BÀN (Manage F&B Order) ─────────────────── */}
      <Modal
        open={fnbModalVisible}
        onCancel={() => setFnbModalVisible(false)}
        footer={null}
        width={780}
        title={
          <div className="flex items-center justify-between pr-4">
            <div className="flex items-center gap-2">
              <CoffeeOutlined className="text-emerald-600 text-lg" />
              <span className="font-bold text-slate-900 text-base">
                Gọi Món F&B Tại Bàn: {selectedTable?.name}
              </span>
            </div>
            <Tag color="green" className="!font-bold">
              {currentOrderList.reduce((acc, cur) => acc + cur.quantity, 0)} món đã chọn
            </Tag>
          </div>
        }
      >
        <div className="py-2 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Cột Trái (7 cols): Danh Mục Món & Tồn Kho */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Thực đơn & Tồn kho:</span>
              <Select
                value={fnbCategory}
                onChange={(val) => setFnbCategory(val)}
                className="!w-36 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả món" },
                  { value: "coffee", label: "Cà phê" },
                  { value: "tea", label: "Trà" },
                  { value: "beer", label: "Bia" },
                  { value: "food", label: "Món ăn" },
                  { value: "snack", label: "Ăn vặt" },
                  { value: "equipment", label: "Phụ kiện" },
                ]}
              />
            </div>

            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
              {fnbStock
                .filter((item) => fnbCategory === "all" || item.category === fnbCategory)
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{item.name}</span>
                        {item.stockQuantity <= 0 ? (
                          <Tag color="error" className="!text-[9px] !px-1.5 !py-0 !border-0">HẾT HÀNG</Tag>
                        ) : item.stockQuantity < 10 ? (
                          <Tag color="warning" className="!text-[9px] !px-1.5 !py-0 !border-0">CÒN {item.stockQuantity}</Tag>
                        ) : (
                          <Tag color="default" className="!text-[9px] !px-1.5 !py-0 !border-0 !bg-slate-100">Kho: {item.stockQuantity}</Tag>
                        )}
                      </div>
                      <span className="text-xs font-bold text-emerald-600 block mt-0.5">
                        {item.price.toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={item.stockQuantity <= 0}
                      onClick={() => handleAddFnbItem(item)}
                      leftIcon={<PlusOutlined />}
                      className="!text-xs !h-8 !px-2.5 !rounded-xl !border-emerald-300 !text-emerald-800 hover:!bg-emerald-50"
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
                <span className="text-xs font-bold text-slate-800">Món của bàn này:</span>
                <span className="text-xs font-mono text-slate-500">
                  {currentOrderList.length} loại
                </span>
              </div>

              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                {currentOrderList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Chưa có món nào được gọi. Hãy bấm &quot;Thêm&quot; bên trái.
                  </div>
                ) : (
                  currentOrderList.map((order) => (
                    <div
                      key={order.id}
                      className="p-2 rounded-xl bg-white border border-slate-200/80 text-xs flex items-center justify-between"
                    >
                      <div className="pr-2 max-w-[130px]">
                        <span className="font-semibold text-slate-800 block truncate">{order.name}</span>
                        <span className="text-[11px] text-emerald-600 font-bold">
                          {(order.price * order.quantity).toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderItemQty(order.id, -1)}
                          className="h-6 w-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="font-bold text-xs w-4 text-center">{order.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderItemQty(order.id, 1)}
                          className="h-6 w-6 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold"
                        >
                          +
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
                <span className="text-slate-600">Tổng tiền F&B:</span>
                <span className="text-base text-emerald-700 font-black">
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
                className="!w-full !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold text-xs !h-9 shadow-xs"
              >
                Xác Nhận & Chuyển Quầy Pha Chế
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
          <div className="flex items-center gap-2">
            <DollarOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              Thanh Toán & Chốt Hóa Đơn ({selectedTable?.name})
            </span>
          </div>
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
                <strong className="text-slate-900">
                  {calculatePlayingDetails(selectedTable).cost.toLocaleString("vi-VN")}đ
                </strong>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Tiền F&B ({selectedTable.currentSession.orders.length} món):</span>
                <strong className="text-slate-900">
                  {selectedTable.currentSession.orders
                    .reduce((acc, cur) => acc + cur.price * cur.quantity, 0)
                    .toLocaleString("vi-VN")}
                  đ
                </strong>
              </div>

              {/* Discount selection */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600">Chiết khấu / Giảm giá:</span>
                <div className="flex items-center gap-2">
                  <Select
                    value={discountPercent}
                    onChange={(val) => setDiscountPercent(val)}
                    className="!w-32 !rounded-xl !text-xs"
                    options={[
                      { value: 0, label: "0% (Không)" },
                      { value: 5, label: "5% (Ưu đãi)" },
                      { value: 10, label: "10% (Hội viên VIP)" },
                      { value: 20, label: "20% (Giờ Vàng)" },
                    ]}
                  />
                </div>
              </div>

              {/* Final Amount */}
              <div className="flex justify-between items-center pt-2 border-t-2 border-slate-200 font-bold text-sm text-slate-900">
                <span>TỔNG CỘNG PHẢI THU:</span>
                <span className="text-lg font-black text-emerald-700">
                  {Math.max(
                    0,
                    Math.round(
                      (calculatePlayingDetails(selectedTable).cost +
                        selectedTable.currentSession.orders.reduce(
                          (acc, cur) => acc + cur.price * cur.quantity,
                          0
                        )) *
                        (1 - discountPercent / 100)
                    )
                  ).toLocaleString("vi-VN")}
                  đ
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Phương thức thanh toán:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("vnpay")}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === "vnpay"
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <QrcodeOutlined className="text-base text-emerald-600" />
                  <span className="font-bold text-[11px]">VNPay QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === "cash"
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <DollarOutlined className="text-base text-amber-600" />
                  <span className="font-bold text-[11px]">Tiền Mặt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === "card"
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <SafetyCertificateOutlined className="text-base text-blue-600" />
                  <span className="font-bold text-[11px]">Quẹt Thẻ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("member_balance")}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === "member_balance"
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <UserOutlined className="text-base text-purple-600" />
                  <span className="font-bold text-[11px]">Ví Hội Viên</span>
                </button>
              </div>
            </div>

            {/* VNPay Mock Display */}
            {paymentMethod === "vnpay" && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-3">
                <div className="h-16 w-16 bg-white rounded-xl p-1 shadow-xs border border-emerald-200 flex items-center justify-center">
                  <QrcodeOutlined className="text-4xl text-slate-800" />
                </div>
                <div>
                  <span className="font-bold text-xs text-emerald-950 block">Mã QR VNPay Động</span>
                  <span className="text-[11px] text-emerald-800 block">
                    Khách mở App Ngân Hàng hoặc Ví VNPay quét để thanh toán tự động xác nhận sau 2s.
                  </span>
                </div>
              </div>
            )}

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
                leftIcon={<PrinterOutlined />}
                className="!bg-emerald-700 hover:!bg-emerald-800 !border-emerald-700 !rounded-xl font-bold px-4"
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
            <span className="font-bold text-slate-900 text-sm">Phiếu Hóa Đơn Bán Lẻ</span>
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
              In Phiếu (Print)
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
                <span>Bàn thi đấu:</span>
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
              <div className="flex justify-between">
                <span>Đơn giá giờ:</span>
                <span>{paidSummary.pricePerHour.toLocaleString("vi-VN")}đ/h</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-slate-100">
                <span>Tiền giờ chơi:</span>
                <span>{paidSummary.playingCost.toLocaleString("vi-VN")}đ</span>
              </div>
            </div>

            {paidSummary.orders && paidSummary.orders.length > 0 && (
              <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
                <span className="font-bold block mb-1">MÓN F&B ĐÃ DÙNG:</span>
                {paidSummary.orders.map((item: PosOrderItem, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{(item.price * item.quantity).toLocaleString("vi-VN")}đ</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1 border-t border-slate-100">
                  <span>Tổng F&B:</span>
                  <span>{paidSummary.fnbTotal.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t-2 border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Tổng tiền hàng:</span>
                <span>{paidSummary.subtotal.toLocaleString("vi-VN")}đ</span>
              </div>
              {paidSummary.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Giảm giá ({paidSummary.discountPercent}%):</span>
                  <span>-{paidSummary.discountAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200 text-slate-900">
                <span>THANH TOÁN:</span>
                <span className="text-emerald-700">{paidSummary.finalAmount.toLocaleString("vi-VN")}đ</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Hình thức:</span>
                <span className="uppercase">{paidSummary.paymentMethod}</span>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-slate-200 text-[10px] text-slate-400">
              Cảm ơn quý cơ thủ đã thi đấu tại CueZone!
              <br />
              Hẹn gặp lại quý khách!
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PosTableFloorPage;
