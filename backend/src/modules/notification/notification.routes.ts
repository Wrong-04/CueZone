import { Router } from "express";
import * as notificationController from "./notification.controller";
import { requireRole } from "../../middlewares/auth.middleware";
import { UserRole } from "../user/user.model";

const router = Router();

router.get("/", notificationController.getAll);
router.get("/unread-count", notificationController.getUnreadCount);
router.post("/", requireRole(UserRole.ADMIN, UserRole.STAFF), notificationController.create);
router.put("/read-all", notificationController.markAllRead);
router.put("/:id/read", notificationController.markRead);
router.delete("/:id", notificationController.delete_);
router.delete("/", notificationController.clearAll);

export default router;
