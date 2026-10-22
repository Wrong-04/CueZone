import {
  Request,
  Response,
  NextFunction,
} from "express";

export function requireInventoryRead(
  req: Request,
  res: Response,
  next: NextFunction
) {
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

  const allowedRoles = [
    "admin",
    "warehouse",
    "staff",
  ];

  if (!allowedRoles.includes(user.role || "")) {
    return res.status(403).json({
      success: false,
      message:
        "Bạn không có quyền xem tồn kho.",
    });
  }

  next();
}