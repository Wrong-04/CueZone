import mongoose from "mongoose";
import Product from "../product/product.model";
import InventoryTransaction from "../product/inventory.model";
import AccessoryWaste, { IAccessoryWaste } from "./accessory-waste.model";
import "../user/user.model";

export interface CreateAccessoryWasteInput {
  product: string;
  quantity: number;
  reason: string;
  note?: string;
}

export class AccessoryWasteService {
  async createWaste(input: CreateAccessoryWasteInput, performedBy: string): Promise<IAccessoryWaste> {
    const targetProductId = input.product || (input as any).productId;
    if (!targetProductId || !mongoose.Types.ObjectId.isValid(targetProductId)) {
      throw new Error("Mã mặt hàng/phụ kiện không hợp lệ.");
    }

    const quantity = Number(input.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Số lượng xuất hủy phải là số nguyên dương lớn hơn 0.");
    }

    if (typeof input.reason !== "string" || !input.reason.trim()) {
      throw new Error("Bắt buộc phải nhập lý do hư hỏng (ví dụ: cơ cong, mẻ bóng, mòn lơ, rách bao tay).");
    }

    const trimmedReason = input.reason.trim();
    if (trimmedReason.length < 3 || trimmedReason.length > 255) {
      throw new Error("Lý do hư hỏng phải từ 3 đến 255 ký tự.");
    }

    const session = await mongoose.startSession();
    try {
      let createdWaste: IAccessoryWaste | undefined;

      await session.withTransaction(async () => {
        const product = await Product.findById(targetProductId).session(session);
        if (!product) {
          throw new Error("Không tìm thấy phụ kiện trong hệ thống.");
        }

        if (product.isActive === false) {
          throw new Error("Phụ kiện này hiện đã bị ngừng hoạt động.");
        }

        // Kiểm tra loại trừ món chế biến tại quán (không lưu kho)
        const isMakeToOrder = Boolean(
          (product as any).isthemaketoorder ??
          (product as any).isTheMakeToOrder ??
          (product as any).isMadeToOrder
        );
        if (isMakeToOrder) {
          throw new Error("Mặt hàng chế biến tại quán không có tồn kho để xuất hủy hao mòn.");
        }

        const previousStock = Number(product.stock) || 0;
        if (previousStock < quantity) {
          throw new Error(`Số lượng xuất hủy (${quantity}) vượt quá tồn kho thực tế hiện tại (${previousStock} ${product.unit}).`);
        }

        const newStock = previousStock - quantity;
        product.stock = newStock;
        await product.save({ session });

        const costPrice = Number(product.costPrice) || 0;
        const totalValue = costPrice * quantity;

        const [waste] = await AccessoryWaste.create(
          [
            {
              product: product._id,
              productName: product.name,
              sku: product.sku,
              unit: product.unit,
              quantity,
              costPrice,
              totalValue,
              previousStock,
              newStock,
              reason: trimmedReason,
              note: typeof input.note === "string" ? input.note.trim() : "",
              performedBy: new mongoose.Types.ObjectId(performedBy),
              type: "WASTE",
            },
          ],
          { session },
        );

        // Ghi sổ cái (ledger) xuất loại WASTE vào InventoryTransaction
        await InventoryTransaction.create(
          [
            {
              product: product._id,
              type: "waste",
              quantity,
              previousStock,
              newStock,
              reason: `Xuất hủy phụ kiện [WASTE]: ${trimmedReason}`,
              referenceId: waste.disposalNumber,
              referenceType: "accessory_waste",
              performedBy: new mongoose.Types.ObjectId(performedBy),
            },
          ],
          { session },
        );

        createdWaste = waste;
      });

      if (!createdWaste) {
        throw new Error("Không thể khởi tạo phiếu xuất hủy.");
      }

      return createdWaste;
    } finally {
      await session.endSession();
    }
  }

  async getWastes(params: {
    page?: number;
    limit?: number;
    search?: string;
    product?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
    const filter: Record<string, unknown> = {};

    if (params.product && mongoose.Types.ObjectId.isValid(params.product)) {
      filter.product = new mongoose.Types.ObjectId(params.product);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      filter.$or = [
        { disposalNumber: { $regex: q, $options: "i" } },
        { productName: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
        { reason: { $regex: q, $options: "i" } },
      ];
    }

    if (params.fromDate || params.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (params.fromDate) {
        dateFilter.$gte = new Date(params.fromDate);
      }
      if (params.toDate) {
        const end = new Date(params.toDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      filter.createdAt = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AccessoryWaste.find(filter)
        .populate("performedBy", "name email role")
        .populate("product", "name sku unit costPrice salePrice category imageUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AccessoryWaste.countDocuments(filter),
    ]);

    const enrichedItems = items.map((it: any) => {
      const prod = it.product && typeof it.product === "object" ? it.product : null;
      const unitCost = Number(it.costPrice ?? prod?.costPrice ?? 0);
      const totalVal = Number(it.totalValue ?? (unitCost * (it.quantity || 1)));
      return {
        ...it,
        costPrice: unitCost,
        totalValue: totalVal,
      };
    });

    return {
      items: enrichedItems,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getWasteById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Mã phiếu xuất hủy không hợp lệ.");
    }

    const waste = await AccessoryWaste.findById(id)
      .populate("performedBy", "name email role")
      .populate("product")
      .lean();

    if (!waste) {
      throw new Error("Không tìm thấy phiếu xuất hủy.");
    }

    const prod = waste.product && typeof waste.product === "object" ? (waste.product as any) : null;
    const unitCost = Number(waste.costPrice ?? prod?.costPrice ?? 0);
    const totalVal = Number(waste.totalValue ?? (unitCost * (waste.quantity || 1)));

    return {
      ...waste,
      costPrice: unitCost,
      totalValue: totalVal,
    };
  }

  async getWasteAuditStats() {
    // Tổng số lượng và số lần xuất hủy theo từng sản phẩm
    const productAgg = await AccessoryWaste.aggregate([
      {
        $group: {
          _id: "$product",
          productName: { $first: "$productName" },
          sku: { $first: "$sku" },
          unit: { $first: "$unit" },
          totalWastedQuantity: { $sum: "$quantity" },
          disposalCount: { $sum: 1 },
          lastDisposalAt: { $max: "$createdAt" },
        },
      },
      { $sort: { totalWastedQuantity: -1 } },
    ]);

    // Thống kê theo lý do hư hỏng
    const reasonAgg = await AccessoryWaste.aggregate([
      {
        $group: {
          _id: "$reason",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    // Tính tỷ lệ hao hụt dựa trên tồn kho hiện tại
    const productsWithRate = await Promise.all(
      productAgg.map(async (item) => {
        const prod = (await Product.findById(item._id).select("stock").lean()) as { stock?: number } | null;
        const currentStock = prod ? Number(prod.stock) || 0 : 0;
        const totalStockBase = currentStock + item.totalWastedQuantity;
        const wasteRate = totalStockBase > 0 ? Math.round((item.totalWastedQuantity / totalStockBase) * 10000) / 100 : 0;

        return {
          productId: item._id,
          productName: item.productName,
          sku: item.sku,
          unit: item.unit,
          totalWastedQuantity: item.totalWastedQuantity,
          disposalCount: item.disposalCount,
          currentStock,
          wasteRate, // Tỷ lệ hao hụt (%)
          lastDisposalAt: item.lastDisposalAt,
        };
      }),
    );

    const totalWastedAll = productsWithRate.reduce((acc, p) => acc + p.totalWastedQuantity, 0);

    return {
      totalWastedQuantity: totalWastedAll,
      totalDisposalRecords: productAgg.reduce((acc, p) => acc + p.disposalCount, 0),
      byProduct: productsWithRate,
      byReason: reasonAgg.map((r) => ({
        reason: r._id,
        count: r.count,
        totalQuantity: r.totalQuantity,
      })),
    };
  }
}
