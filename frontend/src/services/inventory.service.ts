import api from "./api";
import axios from "axios";

export type StockStatus = "in_stock" | "low" | "out";

export type StockProduct = {
  _id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  costPrice?: number;
  salePrice: number;
  stockStatus: StockStatus;
};

export type InventoryPage = {
  items: StockProduct[];
  total: number;
  page: number;
  limit: number;
  pages: number;
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
      const responseData = error.response?.data as { message?: string } | null | undefined;
      throw new Error(
        responseData?.message ||
          (error.response?.status ? `Yêu cầu thất bại (HTTP ${error.response.status}).` : error.message) ||
          "Không thể thực hiện yêu cầu.",
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Đã xảy ra lỗi không xác định.");
  }
}

export async function fetchInventory(
  params: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<InventoryPage> {
  const query = new URLSearchParams();

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.category) {
    query.set("category", params.category);
  }

  query.set("status", params.status || "all");

  query.set("page", String(params.page || 1));

  query.set("limit", String(params.limit || 20));

  const response = await request<{
    success: boolean;
    data: InventoryPage;
  }>(`/inventory?${query.toString()}`);

  return response.data;
}

export async function createInventoryTransaction(payload: {
  product: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  reason: string;
}) {
  return request("/inventory/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchInventoryHistory(productId: string) {
  return request(`/inventory/${productId}/history`);
}
