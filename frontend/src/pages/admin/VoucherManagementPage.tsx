import { useCallback, useEffect, useState, type FormEvent } from "react";
import { GiftOutlined, HistoryOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Input, Select, Tag } from "../../shared/ui";
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
  minOrderAmount: string;
  startsAt: string;
  expiresAt: string;
  maxUses: string;
};

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function emptyForm(): VoucherForm {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    code: "",
    description: "",
    discountType: "percent",
    discountValue: "",
    minOrderAmount: "0",
    startsAt: localDateTime(start),
    expiresAt: localDateTime(end),
    maxUses: "",
  };
}

function toForm(voucher: Voucher): VoucherForm {
  return {
    code: voucher.code,
    description: voucher.description || "",
    discountType: voucher.discountType,
    discountValue: String(voucher.discountValue),
    minOrderAmount: String(voucher.minOrderAmount),
    startsAt: localDateTime(new Date(voucher.startsAt)),
    expiresAt: localDateTime(new Date(voucher.expiresAt)),
    maxUses: voucher.maxUses === undefined ? "" : String(voucher.maxUses),
  };
}

function money(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export default function VoucherManagementPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [form, setForm] = useState<VoucherForm>(emptyForm);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [usageVoucher, setUsageVoucher] = useState<Voucher | null>(null);
  const [usageHistory, setUsageHistory] = useState<VoucherUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setVouchers(await voucherService.list());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách voucher");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadVouchers(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadVouchers]);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm());
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload: VoucherInput = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: Number(form.minOrderAmount),
      startsAt: new Date(form.startsAt).toISOString(),
      expiresAt: new Date(form.expiresAt).toISOString(),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
    };
    try {
      if (editing) await voucherService.update(editing._id, payload);
      else await voucherService.create(payload);
      setNotice(editing ? "Đã cập nhật voucher." : "Đã tạo voucher.");
      resetForm();
      await loadVouchers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể lưu voucher");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (voucher: Voucher) => {
    setError("");
    try {
      await voucherService.setActive(voucher._id, !voucher.isActive);
      await loadVouchers();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể cập nhật voucher");
    }
  };

  const deleteVoucher = async (voucher: Voucher) => {
    if (!window.confirm(`Xóa voucher ${voucher.code}?`)) return;
    setError("");
    try {
      await voucherService.remove(voucher._id);
      setNotice(`Đã xóa voucher ${voucher.code}.`);
      await loadVouchers();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể xóa voucher");
    }
  };

  const showUsage = async (voucher: Voucher) => {
    setUsageVoucher(voucher);
    setUsageHistory([]);
    setError("");
    try {
      setUsageHistory(await voucherService.usageHistory(voucher._id));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể tải lịch sử sử dụng");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <GiftOutlined className="text-emerald-600" /> Quản lý voucher
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo mã khuyến mãi, thiết lập điều kiện áp dụng và theo dõi lượt sử dụng.
          </p>
        </div>
        <Button variant="outline" leftIcon={<ReloadOutlined />} onClick={() => void loadVouchers()}>
          Tải lại
        </Button>
      </div>

      {(error || notice) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {error || notice}
        </div>
      )}

      <Card className="!rounded-2xl !border-slate-200" title={editing ? "Cập nhật voucher" : "Tạo voucher"}>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Mã voucher
            <Input required maxLength={32} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="VD: CUEZONE20" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Loại giảm giá
            <Select
              value={form.discountType}
              onChange={(value) => setForm({ ...form, discountType: value })}
              options={[
                { value: "percent", label: "Phần trăm (%)" },
                { value: "fixed", label: "Số tiền cố định (đ)" },
              ]}
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Mức giảm
            <Input required type="number" min={1} max={form.discountType === "percent" ? 100 : undefined} value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Đơn tối thiểu (đ)
            <Input required type="number" min={0} step={1000} value={form.minOrderAmount} onChange={(event) => setForm({ ...form, minOrderAmount: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Bắt đầu
            <Input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Hết hạn
            <Input required type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Số lượt tối đa (để trống nếu không giới hạn)
            <Input type="number" min={1} value={form.maxUses} onChange={(event) => setForm({ ...form, maxUses: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Mô tả
            <Input maxLength={250} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Mô tả chương trình (không bắt buộc)" />
          </label>
          <div className="flex gap-2 md:col-span-2 xl:col-span-4">
            <Button htmlType="submit" loading={saving} leftIcon={<PlusOutlined />}>
              {editing ? "Lưu thay đổi" : "Tạo voucher"}
            </Button>
            {editing && <Button variant="outline" onClick={resetForm}>Hủy sửa</Button>}
          </div>
        </form>
      </Card>

      <Card className="!rounded-2xl !border-slate-200" title="Danh sách voucher">
        {loading ? (
          <p className="py-8 text-center text-slate-500">Đang tải voucher...</p>
        ) : vouchers.length === 0 ? (
          <p className="py-8 text-center text-slate-500">Chưa có voucher nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Mã</th><th className="p-3">Ưu đãi</th><th className="p-3">Điều kiện</th>
                  <th className="p-3">Hạn dùng</th><th className="p-3">Lượt dùng</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher) => (
                  <tr key={voucher._id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 font-bold text-slate-900">{voucher.code}<div className="text-xs font-normal text-slate-500">{voucher.description}</div></td>
                    <td className="p-3">{voucher.discountType === "percent" ? `${voucher.discountValue}%` : money(voucher.discountValue)}</td>
                    <td className="p-3">{money(voucher.minOrderAmount)}</td>
                    <td className="p-3">{new Date(voucher.expiresAt).toLocaleString("vi-VN")}</td>
                    <td className="p-3">{voucher.usageCount}{voucher.maxUses === undefined ? " / ∞" : ` / ${voucher.maxUses}`}</td>
                    <td className="p-3"><Tag color={voucher.isActive ? "green" : "default"}>{voucher.isActive ? "Đang hoạt động" : "Đã tắt"}</Tag></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(voucher); setForm(toForm(voucher)); setNotice(""); }}>
                          Sửa
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void toggleActive(voucher)}>
                          {voucher.isActive ? "Tắt" : "Bật"}
                        </Button>
                        <Button size="sm" variant="outline" leftIcon={<HistoryOutlined />} onClick={() => void showUsage(voucher)}>
                          Lịch sử
                        </Button>
                        <Button size="sm" variant="danger-outline" onClick={() => void deleteVoucher(voucher)}>
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {usageVoucher && (
        <Card className="!rounded-2xl !border-slate-200" title={`Lịch sử sử dụng: ${usageVoucher.code}`}>
          <div className="mb-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setUsageVoucher(null)}>Đóng lịch sử</Button>
          </div>
          {usageHistory.length === 0 ? (
            <p className="py-5 text-center text-sm text-slate-500">Voucher chưa được sử dụng.</p>
          ) : (
            <div className="space-y-2">
              {usageHistory.map((usage) => (
                <div key={usage._id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                  <span>{usage.customerName} · {usage.invoiceCode} · {new Date(usage.usedAt).toLocaleString("vi-VN")}</span>
                  <span>Đơn {money(usage.subtotal)} · giảm {money(usage.discountAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
