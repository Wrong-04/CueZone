import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { appConfig } from "../config/app.config";
import { TokenPayload } from "../modules/auth/auth.service";
import { User, UserRole } from "../modules/user/user.model";
import {
  getEffectivePermissions,
  hasPermission,
  isValidPermission,
  type PermissionModule,
} from "../modules/role/permission.catalog";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Không có token xác thực" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, appConfig.jwt.secret) as TokenPayload;
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ success: false, message: "Tài khoản không tồn tại" });
      return;
    }
    if (user.isLocked) {
      res.status(403).json({ success: false, message: "Tài khoản đã bị khóa" });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ success: false, message: "Tài khoản đã bị vô hiệu hóa" });
      return;
    }
    (req as any).user = decoded;
    (req as any).currentUser = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next();
    return;
  }
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Token không hợp lệ" });
    return;
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    (req as any).user = jwt.verify(token, appConfig.jwt.secret) as TokenPayload;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Không có token xác thực" });
      return;
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        res.status(401).json({ success: false, message: "Tài khoản không tồn tại" });
        return;
      }
      if (!user.isActive) {
        res.status(403).json({ success: false, message: "Tài khoản đã bị vô hiệu hóa" });
        return;
      }
      if (user.isLocked) {
        res.status(403).json({ success: false, message: "Tài khoản đã bị khóa" });
        return;
      }
      if (!allowedRoles.includes(user.role)) {
        res
          .status(403)
          .json({ success: false, message: "Bạn không có quyền thực hiện thao tác này" });
        return;
      }
      (req as any).currentUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Kiểm tra quyền theo ma trận RBAC (modules/role/permission.catalog.ts). Đọc lại user từ DB mỗi
// request để khóa/vô hiệu hóa/đổi vai trò có hiệu lực ngay.
export const requirePermission = (moduleName: PermissionModule, actionName: string) => {
  if (!isValidPermission(moduleName, actionName)) {
    throw new Error(`Quyền chưa khai báo trong catalog: ${moduleName}.${actionName}`);
  }
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById((req as any).user?.userId);
      if (!user || !user.isActive || user.isLocked) {
        res.status(401).json({ success: false, message: "Phiên đăng nhập không còn hợp lệ" });
        return;
      }
      const perms = await getEffectivePermissions(user.role);
      if (!hasPermission(perms, moduleName, actionName)) {
        res
          .status(403)
          .json({ success: false, message: "Bạn không có quyền thực hiện thao tác này" });
        return;
      }
      (req as any).currentUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
};
