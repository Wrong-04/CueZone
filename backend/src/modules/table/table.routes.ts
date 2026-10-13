import { Router } from "express";
import * as tableController from "./table.controller";
import { requirePosStaff } from "../../middlewares/pos.middleware";

const router = Router();

router.get("/", requirePosStaff, tableController.getAll);
router.get("/stats", requirePosStaff, tableController.getStats);
router.get("/:id", requirePosStaff, tableController.getById);
router.post("/", requirePosStaff, tableController.create);
router.put("/:id", requirePosStaff, tableController.update);
router.put("/:id/status", requirePosStaff, tableController.updateStatus);
router.delete("/:id", requirePosStaff, tableController.delete_);

export default router;
