import { Router } from "express";
import userRouter from "../../modules/user/user.routes";
import roleRouter from "../../modules/role/role.routes";
import { requireRole } from "../../middlewares/auth.middleware";
import { UserRole } from "../../modules/user/user.model";

export const rbacProtectedRoutes = Router();

// Quản lý người dùng và vai trò phân quyền (RBAC) - Chỉ dành riêng cho ADMIN
rbacProtectedRoutes.use("/users", requireRole(UserRole.ADMIN), userRouter);
rbacProtectedRoutes.use("/roles", requireRole(UserRole.ADMIN), roleRouter);
