import { useCallback, useEffect, useState } from "react";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  ContainerOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  CloseOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

import {
  fetchGoodsReceipts,
  createGoodsReceipt,
  completeGoodsReceipt,
  deleteGoodsReceipt,
  type GoodsReceipt,
  type GoodsReceiptItem,
} from "../../services/goods-receipt.service";
import { Pagination } from "../../shared/ui";
import { fetchSuppliers, type Supplier } from "../../services/supplier.service";
import { fetchProducts, type Product } from "../../services/catalog-management.service";

// ─── helpers ────────────────────────────────────────────────────────────────

const vnd = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getSupplierName(supplier: GoodsReceipt["supplier"]): string {
  if (!supplier) return "—";
  if (typeof supplier === "string") return supplier;
  return supplier.name || "—";
}

// ─── sub-components ──────────────────────────────────────────────────────────

const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50";

const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

function StatusBadge({ status }: { status: "draft" | "completed" }) {
  if (status === "completed") {
    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold"
        style={{
          background: "var(--status-success-bg)",
          color: "var(--status-success-text)",
          borderColor: "var(--status-success-bg)",
        }}
      >
        <CheckCircleOutlined />
        Đã hoàn tất
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold"
      style={{
        background: "var(--status-warning-bg)",
        color: "var(--status-warning-text)",
        borderColor: "var(--status-warning-bg)",
      }}
    >
      Nháp
    </span>
  );
}

// ─── receipt form item ────────────────────────────────────────────────────────

type FormItem = {
  id: string; // local key
  product: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitCost: number;
};

function newFormItem(): FormItem {
  return {
    id: Math.random().toString(36).slice(2),
    product: "",
    productName: "",
    sku: "",
    unit: "",
    quantity: 1,
    unitCost: 0,
  };
}

// ─── receipt modal ────────────────────────────────────────────────────────────

function ReceiptModal({
  receipt,
  suppliers,
  products,
  onClose,
  onSaved,
}: {
  receipt: GoodsReceipt | null; // null → create mode
  suppliers: Supplier[];
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isView = receipt?.status === "completed";

  const [supplierId, setSupplierId] = useState<string>(
    receipt
      ? typeof receipt.supplier === "string"
        ? receipt.supplier
        : receipt.supplier._id
      : "",
  );
  const [items, setItems] = useState<FormItem[]>(() => {
    if (receipt && receipt.items.length > 0) {
      return receipt.items.map((it: GoodsReceiptItem) => ({
        id: Math.random().toString(36).slice(2),
        product: it.product,
        productName: it.productName || "",
        sku: it.sku || "",
        unit: it.unit || "",
        quantity: it.quantity,
        unitCost: it.unitCost,
      }));
    }
    return [newFormItem()];
  });
  const [note, setNote] = useState(receipt?.note || "");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  // keyboard dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving && !completing) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saving, completing, onClose]);

  const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

  const addItem = () => setItems((prev) => [...prev, newFormItem()]);

  const removeItem = (id: string) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));

  const setItemField = <K extends keyof FormItem>(id: string, field: K, value: FormItem[K]) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    );
  };

  const selectProduct = (itemId: string, productId: string) => {
    const prod = products.find((p) => p._id === productId);
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          product: productId,
          productName: prod?.name || "",
          sku: prod?.sku || "",
          unit: prod?.unit || "",
          unitCost: prod?.costPrice ?? it.unitCost,
        };
      }),
    );
  };

  const validate = (): boolean => {
    if (!supplierId) {
      setError("Vui lòng chọn nhà cung cấp.");
      return false;
    }
    for (const it of items) {
      if (!it.product) {
        setError("Vui lòng chọn sản phẩm cho tất cả các dòng.");
        return false;
      }
      if (it.quantity <= 0) {
        setError("Số lượng phải lớn hơn 0.");
        return false;
      }
      if (it.unitCost < 0) {
        setError("Đơn giá không được âm.");
        return false;
      }
    }
    return true;
  };

  const buildPayload = () => ({
    supplier: supplierId,
    items: items.map((it) => ({
      product: it.product,
      quantity: it.quantity,
      unitCost: it.unitCost,
    })),
    note: note.trim() || undefined,
  });

  const handleSaveDraft = async () => {
    if (!validate()) return;
    try {
      setError("");
      setSaving(true);
      await createGoodsReceipt(buildPayload());
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Không thể lưu phiếu nhập."));
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteNow = async () => {
    if (!validate()) return;
    if (!window.confirm("Xác nhận hoàn tất phiếu nhập ngay? Thao tác này không thể hoàn tác.")) return;
    try {
      setError("");
      setCompleting(true);
      const created = await createGoodsReceipt({ ...buildPayload() });
      await completeGoodsReceipt(created._id);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Không thể hoàn tất phiếu nhập."));
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !completing) onClose();
      }}
    >
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* modal header */}
        <div
          className="flex items-center justify-between rounded-t-2xl px-6 py-4"
          style={{ background: "var(--brand)" }}
        >
          <div className="flex items-center gap-3 text-white">
            <ContainerOutlined className="text-xl" />
            <h2 className="text-lg font-bold">
              {isView
                ? `Phiếu nhập kho — ${receipt?.receiptNumber}`
                : receipt
                ? `Chỉnh sửa phiếu — ${receipt.receiptNumber}`
                : "Tạo phiếu nhập kho mới"}
            </h2>
            {receipt && <StatusBadge status={receipt.status} />}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || completing}
            className="text-white/80 hover:text-white transition"
            aria-label="Đóng"
          >
            <CloseOutlined className="text-lg" />
          </button>
        </div>

        {/* modal body */}
        <div className="p-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            >
              <ExclamationCircleOutlined className="mt-0.5 shrink-0" />
              <span className="flex-1 break-words">{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Đóng"
              >
                <CloseOutlined />
              </button>
            </div>
          )}

          {/* supplier */}
          <div>
            <label className={labelClass} htmlFor="modal-supplier">
              Nhà cung cấp <span className="text-rose-500">*</span>
            </label>
            {isView ? (
              <p className="text-sm font-semibold text-slate-800">
                {getSupplierName(receipt!.supplier)}
              </p>
            ) : (
              <select
                id="modal-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                disabled={saving || completing}
                className={`${inputClass} cursor-pointer appearance-none`}
              >
                <option value="">— Chọn nhà cung cấp —</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                    {s.contactPerson ? ` (${s.contactPerson})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* items table */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">
                Danh sách vật tư & phụ kiện nhập <span className="text-rose-500">*</span>
              </p>
              {!isView && (
                <button
                  type="button"
                  onClick={addItem}
                  disabled={saving || completing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <PlusOutlined />
                  + Thêm dòng vật tư
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[780px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-bold">Sản phẩm</th>
                    <th className="px-3 py-3 font-bold w-24">SKU</th>
                    <th className="px-3 py-3 font-bold w-20">Đơn vị</th>
                    <th className="px-3 py-3 font-bold w-28">Số lượng</th>
                    <th className="px-3 py-3 font-bold w-36">Đơn giá nhập</th>
                    <th className="px-3 py-3 font-bold w-36 text-right">Thành tiền</th>
                    {!isView && <th className="px-3 py-3 w-12" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3">
                        {isView ? (
                          <span className="font-medium text-slate-800">
                            {it.productName || it.product}
                          </span>
                        ) : (
                          <select
                            value={it.product}
                            onChange={(e) => selectProduct(it.id, e.target.value)}
                            disabled={saving || completing}
                            className={`${inputClass} py-2`}
                          >
                            <option value="">— Chọn sản phẩm —</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-xs">{it.sku || "—"}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs">{it.unit || "—"}</td>
                      <td className="px-3 py-3">
                        {isView ? (
                          <span className="font-medium">{it.quantity}</span>
                        ) : (
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={(e) =>
                              setItemField(it.id, "quantity", Math.max(1, Number(e.target.value)))
                            }
                            disabled={saving || completing}
                            className={`${inputClass} py-2 w-24`}
                          />
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={vnd(it.unitCost)}
                            className={`${inputClass} py-2 w-36 bg-slate-100 text-slate-600 font-mono cursor-not-allowed select-none`}
                            title="Đơn giá vốn cố định theo Quản lý hàng hóa, không thể chỉnh sửa"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-800">
                        {vnd(it.quantity * it.unitCost)}
                      </td>
                      {!isView && (
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => removeItem(it.id)}
                            disabled={items.length === 1 || saving || completing}
                            title="Xóa dòng"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <DeleteOutlined />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* note */}
          <div>
            <label className={labelClass} htmlFor="modal-note">
              Ghi chú
            </label>
            {isView ? (
              <p className="text-sm text-slate-600">{receipt?.note || "—"}</p>
            ) : (
              <textarea
                id="modal-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={saving || completing}
                placeholder="Ghi chú thêm (không bắt buộc)"
                className={`${inputClass} resize-none`}
              />
            )}
          </div>

          {/* view-mode: completed details */}
          {isView && receipt && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-sm text-slate-600">
              {receipt.completedAt && (
                <p>
                  <span className="font-semibold text-slate-700">Ngày hoàn tất:</span>{" "}
                  {formatDate(receipt.completedAt)}
                </p>
              )}
              {receipt.createdAt && (
                <p>
                  <span className="font-semibold text-slate-700">Ngày tạo:</span>{" "}
                  {formatDate(receipt.createdAt)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* modal footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/60 px-6 py-4 rounded-b-2xl">
          <div>
            <p className="text-xs text-slate-500">Tổng tiền</p>
            <p className="text-xl font-bold" style={{ color: "var(--brand)" }}>
              {vnd(totalAmount)}
            </p>
          </div>

          {isView ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Đóng
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || completing}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => void handleSaveDraft()}
                disabled={saving || completing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
              >
                {saving && <LoadingOutlined className="animate-spin" />}
                Lưu nháp
              </button>

              <button
                type="button"
                onClick={() => void handleCompleteNow()}
                disabled={saving || completing}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-50"
                style={{ background: "var(--brand)" }}
              >
                {completing && <LoadingOutlined className="animate-spin" />}
                <CheckCircleOutlined />
                Hoàn tất ngay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function GoodsReceiptPage() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);

  // confirm complete
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // confirm delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // dropdown data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const limit = 15;

  // ── load list ──
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const result = await fetchGoodsReceipts({
        page,
        limit,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      setReceipts(result.data);
      setTotal(result.pagination.total);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Không thể tải danh sách phiếu nhập kho."));
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, reloadKey]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── load dropdown data once ──
  useEffect(() => {
    void fetchSuppliers({ limit: 200 }).then((env) => {
      setSuppliers(Array.isArray(env.data) ? env.data : []);
    });
    void fetchProducts().then((res) => {
      setProducts(res.data ?? []);
    });
  }, []);

  // ── actions ──
  const handleComplete = async (id: string) => {
    try {
      setActionError("");
      setCompletingId(id);
      await completeGoodsReceipt(id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(getErrorMessage(err, "Không thể hoàn tất phiếu nhập."));
    } finally {
      setCompletingId(null);
      setConfirmCompleteId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setActionError("");
      setDeletingId(id);
      await deleteGoodsReceipt(id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(getErrorMessage(err, "Không thể xóa phiếu nhập."));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };


  return (
    <div className="min-h-full space-y-6 pb-8" style={{ color: "var(--text-main)" }}>
      {/* ── Header ── */}
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: "var(--brand)",
              color: "#ffffff",
              boxShadow: "0 8px 20px rgba(0, 155, 114, 0.18)",
            }}
          >
            <ContainerOutlined className="text-2xl" />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
              Phiếu Nhập Kho Vật Tư
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Quản lý chứng từ nhập cơ, bóng, nỉ, lơ và hàng hóa F&B từ nhà phân phối.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedReceipt(null);
            setModalOpen(true);
          }}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          style={{ background: "var(--brand)" }}
        >
          <PlusOutlined />
          Tạo phiếu nhập
        </button>
      </section>

      {/* ── Error Banner ── */}
      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <ExclamationCircleOutlined className="mt-0.5 shrink-0 text-base" />
            <div>
              <p className="font-semibold">Không thể tải dữ liệu</p>
              <p className="mt-1 break-words">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold hover:bg-rose-100"
          >
            <ReloadOutlined />
            Thử lại
          </button>
        </div>
      )}

      {/* ── Action Error Banner ── */}
      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <ExclamationCircleOutlined className="mt-0.5 shrink-0 text-base" />
          <span className="flex-1 break-words">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label="Đóng"
          >
            <CloseOutlined />
          </button>
        </div>
      )}

      {/* ── Filter bar ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">Danh sách phiếu nhập</h2>
            <p className="mt-1 text-sm text-slate-500">Tìm kiếm và lọc phiếu nhập kho.</p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
          >
            <ReloadOutlined className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          {/* search */}
          <div className="relative min-w-0 flex-1">
            <SearchOutlined className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm mã phiếu, nhà cung cấp..."
              className={`${inputClass} pl-10 pr-10`}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <CloseOutlined />
              </button>
            )}
          </div>

          {/* status filter */}
          <div className="w-full lg:w-48">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={`${inputClass} cursor-pointer appearance-none`}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Nháp</option>
              <option value="completed">Hoàn tất</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Table ── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-800">Phiếu nhập kho</h2>
            <p className="mt-1 text-xs text-slate-500">Danh sách phiếu nhập từ nhà cung cấp</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {loading ? "Đang cập nhật" : `${total} phiếu`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50/90 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4 font-bold">Mã phiếu</th>
                <th className="px-4 py-4 font-bold">Nhà cung cấp</th>
                <th className="px-4 py-4 font-bold">Số dòng</th>
                <th className="px-4 py-4 font-bold text-right">Tổng tiền</th>
                <th className="px-4 py-4 font-bold">Trạng thái</th>
                <th className="px-4 py-4 font-bold">Ngày tạo</th>
                <th className="px-5 py-4 text-center font-bold">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && receipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                      <LoadingOutlined className="text-3xl animate-spin text-emerald-600" />
                      <p className="text-sm font-medium text-slate-600">
                        Đang tải danh sách phiếu nhập kho...
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && receipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <ContainerOutlined className="text-3xl" />
                      </div>
                      <h3 className="mt-4 font-bold text-slate-700">
                        {loadError
                          ? "Chưa thể hiển thị dữ liệu"
                          : search.trim()
                          ? "Không tìm thấy phiếu nhập"
                          : "Chưa có phiếu nhập nào"}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {loadError
                          ? "Kiểm tra kết nối máy chủ rồi thử lại."
                          : search.trim()
                          ? "Hãy thử từ khóa khác."
                          : 'Nhấn "Tạo phiếu nhập" để bắt đầu.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {receipts.map((r) => (
                <tr key={r._id} className="group transition-colors hover:bg-emerald-50/30">
                  <td className="px-5 py-4">
                    <span className="font-mono text-sm font-semibold text-slate-800">
                      {r.receiptNumber}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{getSupplierName(r.supplier)}</td>
                  <td className="px-4 py-4 text-slate-500">{r.items.length} sản phẩm</td>
                  <td className="px-4 py-4 text-right font-semibold text-slate-800">
                    {vnd(r.totalAmount)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-xs">{formatDate(r.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* View */}
                      <button
                        type="button"
                        title="Xem chi tiết"
                        onClick={() => {
                          setSelectedReceipt(r);
                          setModalOpen(true);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <EyeOutlined />
                      </button>

                      {/* Complete — only draft */}
                      {r.status === "draft" && (
                        <button
                          type="button"
                          title="Hoàn tất phiếu nhập"
                          disabled={completingId === r._id}
                          onClick={() => setConfirmCompleteId(r._id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {completingId === r._id ? (
                            <LoadingOutlined className="animate-spin" />
                          ) : (
                            <CheckCircleOutlined />
                          )}
                        </button>
                      )}

                      {/* Delete — only draft */}
                      {r.status === "draft" && (
                        <button
                          type="button"
                          title="Xóa phiếu nhập"
                          disabled={deletingId === r._id}
                          onClick={() => setConfirmDeleteId(r._id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === r._id ? (
                            <LoadingOutlined className="animate-spin" />
                          ) : (
                            <DeleteOutlined />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination đồng bộ */}
        <Pagination
          current={page}
          pageSize={limit}
          total={total}
          unit="phiếu nhập"
          onChange={(p) => setPage(p)}
        />
      </section>

      {/* ── Confirm Complete Modal ── */}
      {confirmCompleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800">Xác nhận hoàn tất phiếu nhập</h3>
            <p className="mt-2 text-sm text-slate-600">
              Phiếu nhập sẽ được hoàn tất và hàng hóa sẽ được cập nhật vào kho. Thao tác này không
              thể hoàn tác.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmCompleteId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleComplete(confirmCompleteId)}
                disabled={!!completingId}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--brand)" }}
              >
                {completingId && <LoadingOutlined className="animate-spin" />}
                <CheckCircleOutlined />
                Xác nhận hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-rose-700">Xác nhận xóa phiếu nhập</h3>
            <p className="mt-2 text-sm text-slate-600">
              Phiếu nhập nháp này sẽ bị xóa vĩnh viễn. Thao tác không thể hoàn tác.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingId && <LoadingOutlined className="animate-spin" />}
                <DeleteOutlined />
                Xóa phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {modalOpen && (
        <ReceiptModal
          key={selectedReceipt?._id ?? "new"}
          receipt={selectedReceipt}
          suppliers={suppliers}
          products={products}
          onClose={() => {
            setModalOpen(false);
            setSelectedReceipt(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setSelectedReceipt(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
