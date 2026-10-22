import { Router } from "express";
import authRouter from "../../modules/auth/auth.routes";

export const authRoutes = Router();

// Endpoint xác thực công khai: đăng nhập, đăng ký, OTP, refresh token
// (auth profile cũng nằm ở /auth/profile và tự kiểm tra token nội bộ)
authRoutes.use("/", authRouter);
