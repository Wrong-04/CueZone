import "reflect-metadata";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { useExpressServer, useContainer } from "routing-controllers";
import { Container } from "typedi";
import dotenv from "dotenv";

dotenv.config();

export class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.setupDatabase();
    this.setupMiddlewares();
    this.setupRouting();
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

  private setupRouting(): void {
    useContainer(Container);

    useExpressServer(this.app, {
      cors: true,
      routePrefix: "/api/v1",
      // controllers: [__dirname + "/modules/**/*.controller.ts"], 
      // middlewares: [__dirname + "/middlewares/**/*.ts"],
      defaultErrorHandler: false, 
      validation: true 
    });
  }
}
