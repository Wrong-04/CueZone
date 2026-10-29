import { Request, Response } from "express";
import { ProductService } from "./product.service";

const productService = new ProductService();

export const getFnbMenu = async (req: Request, res: Response) => {
  try {
    const menu = await productService.getFnbMenu();
    return res.json({ success: true, data: menu });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const getAll = async (req: Request, res: Response) => {
  try {
    const products = await productService.getAll();
    return res.json({ success: true, data: products });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const product = await productService.getById(req.params.id);
    return res.json({ success: true, data: product });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const uploadImage = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Vui lòng chọn ảnh sản phẩm" });
  }

  try {
    const product = await productService.replaceImage(req.params.id, req.file.buffer);
    return res.json({
      success: true,
      message: "Đã tải ảnh lên Cloudinary và cập nhật sản phẩm",
      data: product,
    });
  } catch (error: any) {
    const status = error.httpCode || (error.message === "Không tìm thấy sản phẩm" ? 404 : 502);
    const message =
      status === 502 ? "Không thể tải ảnh lên Cloudinary. Vui lòng thử lại." : error.message;
    return res.status(status).json({ success: false, message });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const product = await productService.create(req.body);
    return res.json({ success: true, message: "Tạo sản phẩm thành công", data: product });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    return res.json({ success: true, message: "Cập nhật sản phẩm thành công", data: product });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

export const delete_ = async (req: Request, res: Response) => {
  try {
    await productService.delete(req.params.id);
    return res.json({ success: true, message: "Xóa sản phẩm thành công" });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};
