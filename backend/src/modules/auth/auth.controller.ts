import { Request, Response } from "express";
import { AuthService } from "./auth.service";

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, message: "Đăng ký thành công", data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const sendVerificationCode = async (req: Request, res: Response) => {
  try {
    const result = await authService.sendVerificationCode(req.body);
    res.json({
      success: true,
      message: "Mã xác minh đã được gửi đến email của bạn",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const verifyAndRegister = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    const result = await authService.verifyAndRegister(email, code);
    res.status(201).json({ success: true, message: "Xác minh email thành công", data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, message: "Đăng nhập thành công", data: result });
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.userId) {
      res.status(401).json({ success: false, message: "Không có thông tin xác thực" });
      return;
    }
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
    res.status(401).json({ success: false, message: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const result = await authService.forgotPassword(req.body);
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const result = await authService.resetPassword(req.body);
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.userId) {
      res.status(401).json({ success: false, message: "Không có thông tin xác thực" });
      return;
    }
    const result = await authService.changePassword(user.userId, req.body);
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
