import { Router } from "express";

import {
  getInventory,
  getInventoryHistory,
  createInventoryTransaction,
} from "./inventory.controller";

import { requireInventoryRead } from "../../middlewares/inventory-read.middleware";
import { requireProductManager } from "../../middlewares/product-admin.middleware";

import wasteRouter from "../inventory/accessory-waste.routes";
import orderDeductionRouter from "../inventory/order-deduction.routes";
import inventoryReportRouter from "../inventory/inventory-report.routes";
import stockCheckRouter from "../inventory/stock-check.routes";

const router = Router();

router.use("/waste", wasteRouter);
router.use("/order-deductions", orderDeductionRouter);
router.use("/report", inventoryReportRouter);
router.use("/stock-checks", stockCheckRouter);

router.get("/", requireInventoryRead, getInventory);

router.get("/:productId/history", requireInventoryRead, getInventoryHistory);

router.post("/transactions", requireProductManager, createInventoryTransaction);

export default router;
