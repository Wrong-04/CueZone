import { Router } from "express";
import * as pricingController from "./pricing.controller";

const router = Router();

router.get("/", pricingController.getAll);
router.get("/:id", pricingController.getById);
router.post("/", pricingController.create);
router.put("/:id", pricingController.update);
router.put("/:id/activate", pricingController.activate);
router.delete("/:id", pricingController.delete_);

export default router;
