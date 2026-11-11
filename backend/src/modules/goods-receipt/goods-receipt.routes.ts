import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import { requireProductManager } from "../../middlewares/product-admin.middleware";
import GoodsReceipt from "./goods-receipt.model";
import Product from "../product/product.model";
import Supplier from "../supplier/supplier.model";
import InventoryTransaction from "../product/inventory.model";
import { User } from "../user/user.model";

const router = Router();

router.use(requireProductManager);

function getUserId(req: Request): string | null {
  const user = (req as any).user;
  return user?.userId || user?._id || user?.id || null;
}

function generateReceiptNumber(): string {
  const now = new Date();
  const datePart =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000).toString();
  return `PN-${datePart}-${rand}`;
}

/*
 * GET /api/v1/goods-receipts
 * Danh sách phiếu nhập kho
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const filter: Record<string, unknown> = {};

    if (req.query.status && typeof req.query.status === "string") {
      filter.status = req.query.status;
    }
    if (req.query.supplierId && typeof req.query.supplierId === "string") {
      if (!mongoose.Types.ObjectId.isValid(req.query.supplierId)) {
        return res.status(400).json({ success: false, message: "supplierId không hợp lệ." });
      }
      filter.supplier = new mongoose.Types.ObjectId(req.query.supplierId);
    }
    if (req.query.search && typeof req.query.search === "string") {
      const search = req.query.search.trim();
      filter.receiptNumber = { $regex: search, $options: "i" };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      GoodsReceipt.find(filter)
        .populate("supplier", "name contactPerson phone")
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GoodsReceipt.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("GET GOODS RECEIPTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách phiếu nhập." });
  }
});

/*
 * GET /api/v1/goods-receipts/:id
 * Chi tiết phiếu nhập kho
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Mã phiếu không hợp lệ." });
    }
    const receipt = await GoodsReceipt.findById(req.params.id)
      .populate("supplier", "name contactPerson phone email")
      .populate("items.product", "name sku unit costPrice stock")
      .populate("createdBy", "name email role")
      .populate("completedBy", "name email role")
      .lean();

    if (!receipt) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu nhập." });
    }
    return res.json({ success: true, data: receipt });
  } catch (error) {
    console.error("GET GOODS RECEIPT ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể tải phiếu nhập." });
  }
});

/*
 * POST /api/v1/goods-receipts
 * Tạo phiếu nhập nháp
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: "Không xác định được tài khoản." });
    }

    const { supplier: supplierId, items, note } = req.body;

    // Validate supplier
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ success: false, message: "Mã nhà cung cấp không hợp lệ." });
    }
    const supplier = await Supplier.findById(supplierId).lean();
    if (!supplier) {
      return res.status(400).json({ success: false, message: "Nhà cung cấp không tồn tại." });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Phiếu nhập phải có ít nhất một mặt hàng." });
    }

    const resolvedItems: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
        return res
          .status(400)
          .json({ success: false, message: `Mục ${i + 1}: mã hàng hóa không hợp lệ.` });
      }
      const product = await Product.findById(item.product).lean();
      if (!product) {
        return res
          .status(400)
          .json({ success: false, message: `Mục ${i + 1}: hàng hóa không tồn tại.` });
      }
      if ((product as any).isActive === false) {
        return res
          .status(400)
          .json({ success: false, message: `Mục ${i + 1}: hàng hóa không còn hoạt động.` });
      }
      const isMakeToOrder = Boolean(
        (product as any).isthemaketoorder ??
        (product as any).isTheMakeToOrder ??
        (product as any).isMadeToOrder
      );
      if (isMakeToOrder) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Mục ${i + 1}: ${(product as any).name} là món chế biến tại quán (không nhập kho).`,
          });
      }
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res
          .status(400)
          .json({ success: false, message: `Mục ${i + 1}: số lượng phải lớn hơn 0.` });
      }
      const unitCost = Number(item.unitCost);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        return res
          .status(400)
          .json({ success: false, message: `Mục ${i + 1}: đơn giá không được âm.` });
      }
      const totalCost = quantity * unitCost;
      resolvedItems.push({
        product: (product as any)._id,
        productName: (product as any).name,
        sku: (product as any).sku,
        unit: (product as any).unit,
        quantity,
        unitCost,
        totalCost,
      });
    }

    const totalAmount = resolvedItems.reduce((sum, it) => sum + it.totalCost, 0);

    // Unique receipt number — retry once on collision
    let receiptNumber = generateReceiptNumber();
    let existing = await GoodsReceipt.findOne({ receiptNumber }).lean();
    if (existing) {
      receiptNumber = generateReceiptNumber();
    }

    const noteValue =
      typeof note === "string" && note.trim() ? note.trim().slice(0, 500) : undefined;

    const receipt = await GoodsReceipt.create({
      receiptNumber,
      supplier: supplierId,
      items: resolvedItems,
      totalAmount,
      status: "draft",
      note: noteValue,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo phiếu nhập nháp thành công.",
      data: receipt,
    });
  } catch (error) {
    console.error("CREATE GOODS RECEIPT ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể tạo phiếu nhập." });
  }
});

/*
 * PUT /api/v1/goods-receipts/:id
 * Cập nhật phiếu nháp
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Mã phiếu không hợp lệ." });
    }

    const receipt = await GoodsReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu nhập." });
    }
    if (receipt.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể cập nhật phiếu ở trạng thái nháp.",
      });
    }

    const { supplier: supplierId, items, note } = req.body;
    const update: Record<string, unknown> = {};

    if (supplierId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(supplierId)) {
        return res.status(400).json({ success: false, message: "Mã nhà cung cấp không hợp lệ." });
      }
      const supplier = await Supplier.findById(supplierId).lean();
      if (!supplier) {
        return res.status(400).json({ success: false, message: "Nhà cung cấp không tồn tại." });
      }
      update.supplier = supplierId;
    }

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Phiếu nhập phải có ít nhất một mặt hàng." });
      }
      const resolvedItems: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
          return res
            .status(400)
            .json({ success: false, message: `Mục ${i + 1}: mã hàng hóa không hợp lệ.` });
        }
        const product = await Product.findById(item.product).lean();
        if (!product) {
          return res
            .status(400)
            .json({ success: false, message: `Mục ${i + 1}: hàng hóa không tồn tại.` });
        }
        if ((product as any).isActive === false) {
          return res
            .status(400)
            .json({ success: false, message: `Mục ${i + 1}: hàng hóa không còn hoạt động.` });
        }
        const isMakeToOrder = Boolean(
          (product as any).isthemaketoorder ??
          (product as any).isTheMakeToOrder ??
          (product as any).isMadeToOrder
        );
        if (isMakeToOrder) {
          return res
            .status(400)
            .json({
              success: false,
              message: `Mục ${i + 1}: ${(product as any).name} là món chế biến tại quán (không nhập kho).`,
            });
        }
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return res
            .status(400)
            .json({ success: false, message: `Mục ${i + 1}: số lượng phải lớn hơn 0.` });
        }
        const unitCost = Number(item.unitCost);
        if (!Number.isFinite(unitCost) || unitCost < 0) {
          return res
            .status(400)
            .json({ success: false, message: `Mục ${i + 1}: đơn giá không được âm.` });
        }
        const totalCost = quantity * unitCost;
        resolvedItems.push({
          product: (product as any)._id,
          productName: (product as any).name,
          sku: (product as any).sku,
          unit: (product as any).unit,
          quantity,
          unitCost,
          totalCost,
        });
      }
      update.items = resolvedItems;
      update.totalAmount = resolvedItems.reduce((sum, it) => sum + it.totalCost, 0);
    }

    if (note !== undefined) {
      update.note = typeof note === "string" ? note.trim().slice(0, 500) : "";
    }

    const updated = await GoodsReceipt.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true },
    );

    return res.json({
      success: true,
      message: "Cập nhật phiếu nhập thành công.",
      data: updated,
    });
  } catch (error) {
    console.error("UPDATE GOODS RECEIPT ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể cập nhật phiếu nhập." });
  }
});

/*
 * DELETE /api/v1/goods-receipts/:id
 * Xóa phiếu nháp
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Mã phiếu không hợp lệ." });
    }
    const receipt = await GoodsReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu nhập." });
    }
    if (receipt.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể xóa phiếu ở trạng thái nháp.",
      });
    }
    await GoodsReceipt.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: "Đã xóa phiếu nhập." });
  } catch (error) {
    console.error("DELETE GOODS RECEIPT ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa phiếu nhập." });
  }
});

/*
 * POST /api/v1/goods-receipts/:id/complete
 * Hoàn tất phiếu nhập — cập nhật tồn kho trong transaction
 */
router.post("/:id/complete", async (req: Request, res: Response) => {
  const mongoSession = await mongoose.startSession();
  try {
    const userId = getUserId(req);
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: "Không xác định được tài khoản." });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Mã phiếu không hợp lệ." });
    }

    let completedReceipt: any;

    await mongoSession.withTransaction(async () => {
      // Re-fetch with session lock
      const receipt = await GoodsReceipt.findById(req.params.id).session(mongoSession);
      if (!receipt) {
        const err: any = new Error("NOT_FOUND");
        err.code = "NOT_FOUND";
        throw err;
      }
      if (receipt.status === "completed") {
        const err: any = new Error("ALREADY_COMPLETED");
        err.code = "ALREADY_COMPLETED";
        throw err;
      }

      const now = new Date();
      const inventoryDocs: any[] = [];

      for (const item of receipt.items) {
        const product = await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } },
          { session: mongoSession, new: true },
        );
        if (!product) {
          const err: any = new Error(`PRODUCT_NOT_FOUND:${item.product}`);
          err.code = "PRODUCT_NOT_FOUND";
          throw err;
        }
        const newStock = Number(product.stock);
        const previousStock = newStock - item.quantity;
        inventoryDocs.push({
          product: item.product,
          type: "in",
          quantity: item.quantity,
          previousStock,
          newStock,
          reason: `Nhập kho theo phiếu ${receipt.receiptNumber}`,
          performedBy: new mongoose.Types.ObjectId(userId),
        });
      }

      await InventoryTransaction.insertMany(inventoryDocs, { session: mongoSession });

      completedReceipt = await GoodsReceipt.findByIdAndUpdate(
        receipt._id,
        { $set: { status: "completed", completedAt: now, completedBy: userId } },
        { session: mongoSession, new: true },
      );
    });

    return res.json({
      success: true,
      message: "Hoàn tất phiếu nhập thành công.",
      data: completedReceipt,
    });
  } catch (error: any) {
    if (error?.code === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu nhập." });
    }
    if (error?.code === "ALREADY_COMPLETED") {
      return res.status(409).json({ success: false, message: "Phiếu nhập đã được hoàn tất." });
    }
    if (error?.code === "PRODUCT_NOT_FOUND") {
      return res.status(400).json({ success: false, message: "Hàng hóa trong phiếu không tồn tại." });
    }
    console.error("COMPLETE GOODS RECEIPT ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể hoàn tất phiếu nhập." });
  } finally {
    await mongoSession.endSession();
  }
});

/*
 * GET /api/v1/goods-receipts/:id/items
 * Liệt kê items của phiếu
 */
router.get("/:id/items", async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Mã phiếu không hợp lệ." });
    }
    const receipt = await GoodsReceipt.findById(req.params.id)
      .populate("items.product", "name sku unit stock costPrice")
      .select("items receiptNumber status")
      .lean();

    if (!receipt) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu nhập." });
    }
    return res.json({ success: true, data: receipt });
  } catch (error) {
    console.error("GET GOODS RECEIPT ITEMS ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách mặt hàng." });
  }
});

export default router;
