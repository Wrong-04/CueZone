import { Router } from "express";
import multer from "multer";
import type { RequestHandler } from "express";
import { requirePosStaff } from "../../middlewares/pos.middleware";
import * as productController from "./product.controller";

const publicRouter = Router();
publicRouter.get("/fnb", productController.getFnbMenu);

const imageUpload = multer({
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

const parseProductImage: RequestHandler = (req, res, next) => {
  imageUpload(req, res, (error) => {
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

export const productManagementRouter = Router();
productManagementRouter.use(requirePosStaff);
productManagementRouter.get("/", productController.getAll);
productManagementRouter.get("/:id", productController.getById);
productManagementRouter.post("/:id/image", parseProductImage, productController.uploadImage);
productManagementRouter.post("/", productController.create);
productManagementRouter.put("/:id", productController.update);
productManagementRouter.delete("/:id", productController.delete_);

export default publicRouter;
