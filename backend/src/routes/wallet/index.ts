import { Router } from "express";
import walletRouter from "../../modules/wallet/wallet.routes";

export const walletProtectedRoutes = Router();

walletProtectedRoutes.use("/wallet", walletRouter);
