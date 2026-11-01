import { Request, Response, NextFunction } from "express";
import { User, UserRole } from "../modules/user/user.model";

export async function requirePosStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById((req as any).user?.userId);
    if (!user || !user.isActive || user.isLocked) {
      return res.status(401).json({ success: false, message: "Phiên đăng nhập không còn hợp lệ" });
    }
    if (![UserRole.ADMIN, UserRole.STAFF, UserRole.CASHIER].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền điều hành bàn" });
    }
    next();
  } catch (error) {
    next(error);
  }
}
