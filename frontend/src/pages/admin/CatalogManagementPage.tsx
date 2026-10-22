
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  Check,
  CirclePlus,
  LoaderCircle,
  Package,
  Pencil,
  RefreshCw,
  Search,
  Tags,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";

import {
  fetchCategories,
  fetchProducts,
  createCategory,
  updateCategory,
  createProduct,
  updateProduct,
  setCategoryActiveStatus,
  setProductSaleStatus,
  type Category,
  type Product,
} from "../../services/catalog-management.service";

type Tab = "products" | "categories";
type StatusFilter = "all" | "active" | "inactive";

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  unit: string;
  stock: string;
  minStock: string;
  costPrice: string;
  salePrice: string;
  description: string;
  isForSale: boolean;
};

type CategoryForm = {
  name: string;
  code: string;
  description: string;
};

const EMPTY_PRODUCT_FORM: ProductForm = {
  name: "",
  sku: "",
  category: "",
  unit: "cái",
  stock: "0",
  minStock: "0",
  costPrice: "0",
  salePrice: "0",
  description: "",
  isForSale: true,
};

const EMPTY_CATEGORY_FORM: CategoryForm = {
  name: "",
  code: "",
  description: "",
};

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Đã xảy ra lỗi. Vui lòng thử lại.";
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function getCategoryName(
  product: Product,
  categories: Category[]
): string {
  const category = categories.find(
    (item) =>
      item._id === product.category ||
      item.code === product.category ||
      item.name === product.category
  );

  return category?.name || product.category || "Chưa phân loại";
}

function StatusBadge({
  active,
  children,
}: {
  active: boolean;
  children: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full",
        "border px-3 py-1.5 text-xs font-semibold",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700",
      ].join(" ")}
    >
      <span
        className={[
          "h-2 w-2 rounded-full",
          active ? "bg-emerald-500" : "bg-rose-500",
        ].join(" ")}
      />
      {children}
    </span>
  );
}

function ToggleButton({
  active,
  loading,
  onClick,
  label,
}: {
  active: boolean;
  loading: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={[
        "inline-flex items-center justify-center rounded-xl",
        "p-2 transition-colors disabled:cursor-not-allowed",
        "disabled:opacity-50",
        active
          ? "text-emerald-600 hover:bg-emerald-50"
          : "text-rose-600 hover:bg-rose-50",
      ].join(" ")}
    >
      {loading ? (
        <LoaderCircle className="h-6 w-6 animate-spin" />
      ) : active ? (
        <ToggleRight className="h-7 w-7" />
      ) : (
        <ToggleLeft className="h-7 w-7" />
      )}
    </button>
  );
}

export default function CatalogManagementPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [productModal, setProductModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);
  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [productForm, setProductForm] =
    useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [categoryForm, setCategoryForm] =
    useState<CategoryForm>(EMPTY_CATEGORY_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [categoryResult, productResult] =
        await Promise.all([
          fetchCategories(),
          fetchProducts(),
        ]);

      // Luôn kiểm tra response trước khi đọc dữ liệu.
      setCategories(
        Array.isArray(categoryResult?.data)
          ? categoryResult.data
          : []
      );

      setProducts(
        Array.isArray(productResult?.data)
          ? productResult.data
          : []
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");

    return products.filter((product) => {
      const matchesSearch =
        !keyword ||
        product.name?.toLocaleLowerCase("vi").includes(keyword) ||
        product.sku?.toLocaleLowerCase("vi").includes(keyword) ||
        getCategoryName(product, categories)
          .toLocaleLowerCase("vi")
          .includes(keyword);

      const active = product.isForSale !== false;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && active) ||
        (statusFilter === "inactive" && !active);

      return matchesSearch && matchesStatus;
    });
  }, [products, categories, search, statusFilter]);

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");

    return categories.filter((category) => {
      const matchesSearch =
        !keyword ||
        category.name?.toLocaleLowerCase("vi").includes(keyword) ||
        category.code?.toLocaleLowerCase("vi").includes(keyword) ||
        category.description?.toLocaleLowerCase("vi").includes(keyword);

      const active = category.isActive !== false;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && active) ||
        (statusFilter === "inactive" && !active);

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  function openCreateProduct() {
    setEditingProduct(null);
    setProductForm({
      ...EMPTY_PRODUCT_FORM,
      category: categories[0]?.code || "",
    });
    setError("");
    setProductModal(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);

    setProductForm({
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "",
      unit: product.unit || "cái",
      stock: String(product.stock ?? 0),
      minStock: String(product.minStock ?? 0),
      costPrice: String(product.costPrice ?? 0),
      salePrice: String(product.salePrice ?? 0),
      description: product.description || "",
      isForSale: product.isForSale !== false,
    });

    setError("");
    setProductModal(true);
  }

  function openCreateCategory() {
    setEditingCategory(null);
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setError("");
    setCategoryModal(true);
  }

  function openEditCategory(category: Category) {
    setEditingCategory(category);

    setCategoryForm({
      name: category.name || "",
      code: category.code || "",
      description: category.description || "",
    });

    setError("");
    setCategoryModal(true);
  }

  async function handleProductSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: productForm.name.trim(),
        sku: productForm.sku.trim(),
        category: productForm.category,
        unit: productForm.unit.trim(),
        costPrice: Number(productForm.costPrice),
        salePrice: Number(productForm.salePrice),
        minStock: Number(productForm.minStock),
        supplierId: editingProduct?.supplierId ?? null,
        description: productForm.description.trim(),
        isForSale: productForm.isForSale,
      };

      if (
        !payload.name ||
        !payload.sku ||
        !payload.category ||
        !payload.unit
      ) {
        throw new Error("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      }

      const numericValues = [
        payload.costPrice,
        payload.salePrice,
        payload.minStock,
      ];

      if (
        numericValues.some(
          (value) => !Number.isFinite(value) || value < 0
        )
      ) {
        throw new Error("Giá và tồn kho tối thiểu phải là số không âm.");
      }

      if (editingProduct) {
        await updateProduct(editingProduct._id, payload);
      } else {
        await createProduct(payload);
      }

      setProductModal(false);
      setSuccess(
        editingProduct
          ? "Cập nhật hàng hóa thành công."
          : "Thêm hàng hóa thành công."
      );

      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCategorySubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const name = categoryForm.name.trim();
      const code = categoryForm.code.trim();
      const description = categoryForm.description.trim();

      if (!name || !code) {
        throw new Error("Tên và mã danh mục là bắt buộc.");
      }

      if (editingCategory) {
        await updateCategory(editingCategory._id, {
          name,
          description,
        });
      } else {
        await createCategory({
          name,
          code,
          description,
        });
      }

      setCategoryModal(false);
      setSuccess(
        editingCategory
          ? "Cập nhật danh mục thành công."
          : "Thêm danh mục thành công."
      );

      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product: Product) {
    const nextStatus = product.isForSale === false;
    const confirmed = window.confirm(
      nextStatus
        ? `Bật kinh doanh "${product.name}"?`
        : `Ngừng kinh doanh "${product.name}"?`
    );

    if (!confirmed) return;

    setBusyId(product._id);
    setError("");
    setSuccess("");

    try {
      await setProductSaleStatus(product._id, nextStatus);

      setProducts((current) =>
        current.map((item) =>
          item._id === product._id
            ? { ...item, isForSale: nextStatus }
            : item
        )
      );

      setSuccess(
        nextStatus
          ? "Đã bật kinh doanh hàng hóa."
          : "Đã ngừng kinh doanh hàng hóa."
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleCategory(category: Category) {
    const nextStatus = category.isActive === false;
    const confirmed = window.confirm(
      nextStatus
        ? `Bật sử dụng danh mục "${category.name}"?`
        : `Ngừng sử dụng danh mục "${category.name}"?`
    );

    if (!confirmed) return;

    setBusyId(category._id);
    setError("");
    setSuccess("");

    try {
      await setCategoryActiveStatus(
        category._id,
        nextStatus
      );

      setCategories((current) =>
        current.map((item) =>
          item._id === category._id
            ? { ...item, isActive: nextStatus }
            : item
        )
      );

      setSuccess(
        nextStatus
          ? "Đã bật sử dụng danh mục."
          : "Đã ngừng sử dụng danh mục."
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-7">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Package className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                Quản lý hàng hóa &amp; Danh mục
              </h1>
              <p className="mt-1 text-sm text-slate-500 sm:text-base">
                Quản lý hàng hóa, danh mục, giá bán và thông tin nhập hàng của quán.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              tab === "products"
                ? openCreateProduct
                : openCreateCategory
            }
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            <CirclePlus className="h-5 w-5" />
            {tab === "products"
              ? "Thêm hàng hóa"
              : "Thêm danh mục"}
          </button>
        </header>

        {(error || success) && (
          <div
            role={error ? "alert" : "status"}
            className={[
              "flex items-start justify-between gap-3 rounded-xl border px-4 py-3",
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            <div className="flex items-start gap-2">
              {error ? (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <Check className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <span className="text-sm font-medium">
                {error || success}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
              }}
              aria-label="Đóng thông báo"
              className="rounded-lg p-1 hover:bg-black/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex gap-1 border-b border-slate-200 px-4 pt-2 sm:px-6">
            <button
              type="button"
              onClick={() => {
                setTab("products");
                setSearch("");
                setStatusFilter("all");
              }}
              className={[
                "inline-flex items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition",
                tab === "products"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              <Package className="h-4 w-4" />
              Hàng hóa
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("categories");
                setSearch("");
                setStatusFilter("all");
              }}
              className={[
                "inline-flex items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition",
                tab === "categories"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              <Tags className="h-4 w-4" />
              Danh mục
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {categories.length}
              </span>
            </button>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    tab === "products"
                      ? "Tìm tên hàng hoặc mã SKU..."
                      : "Tìm tên, mã hoặc mô tả danh mục..."
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as StatusFilter
                    )
                  }
                  aria-label="Lọc trạng thái"
                  className="min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">
                    {tab === "products"
                      ? "Đang kinh doanh"
                      : "Đang sử dụng"}
                  </option>
                  <option value="inactive">
                    {tab === "products"
                      ? "Ngừng bán"
                      : "Ngừng sử dụng"}
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  disabled={loading}
                  title="Làm mới dữ liệu"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={[
                      "h-5 w-5",
                      loading ? "animate-spin" : "",
                    ].join(" ")}
                  />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  {tab === "products" ? (
                    <tr>
                      <th className="px-4 py-4 font-bold">SKU</th>
                      <th className="px-4 py-4 font-bold">Hàng hóa</th>
                      <th className="px-4 py-4 font-bold">Danh mục</th>
                      <th className="px-4 py-4 font-bold">Tồn kho</th>
                      <th className="px-4 py-4 font-bold">Giá nhập</th>
                      <th className="px-4 py-4 font-bold">Giá bán</th>
                      <th className="px-4 py-4 font-bold">Trạng thái</th>
                      <th className="px-4 py-4 text-center font-bold">Thao tác</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-4 py-4 font-bold">Mã</th>
                      <th className="px-4 py-4 font-bold">Tên danh mục</th>
                      <th className="px-4 py-4 font-bold">Mô tả</th>
                      <th className="px-4 py-4 font-bold">Trạng thái</th>
                      <th className="px-4 py-4 text-center font-bold">Thao tác</th>
                    </tr>
                  )}
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={tab === "products" ? 8 : 5}
                        className="px-4 py-16 text-center"
                      >
                        <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
                        <p className="mt-3 text-slate-500">
                          Đang tải dữ liệu...
                        </p>
                      </td>
                    </tr>
                  ) : tab === "products" ? (
                    filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center">
                          <Package className="mx-auto h-10 w-10 text-slate-300" />
                          <p className="mt-3 font-semibold text-slate-700">
                            Chưa có hàng hóa phù hợp
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            Thử thay đổi từ khóa hoặc thêm hàng hóa mới.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        const active = product.isForSale !== false;

                        return (
                          <tr
                            key={product._id}
                            className="transition-colors hover:bg-emerald-50/30"
                          >
                            <td className="px-4 py-4 font-semibold text-slate-700">
                              {product.sku}
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-800">
                                {product.name}
                              </div>
                              {product.description && (
                                <div className="mt-1 max-w-64 truncate text-xs text-slate-400">
                                  {product.description}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                                {getCategoryName(product, categories)}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-semibold text-slate-700">
                              {product.stock ?? 0}{" "}
                              <span className="font-normal text-slate-500">
                                {product.unit}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                              {formatMoney(product.costPrice)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-700">
                              {formatMoney(product.salePrice)}
                            </td>
                            <td className="px-4 py-4">
                              <StatusBadge active={active}>
                                {active ? "Đang kinh doanh" : "Ngừng bán"}
                              </StatusBadge>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditProduct(product)}
                                  title="Sửa hàng hóa"
                                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-600"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <ToggleButton
                                  active={active}
                                  loading={busyId === product._id}
                                  label={
                                    active
                                      ? "Ngừng kinh doanh"
                                      : "Bật kinh doanh"
                                  }
                                  onClick={() => void toggleProduct(product)}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <Tags className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-3 font-semibold text-slate-700">
                          Chưa có danh mục phù hợp
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          Thử thay đổi từ khóa hoặc thêm danh mục mới.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((category) => {
                      const active = category.isActive !== false;

                      return (
                        <tr
                          key={category._id}
                          className="transition-colors hover:bg-emerald-50/30"
                        >
                          <td className="px-4 py-4 font-semibold text-slate-700">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                              {category.code}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-800">
                            {category.name}
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {category.description || "—"}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge active={active}>
                              {active ? "Đang sử dụng" : "Ngừng sử dụng"}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditCategory(category)}
                                title="Sửa danh mục"
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-600"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <ToggleButton
                                active={active}
                                loading={busyId === category._id}
                                label={
                                  active
                                    ? "Ngừng sử dụng danh mục"
                                    : "Bật sử dụng danh mục"
                                }
                                onClick={() => void toggleCategory(category)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row sm:items-center">
              <span>
                {tab === "products"
                  ? `${filteredProducts.length} hàng hóa phù hợp`
                  : `${filteredCategories.length} danh mục phù hợp`}
              </span>
              <span>
                Trạng thái được lưu trên máy chủ khi thao tác thành công.
              </span>
            </div>
          </div>
        </section>
      </div>

      {productModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setProductModal(false);
            }
          }}
        >
          <form
            onSubmit={handleProductSubmit}
            className="my-auto w-full max-w-2xl space-y-5 rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingProduct ? "Sửa hàng hóa" : "Thêm hàng hóa"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Nhập thông tin hàng hóa của quán.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setProductModal(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">
                Tên hàng hóa *
                <input
                  required
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium">
                Mã SKU *
                <input
                  required
                  value={productForm.sku}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium">
                Danh mục *
                <select
                  required
                  value={productForm.category}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      category: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-500"
                >
                  <option value="">Chọn danh mục</option>
                  {categories
                    .filter((c) => c.isActive !== false)
                    .map((category) => (
                      <option
                        key={category._id}
                        value={category.code}
                      >
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-medium">
                Đơn vị *
                <input
                  required
                  value={productForm.unit}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, unit: e.target.value }))
                  }
                  placeholder="cái, hộp, kg..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium">
                Giá nhập (VNĐ) *
                <input
                  required
                  min="0"
                  type="number"
                  value={productForm.costPrice}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      costPrice: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium">
                Giá bán (VNĐ) *
                <input
                  required
                  min="0"
                  type="number"
                  value={productForm.salePrice}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      salePrice: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium">
                Tồn kho tối thiểu
                <input
                  min="0"
                  type="number"
                  value={productForm.minStock}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      minStock: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium">
                Trạng thái kinh doanh
                <select
                  value={productForm.isForSale ? "active" : "inactive"}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      isForSale: e.target.value === "active",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-500"
                >
                  <option value="active">Đang kinh doanh</option>
                  <option value="inactive">Ngừng bán</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                Mô tả
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setProductModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {editingProduct ? "Lưu thay đổi" : "Thêm hàng hóa"}
              </button>
            </div>
          </form>
        </div>
      )}

      {categoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setCategoryModal(false);
            }
          }}
        >
          <form
            onSubmit={handleCategorySubmit}
            className="my-auto w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingCategory ? "Sửa danh mục" : "Thêm danh mục"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Quản lý nhóm hàng hóa của quán.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setCategoryModal(false)}
                aria-label="Đóng"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block space-y-1.5 text-sm font-medium">
              Tên danh mục *
              <input
                required
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ví dụ: Đồ uống"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="block space-y-1.5 text-sm font-medium">
              Mã danh mục *
              <input
                required
                disabled={Boolean(editingCategory)}
                value={categoryForm.code}
                onChange={(e) =>
                  setCategoryForm((f) => ({
                    ...f,
                    code: e.target.value,
                  }))
                }
                placeholder="Ví dụ: drink"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500 disabled:bg-slate-100"
              />
              {editingCategory && (
                <span className="text-xs font-normal text-slate-400">
                  Mã danh mục được giữ nguyên khi chỉnh sửa.
                </span>
              )}
            </label>

            <label className="block space-y-1.5 text-sm font-medium">
              Mô tả
              <textarea
                rows={3}
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="Mô tả danh mục..."
                className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setCategoryModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {editingCategory ? "Lưu thay đổi" : "Thêm danh mục"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
