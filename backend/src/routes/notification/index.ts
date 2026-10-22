import { Router } from "express";
import notificationRouter from "../../modules/notification/notification.routes";

export const notificationProtectedRoutes = Router();

// Quản lý thông báo người dùng
notificationProtectedRoutes.use("/notifications", notificationRouter);
