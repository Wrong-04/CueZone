import { Router } from "express";
import * as notificationController from "./notification.controller";

const router = Router();

router.get("/", notificationController.getAll);
router.get("/unread-count", notificationController.getUnreadCount);
router.put("/:id/read", notificationController.markRead);
router.put("/read-all", notificationController.markAllRead);
router.delete("/:id", notificationController.delete_);
router.delete("/", notificationController.clearAll);

export default router;
