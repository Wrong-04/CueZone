// ============================================================================
// 1. IMPORTS
// ============================================================================
// 1.1 Thư viện bên ngoài & Icons
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  GiftOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

// 1.2 Hooks, utils, services nội bộ
import { Button, Card, message } from "../../shared/ui";
import {
  voucherService,
  type Voucher,
  type VoucherInput,
  type VoucherUsage,
} from "../../services/voucher.service";

// 1.3 Components con & Modals
import { VoucherKpiCards } from "./voucher/components/VoucherKpiCards";
import { VoucherTableView } from "./voucher/components/VoucherTableView";
import { VoucherFormModal } from "./voucher/modals/VoucherFormModal";
import { VoucherHistoryModal } from "./voucher/modals/VoucherHistoryModal";

// 1.4 Types, Dictionaries & Helpers
import {
  emptyForm,
  toForm,
  getVoucherStatus,
  type VoucherForm,
} from "./voucher/types/voucher.types";

// ============================================================================
// 4. MAIN COMPONENT: QUẢN LÝ MÃ KHUYẾN MÃI (VOUCHER MANAGEMENT)
// ============================================================================
export default function VoucherManagementPage() {
  // ── 4.1 State: Danh sách dữ liệu, Form và Modals ──────────────────────────
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [form, setForm] = useState<VoucherForm>(emptyForm);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [usageVoucher, setUsageVoucher] = useState<Voucher | null>(null);
  const [usageHistory, setUsageHistory] = useState<VoucherUsage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── 4.2 State: Bộ lọc tìm kiếm & Phân loại ─────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // ── 4.3 Derived State: Thống kê nhanh chỉ số KPI ──────────────────────────
  const stats = useMemo(() => {
    let active = 0;
    let expired = 0;
    let totalUses = 0;
    for (const v of vouchers) {
      const st = getVoucherStatus(v);
      if (st.key === "active") active++;
      if (st.key === "expired" || st.key === "inactive" || st.key === "out_of_quota") expired++;
      totalUses += v.usageCount || 0;
    }
    return { total: vouchers.length, active, expired, totalUses };
  }, [vouchers]);

  // ── 4.4 Derived State: Lọc danh sách voucher theo điều kiện tìm kiếm ────────
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) => {
      const matchesSearch =
        voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voucher.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || voucher.discountType === typeFilter;
      const status = getVoucherStatus(voucher);
      const matchesStatus = statusFilter === "all" || status.key === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vouchers, searchTerm, typeFilter, statusFilter]);

  // ── 4.5 Action Handlers (Nạp dữ liệu, Lưu, Bật/Tắt, Xóa, Lịch sử) ───────────
  // Tải danh sách voucher từ server
  const loadVouchers = useCallback(async () => {
    setLoading(true);
    try {
      setVouchers(await voucherService.list());
    } catch (loadError) {
      message.error(loadError instanceof Error ? loadError.message : "Không thể tải danh sách voucher");
    } finally {
      setLoading(false);
    }
  }, []);

  // Mở modal tạo mới voucher
  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  // Mở modal chỉnh sửa voucher hiện có
  const openEditModal = (voucher: Voucher) => {
    setEditing(voucher);
    setForm(toForm(voucher));
    setModalOpen(true);
  };

  // Đóng modal và reset form
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  // Gửi form tạo mới hoặc cập nhật voucher
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const nowMs = Date.now();
    const minAllowedStartMs = nowMs - 5 * 60 * 1000;
    if (form.startsAt) {
      const startMs = new Date(form.startsAt).getTime();
      if (!editing) {
        if (startMs < minAllowedStartMs) {
          message.error("Thời gian bắt đầu không được nằm trong quá khứ");
          setSaving(false);
          return;
        }
      } else {
        const origStartMs = new Date(editing.startsAt).getTime();
        if (Math.abs(startMs - origStartMs) > 60_000 && startMs < minAllowedStartMs) {
          message.error("Thời gian bắt đầu mới không được nằm trong quá khứ");
          setSaving(false);
          return;
        }
      }
    }

    if (!form.isUnlimitedExpiry && form.expiresAt) {
      const endMs = new Date(form.expiresAt).getTime();
      if (endMs <= nowMs) {
        message.error("Thời gian kết thúc phải lớn hơn thời điểm hiện tại");
        setSaving(false);
        return;
      }
      if (form.startsAt && new Date(form.startsAt).getTime() >= endMs) {
        message.error("Thời gian bắt đầu phải trước thời gian hết hạn");
        setSaving(false);
        return;
      }
    }

    const payload: VoucherInput = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscountAmount:
        form.discountType === "percent" && form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
      targetAudience: form.targetAudience || "all",
      minOrderAmount: Number(form.minOrderAmount || 0),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
      expiresAt: form.isUnlimitedExpiry || !form.expiresAt ? null : new Date(form.expiresAt).toISOString(),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
    };

    try {
      if (editing) {
        await voucherService.update(editing._id, payload);
        message.success("Đã cập nhật mã ưu đãi thành công");
      } else {
        await voucherService.create(payload);
        message.success("Đã tạo mã ưu đãi mới thành công");
      }
      closeModal();
      await loadVouchers();
    } catch (submitError) {
      message.error(submitError instanceof Error ? submitError.message : "Không thể lưu thông tin voucher");
    } finally {
      setSaving(false);
    }
  };

  // Kích hoạt hoặc tạm dừng mã voucher
  const toggleActive = async (voucher: Voucher) => {
    try {
      await voucherService.setActive(voucher._id, !voucher.isActive);
      message.success(voucher.isActive ? `Đã tạm dừng mã ${voucher.code}` : `Đã kích hoạt mã ${voucher.code}`);
      await loadVouchers();
    } catch (actionError) {
      message.error(actionError instanceof Error ? actionError.message : "Không thể thay đổi trạng thái");
    }
  };

  // Xóa mã voucher chưa có lượt sử dụng
  const deleteVoucher = async (voucher: Voucher) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã ưu đãi ${voucher.code}?`)) return;
    try {
      await voucherService.remove(voucher._id);
      message.success(`Đã xóa mã ưu đãi ${voucher.code}`);
      await loadVouchers();
    } catch (actionError) {
      message.error(actionError instanceof Error ? actionError.message : "Không thể xóa voucher");
    }
  };

  // Mở modal xem lịch sử các lần dùng mã
  const showUsage = async (voucher: Voucher) => {
    setUsageVoucher(voucher);
    setHistoryLoading(true);
    try {
      setUsageHistory(await voucherService.usageHistory(voucher._id));
    } catch (historyError) {
      message.error(historyError instanceof Error ? historyError.message : "Không thể tải lịch sử sử dụng");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Sao chép mã voucher vào clipboard
  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    message.success(`Đã sao chép mã: ${code}`);
  };

  // ── 4.6 Effects (Khởi động nạp danh sách) ──────────────────────────────────
  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadVouchers(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadVouchers]);

  // ── 4.7 Main Render JSX ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* ── 1. TIÊU ĐỀ TRANG VÀ THAO TÁC CHÍNH ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <GiftOutlined className="text-emerald-600 text-2xl" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Quản Lý Mã Khuyến Mãi & Ưu Đãi
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập mã giảm giá theo %, tiền cố định và cấu hình hạn mức cho hội viên.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            icon={<ReloadOutlined />}
            onClick={() => void loadVouchers()}
            disabled={loading}
            className="!rounded-xl !h-10 text-xs font-semibold !border-slate-200 whitespace-nowrap"
          >
            Làm mới
          </Button>
          <Button
            variant="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            className="!rounded-xl !h-10 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold text-xs shadow-sm whitespace-nowrap"
          >
            Tạo mã ưu đãi
          </Button>
        </div>
      </div>

      {/* ── 2. CỤM 4 THẺ KPI CHỈ SỐ VOUCHER CHUẨN DESIGN SYSTEM ─────────────── */}
      <VoucherKpiCards stats={stats} />

      {/* ── 3. KHỐI BỘ LỌC TÌM KIẾM & BẢNG DANH SÁCH MÃ ƯU ĐÃI ──────────────── */}
      <Card className="!rounded-2xl border-slate-200/80 shadow-sm overflow-hidden p-5 bg-white">
        {/* Bộ lọc theo từ khóa, hình thức giảm và trạng thái */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 focus-within:border-emerald-500 transition-colors">
            <SearchOutlined className="text-slate-400 text-sm" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã hoặc tên chương trình..."
              className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
              <span>Hình thức:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-1.5 outline-none font-medium text-slate-700"
              >
                <option value="all">Tất cả hình thức</option>
                <option value="percent">Phần trăm (%)</option>
                <option value="fixed">Số tiền cố định (đ)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
              <span>Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-1.5 outline-none font-medium text-slate-700"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="upcoming">Sắp bắt đầu</option>
                <option value="expired">Đã hết hạn</option>
                <option value="out_of_quota">Đã hết lượt</option>
                <option value="inactive">Đã tạm dừng</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bảng danh sách voucher (Tách ra thành component con) */}
        <div className="mt-4 overflow-x-auto">
          <VoucherTableView
            vouchers={filteredVouchers}
            loading={loading}
            onOpenCreate={openCreateModal}
            onOpenEdit={openEditModal}
            onToggleActive={toggleActive}
            onDelete={deleteVoucher}
            onShowUsage={showUsage}
            onCopyCode={copyCode}
          />
        </div>
      </Card>

      {/* ── 4. CÁC MODAL THAO TÁC FORM VÀ LỊCH SỬ ─────────────────────────── */}
      {/* Modal 1: Thêm mới / Cập nhật Voucher */}
      <VoucherFormModal
        open={modalOpen}
        editing={editing}
        form={form}
        saving={saving}
        onClose={closeModal}
        setForm={setForm}
        onSubmit={(event) => void submit(event)}
      />

      {/* Modal 2: Lịch sử sử dụng Voucher */}
      <VoucherHistoryModal
        voucher={usageVoucher}
        history={usageHistory}
        loading={historyLoading}
        onClose={() => setUsageVoucher(null)}
      />
    </div>
  );
}
