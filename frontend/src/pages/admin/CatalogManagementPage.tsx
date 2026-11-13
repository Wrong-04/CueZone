import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ShoppingOutlined,
  TagsOutlined,
  CloseOutlined,
  SaveOutlined,
  PlusOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
} from "@ant-design/icons";
import { message } from "antd";
import { Button, Modal } from "../../shared/ui";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Eye,
  LoaderCircle,
  Package,
  Pencil,
  RefreshCw,
  Search,
  Tags,
  ToggleLeft,
  ToggleRight,
  Utensils,
  Warehouse,
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
type ScopeFilter = "all" | "fnb" | "warehouse";

function isFnbCategory(category: Category): boolean {
  if (category.scope === "fnb") return true;
  if (category.scope === "warehouse") return false;
  const code = (category.code || "").toLowerCase();
  const name = (category.name || "").toLowerCase();
  return (
    code === "drink" ||
    code === "food" ||
    code === "snack" ||
    code === "beverage" ||
    name.includes("uống") ||
    name.includes("đồ ăn") ||
    name.includes("ăn vặt")
  );
}

function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s-]+/g, "_");
}

function countLinkedProducts(category: Category, products: Product[]): number {
  const targetId = category._id;
  const targetCode = (category.code || "").toLowerCase();
  return products.filter((p) => {
    const rawCat = p.category;
    if (typeof rawCat === "object" && rawCat !== null) {
      const cId = (rawCat as any)._id;
      const cCode = String((rawCat as any).code || "").toLowerCase();
      return cId === targetId || (cCode && cCode === targetCode);
    }
    if (typeof rawCat === "string") {
      return rawCat === targetId || rawCat.toLowerCase() === targetCode;
    }
    return false;
  }).length;
}

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
  isthemaketoorder: boolean;
};

type CategoryForm = {
  name: string;
  code: string;
  scope: "fnb" | "warehouse";
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
  isthemaketoorder: false,
};

const EMPTY_CATEGORY_FORM: CategoryForm = {
  name: "",
  code: "",
  scope: "fnb",
  description: "",
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function getCategoryName(product: Product, categories: Category[]): string {
  const category = categories.find(
    (item) =>
      item._id === product.category ||
      item.code === product.category ||
      item.name === product.category,
  );

  return category?.name || product.category || "Chưa phân loại";
}

function StatusBadge({ active, children }: { active: boolean; children: string }) {
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
        className={["h-2 w-2 rounded-full", active ? "bg-emerald-500" : "bg-rose-500"].join(" ")}
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
        active ? "text-emerald-600 hover:bg-emerald-50" : "text-rose-600 hover:bg-rose-50",
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

export default function CatalogManagementPage({ embedded = false }: { embedded?: boolean }) {
  const [tab, setTab] = useState<Tab>(embedded ? "categories" : "products");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [productModal, setProductModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryProductsModal, setCategoryProductsModal] = useState<Category | null>(null);
  const [productModalSearch, setProductModalSearch] = useState("");
  const [productModalStatus, setProductModalStatus] = useState<"all" | "active" | "inactive" | "outOfStock">("all");

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [categoryResult, productResult] = await Promise.all([
        fetchCategories(),
        fetchProducts(),
      ]);

      setCategories(Array.isArray(categoryResult?.data) ? categoryResult.data : []);

      setProducts(Array.isArray(productResult?.data) ? productResult.data : []);
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
        getCategoryName(product, categories).toLocaleLowerCase("vi").includes(keyword);

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

      const isFnb = isFnbCategory(category);
      const matchesScope =
        scopeFilter === "all" ||
        (scopeFilter === "fnb" && isFnb) ||
        (scopeFilter === "warehouse" && !isFnb);

      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [categories, search, statusFilter, scopeFilter]);

  const selectedCategoryProducts = useMemo(() => {
    if (!categoryProductsModal) return [];
    const targetId = categoryProductsModal._id;
    const targetCode = (categoryProductsModal.code || "").toLowerCase();
    return products.filter((p) => {
      const rawCat = p.category;
      if (typeof rawCat === "object" && rawCat !== null) {
        const cId = (rawCat as any)._id;
        const cCode = String((rawCat as any).code || "").toLowerCase();
        return cId === targetId || (cCode && cCode === targetCode);
      }
      if (typeof rawCat === "string") {
        return rawCat === targetId || rawCat.toLowerCase() === targetCode;
      }
      return false;
    });
  }, [categoryProductsModal, products]);

  const filteredSelectedCategoryProducts = useMemo(() => {
    const keyword = productModalSearch.trim().toLowerCase();
    return selectedCategoryProducts.filter((product) => {
      const matchesSearch =
        !keyword ||
        product.name?.toLowerCase().includes(keyword) ||
        product.sku?.toLowerCase().includes(keyword);

      const isForSaleActive = product.isForSale !== false;
      const isProductActive = product.isActive !== false;
      const isOutOfStock = (product.stock ?? 0) <= 0;

      const matchesStatus =
        productModalStatus === "all" ||
        (productModalStatus === "active" && isForSaleActive && isProductActive) ||
        (productModalStatus === "inactive" && (!isForSaleActive || !isProductActive)) ||
        (productModalStatus === "outOfStock" && isOutOfStock);

      return matchesSearch && matchesStatus;
    });
  }, [selectedCategoryProducts, productModalSearch, productModalStatus]);

  function openCreateProduct() {
    setEditingProduct(null);
    setProductForm({
      ...EMPTY_PRODUCT_FORM,
      category: categories[0]?.code || "",
      isthemaketoorder: false,
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
      isthemaketoorder: Boolean(
        product.isthemaketoorder ?? product.isTheMakeToOrder ?? product.isMadeToOrder,
      ),
    });

    setError("");
    setProductModal(true);
  }

  function openCreateCategory() {
    setEditingCategory(null);
    setCategoryForm({
      ...EMPTY_CATEGORY_FORM,
      scope: embedded ? "warehouse" : "fnb",
    });
    setError("");
    setCategoryModal(true);
  }

  function openEditCategory(category: Category) {
    setEditingCategory(category);

    setCategoryForm({
      name: category.name || "",
      code: category.code || "",
      scope: category.scope || (isFnbCategory(category) ? "fnb" : "warehouse"),
      description: category.description || "",
    });

    setError("");
    setCategoryModal(true);
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
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
        isMadeToOrder: productForm.isthemaketoorder,
        isTheMakeToOrder: productForm.isthemaketoorder,
        isthemaketoorder: productForm.isthemaketoorder,
      };

      if (!payload.name || !payload.sku || !payload.category || !payload.unit) {
        throw new Error("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      }

      const numericValues = [payload.costPrice, payload.salePrice, payload.minStock];

      if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error("Giá và tồn kho tối thiểu phải là số không âm.");
      }

      if (editingProduct) {
        await updateProduct(editingProduct._id, payload);
      } else {
        await createProduct(payload);
      }

      setProductModal(false);
      setSuccess(editingProduct ? "Cập nhật hàng hóa thành công." : "Thêm hàng hóa thành công.");

      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const name = categoryForm.name.trim();
      const code = categoryForm.code.trim();
      const scope = categoryForm.scope;
      const description = categoryForm.description.trim();

      if (!name || !code) {
        throw new Error("Tên và mã danh mục là bắt buộc.");
      }

      if (editingCategory) {
        await updateCategory(editingCategory._id, {
          name,
          scope,
          description,
        });
      } else {
        await createCategory({
          name,
          code,
          scope,
          description,
        });
      }

      setCategoryModal(false);
      setSuccess(editingCategory ? "Cập nhật danh mục thành công." : "Thêm danh mục thành công.");

      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product: Product) {
    const isCurrentlyActive = product.isActive !== false && (product.salePrice === 0 || product.isForSale !== false);
    const nextStatus = !isCurrentlyActive;

    Modal.confirm({
      title: (
        <span className="font-black text-slate-900 text-base">
          {nextStatus ? "Bật hoạt động mặt hàng" : "Tạm ngưng mặt hàng"}
        </span>
      ),
      icon: nextStatus ? (
        <CheckCircleFilled className="text-emerald-500 !text-2xl" />
      ) : (
        <ExclamationCircleFilled className="text-amber-500 !text-2xl" />
      ),
      content: (
        <div className="py-2 text-sm text-slate-600">
          <p className="mb-2">
            Bạn có chắc chắn muốn {nextStatus ? "bật hoạt động lại" : "tạm ngưng"} mặt hàng{" "}
            <strong className="text-slate-900 font-bold">"{product.name}" ({product.sku})</strong>?
          </p>
          <p className="text-xs text-slate-500 mb-0">
            {nextStatus
              ? "Mặt hàng này sẽ xuất hiện lại trong menu F&B và sẵn sàng phục vụ tại quầy POS & Kho."
              : "Mặt hàng này sẽ tạm ngưng bán tại quầy/bàn và tạm ngưng lưu thông trong kho, không ảnh hưởng đến các mặt hàng khác cùng danh mục."}
          </p>
        </div>
      ),
      okText: nextStatus ? "Bật hoạt động" : "Tạm ngưng",
      okType: nextStatus ? "primary" : "danger",
      cancelText: "Hủy bỏ",
      centered: true,
      maskClosable: true,
      okButtonProps: {
        className: nextStatus
          ? "!bg-emerald-600 hover:!bg-emerald-700 !rounded-xl !h-9 !px-5 !font-bold shadow-xs cursor-pointer"
          : "!bg-rose-600 hover:!bg-rose-700 !rounded-xl !h-9 !px-5 !font-bold shadow-xs cursor-pointer",
      },
      cancelButtonProps: {
        className: "!rounded-xl !h-9 !px-4 !border-slate-300 hover:!border-slate-400 !font-semibold text-slate-700 cursor-pointer",
      },
      onOk: async () => {
        setBusyId(product._id);
        setError("");
        setSuccess("");

        try {
          const nextForSale = nextStatus ? product.salePrice > 0 : false;
          const nextActive = nextStatus;

          await setProductSaleStatus(product._id, nextForSale, nextActive);

          setProducts((current) =>
            current.map((item) =>
              item._id === product._id ? { ...item, isForSale: nextForSale, isActive: nextActive } : item,
            ),
          );

          // Phát sự kiện đồng bộ toàn hệ thống
          window.dispatchEvent(new CustomEvent("catalog-updated"));

          message.success(
            nextStatus
              ? `Đã kích hoạt hàng hóa "${product.name}".`
              : `Đã tạm ngưng hàng hóa "${product.name}".`,
          );
        } catch (err) {
          const msg = errorMessage(err);
          setError(msg);
          message.error(msg);
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  async function toggleCategory(category: Category) {
    const nextStatus = category.isActive === false;

    // Tính toán số lượng sản phẩm liên kết và số mặt hàng còn tồn kho
    const targetId = category._id;
    const targetCode = (category.code || "").toLowerCase();
    const linked = products.filter((p) => {
      const rawCat = p.category;
      if (typeof rawCat === "object" && rawCat !== null) {
        const cId = (rawCat as any)._id;
        const cCode = String((rawCat as any).code || "").toLowerCase();
        return cId === targetId || (cCode && cCode === targetCode);
      }
      if (typeof rawCat === "string") {
        return rawCat === targetId || rawCat.toLowerCase() === targetCode;
      }
      return false;
    });

    const inStockCount = linked.filter(
      (p) => (p.stock ?? 0) > 0 && p.isActive !== false && (p.salePrice === 0 || p.isForSale !== false),
    ).length;

    Modal.confirm({
      title: (
        <span className="font-black text-slate-900 text-base">
          {nextStatus ? "Kích hoạt sử dụng danh mục" : "Ngừng sử dụng danh mục"}
        </span>
      ),
      icon: nextStatus ? (
        <CheckCircleFilled className="text-emerald-500 !text-2xl" />
      ) : (
        <ExclamationCircleFilled className="text-amber-500 !text-2xl" />
      ),
      content: (
        <div className="py-2 text-sm text-slate-600 space-y-3">
          <p className="mb-0">
            Bạn có chắc chắn muốn {nextStatus ? "bật sử dụng" : "ngừng sử dụng"} danh mục{" "}
            <strong className="text-slate-900 font-bold">"{category.name}"</strong>?
          </p>

          {!nextStatus && inStockCount > 0 ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-2">
              <div className="font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Lưu ý: Danh mục đang có {inStockCount}/{linked.length} món còn tồn kho</span>
              </div>
              <p className="text-slate-600 mb-0 leading-relaxed">
                Nếu chỉ có <strong>1 vài món hết hàng</strong>, bạn <strong>KHÔNG NÊN</strong> tắt cả danh mục (vì sẽ làm dừng bán tất cả {inStockCount} món còn hàng). Bạn nên tắt riêng từng món hết hàng.
              </p>
              <button
                type="button"
                onClick={() => {
                  Modal.destroyAll();
                  setProductModalSearch("");
                  setProductModalStatus("all");
                  setCategoryProductsModal(category);
                }}
                className="w-full mt-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Xem &amp; Quản lý riêng từng món (Khuyên dùng)</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mb-0">
              {nextStatus
                ? "Tất cả các sản phẩm và vật tư thuộc danh mục này sẽ được kích hoạt lại trong kho hàng & POS."
                : "Tất cả các sản phẩm và vật tư thuộc danh mục này sẽ tạm ngưng hoạt động trong kho hàng & POS."}
            </p>
          )}
        </div>
      ),
      okText: nextStatus ? "Bật danh mục" : (inStockCount > 0 ? "Vẫn tắt cả danh mục" : "Ngừng sử dụng"),
      okType: nextStatus ? "primary" : "danger",
      cancelText: "Hủy bỏ",
      centered: true,
      maskClosable: true,
      okButtonProps: {
        className: nextStatus
          ? "!bg-emerald-600 hover:!bg-emerald-700 !rounded-xl !h-9 !px-5 !font-bold shadow-xs cursor-pointer"
          : "!bg-rose-600 hover:!bg-rose-700 !rounded-xl !h-9 !px-5 !font-bold shadow-xs cursor-pointer",
      },
      cancelButtonProps: {
        className: "!rounded-xl !h-9 !px-4 !border-slate-300 hover:!border-slate-400 !font-semibold text-slate-700 cursor-pointer",
      },
      onOk: async () => {
        setBusyId(category._id);
        setError("");
        setSuccess("");

        try {
          await setCategoryActiveStatus(category._id, nextStatus);

          setCategories((current) =>
            current.map((item) =>
              item._id === category._id ? { ...item, isActive: nextStatus } : item,
            ),
          );

          // Đồng bộ luôn trạng thái các sản phẩm trong state Catalog
          setProducts((current) =>
            current.map((p) => {
              const belongs =
                p.category === category._id ||
                p.category === category.code ||
                p.category?.toLowerCase() === category.code?.toLowerCase();
              return belongs ? { ...p, isActive: nextStatus, isForSale: nextStatus } : p;
            }),
          );

          // Phát sự kiện đồng bộ toàn hệ thống
          window.dispatchEvent(new CustomEvent("catalog-updated"));

          message.success(
            nextStatus
              ? `Đã kích hoạt danh mục "${category.name}" và toàn bộ sản phẩm liên kết trong kho.`
              : `Đã ngừng sử dụng danh mục "${category.name}" và tạm ngưng sản phẩm trong kho.`,
          );
        } catch (err) {
          const msg = errorMessage(err);
          setError(msg);
          message.error(msg);
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  // Khi được nhúng vào Kho Hàng (embedded = true), ép buộc chế độ luôn là "categories" để triệt tiêu trùng lặp với màn Tồn kho vật tư
  const currentTab = embedded ? "categories" : tab;

  return (
    <div className={embedded ? "space-y-4" : "min-h-full bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-7"}>
      <div className={embedded ? "space-y-4" : "mx-auto max-w-[1800px] space-y-6"}>
        {/* 4 Thẻ KPI Thống Kê Chuẩn - Luôn đặt ở TRÊN CÙNG đồng bộ toàn hệ thống */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentTab === "categories" ? (
            <>
              {/* Card 1: Tổng nhóm danh mục */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Tổng nhóm danh mục
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center text-lg">
                    <Tags className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-800 font-mono">
                  {categories.length} nhóm
                </div>
                <div className="text-xs text-slate-400 mt-2">Tổng số nhóm danh mục hệ thống</div>
                <div className="absolute top-0 right-0 left-0 h-1 bg-slate-400" />
              </div>

              {/* Card 2: Menu F&B */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Menu F&amp;B (Ăn uống)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                    <Utensils className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-emerald-600 font-mono">
                  {categories.filter((c) => isFnbCategory(c)).length} nhóm
                </div>
                <div className="text-xs text-slate-400 mt-2">Đồ uống, đồ ăn, ăn vặt phục vụ khách</div>
                <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
              </div>

              {/* Card 3: Kho & Vật tư */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
                    Kho &amp; Vật tư Bida
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
                    <Warehouse className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-cyan-600 font-mono">
                  {categories.filter((c) => !isFnbCategory(c)).length} nhóm
                </div>
                <div className="text-xs text-slate-400 mt-2">Phụ kiện bida, nguyên liệu, bảo dưỡng</div>
                <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
              </div>

              {/* Card 4: Mặt hàng liên kết */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Mặt hàng liên kết
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
                    <Package className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-purple-600 font-mono">
                  {products.length} sản phẩm
                </div>
                <div className="text-xs text-slate-400 mt-2">Được phân bổ theo các danh mục</div>
                <div className="absolute top-0 right-0 left-0 h-1 bg-purple-500" />
              </div>
            </>
          ) : (
            <>
              {/* Card 1: Tổng hàng hóa */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Tổng hàng hóa
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                    <Package className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-emerald-600 font-mono">
                  {products.length} mã
                </div>
                <div className="text-xs text-slate-400 mt-2">Tổng số SKU đã đăng ký vào hệ thống</div>
                <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
              </div>

              {/* Card 2: Đang kinh doanh */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Đang kinh doanh
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
                    <Check className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-cyan-600 font-mono">
                  {products.filter((p) => p.isForSale !== false).length} mặt hàng
                </div>
                <div className="text-xs text-slate-400 mt-2">Đang bật kinh doanh phục vụ</div>
                <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
              </div>

              {/* Card 3: Nhóm danh mục */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nhóm danh mục
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
                    <Tags className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-purple-600 font-mono">
                  {categories.length} nhóm
                </div>
                <div className="text-xs text-slate-400 mt-2">Phân loại hàng hóa &amp; thiết bị</div>
                <div className="absolute top-0 right-0 left-0 h-1 bg-purple-500" />
              </div>

              {/* Card 4: Cảnh báo tồn kho */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Cảnh báo tồn kho
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-amber-600 font-mono">
                  {products.filter((p) => (p.stock ?? 0) <= (p.minStock ?? 5)).length} mặt hàng
                </div>
                <div className="text-xs text-slate-400 mt-2">Dưới hoặc chạm ngưỡng tối thiểu</div>
                <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
              </div>
            </>
          )}
        </div>

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
              <span className="text-sm font-medium">{error || success}</span>
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

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
          {/* Header nằm trong Card Bảng, DƯỚI KPI */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                {currentTab === "categories"
                  ? "Danh mục phân loại hàng hóa & dịch vụ"
                  : "Danh mục hàng hóa & Phụ kiện bida"}
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                {currentTab === "categories"
                  ? "Quản lý các nhóm danh mục phân loại đồ ăn, đồ uống F&B, phụ kiện bida và vật tư kho."
                  : "Quản lý các nhóm danh mục phân loại và mã sản phẩm trong hệ thống kho."}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusOutlined />}
              onClick={currentTab === "categories" ? openCreateCategory : openCreateProduct}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold"
            >
              {currentTab === "categories" ? "Thêm danh mục mới" : "Thêm hàng hóa"}
            </Button>
          </div>

          {/* 2 Tab Switcher: Hàng hóa & Danh mục - CHỈ hiển thị khi mở trang admin riêng (!embedded) */}
          {!embedded && (
            <div className="flex gap-1 border-b border-slate-200 px-4 pt-1 sm:px-6 bg-slate-50/40">
              <button
                type="button"
                onClick={() => {
                  setTab("products");
                  setSearch("");
                  setStatusFilter("all");
                }}
                className={[
                  "inline-flex items-center gap-2 border-b-2 px-3 py-3 text-xs sm:text-sm font-semibold transition",
                  tab === "products"
                    ? "border-emerald-600 text-emerald-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                <Package className="h-4 w-4" />
                Hàng hóa
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-mono">
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
                  "inline-flex items-center gap-2 border-b-2 px-3 py-3 text-xs sm:text-sm font-semibold transition",
                  tab === "categories"
                    ? "border-emerald-600 text-emerald-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                <Tags className="h-4 w-4" />
                Danh mục
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-mono">
                  {categories.length}
                </span>
              </button>
            </div>
          )}

          <div className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    currentTab === "categories"
                      ? "Tìm tên, mã hoặc mô tả danh mục..."
                      : "Tìm tên hàng hoặc mã SKU..."
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 text-xs sm:text-sm"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {currentTab === "categories" && (
                  <select
                    value={scopeFilter}
                    onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
                    aria-label="Lọc phân hệ"
                    className="min-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-emerald-500"
                  >
                    <option value="all">Tất cả phân hệ ({categories.length})</option>
                    <option value="fnb">🍽️ Menu F&amp;B ({categories.filter(isFnbCategory).length})</option>
                    <option value="warehouse">📦 Kho &amp; Vật tư ({categories.filter((c) => !isFnbCategory(c)).length})</option>
                  </select>
                )}

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  aria-label="Lọc trạng thái"
                  className="min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-emerald-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">
                    {currentTab === "categories" ? "Đang sử dụng" : "Đang kinh doanh"}
                  </option>
                  <option value="inactive">
                    {currentTab === "categories" ? "Ngừng sử dụng" : "Ngừng bán"}
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  disabled={loading}
                  title="Làm mới dữ liệu"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className={["h-5 w-5", loading ? "animate-spin" : ""].join(" ")} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  {currentTab === "categories" ? (
                    <tr>
                      <th className="px-4 py-4">Mã</th>
                      <th className="px-4 py-4">Tên danh mục</th>
                      <th className="px-4 py-4">Phân hệ sử dụng</th>
                      <th className="px-4 py-4">Mặt hàng liên kết</th>
                      <th className="px-4 py-4">Mô tả</th>
                      <th className="px-4 py-4">Trạng thái</th>
                      <th className="px-4 py-4 text-center">Thao tác</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-4 py-4">SKU</th>
                      <th className="px-4 py-4">Hàng hóa</th>
                      <th className="px-4 py-4">Danh mục</th>
                      <th className="px-4 py-4">Tồn kho</th>
                      <th className="px-4 py-4">Giá nhập</th>
                      <th className="px-4 py-4">Giá bán</th>
                      <th className="px-4 py-4">Trạng thái</th>
                      <th className="px-4 py-4 text-center">Thao tác</th>
                    </tr>
                  )}
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={currentTab === "categories" ? 7 : 8} className="px-4 py-16 text-center">
                        <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
                        <p className="mt-3 text-slate-500">Đang tải dữ liệu...</p>
                      </td>
                    </tr>
                  ) : currentTab === "categories" ? (
                    filteredCategories.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center">
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
                        const isFnb = isFnbCategory(category);
                        const linkedCount = countLinkedProducts(category, products);

                        return (
                          <tr key={category._id} className="transition-colors hover:bg-emerald-50/30">
                            <td className="px-4 py-4 font-semibold text-slate-700">
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-bold text-slate-800 border border-slate-200">
                                {category.code}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-bold text-slate-900">
                              {category.name}
                            </td>
                            <td className="px-4 py-4">
                              {isFnb ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                  <Utensils className="h-3.5 w-3.5" />
                                  Menu F&amp;B
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200/70">
                                  <Warehouse className="h-3.5 w-3.5" />
                                  Kho &amp; Vật tư
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setProductModalSearch("");
                                  setProductModalStatus("all");
                                  setCategoryProductsModal(category);
                                }}
                                className="inline-flex items-center gap-1.5 font-mono font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-200/80 text-xs transition cursor-pointer shadow-xs group"
                                title="Xem &amp; quản lý chi tiết từng mặt hàng trong danh mục này"
                              >
                                <Package className="h-3.5 w-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                                <span>{linkedCount} mặt hàng</span>
                                <Eye className="h-3.5 w-3.5 text-emerald-500 opacity-70 group-hover:opacity-100" />
                              </button>
                            </td>
                            <td className="px-4 py-4 text-slate-500 text-xs max-w-xs truncate">
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
                                  label={active ? "Ngừng sử dụng danh mục" : "Bật sử dụng danh mục"}
                                  onClick={() => void toggleCategory(category)}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )
                  ) : (
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
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-800 border border-slate-200">
                                {product.sku}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-800">{product.name}</div>
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
                              {Boolean(
                                product.isthemaketoorder ??
                                product.isTheMakeToOrder ??
                                product.isMadeToOrder,
                              ) ? (
                                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200/60">
                                  Chế biến tại quán (Không lưu kho)
                                </span>
                              ) : (
                                <>
                                  <span className="font-mono font-bold text-slate-900">{product.stock ?? 0}</span>{" "}
                                  <span className="font-normal text-slate-500 text-xs">{product.unit}</span>
                                </>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 font-mono font-medium text-slate-600">
                              {formatMoney(product.costPrice)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 font-mono font-bold text-slate-800">
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
                                  label={active ? "Ngừng kinh doanh" : "Bật kinh doanh"}
                                  onClick={() => void toggleProduct(product)}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row sm:items-center">
              <span>
                {currentTab === "categories"
                  ? `${filteredCategories.length} danh mục phù hợp`
                  : `${filteredProducts.length} hàng hóa phù hợp`}
              </span>
              <span>Trạng thái được lưu trên máy chủ khi thao tác thành công.</span>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={productModal}
        onCancel={() => !saving && setProductModal(false)}
        footer={null}
        closable={false}
        width={700}
        centered
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        <div className="relative my-auto w-full rounded-3xl bg-white border border-slate-100 overflow-hidden">
            {/* Top accent gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

            <form onSubmit={handleProductSubmit} className="p-6 sm:p-7 space-y-5">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl shadow-xs">
                    <ShoppingOutlined />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight mb-0.5">
                      {editingProduct ? "Cập Nhật Thông Tin Hàng Hóa" : "Thêm Hàng Hóa Mới"}
                    </h2>
                    <p className="text-xs text-slate-500 mb-0">
                      Quản lý mã hàng, danh mục, đơn giá vốn và giá niêm yết bán tại quầy POS.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setProductModal(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Đóng"
                >
                  <CloseOutlined className="text-sm" />
                </button>
              </div>

              {/* Section 1: Thông tin cơ bản */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    1. Thông tin mặt hàng
                  </span>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      Tên hàng hóa <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Ví dụ: Bia Heineken Silver, Đầu cơ Kamui..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        Mã SKU <span className="text-rose-500">*</span>
                      </label>
                      {!productForm.sku.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            const prefix = (productForm.category || "PRD").toUpperCase().slice(0, 3);
                            const rand = Math.floor(100 + Math.random() * 900);
                            setProductForm((f) => ({ ...f, sku: `${prefix}-${rand}` }));
                          }}
                          className="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                        >
                          + Tạo mã tự động
                        </button>
                      )}
                    </div>
                    <input
                      required
                      value={productForm.sku}
                      onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))}
                      placeholder="Ví dụ: DRK-001, ACC-002..."
                      className="w-full font-mono uppercase rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      Danh mục <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={productForm.category}
                      onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    >
                      <option value="">-- Chọn danh mục hàng hóa --</option>
                      <optgroup label="🍽️ Nhóm Menu F&B (Đồ ăn & Thức uống)">
                        {categories
                          .filter((c) => c.isActive !== false && isFnbCategory(c))
                          .map((category) => (
                            <option key={category._id} value={category.code}>
                              {category.name} ({category.code})
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="📦 Nhóm Kho & Vật tư Bida">
                        {categories
                          .filter((c) => c.isActive !== false && !isFnbCategory(c))
                          .map((category) => (
                            <option key={category._id} value={category.code}>
                              {category.name} ({category.code})
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      Đơn vị tính <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      value={productForm.unit}
                      onChange={(e) => setProductForm((f) => ({ ...f, unit: e.target.value }))}
                      placeholder="Ví dụ: lon, chai, cái, hộp, gói..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {["lon", "chai", "ly", "cái", "cây", "bộ", "hộp", "gói"].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setProductForm((f) => ({ ...f, unit: u }))}
                          className={`text-[11px] rounded-md px-1.5 py-0.5 transition-colors cursor-pointer ${
                            productForm.unit.toLowerCase() === u
                              ? "bg-emerald-600 text-white font-bold"
                              : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Giá cả & Quản lý tồn kho */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    2. Giá bán & Quản lý kho
                  </span>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        Giá nhập vốn <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-mono text-slate-500">
                        {formatMoney(Number(productForm.costPrice) || 0)}
                      </span>
                    </div>
                    <input
                      required
                      min="0"
                      type="number"
                      value={productForm.costPrice}
                      onChange={(e) => setProductForm((f) => ({ ...f, costPrice: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        Giá bán niêm yết <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-mono font-bold text-emerald-600">
                        {formatMoney(Number(productForm.salePrice) || 0)}
                      </span>
                    </div>
                    <input
                      required
                      min="0"
                      type="number"
                      value={productForm.salePrice}
                      onChange={(e) => setProductForm((f) => ({ ...f, salePrice: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>

                  {/* Profit estimate badge */}
                  {Number(productForm.salePrice) > 0 && Number(productForm.costPrice) > 0 && (
                    <div className="sm:col-span-2 rounded-xl p-2.5 border text-xs flex items-center justify-between bg-white border-slate-200">
                      <span className="text-slate-600 font-medium">Lãi dự kiến / đơn vị:</span>
                      {Number(productForm.salePrice) >= Number(productForm.costPrice) ? (
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          +{(Number(productForm.salePrice) - Number(productForm.costPrice)).toLocaleString("vi-VN")}đ
                          {" "}({Math.round(((Number(productForm.salePrice) - Number(productForm.costPrice)) / Number(productForm.salePrice)) * 100)}% biên lãi)
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                          Cảnh báo: Bán dưới giá vốn {(Number(productForm.costPrice) - Number(productForm.salePrice)).toLocaleString("vi-VN")}đ
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Tồn kho tối thiểu (Cảnh báo)
                    </label>
                    <input
                      min="0"
                      type="number"
                      value={productForm.minStock}
                      onChange={(e) => setProductForm((f) => ({ ...f, minStock: e.target.value }))}
                      placeholder="Mặc định: 0"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Trạng thái kinh doanh
                    </label>
                    <select
                      value={productForm.isForSale ? "active" : "inactive"}
                      onChange={(e) =>
                        setProductForm((f) => ({
                          ...f,
                          isForSale: e.target.value === "active",
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    >
                      <option value="active">Đang kinh doanh tại quầy / bàn</option>
                      <option value="inactive">Tạm ngừng bán</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 pt-1">
                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 cursor-pointer hover:bg-slate-50 transition-colors shadow-2xs">
                      <input
                        type="checkbox"
                        checked={productForm.isthemaketoorder}
                        onChange={(e) =>
                          setProductForm((f) => ({
                            ...f,
                            isthemaketoorder: e.target.checked,
                          }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800">
                          Món chế biến tại quán (Make-to-order - Không quản lý tồn kho)
                        </span>
                        <p className="text-[11px] text-slate-500 mb-0">
                          Áp dụng cho các món ăn / đồ uống được nấu hoặc pha chế trực tiếp khi khách gọi. Món này không có số lượng tồn kho cụ thể và được tự động ẩn khỏi kho hàng.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 3: Mô tả */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Mô tả & Vị trí lưu kho
                </label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Quy cách đóng gói, vị trí kệ lưu trữ tại quán bi-a..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                  {error}
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setProductModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <SaveOutlined />
                  )}
                  {editingProduct ? "Lưu thay đổi" : "Lưu hàng hóa"}
                </button>
              </div>
            </form>
        </div>
      </Modal>

      <Modal
        open={categoryModal}
        onCancel={() => !saving && setCategoryModal(false)}
        footer={null}
        closable={false}
        width={540}
        centered
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        <div className="relative my-auto w-full rounded-3xl bg-white border border-slate-100 overflow-hidden">
            {/* Top accent gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

            <form onSubmit={handleCategorySubmit} className="p-6 sm:p-7 space-y-5">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl shadow-xs">
                    <TagsOutlined />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight mb-0.5">
                      {editingCategory ? "Cập Nhật Danh Mục" : "Thêm Danh Mục Mới"}
                    </h2>
                    <p className="text-xs text-slate-500 mb-0">
                      Quản lý nhóm phân loại đồ uống, thức ăn, phụ kiện cho quán.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setCategoryModal(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Đóng"
                >
                  <CloseOutlined className="text-sm" />
                </button>
              </div>

              {/* Body Fields */}
              <div className="space-y-4">
                {/* 1. Phân hệ áp dụng (F&B vs Kho) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Phân hệ áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCategoryForm((f) => ({ ...f, scope: "fnb" }))}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                        categoryForm.scope === "fnb"
                          ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm ${
                            categoryForm.scope === "fnb"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Utensils className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm">Menu F&amp;B</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-0 leading-tight">
                        Đồ ăn, đồ uống phục vụ khách tại bàn &amp; POS
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategoryForm((f) => ({ ...f, scope: "warehouse" }))}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                        categoryForm.scope === "warehouse"
                          ? "border-cyan-500 bg-cyan-50/60 ring-2 ring-cyan-500/20 text-cyan-950 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm ${
                            categoryForm.scope === "warehouse"
                              ? "bg-cyan-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Warehouse className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm">Kho &amp; Vật tư</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-0 leading-tight">
                        Phụ kiện bida (cơ, bóng, nỉ, lơ), nguyên liệu kho
                      </p>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Xác định danh mục sẽ xuất hiện trên Thực đơn khách gọi (F&amp;B) hay Quản lý tồn kho vật tư.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Tên danh mục <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={categoryForm.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setCategoryForm((f) => {
                        // Tự động gợi ý mã code nếu đang tạo mới và chưa gõ mã riêng
                        const shouldAutoSlug = !editingCategory && (!f.code || f.code === slugify(f.name));
                        return {
                          ...f,
                          name: newName,
                          code: shouldAutoSlug ? slugify(newName) : f.code,
                        };
                      });
                    }}
                    placeholder={
                      categoryForm.scope === "fnb"
                        ? "Ví dụ: Đồ uống, Trà trái cây, Ăn vặt..."
                        : "Ví dụ: Phụ kiện cơ bida, Bóng thi đấu, Nỉ & Vải bàn..."
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all bg-slate-50/30 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-400">
                    Tên nhóm hiển thị trên bảng danh mục và các bộ lọc tìm kiếm.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      Mã danh mục (Code) <span className="text-rose-500">*</span>
                    </label>
                    {editingCategory && (
                      <span className="text-[10.5px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                        Mã cố định khi chỉnh sửa
                      </span>
                    )}
                  </div>
                  <input
                    required
                    disabled={Boolean(editingCategory)}
                    value={categoryForm.code}
                    onChange={(e) => setCategoryForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                    placeholder="Ví dụ: drink, snack, accessory..."
                    className="w-full font-mono rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Mã định danh duy nhất (viết thường không dấu, dùng liên kết dữ liệu hệ thống).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Mô tả nhóm hàng hóa
                  </label>
                  <textarea
                    rows={3}
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Ghi chú phạm vi mặt hàng, lưu ý bảo quản..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                  {error}
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setCategoryModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <SaveOutlined />
                  )}
                  {editingCategory ? "Lưu thay đổi" : "Thêm danh mục"}
                </button>
              </div>
            </form>
        </div>
      </Modal>

      {/* Modal Quản Lý Chi Tiết Mặt Hàng Thuộc Danh Mục */}
      <Modal
        open={Boolean(categoryProductsModal)}
        onCancel={() => setCategoryProductsModal(null)}
        footer={null}
        closable={false}
        width={920}
        centered
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        {categoryProductsModal && (
          <div className="relative my-auto w-full rounded-3xl bg-white border border-slate-100 overflow-hidden flex flex-col max-h-[88vh]">
            {/* Top accent gradient */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 shrink-0" />

            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl shadow-xs">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight mb-0">
                      Mặt Hàng Thuộc Danh Mục: {categoryProductsModal.name}
                    </h2>
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800 border border-slate-200">
                      {categoryProductsModal.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-0 mt-0.5">
                    Quản lý bật/tắt kinh doanh và kiểm soát tồn kho từng mặt hàng độc lập mà không cần tắt cả danh mục.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCategoryProductsModal(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Operational Banner */}
            <div className="px-5 sm:px-6 pt-4 pb-2 shrink-0">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-emerald-900 text-xs flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-emerald-800">Quy tắc nghiệp vụ chuẩn:</strong> Khi quán chỉ hết hàng 1 vài món (ví dụ: hết <em>Pepsi lon</em> nhưng vẫn còn <em>Bia / Nước suối</em>), bạn chỉ cần gạt công tắc <strong>Tạm ngưng</strong> ở riêng món đó bên dưới. Danh mục <strong>"{categoryProductsModal.name}"</strong> vẫn tiếp tục hoạt động bình thường trên Menu POS để phục vụ các món còn hàng khác!
                </div>
              </div>
            </div>

            {/* Stats & Filters Bar */}
            <div className="px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setProductModalStatus("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    productModalStatus === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Tất cả ({selectedCategoryProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductModalStatus("active")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    productModalStatus === "active"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  Đang bán (
                  {
                    selectedCategoryProducts.filter(
                      (p) =>
                        p.isActive !== false && (p.salePrice === 0 || p.isForSale !== false),
                    ).length
                  }
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setProductModalStatus("inactive")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    productModalStatus === "inactive"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  Tạm ngưng (
                  {
                    selectedCategoryProducts.filter(
                      (p) =>
                        p.isActive === false || (p.salePrice > 0 && p.isForSale === false),
                    ).length
                  }
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setProductModalStatus("outOfStock")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    productModalStatus === "outOfStock"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  Hết hàng ({selectedCategoryProducts.filter((p) => (p.stock ?? 0) <= 0).length})
                </button>
              </div>

              {/* Search box inside modal */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={productModalSearch}
                  onChange={(e) => setProductModalSearch(e.target.value)}
                  placeholder="Tìm món, mã SKU..."
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
                {productModalSearch && (
                  <button
                    type="button"
                    onClick={() => setProductModalSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Products Table (Scrollable) */}
            <div className="overflow-y-auto px-5 sm:px-6 pb-2 flex-1">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider z-10">
                  <tr className="border-y border-slate-200">
                    <th className="px-3.5 py-3 rounded-l-lg">Mã SKU</th>
                    <th className="px-3.5 py-3">Tên Hàng Hóa</th>
                    <th className="px-3.5 py-3">Tồn Kho Hiện Tại</th>
                    <th className="px-3.5 py-3">Giá Bán</th>
                    <th className="px-3.5 py-3 text-center">Trạng Thái</th>
                    <th className="px-3.5 py-3 text-center rounded-r-lg">Gạt Bật / Tắt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSelectedCategoryProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600 mb-0">
                          Không tìm thấy mặt hàng nào phù hợp
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSelectedCategoryProducts.map((product) => {
                      const isActive =
                        product.isActive !== false &&
                        (product.salePrice === 0 || product.isForSale !== false);
                      const isOutOfStock = (product.stock ?? 0) <= 0;
                      const isMadeToOrder = Boolean(
                        product.isthemaketoorder ??
                          product.isTheMakeToOrder ??
                          product.isMadeToOrder,
                      );

                      return (
                        <tr
                          key={product._id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-3.5 py-3 font-mono font-bold text-xs text-slate-700">
                            <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                              {product.sku}
                            </span>
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-bold text-slate-900 text-sm">{product.name}</div>
                            {product.description && (
                              <div className="text-xs text-slate-400 truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3">
                            {isMadeToOrder ? (
                              <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/60">
                                Chế biến tại quán
                              </span>
                            ) : isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                0 {product.unit} (HẾT HÀNG)
                              </span>
                            ) : (product.stock ?? 0) <= (product.minStock ?? 0) ? (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                {product.stock} {product.unit} (Sắp hết)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {product.stock} {product.unit}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 font-mono font-semibold text-slate-800 text-xs">
                            {product.salePrice > 0 ? formatMoney(product.salePrice) : "Nguyên liệu nội bộ"}
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <StatusBadge active={isActive}>
                              {isActive ? "Đang bán" : "Tạm ngưng"}
                            </StatusBadge>
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <ToggleButton
                              active={isActive}
                              loading={busyId === product._id}
                              label={isActive ? "Tạm ngưng món này" : "Bật kinh doanh lại món này"}
                              onClick={() => void toggleProduct(product)}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Hiển thị {filteredSelectedCategoryProducts.length} / {selectedCategoryProducts.length} mặt hàng trong danh mục
              </span>
              <button
                type="button"
                onClick={() => setCategoryProductsModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
