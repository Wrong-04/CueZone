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

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const table = await tableService.cancelBooking(req.params.id);
    return res.json({ success: true, message: "Hủy giữ bàn thành công", data: table });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const findAvailable = async (req: Request, res: Response) => {
  try {
    const result = await tableService.findAvailableByType(req.query.type as string);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const getPublicTables = async (req: Request, res: Response) => {
  try {
    const tables = await tableService.getPublicTables(req.query);
    return res.json({ success: true, data: tables });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const lookupCustomer = async (req: Request, res: Response) => {
  try {
    const query = (req.query.phone || req.query.query || req.query.search || "") as string;
    const trimmed = query.trim();
    if (!trimmed || (trimmed.replace(/\D/g, "").length < 8 && trimmed.length < 2)) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập số điện thoại (tối thiểu 8 số) hoặc tên hội viên" });
    }
    const customer = await tableService.lookupCustomer(trimmed);
    if (!customer) {
      return res.json({ success: false, message: "Không tìm thấy hội viên phù hợp" });
    }
    return res.json({ success: true, data: customer });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const quickRegisterCustomer = async (req: Request, res: Response) => {
  try {
    const { phone, name } = req.body || {};
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ success: false, message: "Vui lòng nhập số điện thoại hợp lệ" });
    }
    const result = await tableService.quickRegisterCustomer({ phone, name });
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Không thể đăng ký hội viên" });
  }
};
