import { Router } from "express";
import walletRouter from "../../modules/wallet/wallet.routes";

export const walletProtectedRoutes = Router();

// Quản lý ví hội viên, đối soát nạp rút & thanh toán
walletProtectedRoutes.use("/wallet", walletRouter);
