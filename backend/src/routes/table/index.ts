import { Router } from "express";
import tableRouter from "../../modules/table/table.routes";
import sessionRouter from "../../modules/session/session.routes";
import { getPublicTables } from "../../modules/table/table.controller";

// Public routes cho bàn bida (khách xem trạng thái bàn)
export const tablePublicRoutes = Router();
tablePublicRoutes.get("/public/tables", getPublicTables);
tablePublicRoutes.get("/tables/public", getPublicTables);

// Protected routes cho bàn bida & phiên chơi POS
export const tableProtectedRoutes = Router();
// Lưu ý: session router phải đặt trước tables router để mergeParams :id chuẩn xác
tableProtectedRoutes.use("/tables/:id/session", sessionRouter);
tableProtectedRoutes.use("/tables", tableRouter);
