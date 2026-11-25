// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU: CONTROLLER SẢN PHẨM & THỰC ĐƠN F&B
// product.routes.ts -> product.controller.ts -> ProductService -> emitMenuUpdated() (Socket.IO)
// ============================================================================
import { Request, Response } from "express";
import { ProductService } from "./product.service";
import { emitMenuUpdated } from "../../utils/socketHolder";

const productService = new ProductService();

/**
 * Lấy danh sách thực đơn F&B đang mở bán phục vụ quầy POS và Cổng khách hàng.
 * Luồng đi: GET /products/fnb -> ProductService.getFnbMenu() -> trả về danh sách món đã chuẩn hóa.
 *
 * @param {Request} req - Đối tượng HTTP Request
 * @param {Response} res - Đối tượng HTTP Response
 * @returns {Promise<Response>} JSON chứa mảng món F&B
 */
export const getFnbMenu = async (req: Request, res: Response) => {
  try {
    const menu = await productService.getFnbMenu();
    return res.json({ success: true, data: menu });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Lấy toàn bộ danh sách sản phẩm trong kho & thực đơn cho màn quản trị.
 *
 * @param {Request} req - Đối tượng HTTP Request
 * @param {Response} res - Đối tượng HTTP Response
 * @returns {Promise<Response>} JSON chứa toàn bộ sản phẩm kèm categoryName
 */
export const getAll = async (req: Request, res: Response) => {
  try {
    const products = await productService.getAll();
    return res.json({ success: true, data: products });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Lấy thông tin chi tiết một sản phẩm theo ID.
 *
 * @param {Request} req - Đối tượng HTTP Request (chứa req.params.id)
 * @param {Response} res - Đối tượng HTTP Response
 * @returns {Promise<Response>} JSON chứa thông tin sản phẩm
 */
export const getById = async (req: Request, res: Response) => {
  try {
    const product = await productService.getById(req.params.id);
    return res.json({ success: true, data: product });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Tải trực tiếp file ảnh lên Cloudinary và trả URL để gắn vào form tạo mới món ăn.
 *
 * @param {Request} req - Đối tượng HTTP Request chứa req.file.buffer
 * @param {Response} res - Đối tượng HTTP Response
 * @returns {Promise<Response>} JSON chứa { imageUrl }
 */
export const uploadDirectImage = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Vui lòng chọn ảnh sản phẩm" });
  }

  try {
    const imageUrl = await productService.uploadDirectImage(req.file.buffer);
    return res.json({
      success: true,
      message: "Đã tải ảnh lên Cloudinary thành công",
      data: { imageUrl },
    });
  } catch (error: any) {
    const status = error.httpCode || 502;
    const message =
      status === 502 ? "Không thể tải ảnh lên Cloudinary. Vui lòng thử lại." : error.message;
    return res.status(status).json({ success: false, message });
  }
};

/**
 * Tải ảnh mới lên Cloudinary, cập nhật imageUrl cho sản phẩm và phát Socket đồng bộ thực đơn.
 *
 * @param {Request} req - Đối tượng HTTP Request chứa req.params.id và req.file.buffer
 * @param {Response} res - Đối tượng HTTP Response
 * @returns {Promise<Response>} JSON chứa sản phẩm sau khi cập nhật ảnh
 */
export const uploadImage = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Vui lòng chọn ảnh sản phẩm" });
  }

  try {
    const product = await productService.replaceImage(req.params.id, req.file.buffer);
    emitMenuUpdated();
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

/**
 * Tạo sản phẩm/món F&B mới và phát sự kiện Socket `menu:updated` tới POS & Khách hàng.
 *
 * @param {Request} req - Đối tượng HTTP Request chứa dữ liệu CreateProductDTO
 * @param {Response} res - Đối tượng HTTP Response
 * @returns {Promise<Response>} JSON chứa sản phẩm vừa tạo
 */
export const create = async (req: Request, res: Response) => {
  try {
    const product = await productService.create(req.body);
    emitMenuUpdated();
    return res.json({ success: true, message: "Tạo sản phẩm thành công", data: product });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Cập nhật thông tin sản phẩm/món ăn và phát sự kiện Socket `menu:updated`.
 *
 * @param {Request} req - Đối tượng HTTP Request chứa req.params.id và UpdateProductDTO
 * @param {Response} res - Đối tượng HTTP Response
 * @returns {Promise<Response>} JSON chứa sản phẩm sau cập nhật
 */
export const update = async (req: Request, res: Response) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    emitMenuUpdated();
    return res.json({ success: true, message: "Cập nhật sản phẩm thành công", data: product });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Xóa sản phẩm theo ID và phát sự kiện Socket `menu:updated`.
 *
 * @param {Request} req - Đối tượng HTTP Request chứa req.params.id
 * @param {Response} res - Đối tượng HTTP Response
 * @returns {Promise<Response>} JSON xác nhận xóa thành công
 */
export const delete_ = async (req: Request, res: Response) => {
  try {
    await productService.delete(req.params.id);
    emitMenuUpdated();
    return res.json({ success: true, message: "Xóa sản phẩm thành công" });
  } catch (error: any) {
    return res.json({ success: false, message: error.message });
  }
};
