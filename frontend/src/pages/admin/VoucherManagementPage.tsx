import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  GiftOutlined,
  HistoryOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Button, Card, Input, Modal, Select, Tag, message } from "../../shared/ui";
import {
  voucherService,
  type Voucher,
  type VoucherInput,
  type VoucherUsage,
} from "../../services/voucher.service";

type VoucherForm = {
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: string;
  maxDiscountAmount: string;
  targetAudience: "all" | "new_member" | "vip";
  minOrderAmount: string;
  startsAt: string;
  expiresAt: string;
  isUnlimitedExpiry: boolean;
  maxUses: string;
};

function localDateTime(date: Date) {
  if (isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function emptyForm(): VoucherForm {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    code: "",
    description: "",
    discountType: "percent",
    discountValue: "",
    maxDiscountAmount: "",
    targetAudience: "all",
    minOrderAmount: "0",
    startsAt: localDateTime(start),
    expiresAt: localDateTime(end),
    isUnlimitedExpiry: false,
    maxUses: "",
  };
}

function toForm(voucher: Voucher): VoucherForm {
  const start =
    voucher.startsAt && !isNaN(new Date(voucher.startsAt).getTime())
      ? new Date(voucher.startsAt)
      : new Date();

  const hasValidExpiry = Boolean(
    voucher.expiresAt && !isNaN(new Date(voucher.expiresAt).getTime())
  );
  // Nếu không có expiresAt hoặc expiresAt trùng đúng startsAt (do lỗi logic trước) -> xem là vô thời hạn
  const isSameInstant =
    hasValidExpiry &&
    voucher.expiresAt &&
    voucher.startsAt &&
    new Date(voucher.expiresAt).getTime() === new Date(voucher.startsAt).getTime();
  const isUnlimited = !hasValidExpiry || isSameInstant;

  const end =
    hasValidExpiry && !isUnlimited
      ? new Date(voucher.expiresAt!)
      : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    code: voucher.code,
    description: voucher.description || "",
    discountType: voucher.discountType,
    discountValue: String(voucher.discountValue),
    maxDiscountAmount:
      voucher.maxDiscountAmount !== undefined && voucher.maxDiscountAmount !== null
        ? String(voucher.maxDiscountAmount)
        : "",
    targetAudience: voucher.targetAudience || "all",
    minOrderAmount: String(voucher.minOrderAmount ?? 0),
    startsAt: localDateTime(start),
    expiresAt: isUnlimited ? "" : localDateTime(end),
    isUnlimitedExpiry: isUnlimited,
    maxUses: voucher.maxUses === undefined || voucher.maxUses === null ? "" : String(voucher.maxUses),
  };
}

function formatMoney(value?: number | null) {
  if (value === undefined || value === null) return "0đ";
  return `${value.toLocaleString("vi-VN")}đ`;
}

function safeFormatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return "Vô thời hạn";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Vô thời hạn";
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getVoucherStatus(voucher: Voucher): {
  key: "active" | "inactive" | "expired" | "out_of_quota" | "upcoming";
  label: string;
  color: "green" | "gold" | "red" | "default";
} {
  if (!voucher.isActive) {
    return { key: "inactive", label: "Tạm dừng", color: "default" };
  }
  const now = new Date();
  const startsAt = voucher.startsAt ? new Date(voucher.startsAt) : null;
  const expiresAt = voucher.expiresAt ? new Date(voucher.expiresAt) : null;

  if (startsAt && !isNaN(startsAt.getTime()) && now < startsAt) {
    return { key: "upcoming", label: "Sắp bắt đầu", color: "gold" };
  }
  // Chỉ tính hết hạn nếu voucher có ngày hết hạn xác định
  if (expiresAt && !isNaN(expiresAt.getTime()) && now > expiresAt) {
    return { key: "expired", label: "Đã hết hạn", color: "red" };
  }
  if (voucher.maxUses !== undefined && voucher.maxUses !== null && voucher.usageCount >= voucher.maxUses) {
    return { key: "out_of_quota", label: "Đã hết lượt", color: "red" };
  }
  return { key: "active", label: "Đang hoạt động", color: "green" };
}

export default function VoucherManagementPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [form, setForm] = useState<VoucherForm>(emptyForm);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [usageVoucher, setUsageVoucher] = useState<Voucher | null>(null);
  const [usageHistory, setUsageHistory] = useState<VoucherUsage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

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

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadVouchers(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadVouchers]);

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEditModal = (voucher: Voucher) => {
    setEditing(voucher);
    setForm(toForm(voucher));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const generateRandomCode = () => {
    const prefix = "CZ";
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    setForm((prev) => ({ ...prev, code: `${prefix}${randomChars}` }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    if (!form.isUnlimitedExpiry && form.startsAt && form.expiresAt) {
      if (new Date(form.startsAt) >= new Date(form.expiresAt)) {
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

  const toggleActive = async (voucher: Voucher) => {
    try {
      await voucherService.setActive(voucher._id, !voucher.isActive);
      message.success(voucher.isActive ? `Đã tạm dừng mã ${voucher.code}` : `Đã kích hoạt mã ${voucher.code}`);
      await loadVouchers();
    } catch (actionError) {
      message.error(actionError instanceof Error ? actionError.message : "Không thể thay đổi trạng thái");
    }
  };

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

  const showUsage = async (voucher: Voucher) => {
    setUsageVoucher(voucher);
    setUsageHistory([]);
    setHistoryLoading(true);
    try {
      setUsageHistory(await voucherService.usageHistory(voucher._id));
    } catch (actionError) {
      message.error(actionError instanceof Error ? actionError.message : "Không thể tải lịch sử sử dụng");
    } finally {
      setHistoryLoading(false);
    }
  };

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    message.success(`Đã sao chép mã: ${code}`);
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let expired = 0;
    let totalUses = 0;

    const now = new Date();
    for (const v of vouchers) {
      totalUses += v.usageCount || 0;
      if (!v.isActive) {
        inactive++;
      } else {
        const exp = v.expiresAt ? new Date(v.expiresAt) : null;
        if (exp && !isNaN(exp.getTime()) && now > exp) {
          expired++;
        } else if (v.maxUses && v.usageCount >= v.maxUses) {
          expired++;
        } else {
          active++;
        }
      }
    }
    return { total: vouchers.length, active, inactive, expired, totalUses };
  }, [vouchers]);

  // Bộ lọc danh sách
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      // Tìm kiếm theo code hoặc mô tả
      if (searchTerm) {
        const matchCode = v.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchDesc = (v.description || "").toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchCode && !matchDesc) return false;
      }

      // Lọc loại ưu đãi
      if (typeFilter !== "all" && v.discountType !== typeFilter) {
        return false;
      }

      // Lọc trạng thái
      if (statusFilter !== "all") {
        const status = getVoucherStatus(v);
        if (statusFilter === "active" && status.key !== "active") return false;
        if (statusFilter === "inactive" && status.key !== "inactive") return false;
        if (statusFilter === "expired" && status.key !== "expired" && status.key !== "out_of_quota") return false;
      }

      return true;
    });
  }, [vouchers, searchTerm, typeFilter, statusFilter]);

  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* Tiêu đề & Nút thao tác đầu trang */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <GiftOutlined className="text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Quản lý Ưu Đãi & Voucher</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập mã khuyến mãi giờ chơi, dịch vụ và theo dõi lượt sử dụng tại quầy.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            leftIcon={<ReloadOutlined spin={loading} />}
            onClick={() => void loadVouchers()}
            className="!rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Làm mới
          </Button>
          <Button
            leftIcon={<PlusOutlined />}
            onClick={openCreateModal}
            className="!rounded-xl !bg-emerald-600 hover:!bg-emerald-700 font-semibold shadow-sm text-white"
          >
            Thêm voucher mới
          </Button>
        </div>
      </div>

      {/* Thẻ thống kê nhanh */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tổng số chương trình</span>
            <GiftOutlined className="text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="mt-1 text-[11px] text-slate-400">Tất cả các mã ưu đãi</div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Đang hoạt động</span>
            <CheckCircleOutlined className="text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{stats.active}</div>
          <div className="mt-1 text-[11px] text-emerald-600/80">Khả dụng áp dụng tại quầy</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tạm dừng / Hết hạn</span>
            <ClockCircleOutlined className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700">{stats.inactive + stats.expired}</div>
          <div className="mt-1 text-[11px] text-slate-400">
            {stats.inactive} tạm dừng · {stats.expired} hết hạn
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-sky-700 text-xs font-semibold">
            <span>Tổng lượt đã dùng</span>
            <HistoryOutlined className="text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-700">{stats.totalUses}</div>
          <div className="mt-1 text-[11px] text-sky-600/80">Lượt khách đã được giảm giá</div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <Card className="!rounded-2xl !border-slate-200/80 !shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="w-full sm:w-72">
              <Input
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder="Tìm mã voucher, mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                className="!rounded-xl !bg-slate-50 !border-slate-200"
              />
            </div>
            <div className="w-44">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "active", label: "Đang hoạt động" },
                  { value: "inactive", label: "Tạm dừng" },
                  { value: "expired", label: "Đã hết hạn / Hết lượt" },
                ]}
                className="w-full !rounded-xl"
              />
            </div>
            <div className="w-44">
              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: "all", label: "Tất cả loại ưu đãi" },
                  { value: "percent", label: "Giảm phần trăm (%)" },
                  { value: "fixed", label: "Số tiền cố định (đ)" },
                ]}
                className="w-full !rounded-xl"
              />
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Hiển thị <span className="font-bold text-slate-800">{filteredVouchers.length}</span> / {vouchers.length} mã
          </div>
        </div>

        {/* Bảng danh sách voucher */}
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Đang tải danh sách ưu đãi...</div>
          ) : filteredVouchers.length === 0 ? (
            <div className="py-12 text-center">
              <GiftOutlined className="text-3xl text-slate-300" />
              <p className="mt-2 text-sm text-slate-500 font-medium">Không tìm thấy mã ưu đãi nào phù hợp.</p>
              <Button size="sm" variant="outline" onClick={openCreateModal} className="mt-3 !rounded-xl">
                + Tạo mã ưu đãi đầu tiên
              </Button>
            </div>
          ) : (
            <table className="w-full min-w-[960px] text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-48">Mã ưu đãi</th>
                  <th className="py-3 px-4 w-40">Mức giảm giá</th>
                  <th className="py-3 px-4 w-36">Đối tượng</th>
                  <th className="py-3 px-4 w-36">Điều kiện đơn</th>
                  <th className="py-3 px-4 w-44">Thời gian hiệu lực</th>
                  <th className="py-3 px-4 w-28 text-center">Lượt sử dụng</th>
                  <th className="py-3 px-4 w-32 text-center">Trạng thái</th>
                  <th className="py-3 px-4 w-44 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVouchers.map((voucher) => {
                  const status = getVoucherStatus(voucher);
                  const isPercent = voucher.discountType === "percent";
                  const usagePercent = voucher.maxUses
                    ? Math.min(100, Math.round((voucher.usageCount / voucher.maxUses) * 100))
                    : null;

                  return (
                    <tr key={voucher._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Cột Mã */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {voucher.code}
                          </span>
                          <button
                            type="button"
                            title="Sao chép mã"
                            onClick={() => copyCode(voucher.code)}
                            className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                          >
                            <CopyOutlined className="text-xs" />
                          </button>
                        </div>
                        {voucher.description && (
                          <div className="text-xs text-slate-500 mt-1 max-w-xs line-clamp-1">
                            {voucher.description}
                          </div>
                        )}
                      </td>

                      {/* Cột Mức giảm */}
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {isPercent ? (
                          <div>
                            <span className="text-emerald-700 font-bold text-base">Giảm {voucher.discountValue}%</span>
                            {voucher.maxDiscountAmount ? (
                              <div className="text-xs text-slate-500 mt-0.5">
                                Tối đa: <span className="font-semibold text-slate-700">{formatMoney(voucher.maxDiscountAmount)}</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 mt-0.5">Không trần tối đa</div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-emerald-700 font-bold text-base">
                              Giảm {formatMoney(voucher.discountValue)}
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">Trừ trực tiếp hóa đơn</div>
                          </div>
                        )}
                      </td>

                      {/* Cột Đối tượng */}
                      <td className="py-3.5 px-4 text-xs">
                        {voucher.targetAudience === "new_member" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                            🎁 Khách mới
                          </span>
                        ) : voucher.targetAudience === "vip" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                            ⭐ Hội viên VIP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            Hội viên chung
                          </span>
                        )}
                      </td>

                      {/* Cột Điều kiện đơn */}
                      <td className="py-3.5 px-4 text-slate-700">
                        {voucher.minOrderAmount && voucher.minOrderAmount > 0 ? (
                          <div>
                            <div className="font-medium">Từ {formatMoney(voucher.minOrderAmount)}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">Tổng hóa đơn tối thiểu</div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">Mọi hóa đơn (0đ)</div>
                        )}
                      </td>

                      {/* Cột Thời gian hiệu lực */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {voucher.expiresAt && !isNaN(new Date(voucher.expiresAt).getTime()) ? (
                          <>
                            <div className="font-medium text-slate-800">Đến: {safeFormatDate(voucher.expiresAt)}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">Từ: {safeFormatDate(voucher.startsAt)}</div>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                              ♾️ Vô thời hạn
                            </span>
                            <div className="text-[11px] text-slate-400 mt-1">Từ: {safeFormatDate(voucher.startsAt)}</div>
                          </>
                        )}
                      </td>

                      {/* Cột Lượt dùng */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-semibold text-slate-800 text-sm">
                          {voucher.usageCount}
                          <span className="text-slate-400 text-xs font-normal">
                            {voucher.maxUses !== undefined && voucher.maxUses !== null ? ` / ${voucher.maxUses}` : " / ∞"}
                          </span>
                        </div>
                        {usagePercent !== null && (
                          <div className="w-16 mx-auto mt-1.5 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${usagePercent >= 100 ? "bg-rose-500" : "bg-emerald-500"}`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Cột Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        <Tag color={status.color} className="!rounded-md !px-2.5 !py-0.5 font-medium">
                          {status.label}
                        </Tag>
                      </td>

                      {/* Cột Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<EditOutlined />}
                            onClick={() => openEditModal(voucher)}
                            title="Chỉnh sửa thông tin"
                            className="!rounded-lg !px-2.5 text-slate-600 hover:text-emerald-700"
                          >
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<PoweroffOutlined />}
                            onClick={() => void toggleActive(voucher)}
                            title={voucher.isActive ? "Tạm dừng áp dụng" : "Kích hoạt lại"}
                            className={`!rounded-lg !px-2.5 ${voucher.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                          >
                            {voucher.isActive ? "Tắt" : "Bật"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<HistoryOutlined />}
                            onClick={() => void showUsage(voucher)}
                            title="Xem lịch sử sử dụng"
                            className="!rounded-lg !px-2.5 text-slate-600 hover:text-sky-700"
                          >
                            Lịch sử
                          </Button>
                          {voucher.usageCount === 0 && (
                            <Button
                              size="sm"
                              variant="danger-outline"
                              icon={<DeleteOutlined />}
                              onClick={() => void deleteVoucher(voucher)}
                              title="Xóa voucher"
                              className="!rounded-lg !px-2 text-rose-600 hover:bg-rose-50"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal Thêm mới / Cập nhật Voucher */}
      <Modal
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
        className="!w-full max-w-2xl"
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <GiftOutlined className="text-emerald-600" />
            {editing ? `Cập nhật mã ưu đãi: ${editing.code}` : "Tạo mã ưu đãi mới"}
          </div>
        }
      >
        <form onSubmit={(event) => void submit(event)} className="space-y-5 pt-3">
          {/* Nhóm 1: Thông tin mã */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Thông tin chương trình</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-700 block">
                Mã voucher <span className="text-rose-500">*</span>
                <div className="flex gap-2">
                  <Input
                    required
                    maxLength={32}
                    value={form.code}
                    onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                    placeholder="VD: CUEZONE20"
                    className="font-mono uppercase !rounded-lg"
                  />
                  {!editing && (
                    <Button htmlType="button" size="sm" variant="outline" onClick={generateRandomCode} className="!rounded-lg whitespace-nowrap">
                      Tự tạo mã
                    </Button>
                  )}
                </div>
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700 block">
                Tên / Mô tả chương trình
                <Input
                  maxLength={250}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="VD: Ưu đãi giờ vàng cho hội viên mới"
                  className="!rounded-lg"
                />
              </label>
            </div>
          </div>

          {/* Nhóm 2: Mức giảm & Đối tượng áp dụng */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Giá trị ưu đãi & Điều kiện
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-700 block">
                Hình thức giảm giá <span className="text-rose-500">*</span>
                <Select
                  value={form.discountType}
                  onChange={(value) => setForm({ ...form, discountType: value })}
                  options={[
                    { value: "percent", label: "Phần trăm (%)" },
                    { value: "fixed", label: "Số tiền cố định (đ)" },
                  ]}
                  className="w-full !rounded-lg"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700 block">
                Mức giảm ({form.discountType === "percent" ? "%" : "đ"}) <span className="text-rose-500">*</span>
                <Input
                  required
                  type="number"
                  min={1}
                  max={form.discountType === "percent" ? 100 : undefined}
                  value={form.discountValue}
                  onChange={(event) => setForm({ ...form, discountValue: event.target.value })}
                  placeholder={form.discountType === "percent" ? "VD: 20" : "VD: 50.000"}
                  className="!rounded-lg"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700 block">
                Mức giảm tối đa (đ)
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  disabled={form.discountType === "fixed"}
                  value={form.discountType === "fixed" ? "" : form.maxDiscountAmount}
                  onChange={(event) => setForm({ ...form, maxDiscountAmount: event.target.value })}
                  placeholder={form.discountType === "fixed" ? "Không áp dụng cho tiền cố định" : "VD: 50.000"}
                  className={`!rounded-lg ${form.discountType === "fixed" ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
                />
                <span className="text-[10px] text-slate-400 block">
                  {form.discountType === "fixed"
                    ? "Giảm trực tiếp đúng số tiền cố định phía trên"
                    : "Trần giảm tối đa (chống thất thoát doanh thu bàn lớn)"}
                </span>
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700 block">
                Đối tượng áp dụng <span className="text-rose-500">*</span>
                <Select
                  value={form.targetAudience}
                  onChange={(value) => setForm({ ...form, targetAudience: value })}
                  options={[
                    { value: "all", label: "Tất cả Hội viên (Ưu đãi chung)" },
                    { value: "new_member", label: "🎁 Chào mừng Hội viên mới (Tự động tặng khi đăng ký)" },
                    { value: "vip", label: "⭐ Chỉ Hội viên VIP (Hạng Bạc trở lên)" },
                  ]}
                  className="w-full !rounded-lg"
                />
                <span className="text-[10px] text-slate-400 block">
                  {form.targetAudience === "new_member"
                    ? "Tự động hiển thị và kích hoạt khi đăng ký hội viên tại quầy"
                    : "Đối tượng khách hàng được phép hưởng mã ưu đãi"}
                </span>
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700 block">
                Đơn hàng tối thiểu (đ)
                <Input
                  required
                  type="number"
                  min={0}
                  step={1000}
                  value={form.minOrderAmount}
                  onChange={(event) => setForm({ ...form, minOrderAmount: event.target.value })}
                  placeholder="0đ = Áp dụng mọi đơn"
                  className="!rounded-lg"
                />
                <span className="text-[10px] text-slate-400 block">Hóa đơn phải đạt từ mức này mới được giảm</span>
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700 block">
                Số lượt sử dụng tối đa
                <Input
                  type="number"
                  min={1}
                  value={form.maxUses}
                  onChange={(event) => setForm({ ...form, maxUses: event.target.value })}
                  placeholder="Để trống nếu không giới hạn"
                  className="!rounded-lg"
                />
                <span className="text-[10px] text-slate-400 block">Tổng số lần mã này có thể dùng tại quán</span>
              </label>
            </div>
          </div>

          {/* Nhóm 3: Thời gian hiệu lực */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Thời gian hiệu lực
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={form.isUnlimitedExpiry}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm({
                      ...form,
                      isUnlimitedExpiry: checked,
                      expiresAt: checked
                        ? ""
                        : form.expiresAt || localDateTime(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
                    });
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                ♾️ Vô thời hạn (Không hết hạn)
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-700 block">
                Thời gian bắt đầu <span className="text-rose-500">*</span>
                <Input
                  required
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                  className="!rounded-lg"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-slate-700 block">
                Thời gian kết thúc {form.isUnlimitedExpiry ? "" : <span className="text-rose-500">*</span>}
                {form.isUnlimitedExpiry ? (
                  <div className="h-[38px] px-3 flex items-center text-xs font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200 rounded-lg">
                    ♾️ Mã có hiệu lực vô thời hạn
                  </div>
                ) : (
                  <Input
                    required
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
                    className="!rounded-lg"
                  />
                )}
              </label>
            </div>
          </div>

          {/* Nút hành động Modal */}
          <div className="flex justify-end gap-2.5 pt-2">
            <Button htmlType="button" variant="outline" onClick={closeModal} disabled={saving} className="!rounded-xl">
              Hủy bỏ
            </Button>
            <Button
              htmlType="submit"
              loading={saving}
              className="!rounded-xl !bg-emerald-600 hover:!bg-emerald-700 font-semibold shadow-sm text-white"
            >
              {editing ? "Lưu thay đổi" : "Tạo voucher"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Lịch sử sử dụng */}
      <Modal
        open={Boolean(usageVoucher)}
        onCancel={() => setUsageVoucher(null)}
        footer={null}
        destroyOnHidden
        className="!w-full max-w-2xl"
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <HistoryOutlined className="text-sky-600" />
            Lịch sử sử dụng mã: <span className="text-emerald-700 font-mono">{usageVoucher?.code}</span>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              Tổng số lượt đã dùng: <span className="font-bold text-slate-800">{usageVoucher?.usageCount || 0}</span>
            </div>
            <div>
              Ưu đãi:{" "}
              <span className="font-semibold text-emerald-700">
                {usageVoucher?.discountType === "percent"
                  ? `Giảm ${usageVoucher.discountValue}%`
                  : `Giảm ${formatMoney(usageVoucher?.discountValue)}`}
              </span>
            </div>
          </div>

          {historyLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Đang tải lịch sử...</div>
          ) : usageHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">Mã này chưa được áp dụng cho hóa đơn nào.</div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {usageHistory.map((usage) => (
                <div
                  key={usage._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3.5 text-xs shadow-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{usage.customerName || "Khách vãng lai"}</div>
                    <div className="text-slate-400 mt-0.5">
                      Hóa đơn: <span className="font-mono text-slate-600">{usage.invoiceCode}</span> ·{" "}
                      {safeFormatDate(usage.usedAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-600 font-bold text-sm">
                      -{formatMoney(usage.discountAmount)}
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Tổng hóa đơn: {formatMoney(usage.subtotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button size="sm" variant="outline" onClick={() => setUsageVoucher(null)} className="!rounded-xl">
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
