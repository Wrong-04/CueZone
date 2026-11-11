import { Router } from "express";
import multer from "multer";
import type { RequestHandler } from "express";
import { requirePermission } from "../../middlewares/auth.middleware";
import * as newsController from "./news.controller";

const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      callback(new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP"));
      return;
    }
    callback(null, true);
  },
}).single("image");

const parseBannerImage: RequestHandler = (req, res, next) => {
  bannerUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const isTooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    res.status(isTooLarge ? 413 : 400).json({
      success: false,
      message: isTooLarge
        ? "Ảnh không được vượt quá 5 MB"
        : error instanceof Error
          ? error.message
          : "Không thể đọc ảnh tải lên",
    });
  });
};

export const publicNewsRouter = Router();
publicNewsRouter.get("/", newsController.getPublicArticles);
publicNewsRouter.get("/:slugOrId", newsController.getPublicArticleDetail);

export const adminNewsRouter = Router();
adminNewsRouter.use(requirePermission("news", "manage"));
adminNewsRouter.get("/", newsController.getAdminArticles);
adminNewsRouter.post("/upload-banner", parseBannerImage, newsController.uploadBanner);
adminNewsRouter.get("/:id", newsController.getArticleById);
adminNewsRouter.post("/", newsController.createArticle);
adminNewsRouter.put("/:id", newsController.updateArticle);
adminNewsRouter.delete("/:id", newsController.deleteArticle);
