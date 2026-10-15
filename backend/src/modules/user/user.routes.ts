import { Router } from "express";
import * as userController from "./user.controller";

const router = Router();

router.get("/", userController.getAll);
router.get("/stats", userController.getStats);
router.get("/:id", userController.getById);
router.post("/", userController.create);
router.put("/:id", userController.update);
router.put("/:id/toggle-lock", userController.toggleLock);
router.put("/:id/toggle-active", userController.toggleActive);
router.delete("/:id", userController.delete_);

export default router;
