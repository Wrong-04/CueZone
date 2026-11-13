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
  isForSale: boolean;
  isMadeToOrder?: boolean;
  isTheMakeToOrder?: boolean;
  isthemaketoorder?: boolean;
};

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

export async function fetchCategories(): Promise<ApiResult<Category[]>> {
  const response = await request<unknown>("/catalog-management/categories");

  return {
    success: true,
    data: normalizeList<Category>(response),
  };
}

export async function createCategory(payload: CategoryPayload): Promise<ApiResult<unknown>> {
  const response = await request<unknown>("/catalog-management/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalizeMutation(response);
}

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

export async function deleteCategory(id: string): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/categories/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );

  return normalizeMutation(response);
}

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

export async function createProduct(payload: ProductPayload): Promise<ApiResult<unknown>> {
  const response = await request<unknown>("/catalog-management/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalizeMutation(response);
}

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

export async function deleteProduct(id: string): Promise<ApiResult<unknown>> {
  const response = await request<unknown>(
    `/catalog-management/products/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );

  return normalizeMutation(response);
}

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
