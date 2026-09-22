import { Request, Response } from "express";
import { TableService } from "./table.service";

const tableService = new TableService();

export const getAll = async (req: Request, res: Response) => {
  try {
    const tables = await tableService.getAll(req.query);
    return res.json({ success: true, data: tables });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await tableService.getStats();
    return res.json({ success: true, data: stats });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const table = await tableService.getById(req.params.id);
    return res.json({ success: true, data: table });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const table = await tableService.create(req.body);
    return res.json({ success: true, message: "Tạo bàn thành công", data: table });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const table = await tableService.update(req.params.id, req.body);
    return res.json({ success: true, message: "Cập nhật bàn thành công", data: table });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const table = await tableService.updateStatus(req.params.id, req.body.status);
    return res.json({ success: true, message: "Cập nhật trạng thái thành công", data: table });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const delete_ = async (req: Request, res: Response) => {
  try {
    await tableService.delete(req.params.id);
    return res.json({ success: true, message: "Xóa bàn thành công" });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};
