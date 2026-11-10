import api from "./api";
import type { ApiResponse } from "../types";

export interface ProductMenu {
  _id: string;
  name: string;
  sku: string;
  category: string;
  salePrice: number;
  imageUrl?: string;
  description: string;
  stock: number;
  isOutOfStock: boolean;
  isMadeToOrder?: boolean;
}

export interface ProductImageTarget {
  _id: string;
  name: string;
  sku: string;
  category: string;
  imageUrl?: string;
}

export const productService = {
  async getFnbMenu(): Promise<ProductMenu[]> {
    const { data } = await api.get<ApiResponse<ProductMenu[]>>("/products/fnb");
    if (!data.success || !data.data) {
      throw new Error(data.message || "Failed to fetch F&B menu");
    }
    return data.data;
  },

  async getImageTargets(): Promise<ProductImageTarget[]> {
    const { data } = await api.get<ApiResponse<ProductImageTarget[]>>("/products");
    if (!data.success || !data.data) {
      throw new Error(data.message || "Không thể tải danh sách sản phẩm");
    }
    return data.data.filter((product) => ["drink", "food", "snack"].includes(product.category));
  },

  async getAll(): Promise<any[]> {
    const { data } = await api.get<ApiResponse<any[]>>("/products");
    if (!data.success || !data.data) {
      throw new Error(data.message || "Không thể tải danh sách sản phẩm");
    }
    return data.data;
  },

  async update(id: string, payload: any): Promise<any> {
    const { data } = await api.put<ApiResponse<any>>(`/products/${id}`, payload);
    if (!data.success || !data.data) {
      throw new Error(data.message || "Không thể cập nhật sản phẩm");
    }
    return data.data;
  },

  async create(payload: any): Promise<any> {
    const { data } = await api.post<ApiResponse<any>>("/products", payload);
    if (!data.success || !data.data) {
      throw new Error(data.message || "Không thể tạo sản phẩm mới");
    }
    return data.data;
  },

  async uploadProductImage(productId: string, file: File): Promise<ProductImageTarget> {
    const formData = new FormData();
    formData.append("image", file);

    const { data } = await api.post<ApiResponse<ProductImageTarget>>(
      `/products/${productId}/image`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || "Không thể tải ảnh lên máy chủ");
    }
    return data.data;
  },
};
