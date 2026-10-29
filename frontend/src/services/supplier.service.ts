import api from "./api";
import axios from "axios";

export type Supplier = {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SupplierPayload = {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
};

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
      throw new Error("API nhà cung cấp trả về dữ liệu không hợp lệ.");
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
        responseData?.message || error.message || "Không thể kết nối máy chủ nhà cung cấp.",
      );
    }

    throw new Error("Đã xảy ra lỗi khi xử lý nhà cung cấp.");
  }
}

export async function fetchSuppliers(
  params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const query = new URLSearchParams();

  if (params.search) {
    query.set("search", params.search);
  }

  query.set("status", params.status || "active");
  query.set("page", String(params.page || 1));
  query.set("limit", String(params.limit || 20));

  return request<Supplier[]>(`/suppliers?${query.toString()}`);
}

export async function createSupplier(payload: SupplierPayload) {
  return request<Supplier>("/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSupplier(id: string, payload: SupplierPayload) {
  return request<Supplier>(`/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteSupplier(id: string) {
  return request(`/suppliers/${id}`, {
    method: "DELETE",
  });
}

export async function restoreSupplier(id: string) {
  return request<Supplier>(`/suppliers/${id}/restore`, {
    method: "PATCH",
  });
}
