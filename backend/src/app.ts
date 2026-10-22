import "dotenv/config";
import "reflect-metadata";
import express from "express";
import cors from "cors";
import { publicRouter, protectedRouter } from "./routes";
import { authMiddleware } from "./middlewares/auth.middleware";

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

  private setupRoutes(): void {
    this.app.use("/api/v1", publicRouter);
    this.app.use("/api/v1", authMiddleware);
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
