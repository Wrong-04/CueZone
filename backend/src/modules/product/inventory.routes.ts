import { Router } from "express";

import {
  getInventory,
  getInventoryHistory,
  createInventoryTransaction,
} from "./inventory.controller";

import {
  requireInventoryRead,
} from "../../middlewares/inventory-read.middleware";

import {
  requireProductManager,
} from "../../middlewares/product-admin.middleware";

const router = Router();

router.get(
  "/",
  requireInventoryRead,
  getInventory
);

router.get(
  "/:productId/history",
  requireInventoryRead,
  getInventoryHistory
);

router.post(
  "/transactions",
  requireProductManager,
  createInventoryTransaction
);

export default router;