import { Router } from "express";
import notificationRouter from "../../modules/notification/notification.routes";

export const notificationProtectedRoutes = Router();

notificationProtectedRoutes.use("/notifications", notificationRouter);
