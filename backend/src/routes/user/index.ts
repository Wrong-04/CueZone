import { Router } from "express";
import userRouter from "../../modules/user/user.routes";
import roleRouter from "../../modules/role/role.routes";
import { requireRole } from "../../middlewares/auth.middleware";
import { UserRole } from "../../modules/user/user.model";

export const rbacProtectedRoutes = Router();

rbacProtectedRoutes.use("/users", requireRole(UserRole.ADMIN), userRouter);
rbacProtectedRoutes.use("/roles", requireRole(UserRole.ADMIN), roleRouter);
