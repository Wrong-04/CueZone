import { Request, Response, NextFunction } from "express";

export function requireProductManager(req: Request, res: Response, next: NextFunction) {
  const user = (
    req as Request & {
      user?: {
        role?: string;
      };
    }
  ).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Bạn chưa đăng nhập.",
    });
  }

  if (user.role !== "admin" && user.role !== "warehouse") {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền quản lý hàng hóa.",
    });
  }

  next();
}
