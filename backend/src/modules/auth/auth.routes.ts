import { Router } from "express";
import * as authController from "./auth.controller";

const router = Router();

// Public routes (no auth required)
router.post("/register", authController.register);
router.post("/register/request", authController.sendVerificationCode);
router.post("/register/verify", authController.verifyAndRegister);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);

// Protected routes
router.get("/profile", authController.getProfile);

export default router;
