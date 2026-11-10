import { Router } from "express";
import * as pricingController from "./pricing.controller";
import { requirePermission } from "../../middlewares/auth.middleware";

const router = Router();
// POS cần đọc bảng giá; chỉ quyền pricing.manage được ghi.
const pricingRead = requirePermission("pos", "read");
const pricingManage = requirePermission("pricing", "manage");

router.get("/", pricingRead, pricingController.getAll);
router.get("/:id", pricingRead, pricingController.getById);
router.post("/", pricingManage, pricingController.create);
router.put("/:id", pricingManage, pricingController.update);
router.put("/:id/activate", pricingManage, pricingController.activate);
router.delete("/:id", pricingManage, pricingController.delete_);

export default router;
