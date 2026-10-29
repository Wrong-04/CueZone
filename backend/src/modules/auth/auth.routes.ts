import { Router } from "express";
import * as authController from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

// Public routes (no auth required)
router.post("/register", authController.register);
router.post("/register/request", authController.sendVerificationCode);
router.post("/register/verify", authController.verifyAndRegister);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Protected routes
router.get("/profile", authMiddleware, authController.getProfile);
router.post("/change-password", authMiddleware, authController.changePassword);

export default router;
