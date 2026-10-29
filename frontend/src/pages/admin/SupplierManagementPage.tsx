import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  Truck,
  Plus,
  Search,
  Pencil,
  Power,
  RotateCcw,
  X,
  Save,
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Users,
  PackageOpen,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock3,
  FileText,
} from "lucide-react";

import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
  type Supplier,
} from "../../services/supplier.service";

type SupplierForm = {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  note: string;
};

type SupplierStatusInfo = {
  isActive?: boolean;
  active?: boolean;
  isDeleted?: boolean;
  status?: string;
  deletedAt?: string | null;
};

const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getSupplierStatus(supplier: Supplier, filterStatus: string): boolean {
  const item = supplier as Supplier & SupplierStatusInfo;

  if (
    item.isDeleted === true ||
    item.isActive === false ||
    item.active === false ||
    item.deletedAt != null
  ) {
    return false;
  }

  if (item.isActive === true || item.active === true) {
    return true;
  }

  if (typeof item.status === "string") {
    const normalized = item.status.trim().toLowerCase();

    if (
      [
        "inactive",
        "disabled",
        "deleted",
        "suspended",
        "ngừng hợp tác",
        "ngung hop tac",
        "ngừng hoạt động",
        "ngung hoat dong",
      ].includes(normalized)
    ) {
      return false;
    }

    if (
      [
        "active",
        "enabled",
        "working",
        "đang hợp tác",
        "dang hop tac",
        "đang hoạt động",
        "dang hoat dong",
      ].includes(normalized)
    ) {
      return true;
    }
  }

  if (filterStatus === "inactive") {
    return false;
  }

  return true;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-1.5",
        "whitespace-nowrap rounded-full border px-3 py-1.5",
        "text-xs font-semibold",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700",
      ].join(" ")}
    >
      {active ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}

      {active ? "Đang hợp tác" : "Ngừng hợp tác"}
    </span>
  );
}

function IconButton({
  title,
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex h-9 w-9 items-center justify-center",
        "rounded-xl border transition duration-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        danger
          ? "border-rose-100 bg-white text-rose-600 hover:border-rose-200 hover:bg-rose-50"
          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function SupplierManagementPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const result = await fetchSuppliers({
        search: search.trim(),
        status,
        limit: 100,
      });

      setSuppliers(Array.isArray(result?.data) ? result.data : []);
    } catch (error) {
      setSuppliers([]);
      setLoadError(getErrorMessage(error, "Không thể tải danh sách nhà cung cấp."));
    } finally {
      setLoading(false);
    }
  }, [search, status, reloadKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreateModal = () => {
    setEditing(null);
    setActionError("");
    setModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditing(supplier);
    setActionError("");
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
  };

  const handleStatusChange = async (supplier: Supplier) => {
    const active = getSupplierStatus(supplier, status);

    const message = active
      ? `Bạn có chắc muốn ngừng hợp tác với "${supplier.name}"? Nhà cung cấp sẽ không bị xóa vĩnh viễn.`
      : `Bạn có muốn khôi phục hợp tác với "${supplier.name}"?`;

    if (!window.confirm(message)) {
      return;
    }

    try {
      setActionError("");
      setActionLoadingId(supplier._id);

      if (active) {
        await deleteSupplier(supplier._id);
      } else {
        await restoreSupplier(supplier._id);
      }

      await load();
    } catch (error) {
      setActionError(
        getErrorMessage(
          error,
          active
            ? "Không thể ngừng hợp tác với nhà cung cấp."
            : "Không thể khôi phục nhà cung cấp.",
        ),
      );
    } finally {
      setActionLoadingId("");
    }
  };

  const activeCount = suppliers.filter((supplier) => getSupplierStatus(supplier, status)).length;

  const inactiveCount = suppliers.length - activeCount;

  return (
    <div className="min-h-full space-y-6 pb-8" style={{ color: "var(--text-main)" }}>
      {/* Header */}
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
            <Truck size={25} strokeWidth={2.1} />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
              Quản lý nhà cung cấp
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Quản lý đối tác, thông tin liên hệ và tình trạng hợp tác của quán trên một giao diện
              thống nhất.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          style={{ background: "var(--brand)" }}
        >
          <Plus size={19} />
          Thêm nhà cung cấp
        </button>
      </section>

      {/* Error banner */}
      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Không thể tải dữ liệu</p>
              <p className="mt-1 break-words">{loadError}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold hover:bg-rose-100"
          >
            <RefreshCw size={15} />
            Thử lại
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Kết quả hiển thị</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
                {loading ? "—" : suppliers.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">Tối đa 100 nhà cung cấp</p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Building2 size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Đang hợp tác trong kết quả</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-700">
                {loading ? "—" : activeCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">Theo dữ liệu hiện đang hiển thị</p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Ngừng hợp tác trong kết quả</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-rose-600">
                {loading ? "—" : inactiveCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">Theo dữ liệu hiện đang hiển thị</p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Power size={24} />
            </div>
          </div>
        </div>
      </section>

      {/* Search and filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">Danh sách đối tác</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tìm kiếm và quản lý thông tin nhà cung cấp.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên, người liên hệ, số điện thoại, email..."
              aria-label="Tìm kiếm nhà cung cấp"
              className={`${inputClass} pl-11 pr-10`}
            />

            {search && (
              <button
                type="button"
                aria-label="Xóa nội dung tìm kiếm"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="relative w-full lg:w-56">
            <Users
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Lọc trạng thái nhà cung cấp"
              className={`${inputClass} cursor-pointer appearance-none pl-10 pr-10`}
            >
              <option value="active">Đang hợp tác</option>
              <option value="inactive">Ngừng hợp tác</option>
              <option value="all">Tất cả trạng thái</option>
            </select>

            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </div>
        </div>

        {(search.trim() || status !== "active") && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Bộ lọc:</span>

            {search.trim() && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
                Từ khóa: {search.trim()}
                <button
                  type="button"
                  aria-label="Xóa từ khóa"
                  onClick={() => setSearch("")}
                  className="hover:text-rose-600"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {status !== "active" && (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
                {status === "inactive" ? "Ngừng hợp tác" : "Tất cả trạng thái"}
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("all");
              }}
              className="font-semibold text-emerald-700 hover:underline"
            >
              Xóa từ khóa
            </button>
          </div>
        )}
      </section>

      {/* Supplier table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-800">Nhà cung cấp</h2>
            <p className="mt-1 text-xs text-slate-500">Thông tin liên hệ và trạng thái hợp tác</p>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {loading ? "Đang cập nhật" : `${suppliers.length} kết quả`}
          </span>
        </div>

        {actionError && (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:mx-5"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1 break-words">{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError("")}
              aria-label="Đóng thông báo lỗi"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50/90 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4 font-bold">Nhà cung cấp</th>
                <th className="px-4 py-4 font-bold">Người liên hệ</th>
                <th className="px-4 py-4 font-bold">Điện thoại</th>
                <th className="px-4 py-4 font-bold">Email</th>
                <th className="px-4 py-4 font-bold">Địa chỉ</th>
                <th className="px-4 py-4 font-bold">Trạng thái</th>
                <th className="px-5 py-4 text-center font-bold">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && suppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                      <Loader2 size={30} className="animate-spin text-emerald-600" />
                      <p className="text-sm font-medium text-slate-600">
                        Đang tải danh sách nhà cung cấp...
                      </p>
                      <p className="text-xs">Vui lòng đợi trong giây lát.</p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                suppliers.map((supplier) => {
                  const active = getSupplierStatus(supplier, status);

                  const actionLoading = actionLoadingId === supplier._id;

                  return (
                    <tr
                      key={supplier._id}
                      className="group transition-colors hover:bg-emerald-50/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={[
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                              active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500",
                            ].join(" ")}
                          >
                            <Building2 size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-[220px] break-words font-semibold leading-5 text-slate-800">
                              {supplier.name || "Chưa có tên"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">Nhà cung cấp</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Users size={15} className="shrink-0 text-slate-400" />
                          <span className="max-w-[160px] break-words">
                            {supplier.contactPerson || "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {supplier.phone ? (
                          <a
                            href={`tel:${supplier.phone}`}
                            className="inline-flex items-center gap-2 whitespace-nowrap text-slate-600 transition hover:text-emerald-700"
                          >
                            <Phone size={15} className="shrink-0 text-slate-400" />
                            {supplier.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {supplier.email ? (
                          <a
                            href={`mailto:${supplier.email}`}
                            title={supplier.email}
                            className="inline-flex max-w-[200px] items-center gap-2 text-slate-600 transition hover:text-emerald-700"
                          >
                            <Mail size={15} className="shrink-0 text-slate-400" />
                            <span className="truncate">{supplier.email}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {supplier.address ? (
                          <div
                            title={supplier.address}
                            className="flex max-w-[220px] items-start gap-2 text-slate-600"
                          >
                            <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                            <span className="line-clamp-2 break-words leading-5">
                              {supplier.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge active={active} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <IconButton
                            title="Chỉnh sửa nhà cung cấp"
                            onClick={() => openEditModal(supplier)}
                          >
                            <Pencil size={16} />
                          </IconButton>

                          <IconButton
                            title={active ? "Ngừng hợp tác" : "Khôi phục hợp tác"}
                            danger={active}
                            disabled={actionLoading}
                            onClick={() => void handleStatusChange(supplier)}
                          >
                            {actionLoading ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : active ? (
                              <Power size={17} />
                            ) : (
                              <RotateCcw size={17} />
                            )}
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!loading && suppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        {loadError ? <AlertCircle size={32} /> : <PackageOpen size={32} />}
                      </div>

                      <h3 className="mt-4 font-bold text-slate-700">
                        {loadError
                          ? "Chưa thể hiển thị dữ liệu"
                          : search.trim()
                            ? "Không tìm thấy nhà cung cấp"
                            : "Chưa có nhà cung cấp phù hợp"}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {loadError
                          ? "Hãy kiểm tra kết nối máy chủ rồi thử tải lại."
                          : search.trim()
                            ? "Hãy thử từ khóa khác hoặc xóa bộ lọc tìm kiếm."
                            : "Bạn có thể thêm nhà cung cấp mới để bắt đầu quản lý đối tác."}
                      </p>

                      {loadError ? (
                        <button
                          type="button"
                          onClick={() => setReloadKey((value) => value + 1)}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                          style={{ background: "var(--brand)" }}
                        >
                          <RefreshCw size={16} />
                          Thử tải lại
                        </button>
                      ) : search.trim() ? (
                        <button
                          type="button"
                          onClick={() => setSearch("")}
                          className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Xóa từ khóa tìm kiếm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={openCreateModal}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                          style={{ background: "var(--brand)" }}
                        >
                          <Plus size={17} />
                          Thêm nhà cung cấp
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Hiển thị <span className="font-semibold text-slate-700">{suppliers.length}</span> nhà
            cung cấp trong kết quả hiện tại
          </p>

          <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <CheckCircle2 size={14} className="text-emerald-600" />
            Trạng thái được quản lý trực tiếp từ danh sách
          </p>
        </div>
      </section>

      {/* Create / Edit modal */}
      {modal && (
        <SupplierModal
          key={editing?._id ?? "new-supplier"}
          supplier={editing}
          onClose={closeModal}
          onSaved={async () => {
            closeModal();
            await load();
          }}
        />
      )}
    </div>
  );
}

function SupplierModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<SupplierForm>({
    name: supplier?.name || "",
    contactPerson: supplier?.contactPerson || "",
    phone: supplier?.phone || "",
    email: supplier?.email || "",
    address: supplier?.address || "",
    note: supplier?.note || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, saving]);

  const changeField = (field: keyof SupplierForm, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên nhà cung cấp.");
      return;
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Địa chỉ email không hợp lệ.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload: SupplierForm = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        note: form.note.trim(),
      };

      if (supplier) {
        await updateSupplier(supplier._id, payload);
      } else {
        await createSupplier(payload);
      }

      await onSaved();
    } catch (error) {
      setError(getErrorMessage(error, "Không thể lưu thông tin nhà cung cấp."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[3px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-modal-title"
        className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/50 bg-white shadow-2xl"
      >
        {/* Modal header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-white to-white px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              {supplier ? <Pencil size={21} /> : <Building2 size={22} />}
            </div>

            <div className="min-w-0">
              <h2
                id="supplier-modal-title"
                className="text-xl font-bold tracking-tight text-slate-800"
              >
                {supplier ? "Chỉnh sửa nhà cung cấp" : "Thêm nhà cung cấp"}
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                {supplier
                  ? "Cập nhật thông tin liên hệ và hồ sơ đối tác."
                  : "Nhập thông tin để tạo hồ sơ nhà cung cấp mới."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng biểu mẫu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="max-h-[65vh] space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}

            <section>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-slate-800">Thông tin cơ bản</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className={labelClass}>
                    Tên nhà cung cấp <span className="text-rose-500">*</span>
                  </span>

                  <input
                    autoFocus
                    required
                    maxLength={150}
                    className={inputClass}
                    value={form.name}
                    onChange={(event) => changeField("name", event.target.value)}
                    placeholder="Ví dụ: Công ty phân phối..."
                    disabled={saving}
                  />
                </label>

                <label>
                  <span className={labelClass}>Người liên hệ</span>

                  <span className="relative block">
                    <Users
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      maxLength={100}
                      className={`${inputClass} pl-10`}
                      value={form.contactPerson}
                      onChange={(event) => changeField("contactPerson", event.target.value)}
                      placeholder="Họ và tên"
                      disabled={saving}
                    />
                  </span>
                </label>

                <label>
                  <span className={labelClass}>Số điện thoại</span>

                  <span className="relative block">
                    <Phone
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="tel"
                      maxLength={30}
                      className={`${inputClass} pl-10`}
                      value={form.phone}
                      onChange={(event) => changeField("phone", event.target.value)}
                      placeholder="Nhập số điện thoại"
                      disabled={saving}
                    />
                  </span>
                </label>

                <label className="sm:col-span-2">
                  <span className={labelClass}>Email</span>

                  <span className="relative block">
                    <Mail
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      maxLength={150}
                      className={`${inputClass} pl-10`}
                      value={form.email}
                      onChange={(event) => changeField("email", event.target.value)}
                      placeholder="email@congty.com"
                      disabled={saving}
                    />
                  </span>
                </label>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-slate-800">Địa chỉ và ghi chú</h3>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className={labelClass}>Địa chỉ</span>

                  <span className="relative block">
                    <MapPin
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
                    />

                    <input
                      maxLength={300}
                      className={`${inputClass} pl-10`}
                      value={form.address}
                      onChange={(event) => changeField("address", event.target.value)}
                      placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
                      disabled={saving}
                    />
                  </span>
                </label>

                <label className="block">
                  <span className={labelClass}>Ghi chú</span>

                  <span className="relative block">
                    <FileText
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
                    />

                    <textarea
                      rows={3}
                      maxLength={1000}
                      className={`${inputClass} resize-y pl-10`}
                      value={form.note}
                      onChange={(event) => changeField("note", event.target.value)}
                      placeholder="Thông tin bổ sung về nhà cung cấp..."
                      disabled={saving}
                    />
                  </span>

                  <span className="mt-1.5 block text-right text-xs text-slate-400">
                    {form.note.length}/1000 ký tự
                  </span>
                </label>
              </div>
            </section>
          </div>

          {/* Modal footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <X size={16} />
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--brand)" }}
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}

              {saving ? "Đang lưu..." : supplier ? "Lưu thay đổi" : "Tạo nhà cung cấp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
