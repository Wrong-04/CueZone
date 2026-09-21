import { Request, Response } from "express";
import { AuthService } from "./auth.service";

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    res.json({ success: true, message: "Đăng ký thành công", data: result });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, message: "Đăng nhập thành công", data: result });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const profile = await authService.getProfile(user.userId);
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const tokens = await authService.refreshToken(req.body.refreshToken);
    res.json({ success: true, data: tokens });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
};
