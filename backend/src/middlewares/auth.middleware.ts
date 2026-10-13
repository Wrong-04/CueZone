import { ExpressMiddlewareInterface } from "routing-controllers";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { appConfig } from "../config/app.config";
import { TokenPayload } from "../modules/auth/auth.service";

export class AuthMiddleware implements ExpressMiddlewareInterface {
  use(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Không có token xác thực" });
      return;
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as TokenPayload;
      (req as any).user = decoded;
      next();
    } catch {
      res.status(401).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn" });
    }
  }
}
