// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU: API CLIENT QUẢN LÝ DANH MỤC & HÀNG HÓA (/catalog-management)
// FnBInventoryPage / WarehouseInventoryPage / CatalogManagementPage
//   -> catalog-management.service.ts -> backend/src/modules/product/management.routes.ts
//   -> Cập nhật Category / Product + tự động bắn Socket `menu:updated`
// ============================================================================
import api from "./api";
import axios from "axios";

export type ApiResult<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type Category = {
  _id: string;
  name: string;
  code: string;
  scope?: "fnb" | "warehouse";
  description?: string;
  isActive: boolean;
};

export type Product = {
  _id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  costPrice: number;
  salePrice: number;
  supplierId?: string | null;
  description?: string;
  productType?: "fnb" | "ingredient" | "accessory";
  isForSale: boolean;
  isActive: boolean;
  isMadeToOrder?: boolean;
  isTheMakeToOrder?: boolean;
  isthemaketoorder?: boolean;
};

type CategoryPayload = {
  name: string;
  code: string;
  scope?: "fnb" | "warehouse";
  description?: string;
};

type CategoryUpdatePayload = {
  name: string;
  scope?: "fnb" | "warehouse";
  description?: string;
};

type ProductPayload = {
  name: string;
  sku: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  supplierId?: string | null;
  description?: string;
  productType?: "fnb" | "ingredient" | "accessory";
  isForSale: boolean;
  isMadeToOrder?: boolean;
  isTheMakeToOrder?: boolean;
  isthemaketoorder?: boolean;
};

/**
 * Hàm gửi HTTP request chung cho module danh mục/hàng hóa và chuẩn hóa thông báo lỗi Axios.
 *
 * @param {string} path - Đường dẫn API tương đối (ví dụ: /catalog-management/categories)
 * @param {object} [options] - Phương thức HTTP và chuỗi JSON body (nếu có)
 * @returns {Promise<T>} Dữ liệu JSON thô trả về từ máy chủ
 */
async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: string;
  } = {},
): Promise<T> {
  try {
    const response = await api.request<T>({
      url: path,
      method: options.method || "GET",
      data: options.body ? JSON.parse(options.body) : undefined,
    });

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data as { message?: string; error?: string } | null | undefined;
      const msg =
        responseData?.message ||
        responseData?.error ||
        (error.response?.status ? `Yêu cầu thất bại (HTTP ${error.response.status}).` : error.message);
      throw new Error(msg || "Không thể kết nối máy chủ. Vui lòng kiểm tra backend và địa chỉ API.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Đã xảy ra lỗi không xác định.");
  }
}

/**
 * Chuẩn hóa phản hồi dạng danh sách từ nhiều cấu trúc envelope khác nhau thành mảng phẳng.
 *
 * @param {unknown} response - Dữ liệu phản hồi thô từ API
 * @returns {T[]} Mảng phần tử đã trích xuất
 */
function normalizeList<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (response && typeof response === "object" && "data" in response) {
    const data = response.data;

    if (Array.isArray(data)) {
      return data as T[];
    }

    if (data && typeof data === "object" && "items" in data && Array.isArray(data.items)) {
      return data.items as T[];
    }

    return [];
  }

  return [];
}

/**
 * Chuẩn hóa kết quả thao tác thêm/sửa/xóa thành cấu trúc ApiResult thống nhất.
 *
 * @param {unknown} response - Dữ liệu phản hồi từ API
 * @returns {ApiResult<T | null>} Kết quả kèm cờ success và message
 */
function normalizeMutation<T>(response: unknown): ApiResult<T | null> {
  if (response && typeof response === "object" && "data" in response) {
    return {
      success: !("success" in response) || response.success !== false,
      data: response.data as T | null,
      message:
        "message" in response && typeof response.message === "string"
          ? response.message
          : undefined,
    };
  }

  return {
    success: true,
    data: response as T | null,
  };
}

/**
 * Lấy danh sách toàn bộ danh mục (nhóm F&B và nhóm Kho) từ Backend.
 * Luồng đi: useFnbInventory / WarehouseInventoryPage -> GET /catalog-management/categories.
 *
 * @returns {Promise<ApiResult<Category[]>>} Danh sách danh mục hiện có
 */
export async function fetchCategories(): Promise<ApiResult<Category[]>> {
  const response = await request<unknown>("/catalog-management/categories");

  return {
    success: true,
    data: normalizeList<Category>(response),
  };
}

/**
 * Tạo mới một danh mục F&B hoặc danh mục vật tư kho.
 *
 * @param {CategoryPayload} payload - Tên, mã code duy nhất, phạm vi (fnb | warehouse) và mô tả
 * @returns {Promise<ApiResult<unknown>>} Kết quả tạo danh mục
 */
export async function createCategory(payload: CategoryPayload): Promise<ApiResult<unknown>> {
  const response = await request<unknown>("/catalog-management/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalizeMutation(response);
}

/**
 * Cập nhật tên, phạm vi hoặc mô tả của một danh mục theo ID.
 *
 * @param {string} id - Mã định danh danh mục
 * @param {CategoryUpdatePayload} payload - Dữ liệu cập nhật
 * @returns {Promise<ApiResult<unknown>>} Kết quả sau cập nhật
 */
export async function updateCategory(
  id: string,
  payload: CategoryUpdatePayload,
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/categories/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

  return normalizeMutation(response);
}

/**
 * Xóa danh mục (Backend sẽ từ chối nếu đang có sản phẩm tham chiếu tới danh mục này).
 *
 * @param {string} id - Mã định danh danh mục cần xóa
 * @returns {Promise<ApiResult<unknown>>} Kết quả xóa danh mục
 */
export async function deleteCategory(id: string): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/categories/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );

  return normalizeMutation(response);
}

/**
 * Tải danh sách hàng hóa/món F&B có hỗ trợ lọc theo từ khóa tên/SKU và mã danh mục.
 *
 * @param {object} [params] - Bộ lọc search và category
 * @returns {Promise<ApiResult<Product[]>>} Danh sách sản phẩm phù hợp
 */
export async function fetchProducts(
  params: {
    search?: string;
    category?: string;
  } = {},
): Promise<ApiResult<Product[]>> {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.category?.trim()) {
    query.set("category", params.category.trim());
  }

  const suffix = query.toString();
  const path = `/catalog-management/products${suffix ? `?${suffix}` : ""}`;

  const response = await request<unknown>(path);

  return {
    success: true,
    data: normalizeList<Product>(response),
  };
}

/**
 * Tạo mới một mặt hàng/món ăn qua router catalog-management và phát Socket cập nhật menu.
 *
 * @param {ProductPayload} payload - Thông tin sản phẩm (SKU, giá nhập/bán, định mức, loại hình)
 * @returns {Promise<ApiResult<unknown>>} Bản ghi sản phẩm vừa tạo
 */
export async function createProduct(payload: ProductPayload): Promise<ApiResult<unknown>> {
  const response = await request<unknown>("/catalog-management/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalizeMutation(response);
}

/**
 * Cập nhật đầy đủ thông tin một sản phẩm hiện có và đồng bộ lại menu qua Socket.
 *
 * @param {string} id - Mã định danh sản phẩm
 * @param {ProductPayload} payload - Thông tin cập nhật mới
 * @returns {Promise<ApiResult<unknown>>} Bản ghi sản phẩm sau khi lưu
 */
export async function updateProduct(
  id: string,
  payload: ProductPayload,
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/products/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

  return normalizeMutation(response);
}

/**
 * Xóa vĩnh viễn một sản phẩm theo ID và phát tín hiệu cập nhật menu.
 *
 * @param {string} id - Mã định danh sản phẩm cần xóa
 * @returns {Promise<ApiResult<unknown>>} Kết quả xóa sản phẩm
 */
export async function deleteProduct(id: string): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/products/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );

  return normalizeMutation(response);
}

/**
 * Bật/tắt trạng thái hoạt động của danh mục (Backend tự đồng bộ tắt/mở toàn bộ sản phẩm thuộc danh mục đó).
 *
 * @param {string} id - Mã danh mục
 * @param {boolean} isActive - True để kích hoạt lại, false để ngừng hoạt động
 * @returns {Promise<ApiResult<unknown>>} Kết quả cập nhật
 */
export async function setCategoryActiveStatus(
  id: string,
  isActive: boolean,
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/categories/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
  );

  return normalizeMutation(response);
}

/**
 * Bật/tắt nhanh trạng thái mở bán (isForSale) và hoạt động (isActive) của một sản phẩm.
 *
 * @param {string} id - Mã sản phẩm
 * @param {boolean} isForSale - Trạng thái cho phép bán tại quầy/khách hàng
 * @param {boolean} [isActive] - Trạng thái kích hoạt sản phẩm (tùy chọn)
 * @returns {Promise<ApiResult<unknown>>} Bản ghi sản phẩm sau cập nhật
 */
export async function setProductSaleStatus(
  id: string,
  isForSale: boolean,
  isActive?: boolean,
): Promise<ApiResult<unknown>> {
  const body: { isForSale: boolean; isActive?: boolean } = { isForSale };
  if (typeof isActive === "boolean") {
    body.isActive = isActive;
  }
  const response = await request<unknown>(
    `/catalog-management/products/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );

  return normalizeMutation(response);
}

/**
 * Bật/tắt nhanh cờ isActive của một sản phẩm.
 *
 * @param {string} id - Mã sản phẩm
 * @param {boolean} isActive - Trạng thái hoạt động mới
 * @returns {Promise<ApiResult<unknown>>} Bản ghi sản phẩm sau cập nhật
 */
export async function setProductActiveStatus(
  id: string,
  isActive: boolean,
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/products/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
  );

  return normalizeMutation(response);
}
