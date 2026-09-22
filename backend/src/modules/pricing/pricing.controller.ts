import { Request, Response } from "express";
import { PricingTierService } from "./pricing.service";

const pricingService = new PricingTierService();

export const getAll = async (req: Request, res: Response) => {
  try {
    const tiers = await pricingService.getAll();
    return res.json({ success: true, data: tiers });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const tier = await pricingService.getById(req.params.id);
    return res.json({ success: true, data: tier });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const tier = await pricingService.create(req.body);
    return res.json({ success: true, message: "Tạo khung giờ thành công", data: tier });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const tier = await pricingService.update(req.params.id, req.body);
    return res.json({ success: true, message: "Cập nhật khung giờ thành công", data: tier });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const activate = async (req: Request, res: Response) => {
  try {
    const tier = await pricingService.activate(req.params.id);
    return res.json({ success: true, message: "Kích hoạt khung giờ thành công", data: tier });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const delete_ = async (req: Request, res: Response) => {
  try {
    await pricingService.delete(req.params.id);
    return res.json({ success: true, message: "Xóa khung giờ thành công" });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};
