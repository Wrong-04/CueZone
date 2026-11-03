import mongoose from "mongoose";
import Product from "../product/product.model";
import InventoryTransaction from "../product/inventory.model";
import OrderStockDeduction, { IOrderStockDeduction, IOrderDeductionItem } from "./order-deduction.model";
import { orderEvents } from "../../utils/orderEvents";

export interface OrderItemInput {
  product: string; // product ID
  quantity: number;
  price?: number;
}

export interface OrderDeductionInput {
  orderId: string;
  tableId?: string;
  tableName?: string;
  sessionId?: string;
  items: OrderItemInput[];
  deductedBy?: string;
}

export interface DeductionResult {
  success: boolean;
  message: string;
  alreadyProcessed: boolean;
  deduction: IOrderStockDeduction;
}

export class OrderDeductionService {
  constructor() {
    this.registerEventListener();
  }

  private registerEventListener(): void {
    // SCRUM-980: Event listener lắng nghe sự kiện order:confirmed
    orderEvents.on("order:confirmed", async (payload: OrderDeductionInput) => {
      try {
        await this.deductStockForOrder(payload);
        console.log(`✅ [EventHook] Tự động trừ kho thành công cho orderId: ${payload.orderId}`);
      } catch (error: any) {
        console.error(`❌ [EventHook] Lỗi khi trừ kho tự động cho orderId ${payload.orderId}:`, error?.message || error);
      }
    });
  }

  async deductStockForOrder(input: OrderDeductionInput): Promise<DeductionResult> {
    // SCRUM-979: Bổ sung validate nghiệp vụ
    if (!input.orderId || typeof input.orderId !== "string" || !input.orderId.trim()) {
      throw new Error("Mã đơn bán hàng (orderId) là bắt buộc.");
    }

    const orderId = input.orderId.trim();

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("Đơn bán hàng phải có ít nhất một mặt hàng để trừ kho.");
    }

    // SCRUM-977: Áp dụng cơ chế IDEMPOTENT theo orderId để chống trừ kho lặp
    const existingDeduction = await OrderStockDeduction.findOne({ orderId }).lean();
    if (existingDeduction) {
      return {
        success: true,
        message: `Đơn bán hàng ${orderId} đã được trừ kho trước đó (Idempotent: Bỏ qua thao tác lặp).`,
        alreadyProcessed: true,
        deduction: existingDeduction as unknown as IOrderStockDeduction,
      };
    }

    // Validate từng item
    for (const item of input.items) {
      if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
        throw new Error(`Mã hàng hóa không hợp lệ: ${item.product}`);
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        throw new Error("Số lượng mặt hàng trong đơn phải là số nguyên lớn hơn 0.");
      }
    }

    // SCRUM-981: Xử lý trừ currentStock và ghi log xuất kho trong transaction
    const session = await mongoose.startSession();
    try {
      let createdDeduction: IOrderStockDeduction | undefined;

      await session.withTransaction(async () => {
        // Re-check idempotency bên trong transaction để chống race condition
        const checkInside = await OrderStockDeduction.findOne({ orderId }).session(session);
        if (checkInside) {
          createdDeduction = checkInside;
          return;
        }

        const deductionItems: IOrderDeductionItem[] = [];
        const inventoryTransactions = [];

        for (const item of input.items) {
          const product = await Product.findById(item.product).session(session);
          if (!product) {
            throw new Error(`Không tìm thấy hàng hóa với mã ${item.product}`);
          }

          if (product.isActive === false) {
            throw new Error(`Mặt hàng "${product.name}" hiện đã bị vô hiệu hóa.`);
          }

          const previousStock = Number(product.stock) || 0;
          const quantity = Number(item.quantity);

          if (previousStock < quantity) {
            throw new Error(
              `Mặt hàng "${product.name}" không đủ tồn kho để bán. Tồn hiện tại: ${previousStock} ${product.unit}, yêu cầu: ${quantity}.`,
            );
          }

          const newStock = previousStock - quantity;
          product.stock = newStock;
          await product.save({ session });

          const price = Number(item.price) || Number(product.salePrice) || 0;

          deductionItems.push({
            product: product._id,
            productName: product.name,
            sku: product.sku,
            quantity,
            price,
            previousStock,
            newStock,
          });

          inventoryTransactions.push({
            product: product._id,
            type: "out" as const,
            quantity,
            previousStock,
            newStock,
            reason: `Tự động trừ kho theo đơn bán hàng #${orderId}`,
            referenceId: orderId,
            referenceType: "sales_order",
            performedBy: input.deductedBy && mongoose.Types.ObjectId.isValid(input.deductedBy)
              ? new mongoose.Types.ObjectId(input.deductedBy)
              : undefined,
          });
        }

        const totalQuantity = deductionItems.reduce((acc, it) => acc + it.quantity, 0);

        const [deduction] = await OrderStockDeduction.create(
          [
            {
              orderId,
              tableId: input.tableId && mongoose.Types.ObjectId.isValid(input.tableId)
                ? new mongoose.Types.ObjectId(input.tableId)
                : undefined,
              tableName: input.tableName || "",
              sessionId: input.sessionId || "",
              items: deductionItems,
              totalQuantity,
              status: "CONFIRMED",
              processedAt: new Date(),
              deductedBy: input.deductedBy && mongoose.Types.ObjectId.isValid(input.deductedBy)
                ? new mongoose.Types.ObjectId(input.deductedBy)
                : undefined,
            },
          ],
          { session },
        );

        await InventoryTransaction.insertMany(inventoryTransactions, { session });

        createdDeduction = deduction;
      });

      if (!createdDeduction) {
        throw new Error("Không thể xử lý trừ tồn kho cho đơn bán hàng.");
      }

      return {
        success: true,
        message: "Tự động trừ tồn kho theo đơn bán hàng thành công.",
        alreadyProcessed: false,
        deduction: createdDeduction,
      };
    } finally {
      await session.endSession();
    }
  }

  async getOrderDeductions(params: {
    page?: number;
    limit?: number;
    search?: string;
    orderId?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
    const filter: Record<string, unknown> = {};

    if (params.orderId) {
      filter.orderId = { $regex: params.orderId.trim(), $options: "i" };
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      filter.$or = [
        { orderId: { $regex: q, $options: "i" } },
        { tableName: { $regex: q, $options: "i" } },
        { "items.productName": { $regex: q, $options: "i" } },
        { "items.sku": { $regex: q, $options: "i" } },
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
      filter.processedAt = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      OrderStockDeduction.find(filter)
        .populate("deductedBy", "name email role")
        .sort({ processedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OrderStockDeduction.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getDeductionByOrderId(orderId: string) {
    const record = await OrderStockDeduction.findOne({ orderId })
      .populate("deductedBy", "name email role")
      .populate("items.product")
      .lean();

    if (!record) {
      throw new Error(`Không tìm thấy bản ghi trừ kho cho đơn hàng #${orderId}`);
    }

    return record;
  }
}

export const orderDeductionService = new OrderDeductionService();

