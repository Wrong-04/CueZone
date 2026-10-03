import { Router } from "express";
import * as roleController from "./role.controller";

const router = Router();

router.get("/", roleController.getAll);
router.get("/:id", roleController.getById);
router.post("/", roleController.create);
router.put("/:id", roleController.update);
router.delete("/:id", roleController.delete_);

export default router;
