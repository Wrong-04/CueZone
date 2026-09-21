import { Request, Response } from "express";
import { RoleService } from "./role.service";

const roleService = new RoleService();

export const getAll = async (req: Request, res: Response) => {
  try {
    const roles = await roleService.getAll();
    return res.json({ success: true, data: roles });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const role = await roleService.getById(req.params.id);
    return res.json({ success: true, data: role });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const role = await roleService.create(req.body);
    return res.json({ success: true, message: "Tạo role thành công", data: role });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const role = await roleService.update(req.params.id, req.body);
    return res.json({ success: true, message: "Cập nhật role thành công", data: role });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const delete_ = async (req: Request, res: Response) => {
  try {
    await roleService.delete(req.params.id);
    return res.json({ success: true, message: "Xóa role thành công" });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};
