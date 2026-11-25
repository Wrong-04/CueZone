// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU: ROUTER SẢN PHẨM & THỰC ĐƠN F&B (/api/v1/products)
// - Nhóm Công khai (publicRouter): GET /products/fnb -> trả menu F&B cho POS & Khách hàng
// - Nhóm Quản trị (productManagementRouter, quyền `products.manage`): CRUD sản phẩm & upload ảnh Cloudinary
// ============================================================================
import { Router } from "express";
import multer from "multer";
import type { RequestHandler } from "express";
import { requirePermission } from "../../middlewares/auth.middleware";
import * as productController from "./product.controller";

// ── 1. ROUTER CÔNG KHAI: LẤY THỰC ĐƠN F&B ĐANG MỞ BÁN ──────────────────────────────────
const publicRouter = Router();
publicRouter.get("/fnb", productController.getFnbMenu);

// Cấu hình Multer nhận ảnh trong RAM (tối đa 5 MB, chỉ JPG/PNG/WEBP)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      callback(new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP"));
      return;
    }
    callback(null, true);
  },
}).single("image");

/**
 * Middleware đọc file ảnh tải lên qua multipart/form-data và trả mã lỗi HTTP phù hợp (413/400).
 *
 * @param {Request} req - Đối tượng HTTP Request chứa trường file `image`
 * @param {Response} res - Đối tượng HTTP Response
 * @param {NextFunction} next - Chuyển tiếp sang controller upload ảnh
 * @returns {void}
 */
const parseProductImage: RequestHandler = (req, res, next) => {
  imageUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const isTooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    res.status(isTooLarge ? 413 : 400).json({
      success: false,
      message: isTooLarge
        ? "Ảnh không được vượt quá 5 MB"
        : error instanceof Error
          ? error.message
          : "Không thể đọc ảnh tải lên",
    });
  });
};

// ── 2. ROUTER QUẢN TRỊ SẢN PHẨM & UPLOAD ẢNH (Yêu cầu quyền products.manage) ───────────
export const productManagementRouter = Router();
productManagementRouter.use(requirePermission("products", "manage"));

// Lấy toàn bộ danh sách sản phẩm (kèm tên danh mục)
productManagementRouter.get("/", productController.getAll);
// Upload ảnh lên Cloudinary trước khi lưu form tạo mới
productManagementRouter.post("/upload-image", parseProductImage, productController.uploadDirectImage);
// Xem chi tiết một sản phẩm theo ID
productManagementRouter.get("/:id", productController.getById);
// Upload ảnh và cập nhật trực tiếp cho một sản phẩm đã có
productManagementRouter.post("/:id/image", parseProductImage, productController.uploadImage);
// Tạo mới sản phẩm / món F&B
productManagementRouter.post("/", productController.create);
// Cập nhật thông tin hoặc bật/tắt bán món
productManagementRouter.put("/:id", productController.update);
// Xóa sản phẩm theo ID
productManagementRouter.delete("/:id", productController.delete_);

export default publicRouter;
