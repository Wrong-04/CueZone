import "reflect-metadata";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { appConfig } from "./config/app.config";
import * as authController from "./modules/auth/auth.controller";
import * as userController from "./modules/user/user.controller";
import * as roleController from "./modules/role/role.controller";
import * as tableController from "./modules/table/table.controller";
import * as pricingController from "./modules/pricing/pricing.controller";
import * as notificationController from "./modules/notification/notification.controller";

dotenv.config();

export class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.setupDatabase();
    this.setupMiddlewares();
    this.setupRoutes();
  }

  private setupDatabase(): void {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db";
    mongoose
      .connect(mongoUri)
      .then(() => console.log("✅ MongoDB connected successfully"))
      .catch((err) => console.error("❌ MongoDB connection error:", err));
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
    const publicRouter = express.Router();
    publicRouter.post("/auth/register", authController.register);
    publicRouter.post("/auth/register/request", authController.sendVerificationCode);
    publicRouter.post("/auth/register/verify", authController.verifyAndRegister);
    publicRouter.post("/auth/login", authController.login);
    publicRouter.post("/auth/refresh-token", authController.refreshToken);
    this.app.use("/api/v1", publicRouter);

    this.app.use("/api/v1", this.authMiddleware);

    const protectedRouter = express.Router();
    protectedRouter.get("/auth/profile", authController.getProfile);

    protectedRouter.get("/users", userController.getAll);
    protectedRouter.get("/users/stats", userController.getStats);
    protectedRouter.get("/users/:id", userController.getById);
    protectedRouter.post("/users", userController.create);
    protectedRouter.put("/users/:id", userController.update);
    protectedRouter.put("/users/:id/toggle-lock", userController.toggleLock);
    protectedRouter.put("/users/:id/toggle-active", userController.toggleActive);
    protectedRouter.delete("/users/:id", userController.delete_);

    protectedRouter.get("/roles", roleController.getAll);
    protectedRouter.get("/roles/:id", roleController.getById);
    protectedRouter.post("/roles", roleController.create);
    protectedRouter.put("/roles/:id", roleController.update);
    protectedRouter.delete("/roles/:id", roleController.delete_);

    protectedRouter.get("/tables", tableController.getAll);
    protectedRouter.get("/tables/stats", tableController.getStats);
    protectedRouter.get("/tables/:id", tableController.getById);
    protectedRouter.post("/tables", tableController.create);
    protectedRouter.put("/tables/:id", tableController.update);
    protectedRouter.put("/tables/:id/status", tableController.updateStatus);
    protectedRouter.delete("/tables/:id", tableController.delete_);

    protectedRouter.get("/pricing", pricingController.getAll);
    protectedRouter.get("/pricing/:id", pricingController.getById);
    protectedRouter.post("/pricing", pricingController.create);
    protectedRouter.put("/pricing/:id", pricingController.update);
    protectedRouter.put("/pricing/:id/activate", pricingController.activate);
    protectedRouter.delete("/pricing/:id", pricingController.delete_);

    protectedRouter.get("/notifications", notificationController.getAll);
    protectedRouter.get("/notifications/unread-count", notificationController.getUnreadCount);
    protectedRouter.put("/notifications/:id/read", notificationController.markRead);
    protectedRouter.put("/notifications/read-all", notificationController.markAllRead);
    protectedRouter.delete("/notifications/:id", notificationController.delete_);
    protectedRouter.delete("/notifications", notificationController.clearAll);

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
