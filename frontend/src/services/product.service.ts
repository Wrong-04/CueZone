// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU: API CLIENT QUẢN LÝ THỰC ĐƠN & SẢN PHẨM (/products)
// FnBInventoryPage / PosTableFloorPage / CustomerFnB
//   -> productService -> product.routes.ts -> product.controller.ts -> ProductService -> MongoDB + Cloudinary
// ============================================================================
import api from "./api";
import type { ApiResponse } from "../types";

export interface ProductMenu {
  _id: string;
  name: string;
  sku: string;
  category: string;
  categoryName?: string;
  unit?: string;
  salePrice: number;
  imageUrl?: string;
  description: string;
  stock: number;
  isOutOfStock: boolean;
  isMadeToOrder?: boolean;
  productType?: "fnb" | "ingredient" | "accessory";
}

export interface ProductImageTarget {
  _id: string;
  name: string;
  sku: string;
  category: string;
  imageUrl?: string;
}

export const productService = {
  /**
   * Lấy danh sách món F&B đang mở bán (dùng cho POS Gọi món và Trang khách hàng).
   * Luồng đi: GET /products/fnb -> ProductController.getFnbMenu() -> ProductService.getFnbMenu().
   *
   * @returns {Promise<ProductMenu[]>} Danh sách món kèm cờ isMadeToOrder và trạng thái hết hàng
   */
  async getFnbMenu(): Promise<ProductMenu[]> {
    const { data } = await api.get<ApiResponse<ProductMenu[]>>("/products/fnb");
    if (!data.success || !data.data) {
      throw new Error(data.message || "Failed to fetch F&B menu");
    }
    return data.data;
  },

  /**
   * Lấy danh sách món F&B (drink, food, snack) phục vụ công cụ gắn/cập nhật ảnh sản phẩm.
   *
   * @returns {Promise<ProductImageTarget[]>} Danh sách sản phẩm thuộc nhóm F&B
   */
  async getImageTargets(): Promise<ProductImageTarget[]> {
    const { data } = await api.get<ApiResponse<ProductImageTarget[]>>("/products");
    if (!data.success || !data.data) {
      throw new Error(data.message || "Không thể tải danh sách sản phẩm");
    }
    return data.data.filter((product) => ["drink", "food", "snack"].includes(product.category));
  },

  /**
   * Lấy toàn bộ danh sách sản phẩm trong hệ thống (cả F&B và hàng kho) cho trang quản trị.
   *
   * @returns {Promise<any[]>} Danh sách toàn bộ sản phẩm kèm categoryName đã ghép
   */
  async getAll(): Promise<any[]> {
    const { data } = await api.get<ApiResponse<any[]>>("/products");
    if (!data.success || !data.data) {
      throw new Error(data.message || "Không thể tải danh sách sản phẩm");
    }
    return data.data;
  },

  /**
   * Cập nhật thông tin hoặc trạng thái bán của một sản phẩm/món ăn hiện có.
   *
   * @param {string} id - Mã định danh sản phẩm
   * @param {any} payload - Dữ liệu cần cập nhật (giá, tên, isForSale, isMadeToOrder...)
   * @returns {Promise<any>} Bản ghi sản phẩm sau khi cập nhật
   */
  async update(id: string, payload: any): Promise<any> {
    const { data } = await api.put<ApiResponse<any>>(`/products/${id}`, payload);
    if (!data.success || !data.data) {
      throw new Error(data.message || "Không thể cập nhật sản phẩm");
    }
    return data.data;
  },

  /**
   * Tạo mới một sản phẩm hoặc món F&B trong hệ thống (tự phát Socket menu:updated).
   *
   * @param {any} payload - Thông tin sản phẩm mới
   * @returns {Promise<any>} Bản ghi sản phẩm vừa tạo
   */
  async create(payload: any): Promise<any> {
    const { data } = await api.post<ApiResponse<any>>("/products", payload);
    if (!data.success || !data.data) {
      throw new Error(data.message || "Không thể tạo sản phẩm mới");
    }
    return data.data;
  },

  /**
   * Tải ảnh trực tiếp lên Cloudinary và gắn URL vào một sản phẩm đã tồn tại.
   *
   * @param {string} productId - Mã sản phẩm cần thay ảnh
   * @param {File} file - Tệp ảnh JPG/PNG/WEBP (tối đa 5 MB)
   * @returns {Promise<ProductImageTarget>} Sản phẩm kèm imageUrl mới
   */
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

  /**
   * Tải ảnh lên Cloudinary trước khi lưu form tạo mới sản phẩm để lấy URL xem trước.
   *
   * @param {File} file - Tệp ảnh cần tải lên
   * @returns {Promise<{ imageUrl: string }>} Đường dẫn ảnh an toàn trả về từ Cloudinary
   */
  async uploadDirect(file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append("image", file);

    const { data } = await api.post<ApiResponse<{ imageUrl: string }>>(
      "/products/upload-image",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || "Không thể tải ảnh lên Cloudinary");
    }
    return data.data;
  },
};
