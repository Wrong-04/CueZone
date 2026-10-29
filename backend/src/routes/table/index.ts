import { Router } from "express";
import tableRouter from "../../modules/table/table.routes";
import sessionRouter from "../../modules/session/session.routes";
import { getPublicTables } from "../../modules/table/table.controller";

export const tablePublicRoutes = Router();
tablePublicRoutes.get("/public/tables", getPublicTables);
tablePublicRoutes.get("/tables/public", getPublicTables);

export const tableProtectedRoutes = Router();

tableProtectedRoutes.use("/tables/:id/session", sessionRouter);
tableProtectedRoutes.use("/tables", tableRouter);
