import { Router } from "express";
import productRouter, { productManagementRouter } from "../../modules/product/product.routes";

export const productPublicRoutes = Router();
productPublicRoutes.use("/products", productRouter);

export const productProtectedRoutes = Router();
productProtectedRoutes.use("/products", productManagementRouter);
