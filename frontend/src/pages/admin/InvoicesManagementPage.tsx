import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { Dayjs } from "dayjs";
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
  ReloadOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  DownloadOutlined,
  CalendarOutlined,
  SortAscendingOutlined,
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
  DatePicker,
  type TableColumnsType,
} from "../../shared/ui";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InvoiceItemOrder {
  id: string;
  name: string;
  category: string;
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
  memberRank: string;
  discountPercent: number;
  voucherCode?: string;
  voucherDiscountAmount?: number;
  membershipDiscountAmount?: number;
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
  paymentMethod: string;
  paymentMethodText: string;
  status: "paid" | "pending" | "cancelled";
  statusText: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  cancellerName?: string;
  date: string;
  createdAt?: string;
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

  // Date Filter & Sorting States
  type DateFilterPreset = "all" | "today" | "yesterday" | "7days" | "this_month" | "custom";
  type SortByOption = "newest" | "oldest" | "amount_desc" | "amount_asc" | "duration_desc";

  const [datePreset, setDatePreset] = useState<DateFilterPreset>("all");
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);
  const [customDayjsRange, setCustomDayjsRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [sortBy, setSortBy] = useState<SortByOption>("newest");

  // Helper kiểm tra ngày theo preset
  const isWithinDatePreset = (
    createdAtStr?: string,
    dateStr?: string,
    preset?: DateFilterPreset,
    range?: [string, string] | null,
  ): boolean => {
    if (!preset || preset === "all") return true;

    let date: Date | null = null;
    if (createdAtStr) {
      const d = new Date(createdAtStr);
      if (!isNaN(d.getTime())) date = d;
    }
    if (!date && dateStr) {
      const parts = dateStr.split(",")[0]?.split(" ")[0]?.split("/");
      if (parts && parts.length === 3) {
        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        if (!isNaN(d.getTime())) date = d;
      }
    }
    if (!date) return true;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (preset === "today") {
      return date >= startOfToday && date <= endOfToday;
    }
    if (preset === "yesterday") {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const endOfYesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
        23,
        59,
        59,
        999,
      );
      return date >= startOfYesterday && date <= endOfYesterday;
    }
    if (preset === "7days") {
      const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      return date >= startOf7Days && date <= endOfToday;
    }
    if (preset === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfMonth && date <= endOfToday;
    }
    if (preset === "custom" && range && range[0] && range[1]) {
      const start = new Date(range[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(range[1]);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return true;
  };

  // Invoice Detail Modal & Print Preview
  const [selectedInvoice, setSelectedInvoice] = useState<ClubInvoice | null>(null);

  // Cancel Invoice Modal & States
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [cancellingInvoice, setCancellingInvoice] = useState<ClubInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  const handleOpenCancelModal = (inv: ClubInvoice) => {
    setCancellingInvoice(inv);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingInvoice) return;
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      message.warning("Vui lòng nhập hoặc chọn lý do hủy hóa đơn");
      return;
    }
    setCancelLoading(true);
    try {
      await invoiceService.cancelInvoice(cancellingInvoice.id, trimmedReason);
      message.success(`Đã hủy hóa đơn ${cancellingInvoice.code} thành công`);
      setCancelModalOpen(false);
      setCancellingInvoice(null);
      setCancelReason("");
      if (selectedInvoice && selectedInvoice.id === cancellingInvoice.id) {
        setSelectedInvoice({
          ...selectedInvoice,
          status: "cancelled",
          statusText: "Đã Hủy",
          cancelReason: trimmedReason,
          cancelledAt: new Date().toISOString(),
        });
      }
      await fetchInvoices();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Không thể hủy hóa đơn";
      message.error(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoiceService.getInvoices({
        search: searchQuery.trim() || undefined,
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
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchInvoices();
    }, 120);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  // ── 2. ACTIONS ────────────────────────────────────────────────────────────
  // Lệnh in hóa đơn nhiệt khổ 80mm chuẩn máy in POS quầy thu ngân
  const handlePrintBill = () => {
    if (!selectedInvoice) return;
    const printWindow = window.open("", "_blank", "width=420,height=650");
    if (!printWindow) {
      window.print();
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hóa đơn ${selectedInvoice.code} - CueZone</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 2mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, sans-serif;
              width: 74mm;
              margin: 0 auto;
              padding: 4px;
              color: #000;
              font-size: 11px;
              line-height: 1.35;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .title { font-size: 14px; font-weight: 900; letter-spacing: 0.5px; }
            .dashed { border-top: 1px dashed #555; margin: 6px 0; }
            .double-dashed { border-top: 2px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 10.5px; }
            th { border-bottom: 1px dashed #666; padding: 3px 0; text-align: left; }
            td { padding: 3px 0; }
            .total-row { font-size: 13px; font-weight: 900; margin-top: 4px; }
            .footer { font-size: 9.5px; color: #444; margin-top: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="title">CUEZONE BILLIARDS CLUB</div>
            <div>246 Nguyễn Trãi, P.3, Q.5, TP.HCM</div>
            <div>Hotline: 0909 888 999</div>
          </div>
          <div class="double-dashed"></div>
          <div class="text-center bold" style="font-size: 13px;">PHIẾU THANH TOÁN</div>
          <div class="text-center" style="font-size: 10px;">(In nhiệt chuẩn khổ 80mm)</div>
          ${
            selectedInvoice.status === "cancelled"
              ? `<div class="text-center bold" style="color: red; font-size: 13px; margin-top: 4px; border: 1px solid red; padding: 2px;">*** HÓA ĐƠN ĐÃ HỦY ***<br/><span style="font-size: 9.5px; font-weight: normal; color: #000;">Lý do: ${selectedInvoice.cancelReason || "Hủy bỏ"}</span></div>`
              : ""
          }
          <div class="dashed"></div>
          <div class="row"><span>Mã HĐ:</span><span class="bold">${selectedInvoice.code}</span></div>
          <div class="row"><span>Bàn:</span><span class="bold">${selectedInvoice.tableName}</span></div>
          <div class="row"><span>Khách hàng:</span><span>${selectedInvoice.customerName}</span></div>
          <div class="row"><span>Thu ngân:</span><span>${selectedInvoice.cashierName}</span></div>
          <div class="row"><span>Thời gian:</span><span>${selectedInvoice.timeIn} - ${selectedInvoice.timeOut}</span></div>
          <div class="row"><span>Thời lượng:</span><span class="bold">${selectedInvoice.durationText}</span></div>
          <div class="row"><span>Ngày lập:</span><span>${selectedInvoice.date}</span></div>
          <div class="dashed"></div>
          <table>
            <thead>
              <tr>
                <th style="width: 45%;">Tên món / DV</th>
                <th style="width: 15%; text-align: center;">SL</th>
                <th style="width: 40%; text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${selectedInvoice.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">${item.subtotal.toLocaleString("vi-VN")}đ</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <div class="dashed"></div>
          <div class="row"><span>Tiền giờ bàn:</span><span>${selectedInvoice.tableFee.toLocaleString("vi-VN")}đ</span></div>
          <div class="row"><span>Đồ uống & Dịch vụ:</span><span>${selectedInvoice.fnbFee.toLocaleString("vi-VN")}đ</span></div>
          <div class="row"><span>Tạm tính:</span><span>${selectedInvoice.subtotal.toLocaleString("vi-VN")}đ</span></div>
          ${
            selectedInvoice.voucherDiscountAmount && selectedInvoice.voucherDiscountAmount > 0
              ? `<div class="row bold"><span>Voucher ${selectedInvoice.voucherCode ? `(${selectedInvoice.voucherCode})` : ""}:</span><span>-${selectedInvoice.voucherDiscountAmount.toLocaleString("vi-VN")}đ</span></div>`
              : ""
          }
          ${
            selectedInvoice.membershipDiscountAmount && selectedInvoice.membershipDiscountAmount > 0
              ? `<div class="row bold"><span>Ưu đãi hội viên (${selectedInvoice.discountPercent || 10}%):</span><span>-${selectedInvoice.membershipDiscountAmount.toLocaleString("vi-VN")}đ</span></div>`
              : selectedInvoice.discountAmount > 0 && !selectedInvoice.voucherDiscountAmount
                ? `<div class="row bold"><span>Giảm giá:</span><span>-${selectedInvoice.discountAmount.toLocaleString("vi-VN")}đ</span></div>`
                : ""
          }
          <div class="double-dashed"></div>
          <div class="row total-row">
            <span>TỔNG CỘNG:</span>
            <span>${selectedInvoice.finalTotal.toLocaleString("vi-VN")}đ</span>
          </div>
          <div class="row" style="font-size: 10px; margin-top: 4px;">
            <span>Thanh toán:</span>
            <span class="bold">${selectedInvoice.paymentMethodText}</span>
          </div>
          <div class="double-dashed"></div>
          <div class="footer">
            <div>*** CẢM ƠN QUÝ KHÁCH ***</div>
            <div>Wifi: CueZone_VIP (Pass: 88888888)</div>
            <div>Hẹn gặp lại quý khách lần sau!</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleExportExcel = () => {
    if (sortedInvoices.length === 0) {
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
    const rows = sortedInvoices.map((inv) => [
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
    message.success(`Đã xuất báo cáo ${sortedInvoices.length} hóa đơn thành công!`);
  };

  const handleResetToDefaults = () => {
    void fetchInvoices();
    message.success("Đã đồng bộ lại danh sách hóa đơn từ hệ thống!");
  };

  // ── 3. FILTER & METRICS (Sabo Billiard Standard) ──────────────────────────
  const invoicesFilteredByDate = useMemo(() => {
    return invoicesList.filter((inv) =>
      isWithinDatePreset(inv.createdAt, inv.date, datePreset, customRange),
    );
  }, [invoicesList, datePreset, customRange]);

  const filteredInvoices = useMemo(() => {
    return invoicesFilteredByDate.filter((inv) => {
      let matchStatus = true;
      const invMethod = (inv.paymentMethod || "").toLowerCase();
      if (statusFilter === "paid") {
        matchStatus = inv.status === "paid";
      } else if (statusFilter === "cancelled") {
        matchStatus = inv.status === "cancelled";
      } else if (statusFilter === "cash") {
        matchStatus =
          invMethod === "cash" ||
          invMethod === "tiền mặt" ||
          invMethod === "tien_mat" ||
          invMethod === "tien mat";
      } else if (statusFilter === "vietqr") {
        matchStatus =
          invMethod === "vietqr" ||
          invMethod === "vnpay" ||
          invMethod === "card" ||
          invMethod === "bank" ||
          invMethod === "transfer" ||
          invMethod.includes("chuyển khoản") ||
          invMethod.includes("ngân hàng");
      } else if (statusFilter === "wallet") {
        matchStatus =
          invMethod === "cuezone_pay" ||
          invMethod === "wallet" ||
          invMethod === "member_balance" ||
          invMethod.includes("ví") ||
          invMethod.includes("hội viên");
      }

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
  }, [invoicesFilteredByDate, statusFilter, tableTypeFilter, searchQuery]);

  const sortedInvoices = useMemo(() => {
    const list = [...filteredInvoices];
    if (sortBy === "amount_desc") {
      return list.sort((a, b) => b.finalTotal - a.finalTotal);
    }
    if (sortBy === "amount_asc") {
      return list.sort((a, b) => a.finalTotal - b.finalTotal);
    }
    if (sortBy === "duration_desc") {
      return list.sort((a, b) => b.durationMinutes - a.durationMinutes);
    }
    if (sortBy === "oldest") {
      return list.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });
    }
    // newest (mặc định: mới nhất trước)
    return list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [filteredInvoices, sortBy]);

  const metrics = useMemo(() => {
    const isFilteredDate = datePreset !== "all" || customRange !== null;
    const paidList = invoicesFilteredByDate.filter((i) => i.status === "paid");
    const totalCount = invoicesFilteredByDate.length;
    const totalRevenue = paidList.reduce((acc, cur) => acc + cur.finalTotal, 0);
    const totalTableFee = paidList.reduce((acc, cur) => acc + cur.tableFee, 0);
    const totalFnbFee = paidList.reduce((acc, cur) => acc + cur.fnbFee, 0);
    const cashRevenue = paidList.filter((i) => i.paymentMethod === "cash").reduce((acc, cur) => acc + cur.finalTotal, 0);
    const bankRevenue = paidList.filter((i) => ["vietqr", "card"].includes(i.paymentMethod)).reduce((acc, cur) => acc + cur.finalTotal, 0);
    const walletRevenue = paidList.filter((i) => ["cuezone_pay", "wallet", "member_balance"].includes(i.paymentMethod)).reduce((acc, cur) => acc + cur.finalTotal, 0);

    if (isFilteredDate) {
      return {
        totalCount,
        paidCount: paidList.length,
        totalRevenue,
        totalTableFee,
        totalFnbFee,
        cashRevenue,
        bankRevenue,
        walletRevenue,
        pendingCount: 0,
      };
    }

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
  }, [invoicesFilteredByDate, liveMetrics, datePreset, customRange]);

  // Pill filter items (Chỉ hiển thị hóa đơn kế toán, không hiển thị bàn đang chơi)
  const statusPills = [
    {
      key: "all",
      label: "Tất cả",
      badge: invoicesFilteredByDate.length,
      dotClassName: "bg-slate-400",
    },
    {
      key: "paid",
      label: "Đã thanh toán",
      badge: invoicesFilteredByDate.filter((i) => i.status === "paid").length,
      dotClassName: "bg-emerald-500",
    },
    {
      key: "cash",
      label: "Tiền mặt",
      badge: invoicesFilteredByDate.filter((i) => {
        const m = (i.paymentMethod || "").toLowerCase();
        return m === "cash" || m === "tiền mặt" || m === "tien_mat" || m === "tien mat";
      }).length,
      dotClassName: "bg-amber-500",
    },
    {
      key: "vietqr",
      label: "VietQR / Ngân hàng",
      badge: invoicesFilteredByDate.filter((i) => {
        const m = (i.paymentMethod || "").toLowerCase();
        return (
          m === "vietqr" ||
          m === "vnpay" ||
          m === "card" ||
          m === "bank" ||
          m === "transfer" ||
          m.includes("chuyển khoản") ||
          m.includes("ngân hàng")
        );
      }).length,
      dotClassName: "bg-blue-500",
    },
    {
      key: "wallet",
      label: "Ví hội viên",
      badge: invoicesFilteredByDate.filter((i) => {
        const m = (i.paymentMethod || "").toLowerCase();
        return (
          m === "cuezone_pay" ||
          m === "wallet" ||
          m === "member_balance" ||
          m.includes("ví") ||
          m.includes("hội viên")
        );
      }).length,
      dotClassName: "bg-purple-500",
    },
    {
      key: "cancelled",
      label: "Đã hủy",
      badge: invoicesFilteredByDate.filter((i) => i.status === "cancelled").length,
      dotClassName: "bg-rose-500",
    },
  ];

  // Table Columns (Sabo Billiard Standard)
  const columns: TableColumnsType<ClubInvoice> = [
    {
      title: "Mã Hóa Đơn",
      key: "code",
      width: 155,
      sorter: (a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      },
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
            {record.memberRank &&
              record.memberRank !== "Normal" &&
              record.memberRank !== "Standard" &&
              record.memberRank !== "Phổ thông" && (
                <Tag
                  color={
                    record.memberRank === "Diamond" || record.memberRank === "Kim Cương"
                      ? "purple"
                      : record.memberRank === "Gold" || record.memberRank === "Vàng"
                        ? "gold"
                        : "blue"
                  }
                  className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold"
                >
                  {record.memberRank}
                  {record.discountPercent > 0 ? ` (-${record.discountPercent}%)` : ""}
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
      sorter: (a, b) => a.durationMinutes - b.durationMinutes,
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
      sorter: (a, b) => a.finalTotal - b.finalTotal,
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
      width: 155,
      align: "right",
      render: (_: unknown, record: ClubInvoice) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedInvoice(record)}
            leftIcon={<EyeOutlined />}
            className="!rounded-xl !text-xs !h-8 !border-slate-300 !text-slate-700 hover:!bg-emerald-50 hover:!text-emerald-700 hover:!border-emerald-300 font-bold"
          >
            Xem & In
          </Button>
          {record.status === "paid" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenCancelModal(record)}
              className="!rounded-xl !text-xs !h-8 !border-rose-200 !text-rose-600 hover:!bg-rose-50 hover:!border-rose-400 font-bold px-2.5"
              title="Hủy hóa đơn này"
            >
              Hủy
            </Button>
          )}
        </div>
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
                Lịch Sử Hóa Đơn
              </Title>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 max-w-2xl block">
              Theo dõi lịch sử hóa đơn, doanh thu tiền giờ, dịch vụ và in lại phiếu thanh toán.
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
              Xuất Excel
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
                Doanh thu Đồ uống & Dịch vụ
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
                Két tiền mặt & Chuyển khoản
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

      {/* ── FILTER TOOLBAR (Bố cục thông minh 2 hàng chuẩn SaaS) ────────── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
        {/* Hàng 1: Tabs Trạng thái & Hình thức thanh toán (Trái) + Ô tìm kiếm (Phải) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="overflow-x-auto pb-1 max-w-full">
            <SegmentedPillList
              items={statusPills}
              activeKey={statusFilter}
              onSelect={(key) => setStatusFilter(key)}
            />
          </div>

          <div className="w-full lg:w-72 shrink-0">
            <Input
              placeholder="Tìm mã HD, khách hàng, số bàn..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="!rounded-2xl !h-10 text-xs !border-slate-200 hover:!border-emerald-500 focus:!border-emerald-500"
            />
          </div>
        </div>

        {/* Hàng 2: Bộ lọc chuyên sâu gọn trong 1 dải nền tinh tế */}
        <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Cụm trái: Bộ lọc Thời gian */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
              <CalendarOutlined className="text-emerald-600 text-sm" /> Thời gian:
            </span>
            {(
              [
                { key: "all", label: "Tất cả" },
                { key: "today", label: "Hôm nay" },
                { key: "yesterday", label: "Hôm qua" },
                { key: "7days", label: "7 ngày qua" },
                { key: "this_month", label: "Tháng này" },
                { key: "custom", label: "Tùy chọn ngày" },
              ] as { key: DateFilterPreset; label: string }[]
            ).map((item) => {
              const isActive = datePreset === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setDatePreset(item.key);
                    if (item.key !== "custom") {
                      setCustomRange(null);
                      setCustomDayjsRange(null);
                    }
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer select-none ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/90 font-medium"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {datePreset === "custom" && (
              <div className="inline-block ml-1">
                <RangePicker
                  value={customDayjsRange}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setCustomDayjsRange([dates[0], dates[1]]);
                      setCustomRange([
                        dates[0].format("YYYY-MM-DD"),
                        dates[1].format("YYYY-MM-DD"),
                      ]);
                    } else {
                      setCustomDayjsRange(null);
                      setCustomRange(null);
                    }
                  }}
                  format="DD/MM/YYYY"
                  placeholder={["Từ ngày", "Đến ngày"]}
                  className="!rounded-xl !h-8 text-xs !bg-white"
                />
              </div>
            )}
          </div>

          {/* Cụm phải: Khu vực bàn, Sắp xếp & Đặt lại */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <FilterOutlined /> Khu vực:
              </span>
              <Select
                value={tableTypeFilter}
                onChange={(val) => setTableTypeFilter(val)}
                className="!w-36 !rounded-xl !text-xs !bg-white"
                options={[
                  { value: "all", label: "Tất cả loại bàn" },
                  { value: "pool", label: "Bàn Phổ Thông" },
                  { value: "vip", label: "Bàn VIP" },
                  { value: "match", label: "Bàn Thi Đấu" },
                ]}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <SortAscendingOutlined /> Sắp xếp:
              </span>
              <Select
                value={sortBy}
                onChange={(val) => setSortBy(val as SortByOption)}
                className="!w-44 !rounded-xl !text-xs !bg-white"
                options={[
                  { value: "newest", label: "Mới nhất trước" },
                  { value: "oldest", label: "Cũ nhất trước" },
                  { value: "amount_desc", label: "Tiền cao nhất (Giảm)" },
                  { value: "amount_asc", label: "Tiền thấp nhất (Tăng)" },
                  { value: "duration_desc", label: "Thời gian chơi dài nhất" },
                ]}
              />
            </div>

            {(statusFilter !== "all" ||
              datePreset !== "all" ||
              tableTypeFilter !== "all" ||
              searchQuery.trim() !== "") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setDatePreset("all");
                  setCustomRange(null);
                  setCustomDayjsRange(null);
                  setTableTypeFilter("all");
                  setSearchQuery("");
                  setSortBy("newest");
                }}
                leftIcon={<ReloadOutlined />}
                className="!rounded-xl !text-xs !h-8 !text-slate-600 !border-slate-200 hover:!bg-white"
                title="Xóa tất cả bộ lọc về mặc định"
              >
                Đặt lại
              </Button>
            )}

            <Tag color="cyan" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold !m-0">
              {sortedInvoices.length} Hóa đơn
            </Tag>
          </div>
        </div>
      </div>

      {/* ── INVOICES TABLE ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <Table<ClubInvoice>
          loading={loading}
          columns={columns}
          dataSource={sortedInvoices}
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
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileTextOutlined className="text-emerald-600 text-lg" />
            <span className="font-black text-slate-900 text-base">Phiếu Thanh Toán Bida</span>
          </div>
        }
      >
        {selectedInvoice && (
          <div className="py-4 space-y-4 text-xs font-sans">
            {/* Banner nếu hóa đơn đã bị hủy */}
            {selectedInvoice.status === "cancelled" && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sm text-rose-700">
                  <CloseCircleOutlined className="text-base" /> HÓA ĐƠN NÀY ĐÃ ĐƯỢC HỦY
                </div>
                <div className="text-xs">
                  <strong>Lý do hủy:</strong> {selectedInvoice.cancelReason || "Không có lý do cụ thể"}
                </div>
                {selectedInvoice.cancelledAt && (
                  <div className="text-[11px] text-rose-600">
                    Thời gian hủy: {new Date(selectedInvoice.cancelledAt).toLocaleString("vi-VN")}
                    {selectedInvoice.cancellerName ? ` • Người thực hiện: ${selectedInvoice.cancellerName}` : ""}
                  </div>
                )}
              </div>
            )}

            {/* Bill Receipt Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 text-slate-800">
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <span className="font-black text-base tracking-widest text-slate-900 block">
                  CUEZONE BILLIARDS CLUB
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Hệ thống CLB Bida CueZone
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Wifi: CueZone_VIP (Mật khẩu: 88888888)
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
                  <strong className="text-purple-700">
                    {selectedInvoice.memberRank === "Normal" || selectedInvoice.memberRank === "Standard"
                      ? "Phổ thông"
                      : selectedInvoice.memberRank}
                  </strong>
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
                  <span>Đồ uống & Dịch vụ:</span>
                  <span className="font-mono">
                    {selectedInvoice.fnbFee.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span className="font-mono font-bold">
                    {selectedInvoice.subtotal.toLocaleString("vi-VN")}đ
                  </span>
                </div>

                {selectedInvoice.voucherDiscountAmount && selectedInvoice.voucherDiscountAmount > 0 ? (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Voucher {selectedInvoice.voucherCode ? `(${selectedInvoice.voucherCode})` : ""}:</span>
                    <span className="font-mono">
                      -{selectedInvoice.voucherDiscountAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                ) : null}

                {selectedInvoice.membershipDiscountAmount && selectedInvoice.membershipDiscountAmount > 0 ? (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Ưu đãi hội viên ({selectedInvoice.discountPercent || 10}%):</span>
                    <span className="font-mono">
                      -{selectedInvoice.membershipDiscountAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                ) : selectedInvoice.discountAmount > 0 && !selectedInvoice.voucherDiscountAmount ? (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Giảm giá ({selectedInvoice.discountPercent > 0 ? `${selectedInvoice.discountPercent}%` : "Ưu đãi"}):</span>
                    <span className="font-mono">
                      -{selectedInvoice.discountAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                ) : null}

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
                  <QrcodeOutlined /> Quét mã VietQR chuyển khoản
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  Xin cảm ơn Quý khách & Hẹn gặp lại tại CueZone!
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div>
                {selectedInvoice.status === "paid" && (
                  <Button
                    variant="outline"
                    size="md"
                    leftIcon={<CloseCircleOutlined />}
                    onClick={() => handleOpenCancelModal(selectedInvoice)}
                    className="!border-rose-300 !text-rose-600 hover:!bg-rose-50 hover:!border-rose-400 !rounded-xl !font-bold text-xs"
                  >
                    Hủy Hóa Đơn
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
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
          </div>
        )}
      </Modal>

      {/* ── MODAL XÁC NHẬN HỦY HÓA ĐƠN ──────────────────────────────────── */}
      <Modal
        open={cancelModalOpen}
        onCancel={() => {
          if (!cancelLoading) {
            setCancelModalOpen(false);
            setCancellingInvoice(null);
            setCancelReason("");
          }
        }}
        footer={null}
        width={500}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-rose-100 text-rose-700 font-black text-base">
            <CloseCircleOutlined className="text-rose-600 text-lg" />
            <span>Xác Nhận Hủy Hóa Đơn</span>
          </div>
        }
      >
        {cancellingInvoice && (
          <div className="py-3 space-y-4 text-xs font-sans">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
              <div className="font-bold text-sm text-rose-900">
                Hóa đơn: {cancellingInvoice.code} ({cancellingInvoice.tableName})
              </div>
              <div className="flex justify-between text-xs text-rose-700">
                <span>
                  Tổng tiền: <strong>{cancellingInvoice.finalTotal.toLocaleString("vi-VN")}đ</strong>
                </span>
                <span>
                  Khách: <strong>{cancellingInvoice.customerName}</strong>
                </span>
              </div>
              <div className="text-[11px] text-rose-600 leading-relaxed pt-1 border-t border-rose-200/60">
                ⚠️ <strong>Cảnh báo nghiệp vụ:</strong> Khi hủy hóa đơn, số tiền này sẽ bị loại trừ khỏi tổng doanh thu báo cáo ca & ngày. Nếu khách có áp dụng mã voucher hoặc được tích điểm hội viên, hệ thống sẽ tự động hoàn lại lượt voucher và thu hồi số điểm tích lũy. Thao tác không thể hoàn tác!
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-800 block">
                Chọn nhanh lý do hủy hóa đơn:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Nhập nhầm hình thức thanh toán",
                  "Thu ngân tính nhầm tiền giờ / món",
                  "Khách khiếu nại dịch vụ / đổi ý",
                  "Chốt nhầm sang bàn bida khác",
                  "Quên áp dụng voucher / hạng thẻ",
                  "Khách quẹt thẻ / chuyển khoản lỗi",
                ].map((reasonItem) => (
                  <button
                    key={reasonItem}
                    type="button"
                    onClick={() => setCancelReason(reasonItem)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      cancelReason === reasonItem
                        ? "bg-rose-100 text-rose-800 border-rose-300 font-bold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {reasonItem}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block">
                Lý do chi tiết <span className="text-rose-500">*</span>:
              </label>
              <Input.TextArea
                rows={3}
                placeholder="Nhập lý do cụ thể hủy hóa đơn này để lưu vết kiểm toán..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="!rounded-xl text-xs !border-slate-300 focus:!border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setCancelModalOpen(false);
                  setCancellingInvoice(null);
                  setCancelReason("");
                }}
                disabled={cancelLoading}
                className="!rounded-xl !text-xs"
              >
                Bỏ qua
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<CloseCircleOutlined />}
                onClick={handleConfirmCancel}
                loading={cancelLoading}
                className="!bg-rose-600 hover:!bg-rose-700 !border-rose-600 !rounded-xl !font-bold text-xs px-5"
              >
                Xác Nhận Hủy HĐ
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InvoicesManagementPage;
