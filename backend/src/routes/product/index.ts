import { Router } from "express";
import productRouter, { productManagementRouter } from "../../modules/product/product.routes";

// Public routes cho F&B / Hàng hóa (khách xem menu gọi món)
export const productPublicRoutes = Router();
productPublicRoutes.use("/products", productRouter);

// Protected routes cho quản lý kho hàng, nhập xuất, chỉnh sửa giá sản phẩm
export const productProtectedRoutes = Router();
productProtectedRoutes.use("/products", productManagementRouter);
