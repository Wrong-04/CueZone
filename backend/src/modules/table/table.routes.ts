import { Router } from "express";
import * as tableController from "./table.controller";
import { requirePermission } from "../../middlewares/auth.middleware";

const posRead = requirePermission("pos", "read");
const posOperate = requirePermission("pos", "operate");
const tablesManage = requirePermission("tables", "manage");

const router = Router();

router.get("/", posRead, tableController.getAll);
router.get("/stats", posRead, tableController.getStats);
router.get("/available", posRead, tableController.findAvailable);
router.get("/customer-lookup", posRead, tableController.lookupCustomer);
router.post("/quick-register-customer", posOperate, tableController.quickRegisterCustomer);
router.get("/:id", posRead, tableController.getById);
router.post("/", tablesManage, tableController.create);
router.put("/:id", tablesManage, tableController.update);
router.put("/:id/status", posOperate, tableController.updateStatus);
router.post("/:id/cancel-booking", posOperate, tableController.cancelBooking);
router.delete("/:id", tablesManage, tableController.delete_);

export default router;
