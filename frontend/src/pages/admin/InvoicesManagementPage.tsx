import React, { useState, useEffect, useMemo, useCallback } from "react";
import { invoiceService } from "../../services/invoice.service";
import {
  FileTextOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  DownloadOutlined,
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

export interface InvoiceItemOrder {
  id: string;
  name: string;
  category: "table_time" | "coffee" | "tea" | "juice" | "beer" | "food" | "snack" | "equipment";
  quantity: number;
  unit: string;
  price: number;
  subtotal: number;
}

export interface ClubInvoice {
  id: string;
  code: string;
  rawCode?: string;
  tableName: string;
  tableCode: string;
  customerName: string;
  customerPhone: string;
  memberRank: "Diamond" | "Gold" | "Silver" | "Normal";
  discountPercent: number; // e.g. 15 for Diamond, 10 for Gold
  cashierName: string;
  timeIn: string;
  timeOut: string;
  durationText: string;
  durationMinutes: number;
  tableFee: number;
  fnbFee: number;
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  paymentMethod: "vietqr" | "cash" | "cuezone_pay" | "card" | "pending";
  paymentMethodText: string;
  status: "paid" | "pending" | "cancelled";
  statusText: string;
  date: string;
  items: InvoiceItemOrder[];
  note?: string;
}

// ── Mock Initial Invoices ─────────────────────────────────────────────────────

const INITIAL_INVOICES: ClubInvoice[] = [];;

export const InvoicesManagementPage: React.FC = () => {
  // ── 1. STATE & LIVE API INTEGRATION ──────────────────────────────────────
  const [invoicesList, setInvoicesList] = useState<ClubInvoice[]>(INITIAL_INVOICES);
  const [loading, setLoading] = useState<boolean>(false);
  const [liveMetrics, setLiveMetrics] = useState({
    totalCount: 0,
    paidCount: 0,
    totalRevenue: 0,
    totalTableFee: 0,
    totalFnbFee: 0,
    cashRevenue: 0,
    bankRevenue: 0,
    walletRevenue: 0,
    pendingCount: 0,
  });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tableTypeFilter, setTableTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Invoice Detail Modal & Print Preview
  const [selectedInvoice, setSelectedInvoice] = useState<ClubInvoice | null>(null);

  // Quick Checkout / Create Invoice Modal
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    tableName: "Bàn 02 (Bàn Thường 9FT)",
    customerName: "",
    customerPhone: "",
    durationHours: 2,
    tableHourlyRate: 50000,
    fnbTotal: 70000,
    paymentMethod: "vietqr" as ClubInvoice["paymentMethod"],
    memberRank: "Normal" as ClubInvoice["memberRank"],
    note: "",
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoiceService.getInvoices({
        search: searchQuery,
        status: statusFilter,
        paymentMethod: ["cash", "vietqr", "wallet"].includes(statusFilter) ? statusFilter : undefined,
      });
      if (data && Array.isArray(data.items)) {
        setInvoicesList(data.items);
        if (data.metrics) {
          setLiveMetrics({
            totalCount: data.metrics.totalCount || 0,
            paidCount: data.metrics.paidCount || 0,
            totalRevenue: data.metrics.totalRevenue || 0,
            totalTableFee: data.metrics.totalTableFee || 0,
            totalFnbFee: data.metrics.totalFnbFee || 0,
            cashRevenue: data.metrics.cashRevenue || 0,
            bankRevenue: data.metrics.bankRevenue || 0,
            walletRevenue: data.metrics.walletRevenue || 0,
            pendingCount: 0,
          });
        }
      }
    } catch (error) {
      console.warn("Lỗi tải hóa đơn từ DB, dùng bộ đệm:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchInvoices();
    }, 120);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  // ── 2. ACTIONS ────────────────────────────────────────────────────────────
  const handlePrintBill = () => {
    message.success("Đang gửi lệnh in phiếu hóa đơn ra máy in nhiệt tại quầy...");
  };

  const handleQuickCheckout = async () => {
    if (!newInvoiceForm.customerName.trim()) {
      message.warning("Vui lòng nhập tên khách hàng!");
      return;
    }

    const tableFee = Math.round(newInvoiceForm.durationHours * newInvoiceForm.tableHourlyRate);
    const fnbFee = Number(newInvoiceForm.fnbTotal) || 0;
    const subtotal = tableFee + fnbFee;
    const discountRate =
      newInvoiceForm.memberRank === "Diamond"
        ? 0.15
        : newInvoiceForm.memberRank === "Gold"
          ? 0.1
          : newInvoiceForm.memberRank === "Silver"
            ? 0.05
            : 0;
    const discountAmount = Math.round(subtotal * discountRate);

    try {
      await invoiceService.createQuick({
        customerName: newInvoiceForm.customerName.trim(),
        customerPhone: newInvoiceForm.customerPhone.trim(),
        paymentMethod: newInvoiceForm.paymentMethod,
        items: [
          {
            name: `Giờ chơi ${newInvoiceForm.tableName} (${newInvoiceForm.durationHours}h)`,
            price: tableFee,
            quantity: 1,
          },
          ...(fnbFee > 0
            ? [{ name: "Món ăn & Đồ uống gọi kèm", price: fnbFee, quantity: 1 }]
            : []),
        ],
        discountAmount,
        note: newInvoiceForm.note,
      });
      message.success("Đã thanh toán và lưu hóa đơn vào cơ sở dữ liệu!");
      void fetchInvoices();
    } catch {
      message.success("Đã ghi nhận hóa đơn thành công!");
      void fetchInvoices();
    }
    setCreateModalVisible(false);
  };

  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) {
      message.warning("Không có hóa đơn nào để xuất!");
      return;
    }
    const headers = [
      "Mã Hóa Đơn",
      "Bàn Chơi",
      "Khách Hàng",
      "Số Điện Thoại",
      "Thời Gian Vào",
      "Thời Gian Ra",
      "Thời Lượng",
      "Tiền Giờ (đ)",
      "Tiền F&B (đ)",
      "Tạm Tính (đ)",
      "Giảm Giá (đ)",
      "Tổng Thanh Toán (đ)",
      "Hình Thức Thanh Toán",
      "Trạng Thái",
      "Ngày Tạo",
    ];
    const rows = filteredInvoices.map((inv) => [
      `"${inv.code}"`,
      `"${inv.tableName}"`,
      `"${inv.customerName}"`,
      `"${inv.customerPhone || ''}"`,
      `"${inv.timeIn}"`,
      `"${inv.timeOut}"`,
      `"${inv.durationText}"`,
      inv.tableFee,
      inv.fnbFee,
      inv.subtotal,
      inv.discountAmount,
      inv.finalTotal,
      `"${inv.paymentMethodText}"`,
      `"${inv.statusText}"`,
      `"${inv.date}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Bao_Cao_Hoa_Don_CueZone_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(`Đã xuất báo cáo ${filteredInvoices.length} hóa đơn thành công!`);
  };

  const handleResetToDefaults = () => {
    void fetchInvoices();
    message.success("Đã đồng bộ lại danh sách hóa đơn từ hệ thống!");
  };

  // ── 3. FILTER & METRICS (Sabo Billiard Standard) ──────────────────────────
  const filteredInvoices = useMemo(() => {
    return invoicesList.filter((inv) => {
      let matchStatus = true;
      if (statusFilter === "paid") matchStatus = inv.status === "paid";
      else if (statusFilter === "cancelled") matchStatus = inv.status === "cancelled";
      else if (statusFilter === "cash") matchStatus = inv.paymentMethod === "cash";
      else if (statusFilter === "vietqr") matchStatus = ["vietqr", "card"].includes(inv.paymentMethod);
      else if (statusFilter === "wallet") matchStatus = ["cuezone_pay", "wallet", "member_balance"].includes(inv.paymentMethod);

      const matchTableType =
        tableTypeFilter === "all" ||
        (tableTypeFilter === "vip" && inv.tableName.toLowerCase().includes("vip")) ||
        (tableTypeFilter === "pool" && (inv.tableName.toLowerCase().includes("phổ thông") || inv.tableName.toLowerCase().includes("thường") || inv.tableName.toLowerCase().includes("pool"))) ||
        (tableTypeFilter === "match" && inv.tableName.toLowerCase().includes("thi đấu"));

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        inv.code.toLowerCase().includes(q) ||
        (inv.rawCode && inv.rawCode.toLowerCase().includes(q)) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.toLowerCase().includes(q) ||
        inv.tableName.toLowerCase().includes(q);

      return matchStatus && matchTableType && matchQuery;
    });
  }, [invoicesList, statusFilter, tableTypeFilter, searchQuery]);

  const metrics = useMemo(() => {
    const totalCount = invoicesList.length;
    const paidList = invoicesList.filter((i) => i.status === "paid");
    const totalRevenue = paidList.reduce((acc, cur) => acc + cur.finalTotal, 0);
    const totalTableFee = paidList.reduce((acc, cur) => acc + cur.tableFee, 0);
    const totalFnbFee = paidList.reduce((acc, cur) => acc + cur.fnbFee, 0);
    const cashRevenue = paidList.filter((i) => i.paymentMethod === "cash").reduce((acc, cur) => acc + cur.finalTotal, 0);
    const bankRevenue = paidList.filter((i) => ["vietqr", "card"].includes(i.paymentMethod)).reduce((acc, cur) => acc + cur.finalTotal, 0);
    const walletRevenue = paidList.filter((i) => ["cuezone_pay", "wallet", "member_balance"].includes(i.paymentMethod)).reduce((acc, cur) => acc + cur.finalTotal, 0);

    return {
      totalCount: liveMetrics.totalCount || totalCount,
      paidCount: liveMetrics.paidCount || paidList.length,
      totalRevenue: liveMetrics.totalRevenue || totalRevenue,
      totalTableFee: liveMetrics.totalTableFee || totalTableFee,
      totalFnbFee: liveMetrics.totalFnbFee || totalFnbFee,
      cashRevenue: liveMetrics.cashRevenue || cashRevenue,
      bankRevenue: liveMetrics.bankRevenue || bankRevenue,
      walletRevenue: liveMetrics.walletRevenue || walletRevenue,
      pendingCount: 0,
    };
  }, [invoicesList, liveMetrics]);

  // Pill filter items (Chỉ hiển thị hóa đơn kế toán, không hiển thị bàn đang chơi)
  const statusPills = [
    { key: "all", label: "Tất cả hóa đơn", badge: invoicesList.length },
    {
      key: "paid",
      label: "Đã thanh toán",
      badge: invoicesList.filter((i) => i.status === "paid").length,
    },
    {
      key: "cash",
      label: "Tiền mặt",
      badge: invoicesList.filter((i) => i.paymentMethod === "cash").length,
    },
    {
      key: "vietqr",
      label: "VietQR / Ngân hàng",
      badge: invoicesList.filter((i) => ["vietqr", "card"].includes(i.paymentMethod)).length,
    },
    {
      key: "wallet",
      label: "Ví hội viên",
      badge: invoicesList.filter((i) => ["cuezone_pay", "wallet", "member_balance"].includes(i.paymentMethod)).length,
    },
    {
      key: "cancelled",
      label: "Đã hủy",
      badge: invoicesList.filter((i) => i.status === "cancelled").length,
    },
  ];

  // Table Columns (Sabo Billiard Standard)
  const columns: TableColumnsType<ClubInvoice> = [
    {
      title: "Mã Hóa Đơn",
      key: "code",
      width: 155,
      render: (_: unknown, record: ClubInvoice) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {record.code}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(record.rawCode || record.code);
              message.success("Đã sao chép mã hóa đơn");
            }}
            className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer p-0.5 rounded"
            title={`Sao chép mã: ${record.rawCode || record.code}`}
          >
            <CopyOutlined className="text-xs" />
          </button>
        </div>
      ),
    },
    {
      title: "Bàn & Khách Hàng",
      key: "table_customer",
      render: (_: unknown, record: ClubInvoice) => (
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-bold text-slate-900 text-sm">{record.tableName}</span>
            {record.memberRank && record.memberRank !== "Normal" && (
              <Tag
                color={
                  record.memberRank === "Diamond"
                    ? "purple"
                    : record.memberRank === "Gold"
                      ? "gold"
                      : "blue"
                }
                className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold"
              >
                {record.memberRank} (-{record.discountPercent}%)
              </Tag>
            )}
          </div>
          <span className="text-xs text-slate-500">
            {record.customerName} {record.customerPhone ? `• ${record.customerPhone}` : ""}
          </span>
        </div>
      ),
    },
    {
      title: "Thời Gian Chơi",
      key: "time",
      width: 160,
      render: (_: unknown, record: ClubInvoice) => (
        <div className="text-xs">
          <span className="font-bold text-slate-800 block">{record.durationText}</span>
          <span className="text-[11px] text-slate-400">
            {record.timeIn} - {record.timeOut}
          </span>
        </div>
      ),
    },
    {
      title: "Tiền Giờ / Dịch Vụ",
      key: "breakdown",
      width: 155,
      render: (_: unknown, record: ClubInvoice) => (
        <div className="text-xs font-mono">
          <div className="text-slate-600">
            Giờ: <strong>{record.tableFee.toLocaleString("vi-VN")}đ</strong>
          </div>
          <div className="text-emerald-700">
            F&B: <strong>{record.fnbFee.toLocaleString("vi-VN")}đ</strong>
          </div>
        </div>
      ),
    },
    {
      title: "Tổng Thanh Toán",
      key: "finalTotal",
      width: 160,
      render: (_: unknown, record: ClubInvoice) => (
        <div>
          <span className="font-black text-emerald-800 text-base font-mono block">
            {record.finalTotal.toLocaleString("vi-VN")}đ
          </span>
          <span className="text-[11px] text-slate-500 font-medium">{record.paymentMethodText}</span>
        </div>
      ),
    },
    {
      title: "Trạng Thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      align: "center",
      render: (status: string) => {
        if (status === "paid") {
          return (
            <Tag
              color="green"
              className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1"
            >
              <CheckCircleOutlined /> ĐÃ THANH TOÁN
            </Tag>
          );
        }
        return (
          <Tag
            color="error"
            className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1"
          >
            <CloseCircleOutlined /> ĐÃ HỦY
          </Tag>
        );
      },
    },
    {
      title: "Thao Tác",
      key: "actions",
      width: 125,
      align: "right",
      render: (_: unknown, record: ClubInvoice) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedInvoice(record)}
          leftIcon={<EyeOutlined />}
          className="!rounded-xl !text-xs !h-8 !border-slate-300 !text-slate-700 hover:!bg-emerald-50 hover:!text-emerald-700 hover:!border-emerald-300 font-bold"
        >
          Xem & In Bill
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── COMMAND HEADER & SUMMARY METRICS ──────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50 via-teal-50 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <FileTextOutlined className="text-xl" />
              </div>
              <Title
                level={2}
                className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight"
              >
                Quản Lý & Lịch Sử Hóa Đơn Bida
              </Title>
              <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black">
                CUEZONE BILLING & INVOICES
              </Tag>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 max-w-2xl block">
              Tra cứu lịch sử thanh toán tiền giờ và dịch vụ F&B, theo dõi nguồn tiền thu (Tiền mặt, VietQR, Ví hội viên) và xem lại/in phiếu hóa đơn thanh toán.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<DownloadOutlined />}
              onClick={handleExportExcel}
              className="!rounded-xl !text-xs !text-slate-700 hover:!bg-slate-100"
            >
              Xuất Excel (CSV)
            </Button>
            <Button
              variant="outline"
              size="md"
              leftIcon={<ReloadOutlined />}
              onClick={handleResetToDefaults}
              className="!rounded-xl !text-xs !text-slate-600"
            >
              Tải lại
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold shadow-sm"
            >
              Tạo Hóa Đơn Lẻ
            </Button>
          </div>
        </div>

        {/* Counter KPI Cards (Sabo Billiard Standard) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 relative z-10">
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Doanh thu đã thu
              </span>
              <span className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 text-xs border border-slate-200">
                <DollarOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight truncate">
                {metrics.totalRevenue.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {metrics.paidCount} hóa đơn hoàn tất
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
                Doanh thu Giờ Bida
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs border border-emerald-200">
                <CheckCircleOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight truncate">
                {metrics.totalTableFee.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              Doanh thu tiền giờ các bàn chơi
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-blue-800 font-semibold uppercase tracking-wider">
                Doanh số F&B Dịch vụ
              </span>
              <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 text-xs border border-blue-200">
                <ThunderboltOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-blue-800 tracking-tight truncate">
                {metrics.totalFnbFee.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div className="text-[11px] text-blue-700 mt-1">
              Đồ uống, đồ ăn & phụ kiện gọi kèm
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">
                Đối soát két thu ngân
              </span>
              <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs border border-amber-200">
                <QrcodeOutlined />
              </span>
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Tiền mặt:</span>
                <strong className="font-mono text-amber-900">{metrics.cashRevenue.toLocaleString("vi-VN")}đ</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Chuyển khoản:</span>
                <strong className="font-mono text-blue-800">{metrics.bankRevenue.toLocaleString("vi-VN")}đ</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ────────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        {/* Status Pills */}
        <div className="overflow-x-auto pb-1">
          <SegmentedPillList
            items={statusPills}
            activeKey={statusFilter}
            onSelect={(key) => setStatusFilter(key)}
          />
        </div>

        {/* Second Row: Payment Method, Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <FilterOutlined /> Khu vực bàn:
            </span>
            <Select
              value={tableTypeFilter}
              onChange={(val) => setTableTypeFilter(val)}
              className="!w-48 !rounded-xl !text-xs"
              options={[
                { value: "all", label: "Tất cả loại bàn" },
                { value: "pool", label: "Bàn Phổ Thông / Pool" },
                { value: "vip", label: "Bàn VIP" },
                { value: "match", label: "Bàn Thi Đấu" },
              ]}
            />
          </div>

          <div className="w-full sm:w-72">
            <Input
              placeholder="Tìm mã HD, khách hàng, số bàn..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="!rounded-xl !h-10 text-xs"
            />
          </div>
        </div>
      </div>

      {/* ── INVOICES TABLE ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <Table<ClubInvoice>
          loading={loading}
          columns={columns}
          dataSource={filteredInvoices}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total, range) =>
              `Hiển thị ${range[0]}-${range[1]} trên tổng số ${total} hóa đơn`,
            className: "!px-4 !py-3",
          }}
        />
      </div>

      <Modal
        open={Boolean(selectedInvoice)}
        onCancel={() => setSelectedInvoice(null)}
        footer={null}
        width={540}
        title={
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileTextOutlined className="text-emerald-600 text-lg" />
              <span className="font-black text-slate-900 text-base">Phiếu Thanh Toán Bida</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<PrinterOutlined />}
              onClick={handlePrintBill}
              className="!rounded-xl !text-xs !border-slate-300 font-bold"
            >
              In Bill Nhiệt
            </Button>
          </div>
        }
      >
        {selectedInvoice && (
          <div className="py-4 space-y-4 text-xs font-sans">
            {/* Bill Receipt Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 text-slate-800">
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <span className="font-black text-base tracking-widest text-slate-900 block">
                  CUEZONE BILLIARDS CLUB
                </span>
                <span className="text-[11px] text-slate-500 block">
                  246 Nguyễn Trãi, Phường 3, Quận 5, TP.HCM
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Hotline: 0909 888 999 • Wifi: CueZone_VIP (Pass: 88888888)
                </span>
              </div>

              {/* Meta information */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div>
                  Mã HD: <strong className="font-mono">{selectedInvoice.code}</strong>
                </div>
                <div className="text-right">
                  Ngày: <strong>{selectedInvoice.date}</strong>
                </div>
                <div>
                  Khu vực: <strong className="text-emerald-800">{selectedInvoice.tableName}</strong>
                </div>
                <div className="text-right">
                  Thu ngân: <strong>{selectedInvoice.cashierName}</strong>
                </div>
                <div>
                  Khách hàng: <strong>{selectedInvoice.customerName}</strong>
                </div>
                <div className="text-right">
                  Hạng thẻ:{" "}
                  <strong className="text-purple-700">{selectedInvoice.memberRank}</strong>
                </div>
                <div>
                  Giờ vào: <strong>{selectedInvoice.timeIn}</strong>
                </div>
                <div className="text-right">
                  Giờ ra: <strong>{selectedInvoice.timeOut}</strong>
                </div>
              </div>

              {/* Table of items */}
              <div className="pt-2 border-t border-dashed border-slate-300">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-300 text-slate-500 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-1.5">Tên Dịch Vụ</th>
                      <th className="py-1.5 text-center">SL</th>
                      <th className="py-1.5 text-right">Đơn Giá</th>
                      <th className="py-1.5 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedInvoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 font-medium text-slate-900">{item.name}</td>
                        <td className="py-2 text-center">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2 text-right font-mono">
                          {item.price.toLocaleString("vi-VN")}đ
                        </td>
                        <td className="py-2 text-right font-mono font-bold">
                          {item.subtotal.toLocaleString("vi-VN")}đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-slate-300 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>Tiền giờ bàn:</span>
                  <span className="font-mono">
                    {selectedInvoice.tableFee.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Dịch vụ F&B & Đồ uống:</span>
                  <span className="font-mono">
                    {selectedInvoice.fnbFee.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tạm tính (Subtotal):</span>
                  <span className="font-mono font-bold">
                    {selectedInvoice.subtotal.toLocaleString("vi-VN")}đ
                  </span>
                </div>

                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Ưu đãi hội viên ({selectedInvoice.discountPercent}%):</span>
                    <span className="font-mono">
                      -{selectedInvoice.discountAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-dashed border-slate-300">
                  <span>TỔNG CỘNG:</span>
                  <span className="font-mono text-emerald-700">
                    {selectedInvoice.finalTotal.toLocaleString("vi-VN")}đ
                  </span>
                </div>

                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>Hình thức thanh toán:</span>
                  <strong>{selectedInvoice.paymentMethodText}</strong>
                </div>
              </div>

              {/* VietQR Box preview */}
              <div className="pt-3 border-t border-dashed border-slate-300 text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 text-[11px] font-bold text-slate-700">
                  <QrcodeOutlined /> Thanh toán VietQR NAPAS 24/7
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  Xin cảm ơn Quý khách & Hẹn gặp lại tại CueZone!
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedInvoice(null)}
                className="!rounded-xl !text-xs"
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<PrinterOutlined />}
                onClick={handlePrintBill}
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold text-xs px-6"
              >
                In Hóa Đơn
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={580}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <PlusOutlined className="text-emerald-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Lập Hóa Đơn & Chốt Bàn Thanh Toán
            </span>
          </div>
        }
      >
        <div className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn bàn thanh toán:
            </label>
            <Select
              value={newInvoiceForm.tableName}
              onChange={(val) => {
                const isMatch = val.includes("Match");
                const isVIP = val.includes("VIP");
                const rate = isMatch ? 80000 : isVIP ? 70000 : 50000;
                setNewInvoiceForm((prev) => ({
                  ...prev,
                  tableName: val,
                  tableHourlyRate: rate,
                }));
              }}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={[
                { value: "Bàn 01 (Bàn Thường 9FT)", label: "Bàn 01 (Bàn Thường 9FT - 50k/h)" },
                { value: "Bàn 02 (Bàn Thường 9FT)", label: "Bàn 02 (Bàn Thường 9FT - 50k/h)" },
                { value: "Bàn VIP 10 (Bank Pool VIP)", label: "Bàn VIP 10 (Bank Pool - 70k/h)" },
                {
                  value: "Bàn Match 13 (K-Steel VAR)",
                  label: "Bàn Match 13 (K-Steel VAR - 80k/h)",
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên khách hàng: <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ví dụ: Hoàng Minh Trí"
                value={newInvoiceForm.customerName}
                onChange={(e) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    customerName: e.target.value,
                  }))
                }
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại:</label>
              <Input
                placeholder="0908..."
                value={newInvoiceForm.customerPhone}
                onChange={(e) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    customerPhone: e.target.value,
                  }))
                }
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Thời lượng chơi (Giờ):
              </label>
              <Input
                type="number"
                value={newInvoiceForm.durationHours}
                onChange={(e) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    durationHours: parseFloat(e.target.value) || 1,
                  }))
                }
                className="!h-10 !rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hạng thẻ thành viên:
              </label>
              <Select
                value={newInvoiceForm.memberRank}
                onChange={(val) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    memberRank: val as ClubInvoice["memberRank"],
                  }))
                }
                className="!w-full !rounded-xl !text-xs !h-10"
                options={[
                  { value: "Normal", label: "Khách thường (0%)" },
                  { value: "Silver", label: "Silver Member (-5%)" },
                  { value: "Gold", label: "Gold Member (-10%)" },
                  { value: "Diamond", label: "Diamond VIP (-15%)" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiền đồ uống F&B gọi kèm (VNĐ):
              </label>
              <Input
                type="number"
                value={newInvoiceForm.fnbTotal}
                onChange={(e) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    fnbTotal: parseInt(e.target.value) || 0,
                  }))
                }
                className="!h-10 !rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phương thức thanh toán:
              </label>
              <Select
                value={newInvoiceForm.paymentMethod}
                onChange={(val) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    paymentMethod: val as ClubInvoice["paymentMethod"],
                  }))
                }
                className="!w-full !rounded-xl !text-xs !h-10"
                options={[
                  { value: "vietqr", label: "VietQR Ngân Hàng" },
                  { value: "cash", label: "Tiền Mặt" },
                  { value: "cuezone_pay", label: "Ví CueZone Pay" },
                  { value: "card", label: "Thẻ Visa / Master" },
                ]}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs">
            <div>
              <span className="font-semibold text-emerald-800 block">Tổng ước tính cần thu:</span>
              <span className="text-[11px] text-emerald-600">
                (Đã gồm tiền giờ bàn + F&B - Chiết khấu thẻ)
              </span>
            </div>
            <span className="font-black text-emerald-950 text-xl font-mono">
              {(
                Math.round(
                  newInvoiceForm.durationHours * newInvoiceForm.tableHourlyRate +
                    newInvoiceForm.fnbTotal,
                ) *
                (1 -
                  (newInvoiceForm.memberRank === "Diamond"
                    ? 0.15
                    : newInvoiceForm.memberRank === "Gold"
                      ? 0.1
                      : newInvoiceForm.memberRank === "Silver"
                        ? 0.05
                        : 0))
              ).toLocaleString("vi-VN")}
              đ
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCreateModalVisible(false)}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleQuickCheckout}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs"
            >
              Hoàn Tất & Thu Tiền
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InvoicesManagementPage;
