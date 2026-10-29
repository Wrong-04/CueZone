import { Router } from "express";
import authRouter from "../../modules/auth/auth.routes";

export const authRoutes = Router();

authRoutes.use("/", authRouter);
