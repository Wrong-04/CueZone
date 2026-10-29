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

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Không thể thực hiện yêu cầu.");
  }

  return data;
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
