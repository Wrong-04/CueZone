import api from "./api";
import axios from "axios";

export type GoodsReceiptItem = {
  product: string; // ObjectId
  productName?: string;
  sku?: string;
  unit?: string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
};

export type GoodsReceipt = {
  _id: string;
  receiptNumber: string;
  supplier: string | { _id: string; name: string; contactPerson?: string };
  items: GoodsReceiptItem[];
  totalAmount: number;
  status: "draft" | "completed";
  note?: string;
  createdBy?: string | { _id: string; name: string };
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateGoodsReceiptPayload = {
  supplier: string;
  items: { product: string; quantity: number; unitCost: number }[];
  note?: string;
};

export type UpdateGoodsReceiptPayload = Partial<CreateGoodsReceiptPayload>;

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: string;
  } = {},
): Promise<ApiEnvelope<T>> {
  try {
    const response = await api.request<ApiEnvelope<T>>({
      url: path,
      method: options.method || "GET",
      data: options.body ? JSON.parse(options.body) : undefined,
    });

    const result = response?.data;

    if (!result || typeof result !== "object") {
      throw new Error("API phiếu nhập kho trả về dữ liệu không hợp lệ.");
    }

    if (result.success === false) {
      throw new Error(result.message || "Yêu cầu không thành công.");
    }

    return result;
  } catch (error: unknown) {
    if (error instanceof Error && !axios.isAxiosError(error)) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data as { message?: string } | null | undefined;

      throw new Error(
        responseData?.message || error.message || "Không thể kết nối máy chủ phiếu nhập kho.",
      );
    }

    throw new Error("Đã xảy ra lỗi khi xử lý phiếu nhập kho.");
  }
}

export async function fetchGoodsReceipts(
  params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {},
): Promise<{ data: GoodsReceipt[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }

  query.set("page", String(params.page || 1));
  query.set("limit", String(params.limit || 20));

  const envelope = await request<any>(`/goods-receipts?${query.toString()}`);

  const rawData = envelope.data;
  const items: GoodsReceipt[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.items)
      ? rawData.items
      : [];

  const pagination = envelope.pagination || {
    page: rawData?.page || 1,
    limit: rawData?.limit || 20,
    total: rawData?.total ?? items.length,
    pages: rawData?.pages || 1,
  };

  return {
    data: items,
    pagination,
  };
}

export async function fetchGoodsReceiptById(id: string): Promise<GoodsReceipt> {
  const envelope = await request<GoodsReceipt>(`/goods-receipts/${id}`);

  if (!envelope.data) {
    throw new Error("Không tìm thấy phiếu nhập kho.");
  }

  return envelope.data;
}

export async function createGoodsReceipt(payload: CreateGoodsReceiptPayload): Promise<GoodsReceipt> {
  const envelope = await request<GoodsReceipt>("/goods-receipts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!envelope.data) {
    throw new Error("Không thể tạo phiếu nhập kho.");
  }

  return envelope.data;
}

export async function updateGoodsReceipt(
  id: string,
  payload: UpdateGoodsReceiptPayload,
): Promise<GoodsReceipt> {
  const envelope = await request<GoodsReceipt>(`/goods-receipts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!envelope.data) {
    throw new Error("Không thể cập nhật phiếu nhập kho.");
  }

  return envelope.data;
}

export async function completeGoodsReceipt(id: string): Promise<GoodsReceipt> {
  const envelope = await request<GoodsReceipt>(`/goods-receipts/${id}/complete`, {
    method: "POST",
  });

  if (!envelope.data) {
    throw new Error("Không thể hoàn tất phiếu nhập kho.");
  }

  return envelope.data;
}

export async function deleteGoodsReceipt(id: string): Promise<void> {
  await request(`/goods-receipts/${id}`, {
    method: "DELETE",
  });
}
