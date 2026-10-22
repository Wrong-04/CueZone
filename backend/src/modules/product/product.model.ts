import mongoose, { type Document } from "mongoose";

/**
 * Interface đại diện cho thực thể Sản phẩm / Hàng hóa (Product) bao gồm F&B và Phụ kiện bida.
 */
export interface IProduct extends Document {
  /** Tên mặt hàng (vd: "Trà đào cam sả", "Bao tay bida Predator", "Bò húc") */
  name: string;
  /** Mã SKU / mã vạch định danh duy nhất của sản phẩm */
  sku: string;
  /** Phân loại danh mục: phụ kiện, đồ uống, thức ăn, đồ ăn vặt, nguyên liệu pha chế */
  category: "accessory" | "drink" | "food" | "snack" | "ingredient";
  /** Đơn vị tính (vd: "lon", "chai", "đĩa", "ly", "cái", "hộp") */
  unit: string;
  /** Giá vốn nhập hàng (VNĐ) */
  costPrice: number;
  /** Giá bán niêm yết cho khách hàng tại quán (VNĐ) */
  salePrice: number;
  /** Số lượng hàng hiện có trong kho */
  stock: number;
  /** Định mức tồn kho tối thiểu (dùng kích hoạt cảnh báo nhập hàng) */
  minStock: number;
  /** Đường dẫn URL hình ảnh sản phẩm */
  imageUrl?: string;
  /** Mô tả chi tiết hoặc ghi chú thành phần sản phẩm */
  description?: string;
  /** Cho phép xuất bán trên menu gọi món tại POS hay chỉ dùng nội bộ */
  isForSale: boolean;
  /** Trạng thái kích hoạt mặt hàng (true: đang kinh doanh, false: ngừng bán) */
  isActive: boolean;
  /** Thời điểm tạo sản phẩm */
  createdAt: Date;
  /** Thời điểm cập nhật sản phẩm gần nhất */
  updatedAt: Date;
}

const ProductSchema = new mongoose.Schema<IProduct>(
  {
    // Tên hàng hóa / món ăn
    name: { type: String, required: true },
    // Mã SKU duy nhất
    sku: { type: String, required: true, unique: true },
    // Nhóm danh mục hàng hóa
    category: {
      type: String,
      enum: ["accessory", "drink", "food", "snack", "ingredient"],
      required: true,
    },
    // Đơn vị tính của món
    unit: { type: String, required: true },
    // Giá vốn nhập hàng
    costPrice: { type: Number, default: 0 },
    // Giá bán ra
    salePrice: { type: Number, default: 0 },
    // Số lượng tồn kho thực tế
    stock: { type: Number, default: 0 },
    // Ngưỡng cảnh báo tồn kho tối thiểu
    minStock: { type: Number, default: 10 },
    // Ảnh đại diện sản phẩm
    imageUrl: { type: String },
    // Diễn giải thông tin mặt hàng
    description: { type: String },
    // Cờ cho phép bán tại quầy POS
    isForSale: { type: Boolean, default: true },
    // Cờ trạng thái đang kinh doanh
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Product = mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
