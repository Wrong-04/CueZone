import { Router } from "express";
import pricingRouter from "../../modules/pricing/pricing.routes";

export const pricingProtectedRoutes = Router();

pricingProtectedRoutes.use("/pricing", pricingRouter);
