import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import { Product } from "./product.model";
import Category from "./category.model";

const router = Router();

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function validId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/* =========================
   CATEGORIES
========================= */

// GET /api/v1/catalog-management/categories
router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await Category.find().sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      data: categories,
    });
  }),
);

// POST /api/v1/catalog-management/categories
router.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const name = normalizeString(req.body?.name);
    const code = normalizeString(req.body?.code).toLowerCase();
    const description = normalizeString(req.body?.description);

    if (!name || !code) {
      return sendError(res, 400, "Tên danh mục và mã danh mục là bắt buộc.");
    }

    const existing = await Category.findOne({ code });

    if (existing) {
      return sendError(res, 409, "Mã danh mục đã tồn tại.");
    }

    const category = await Category.create({
      name,
      code,
      description,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      data: category,
      message: "Tạo danh mục thành công.",
    });
  }),
);

// PUT /api/v1/catalog-management/categories/:id
router.put(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!validId(id)) {
      return sendError(res, 400, "ID danh mục không hợp lệ.");
    }

    const updates: Record<string, unknown> = {};

    if (req.body?.name !== undefined) {
      const name = normalizeString(req.body.name);

      if (!name) {
        return sendError(res, 400, "Tên danh mục không được để trống.");
      }

      updates.name = name;
    }

    if (req.body?.description !== undefined) {
      updates.description = normalizeString(req.body.description);
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!category) {
      return sendError(res, 404, "Không tìm thấy danh mục.");
    }

    return res.json({
      success: true,
      data: category,
      message: "Cập nhật danh mục thành công.",
    });
  }),
);

// PATCH /api/v1/catalog-management/categories/:id/status
router.patch(
  "/categories/:id/status",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body ?? {};

    if (!validId(id)) {
      return sendError(res, 400, "ID danh mục không hợp lệ.");
    }

    if (typeof isActive !== "boolean") {
      return sendError(res, 400, "isActive phải là true hoặc false.");
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!category) {
      return sendError(res, 404, "Không tìm thấy danh mục.");
    }

    return res.json({
      success: true,
      data: category,
      message: "Cập nhật trạng thái danh mục thành công.",
    });
  }),
);

// DELETE /api/v1/catalog-management/categories/:id
router.delete(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!validId(id)) {
      return sendError(res, 400, "ID danh mục không hợp lệ.");
    }

    const category = await Category.findById(id);

    if (!category) {
      return sendError(res, 404, "Không tìm thấy danh mục.");
    }

    const productUsingCategory = await Product.exists({
      category: category._id,
    });

    if (productUsingCategory) {
      return sendError(
        res,
        409,
        "Danh mục đang được hàng hóa sử dụng. Hãy ngừng sử dụng thay vì xóa.",
      );
    }

    await Category.deleteOne({ _id: id });

    return res.json({
      success: true,
      data: { _id: id },
      message: "Xóa danh mục thành công.",
    });
  }),
);

/* =========================
   PRODUCTS
========================= */

// GET /api/v1/catalog-management/products
router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const search = normalizeString(req.query.search);
    const category = normalizeString(req.query.category);

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      if (validId(category)) {
        filter.category = new mongoose.Types.ObjectId(category);
      } else {
        filter.category = category;
      }
    }

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      data: products,
    });
  }),
);

// POST /api/v1/catalog-management/products
router.post(
  "/products",
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};

    const name = normalizeString(body.name);
    const sku = normalizeString(body.sku);
    const category = normalizeString(body.category);
    const unit = normalizeString(body.unit);

    if (!name || !sku || !category || !unit) {
      return sendError(res, 400, "Tên hàng hóa, SKU, danh mục và đơn vị tính là bắt buộc.");
    }

    const costPrice = Number(body.costPrice);
    const salePrice = Number(body.salePrice);
    const minStock = Number(body.minStock ?? 0);

    if (
      !Number.isFinite(costPrice) ||
      !Number.isFinite(salePrice) ||
      !Number.isFinite(minStock) ||
      costPrice < 0 ||
      salePrice < 0 ||
      minStock < 0
    ) {
      return sendError(res, 400, "Giá nhập, giá bán và tồn kho tối thiểu phải là số không âm.");
    }

    const duplicateSku = await Product.findOne({ sku });

    if (duplicateSku) {
      return sendError(res, 409, "SKU đã tồn tại.");
    }

    const categoryExists = validId(category)
      ? await Category.exists({ _id: category })
      : await Category.exists({ code: category });

    if (!categoryExists) {
      return sendError(res, 400, "Danh mục không tồn tại.");
    }

    const categoryId = validId(category)
      ? new mongoose.Types.ObjectId(category)
      : (await Category.findOne({ code: category }))?._id;

    if (!categoryId) {
      return sendError(res, 400, "Không xác định được danh mục.");
    }

    const supplierId =
      body.supplierId === undefined || body.supplierId === null || body.supplierId === ""
        ? null
        : normalizeString(body.supplierId);

    if (supplierId && !validId(supplierId)) {
      return sendError(res, 400, "ID nhà cung cấp không hợp lệ.");
    }

    const product = await Product.create({
      name,
      sku,
      category: categoryId,
      unit,
      costPrice,
      salePrice,
      minStock,
      supplierId,
      description: normalizeString(body.description),
      isForSale: body.isForSale !== false,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      data: product,
      message: "Tạo hàng hóa thành công.",
    });
  }),
);

// PUT /api/v1/catalog-management/products/:id
router.put(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const body = req.body ?? {};

    if (!validId(id)) {
      return sendError(res, 400, "ID hàng hóa không hợp lệ.");
    }

    const product = await Product.findById(id);

    if (!product) {
      return sendError(res, 404, "Không tìm thấy hàng hóa.");
    }

    const updates: Record<string, unknown> = {};

    for (const field of ["name", "sku", "unit", "description"]) {
      if (body[field] !== undefined) {
        const value = normalizeString(body[field]);

        if (["name", "sku", "unit"].includes(field) && !value) {
          return sendError(res, 400, `${field} không được để trống.`);
        }

        updates[field] = value;
      }
    }

    for (const field of ["costPrice", "salePrice", "minStock"]) {
      if (body[field] !== undefined) {
        const value = Number(body[field]);

        if (!Number.isFinite(value) || value < 0) {
          return sendError(res, 400, `${field} phải là số không âm.`);
        }

        updates[field] = value;
      }
    }

    if (body.sku !== undefined) {
      const duplicate = await Product.findOne({
        sku: updates.sku,
        _id: { $ne: id },
      });

      if (duplicate) {
        return sendError(res, 409, "SKU đã được sử dụng bởi hàng hóa khác.");
      }
    }

    if (body.category !== undefined) {
      const categoryValue = normalizeString(body.category);

      if (!categoryValue) {
        return sendError(res, 400, "Danh mục không được để trống.");
      }

      const foundCategory = validId(categoryValue)
        ? await Category.findById(categoryValue)
        : await Category.findOne({ code: categoryValue });

      if (!foundCategory) {
        return sendError(res, 400, "Danh mục không tồn tại.");
      }

      updates.category = foundCategory._id;
    }

    if (body.supplierId !== undefined) {
      const supplierId = body.supplierId ? normalizeString(body.supplierId) : null;

      if (supplierId && !validId(supplierId)) {
        return sendError(res, 400, "ID nhà cung cấp không hợp lệ.");
      }

      updates.supplierId = supplierId;
    }

    if (body.isForSale !== undefined) {
      if (typeof body.isForSale !== "boolean") {
        return sendError(res, 400, "isForSale phải là true hoặc false.");
      }

      updates.isForSale = body.isForSale;
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.json({
      success: true,
      data: updated,
      message: "Cập nhật hàng hóa thành công.",
    });
  }),
);

// PATCH /api/v1/catalog-management/products/:id/status
router.patch(
  "/products/:id/status",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isForSale } = req.body ?? {};

    if (!validId(id)) {
      return sendError(res, 400, "ID hàng hóa không hợp lệ.");
    }

    if (typeof isForSale !== "boolean") {
      return sendError(res, 400, "isForSale phải là true hoặc false.");
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { isForSale } },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!product) {
      return sendError(res, 404, "Không tìm thấy hàng hóa.");
    }

    return res.json({
      success: true,
      data: product,
      message: "Cập nhật trạng thái hàng hóa thành công.",
    });
  }),
);

// DELETE /api/v1/catalog-management/products/:id
router.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!validId(id)) {
      return sendError(res, 400, "ID hàng hóa không hợp lệ.");
    }

    const product = await Product.findById(id);

    if (!product) {
      return sendError(res, 404, "Không tìm thấy hàng hóa.");
    }

    await Product.deleteOne({ _id: id });

    return res.json({
      success: true,
      data: { _id: id },
      message: "Xóa hàng hóa thành công.",
    });
  }),
);

export default router;
