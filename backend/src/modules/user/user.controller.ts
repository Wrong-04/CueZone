import { Request, Response } from "express";
import { UserService } from "./user.service";

const userService = new UserService();

export const getAll = async (req: Request, res: Response) => {
  try {
    const users = await userService.getAll(req.query);
    return res.json({ success: true, data: users });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await userService.getStats();
    return res.json({ success: true, data: stats });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const user = await userService.getById(req.params.id);
    return res.json({ success: true, data: user });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const user = await userService.create(req.body);
    return res.json({ success: true, message: "Tạo nhân viên thành công", data: user });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const user = await userService.update(req.params.id, req.body);
    return res.json({ success: true, message: "Cập nhật thành công", data: user });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const toggleLock = async (req: Request, res: Response) => {
  try {
    const user = await userService.toggleLock(req.params.id);
    return res.json({ success: true, message: user.isLocked ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản", data: user });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const toggleActive = async (req: Request, res: Response) => {
  try {
    const user = await userService.toggleActive(req.params.id);
    return res.json({ success: true, message: user.isActive ? "Đã kích hoạt" : "Đã vô hiệu hóa", data: user });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const delete_ = async (req: Request, res: Response) => {
  try {
    await userService.delete(req.params.id);
    return res.json({ success: true, message: "Xóa nhân viên thành công" });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};
