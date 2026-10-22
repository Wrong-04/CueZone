
const API_BASE = (
  import.meta.env.VITE_API_URL || "/api/v1"
).replace(/\/+$/, "");

function getToken(): string | null {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken")
  );
}

export type ApiResult<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type Category = {
  _id: string;
  name: string;
  code: string;
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
  isForSale: boolean;
  isActive: boolean;
};

type CategoryPayload = {
  name: string;
  code: string;
  description?: string;
};

type CategoryUpdatePayload = {
  name: string;
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
  isForSale: boolean;
};

function getErrorMessage(
  body: unknown,
  fallback: string
): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof body.message === "string" &&
    body.message.trim()
  ) {
    return body.message;
  }

  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string" &&
    body.error.trim()
  ) {
    return body.error;
  }

  return fallback;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (
    options.body &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Accept", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Không thể kết nối máy chủ. Vui lòng kiểm tra backend và địa chỉ API."
    );
  }

  const rawBody = await response.text();
  let body: unknown = null;

  if (rawBody.trim()) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      if (response.ok) {
        throw new Error(
          "Máy chủ trả về dữ liệu không hợp lệ."
        );
      }
    }
  }

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        body,
        `Yêu cầu thất bại (HTTP ${response.status}).`
      )
    );
  }

  // Một số API trả về 204 hoặc không có nội dung.
  // Không ép response null thành dữ liệu nghiệp vụ.
  if (body === null) {
    return {
      success: true,
      data: null,
    } as T;
  }

  return body as T;
}

/**
 * Chuẩn hóa response danh sách.
 * Hỗ trợ:
 *   { success: true, data: [...] }
 *   { data: [...] }
 *   [...]
 *
 * Response null hoặc data không phải mảng sẽ thành [].
 */
function normalizeList<T>(
  response: unknown
): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (
    response &&
    typeof response === "object" &&
    "data" in response
  ) {
    const data = response.data;

    if (Array.isArray(data)) {
      return data as T[];
    }

    if (
      data &&
      typeof data === "object" &&
      "items" in data &&
      Array.isArray(data.items)
    ) {
      return data.items as T[];
    }

    return [];
  }

  return [];
}

function normalizeMutation<T>(
  response: unknown
): ApiResult<T | null> {
  if (
    response &&
    typeof response === "object" &&
    "data" in response
  ) {
    return {
      success:
        !("success" in response) ||
        response.success !== false,
      data: response.data as T | null,
      message:
        "message" in response &&
        typeof response.message === "string"
          ? response.message
          : undefined,
    };
  }

  return {
    success: true,
    data: response as T | null,
  };
}

export async function fetchCategories(): Promise<
  ApiResult<Category[]>
> {
  const response = await request<unknown>(
    "/catalog-management/categories"
  );

  return {
    success: true,
    data: normalizeList<Category>(response),
  };
}

export async function createCategory(
  payload: CategoryPayload
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    "/catalog-management/categories",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return normalizeMutation(response);
}

export async function updateCategory(
  id: string,
  payload: CategoryUpdatePayload
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/categories/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );

  return normalizeMutation(response);
}

export async function deleteCategory(
  id: string
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/categories/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );

  return normalizeMutation(response);
}

export async function fetchProducts(
  params: {
    search?: string;
    category?: string;
  } = {}
): Promise<ApiResult<Product[]>> {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.category?.trim()) {
    query.set("category", params.category.trim());
  }

  const suffix = query.toString();
  const path = `/catalog-management/products${
    suffix ? `?${suffix}` : ""
  }`;

  const response = await request<unknown>(path);

  return {
    success: true,
    data: normalizeList<Product>(response),
  };
}

export async function createProduct(
  payload: ProductPayload
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    "/catalog-management/products",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return normalizeMutation(response);
}

export async function updateProduct(
  id: string,
  payload: ProductPayload
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/products/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );

  return normalizeMutation(response);
}

export async function deleteProduct(
  id: string
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/products/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );

  return normalizeMutation(response);
}

/**
 * Bật/tắt danh mục.
 * Backend cần có PATCH /categories/:id/status.
 */
export async function setCategoryActiveStatus(
  id: string,
  isActive: boolean
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/categories/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }
  );

  return normalizeMutation(response);
}

/**
 * Bật/tắt kinh doanh của hàng hóa.
 * Backend cần có PATCH /products/:id/status.
 */
export async function setProductSaleStatus(
  id: string,
  isForSale: boolean
): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/products/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isForSale }),
    }
  );

  return normalizeMutation(response);
}
