import { Router } from "express";
import pricingRouter from "../../modules/pricing/pricing.routes";

export const pricingProtectedRoutes = Router();

// Quản lý cấu hình bảng giá & khung giờ
pricingProtectedRoutes.use("/pricing", pricingRouter);
