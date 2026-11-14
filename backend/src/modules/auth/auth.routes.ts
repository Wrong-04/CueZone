import { Router } from "express";
import multer from "multer";
import type { RequestHandler } from "express";
import * as authController from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      callback(new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP"));
      return;
    }
    callback(null, true);
  },
}).single("avatar");

const parseAvatarImage: RequestHandler = (req, res, next) => {
  avatarUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const isTooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    res.status(isTooLarge ? 413 : 400).json({
      success: false,
      message: isTooLarge
        ? "Ảnh đại diện không được vượt quá 5 MB"
        : error instanceof Error
          ? error.message
          : "Không thể đọc ảnh tải lên",
    });
  });
};

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
router.patch("/profile", authMiddleware, authController.updateProfile);
router.post("/avatar", authMiddleware, parseAvatarImage, authController.uploadAvatar);
router.post("/change-password", authMiddleware, authController.changePassword);

export default router;
