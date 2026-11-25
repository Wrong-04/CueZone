// ============================================================================
// 1. IMPORTS
// ============================================================================
// 1.1 Thư viện bên ngoài & Plugins
import React, { useState, useEffect, useMemo, useCallback } from "react";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  FileTextOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

// 1.2 UI Components & Services nội bộ
import {
  Button,
  Card,
  Table,
  message,
} from "../../shared/ui";
import { invoiceService } from "../../services/invoice.service";

// 1.3 Sub-components & Modals
import { InvoiceKpiCards } from "./invoices/components/InvoiceKpiCards";
import { InvoiceFilterToolbar } from "./invoices/components/InvoiceFilterToolbar";
import { InvoiceThermalReceipt } from "./invoices/components/InvoiceThermalReceipt";
import { InvoiceDetailModal } from "./invoices/modals/InvoiceDetailModal";
import { InvoiceCancelModal } from "./invoices/modals/InvoiceCancelModal";
import { buildInvoiceColumns } from "./invoices/utils/invoice-columns";
import { mapRawInvoice } from "./invoices/utils/invoice-mapper.utils";

// 1.4 Types, Dictionaries & Helpers
import {
  type ClubInvoice,
  type ClubInvoiceItem,
  type InvoiceItemOrder,
  type DatePresetKey,
  type SortByOption,
  getClubReceiptSettings,
} from "./invoices/types/invoice.types";

// Re-export để các trang liên quan (AdminDashboard, v.v.) không bị vỡ import
export type { ClubInvoice, ClubInvoiceItem, InvoiceItemOrder };

// ============================================================================
// 3. CONSTANTS & HELPER SETUP
// ============================================================================
dayjs.extend(isBetween);

// ============================================================================
// 4. MAIN COMPONENT: QUẢN LÝ HÓA ĐƠN & PHÂN BỔ DOANH THU (INVOICES)
// ============================================================================
export const InvoicesManagementPage: React.FC = () => {
  // Cấu hình thông tin in nhiệt câu lạc bộ
  const clubSettings = useMemo(() => getClubReceiptSettings(), []);

  // ── 4.1 State: Danh sách hóa đơn & Trạng thái tải ──────────────────────────
  const [invoicesList, setInvoicesList] = useState<ClubInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // ── 4.2 State: Bộ lọc tìm kiếm & Khoảng thời gian ──────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tableTypeFilter, setTableTypeFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [datePreset, setDatePreset] = useState<DatePresetKey>("all");
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);
  const [customDayjsRange, setCustomDayjsRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [sortBy, setSortBy] = useState<SortByOption>("newest");

  // ── 4.3 State: Modals thao tác chi tiết & Hủy hóa đơn ──────────────────────
  const [selectedInvoice, setSelectedInvoice] = useState<ClubInvoice | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [cancellingInvoice, setCancellingInvoice] = useState<ClubInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [restockInventory, setRestockInventory] = useState<boolean>(true);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  // ── 4.4 Callback: Kiểm tra ngày hóa đơn thuộc khoảng chọn ──────────────────
  const isInvoiceInDateRange = useCallback(
    (invDateStr?: string): boolean => {
      if (!invDateStr) return true;
      if (datePreset === "all") return true;

      let invDay = dayjs();
      if (invDateStr.includes("/")) {
        const [d, m, y] = invDateStr.split("/").map(Number);
        if (d && m && y) invDay = dayjs(`${y}-${m}-${d}`);
      } else {
        const parsed = dayjs(invDateStr);
        if (parsed.isValid()) invDay = parsed;
      }

      if (datePreset === "today") return invDay.isSame(dayjs(), "day");
      if (datePreset === "yesterday") return invDay.isSame(dayjs().subtract(1, "day"), "day");
      if (datePreset === "this_week") return invDay.isSame(dayjs(), "week");
      if (datePreset === "this_month") return invDay.isSame(dayjs(), "month");

      if (datePreset === "custom" && customRange) {
        const [start, end] = customRange;
        return invDay.isBetween(dayjs(start).startOf("day"), dayjs(end).endOf("day"), null, "[]");
      }
      return true;
    },
    [datePreset, customRange],
  );

  // ── 4.5 Derived State: Lọc và sắp xếp danh sách hóa đơn ───────────────────
  const filteredInvoices = useMemo(() => {
    return invoicesList.filter((inv) => {
      if (!isInvoiceInDateRange(inv.date)) return false;
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (paymentMethodFilter !== "all") {
        if (paymentMethodFilter === "cash") {
          if (inv.paymentMethod !== "cash") return false;
        } else if (paymentMethodFilter === "split") {
          if (inv.paymentMethod !== "split") return false;
        } else if (paymentMethodFilter === "vietqr" || paymentMethodFilter === "banking") {
          if (inv.paymentMethod === "cash" || inv.paymentMethod === "split") return false;
        }
      }

      if (tableTypeFilter !== "all") {
        const tLower = (inv.tableType || "").toLowerCase();
        const nLower = (inv.tableName || "").toLowerCase();
        if (tableTypeFilter === "vip" && !tLower.includes("vip") && !nLower.includes("vip")) return false;
        if (tableTypeFilter === "match" && !tLower.includes("match") && !nLower.includes("match")) return false;
        if (tableTypeFilter === "pool" && !tLower.includes("pool") && !nLower.includes("pool")) return false;
        if (tableTypeFilter === "carom" && !tLower.includes("carom") && !nLower.includes("carom")) return false;
        if (tableTypeFilter === "snooker" && !tLower.includes("snooker") && !nLower.includes("snooker")) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = inv.code.toLowerCase().includes(q);
        const matchTable = inv.tableName.toLowerCase().includes(q);
        const matchCust = inv.customerName.toLowerCase().includes(q);
        const matchPhone = (inv.customerPhone || "").includes(q);
        if (!matchCode && !matchTable && !matchCust && !matchPhone) return false;
      }

      return true;
    });
  }, [invoicesList, isInvoiceInDateRange, statusFilter, tableTypeFilter, paymentMethodFilter, searchQuery]);

  const sortedInvoices = useMemo(() => {
    const arr = [...filteredInvoices];
    if (sortBy === "newest") return arr;
    if (sortBy === "oldest") return arr.reverse();
    if (sortBy === "amount_desc") return arr.sort((a, b) => b.finalTotal - a.finalTotal);
    if (sortBy === "amount_asc") return arr.sort((a, b) => a.finalTotal - b.finalTotal);
    if (sortBy === "duration_desc") return arr.sort((a, b) => b.durationMinutes - a.durationMinutes);
    return arr;
  }, [filteredInvoices, sortBy]);

  // ── 4.6 Derived State: Tính toán các chỉ số KPI doanh thu & hóa đơn ────────
  const metrics = useMemo(() => {
    const paidList = sortedInvoices.filter((i) => i.status === "paid");
    const cashRevenue = paidList.reduce(
      (acc, cur) => acc + (cur.paymentMethod === "cash" ? cur.finalTotal : 0),
      0,
    );
    const bankRevenue = paidList.reduce(
      (acc, cur) => acc + (cur.paymentMethod !== "cash" ? cur.finalTotal : 0),
      0,
    );
    return {
      totalRevenue: paidList.reduce((acc, cur) => acc + cur.finalTotal, 0),
      totalInvoices: paidList.length,
      tableHoursRevenue: paidList.reduce((acc, cur) => acc + cur.tableFee, 0),
      fnbRevenue: paidList.reduce((acc, cur) => acc + cur.fnbFee, 0),
      cashRevenue,
      bankRevenue,
      discountTotal: paidList.reduce((acc, cur) => acc + (cur.discountAmount || 0), 0),
      cancelledInvoicesCount: sortedInvoices.filter((i) => i.status === "cancelled").length,
    };
  }, [sortedInvoices]);

  // ── 4.7 Action Handlers (Nạp dữ liệu, Hủy hóa đơn, In bill) ────────────────
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoiceService.getInvoices();
      const rawList = data?.items || (Array.isArray(data as any) ? (data as any) : []);
      if (Array.isArray(rawList)) {
        setInvoicesList(rawList.map(mapRawInvoice));
      }
    } catch {
      message.error("Không thể tải danh sách hóa đơn từ máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePrintBill = () => {
    window.print();
  };

  const handleOpenCancelModal = (invoice: ClubInvoice) => {
    setCancellingInvoice(invoice);
    setCancelReason("");
    setRestockInventory(true);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingInvoice) return;
    if (!cancelReason.trim()) {
      message.warning("Vui lòng nhập lý do hủy hóa đơn");
      return;
    }
    setCancelLoading(true);
    try {
      await invoiceService.cancelInvoice(cancellingInvoice.id, cancelReason.trim(), restockInventory);
      message.success("Đã hủy hóa đơn thành công");
      setCancelModalOpen(false);
      setCancellingInvoice(null);
      setSelectedInvoice(null);
      await fetchInvoices();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || "Không thể hủy hóa đơn");
    } finally {
      setCancelLoading(false);
    }
  };

  // ── 4.8 Effects (Khởi động nạp dữ liệu) ───────────────────────────────────
  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  // Cột bảng hóa đơn được tách vào utils/invoice-columns.tsx
  const columns = useMemo(
    () =>
      buildInvoiceColumns({
        onViewDetail: (rec) => setSelectedInvoice(rec),
        onOpenCancel: (rec) => handleOpenCancelModal(rec),
      }),
    [],
  );

  // ── 4.9 Main Render JSX ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* ── 1. TIÊU ĐỀ TRANG VÀ THAO TÁC TẢI LẠI ──────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileTextOutlined className="text-emerald-600 text-2xl" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Quản Lý & Lịch Sử Hóa Đơn
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tra cứu doanh thu ca chơi, tiền giờ bida, dịch vụ ăn uống và in lại phiếu thanh toán 80mm.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            icon={<ReloadOutlined />}
            onClick={() => void fetchInvoices()}
            disabled={loading}
            className="!rounded-xl !h-10 text-xs font-semibold !border-slate-200 whitespace-nowrap"
          >
            Tải lại
          </Button>
        </div>
      </div>

      {/* ── 2. CỤM 4 THẺ KPI DOANH THU CHUẨN DESIGN SYSTEM ─────────────────── */}
      <InvoiceKpiCards metrics={metrics} />

      {/* ── 3. KHỐI BỘ LỌC TÌM KIẾM & BẢNG DANH SÁCH HÓA ĐƠN ──────────────── */}
      <Card className="!rounded-2xl border-slate-200/80 shadow-sm overflow-hidden p-5 bg-white">
        {/* Thanh công cụ lọc tìm kiếm (Tách thành InvoiceFilterToolbar) */}
        <InvoiceFilterToolbar
          searchQuery={searchQuery}
          onSearchChange={(val) => setSearchQuery(val)}
          datePreset={datePreset}
          onDatePresetChange={(val) => setDatePreset(val)}
          customDayjsRange={customDayjsRange}
          onCustomRangeChange={(dates, dateStrings) => {
            setCustomDayjsRange(dates);
            setCustomRange(dateStrings);
          }}
          tableTypeFilter={tableTypeFilter}
          onTableTypeChange={(val) => setTableTypeFilter(val)}
          statusFilter={statusFilter}
          onStatusChange={(val) => setStatusFilter(val)}
          paymentMethodFilter={paymentMethodFilter}
          onPaymentMethodChange={(val) => setPaymentMethodFilter(val)}
          sortBy={sortBy}
          onSortByChange={(val) => setSortBy(val)}
        />

        {/* Bảng danh sách hóa đơn */}
        <div className="mt-4 overflow-x-auto">
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
      </Card>

      {/* ── 4. CÁC MODAL CHI TIẾT & HỦY HÓA ĐƠN ───────────────────────────── */}
      {/* Modal xem chi tiết hóa đơn & in bill */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        settings={clubSettings}
        onClose={() => setSelectedInvoice(null)}
        onPrint={handlePrintBill}
        onOpenCancel={handleOpenCancelModal}
      />

      {/* Modal xác nhận hủy hóa đơn */}
      <InvoiceCancelModal
        open={cancelModalOpen}
        invoice={cancellingInvoice}
        cancelReason={cancelReason}
        restockInventory={restockInventory}
        cancelLoading={cancelLoading}
        onClose={() => setCancelModalOpen(false)}
        setCancelReason={setCancelReason}
        setRestockInventory={setRestockInventory}
        onConfirmCancel={handleConfirmCancel}
      />

      {/* Bản in hóa đơn nhiệt ẩn (chỉ xuất hiện khi bấm in) */}
      <InvoiceThermalReceipt invoice={selectedInvoice} settings={clubSettings} />
    </div>
  );
};

export default InvoicesManagementPage;
