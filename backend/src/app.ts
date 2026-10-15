import "dotenv/config";
import "reflect-metadata";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { appConfig } from "./config/app.config";
import { publicRouter, protectedRouter } from "./routes";

export class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
  }

  private setupMiddlewares(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Không có token xác thực" });
      return;
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, appConfig.jwt.secret);
      (req as any).user = decoded;
      next();
    } catch {
      res.status(401).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn" });
    }
  }

  private setupRoutes(): void {
    this.app.use("/api/v1", publicRouter);
    this.app.use("/api/v1", this.authMiddleware);
    this.app.use("/api/v1", protectedRouter);

    this.app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("❌ Unhandled error:", err);
      res.status(err.httpCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
      });
    });
  }
}
