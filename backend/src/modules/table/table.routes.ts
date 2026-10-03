import { Router } from "express";
import * as tableController from "./table.controller";

const router = Router();

router.get("/", tableController.getAll);
router.get("/stats", tableController.getStats);
router.get("/:id", tableController.getById);
router.post("/", tableController.create);
router.put("/:id", tableController.update);
router.put("/:id/status", tableController.updateStatus);
router.delete("/:id", tableController.delete_);

export default router;
