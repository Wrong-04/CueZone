import { useEffect, useState } from "react";

import {
  Search,
  RefreshCw,
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

import {
  fetchInventory,
  type StockProduct,
  type InventoryPage,
  type StockStatus,
} from "../../services/inventory.service";

const categories: Record<string, string> = {
  accessory: "Phụ kiện billiard",
  drink: "Đồ uống",
  food: "Đồ ăn",
  snack: "Ăn vặt",
  ingredient: "Nguyên liệu",
};

const statusLabels: Record<string, string> = {
  all: "Tất cả trạng thái",
  in_stock: "Còn hàng",
  low: "Sắp hết",
  out: "Hết hàng",
};

const PAGE_SIZE = 20;

const formatMoney = (value: number = 0) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const controlClass =
  "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200";

function StockStatusBadge({ status }: { status: StockStatus }) {
  const styles: Record<StockStatus, React.CSSProperties> = {
    in_stock: {
      background: "var(--status-success-bg)",
      color: "var(--status-success-text)",
    },
    low: {
      background: "var(--status-warning-bg)",
      color: "var(--status-warning-text)",
    },
    out: {
      background: "var(--status-danger-bg)",
      color: "var(--status-danger-text)",
    },
  };

  const icons: Record<StockStatus, React.ReactNode> = {
    in_stock: <CheckCircle size={14} />,
    low: <AlertTriangle size={14} />,
    out: <XCircle size={14} />,
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={styles[status]}
    >
      {icons[status]}
      {statusLabels[status]}
    </span>
  );
}

export default function StockCatalogPage() {
  const { user } = useAuth();

  const isStaff = user?.role === "staff";

  const [draft, setDraft] = useState("");

  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("");

  const [status, setStatus] = useState("all");

  const [page, setPage] = useState(1);

  const [reload, setReload] = useState(0);

  const [result, setResult] = useState<InventoryPage | null>(null);

  const [busy, setBusy] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(draft.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    let active = true;

    setBusy(true);
    setError("");

    fetchInventory({
      search,
      category,
      status,
      page,
      limit: PAGE_SIZE,
    })
      .then((data) => {
        if (!active) return;
        setResult(data);
      })
      .catch((err: unknown) => {
        if (!active) return;

        setResult(null);

        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu tồn kho.");
      })
      .finally(() => {
        if (active) {
          setBusy(false);
        }
      });

    return () => {
      active = false;
    };
  }, [search, category, status, page, reload]);

  const list = result?.items ?? [];

  const total = result?.total ?? 0;

  const totalPages = Math.max(1, result?.pages ?? 1);

  return (
    <div
      className="space-y-5"
      style={{
        color: "var(--text-main)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Package
              size={26}
              style={{
                color: "var(--brand)",
              }}
            />

            <h1 className="text-2xl font-bold">Danh mục hàng hóa & Tồn kho</h1>
          </div>

          <p
            className="mt-2 text-sm"
            style={{
              color: "var(--text-secondary)",
            }}
          >
            {isStaff
              ? "Tra cứu tồn kho F&B tại quầy POS."
              : "Tra cứu hàng hóa, giá bán và tình trạng tồn kho tại quán."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setReload((value) => value + 1)}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            background: "var(--brand)",
          }}
        >
          <RefreshCw size={17} className={busy ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      <div
        className="space-y-4 rounded-xl bg-white p-4 shadow-sm"
        style={{
          border: "1px solid var(--border-standard)",
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <label
            className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border px-3"
            style={{
              borderColor: "var(--border-standard)",
            }}
          >
            <Search
              size={18}
              style={{
                color: "var(--text-muted)",
              }}
            />

            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tìm tên hàng hoặc mã SKU..."
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
          </label>

          <div className="flex items-center gap-2">
            <Filter
              size={17}
              style={{
                color: "var(--text-secondary)",
              }}
            />

            <select
              className={controlClass}
              style={{
                borderColor: "var(--border-standard)",
              }}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả danh mục</option>

              {Object.entries(categories)
                .filter(([key]) => !isStaff || ["drink", "food", "snack"].includes(key))
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </div>

          <select
            className={controlClass}
            style={{
              borderColor: "var(--border-standard)",
            }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm"
            style={{
              background: "var(--status-danger-bg)",
              color: "var(--status-danger-text)",
            }}
          >
            <XCircle size={18} />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead
              style={{
                background: "var(--table-header-bg)",
                color: "var(--table-header-text)",
              }}
            >
              <tr>
                {[
                  "Mã SKU",
                  "Hàng hóa",
                  "Danh mục",
                  "Đơn vị",
                  "Tồn kho",
                  "Mức tối thiểu",
                  ...(!isStaff ? ["Giá nhập"] : []),
                  "Giá bán",
                  "Trạng thái",
                ].map((column) => (
                  <th key={column} className="whitespace-nowrap p-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!busy &&
                list.map((product: StockProduct) => (
                  <tr
                    key={product._id}
                    className="transition-colors hover:bg-gray-50"
                    style={{
                      borderBottom: "1px solid var(--border-divider)",
                    }}
                  >
                    <td className="p-3 font-medium">{product.sku}</td>

                    <td className="p-3">{product.name}</td>

                    <td className="p-3">{categories[product.category] ?? product.category}</td>

                    <td className="p-3">{product.unit}</td>

                    <td className="p-3 font-semibold">{product.stock}</td>

                    <td className="p-3">{product.minStock}</td>

                    {!isStaff && (
                      <td className="p-3 whitespace-nowrap">
                        {product.costPrice == null ? "—" : formatMoney(product.costPrice)}
                      </td>
                    )}

                    <td className="p-3 whitespace-nowrap">{formatMoney(product.salePrice)}</td>

                    <td className="p-3">
                      <StockStatusBadge status={product.stockStatus} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {busy && (
            <div className="flex flex-col items-center justify-center gap-3 py-14">
              <RefreshCw
                size={26}
                className="animate-spin"
                style={{
                  color: "var(--brand)",
                }}
              />

              <p
                className="text-sm"
                style={{
                  color: "var(--text-secondary)",
                }}
              >
                Đang tải dữ liệu tồn kho...
              </p>
            </div>
          )}

          {!busy && !error && list.length === 0 && (
            <div
              className="flex flex-col items-center justify-center gap-2 py-14"
              style={{
                color: "var(--text-muted)",
              }}
            >
              <Package size={38} strokeWidth={1.5} />

              <p className="font-medium">Không có hàng hóa phù hợp</p>

              <p className="text-xs">Thử thay đổi từ khóa hoặc bộ lọc.</p>
            </div>
          )}
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm"
          style={{
            color: "var(--text-secondary)",
            borderColor: "var(--border-divider)",
          }}
        >
          <span>
            Tổng cộng: <strong>{total}</strong> hàng hóa
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy || page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="flex items-center gap-1 rounded-lg border px-3 py-1.5 disabled:opacity-40"
              style={{
                borderColor: "var(--border-standard)",
              }}
            >
              <ChevronLeft size={16} />
              Trước
            </button>

            <span>
              Trang {page} / {totalPages}
            </span>

            <button
              type="button"
              disabled={busy || page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="flex items-center gap-1 rounded-lg border px-3 py-1.5 disabled:opacity-40"
              style={{
                borderColor: "var(--border-standard)",
              }}
            >
              Sau
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
