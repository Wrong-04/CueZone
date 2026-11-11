import mongoose from "mongoose";
import { StockCheck, IStockCheck, StockCheckStatus } from "./stock-check.model";
import { Product } from "../product/product.model";
import InventoryTransaction from "../product/inventory.model";
import "../user/user.model";

export interface CreateStockCheckInput {
  title: string;
  category?: string;
  note?: string;
}

export interface UpdateCountItemInput {
  productId: string;
  actualStock: number;
  note?: string;
}

export interface StockCheckFilter {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export class StockCheckService {
  /**
   * Sinh mã kiểm kê tự động định dạng KK-YYYYMMDD-XXXX
   */
  private async generateCheckCode(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `KK-${dateStr}-`;

    const lastOne = await StockCheck.findOne({
      checkCode: { $regex: `^${prefix}` },
    })
      .sort({ checkCode: -1 })
      .lean();

    let seq = 1;
    if (lastOne && lastOne.checkCode) {
      const parts = lastOne.checkCode.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${String(seq).padStart(4, "0")}`;
  }

  /**
   * SCRUM-1065: Tạo đợt kiểm kê kèm snapshot tồn kho hiện tại
   */
  async createStockCheck(input: CreateStockCheckInput, userId: string): Promise<IStockCheck> {
    if (!input.title || !input.title.trim()) {
      throw new Error("Tiêu đề đợt kiểm kê không được để trống.");
    }

    const checkCode = await this.generateCheckCode();

    // Query snapshot danh sách sản phẩm
    const productQuery: Record<string, any> = { isActive: { $ne: false } };
    if (input.category && input.category !== "all") {
      if (input.category === "equipment") {
        productQuery.$or = [{ productType: "accessory" }, { category: "accessory" }];
      } else if (input.category === "ingredients") {
        productQuery.$or = [{ productType: "ingredient" }, { category: "ingredient" }];
      } else if (input.category === "beverage") {
        productQuery.$or = [{ productType: "fnb" }, { category: { $in: ["drink", "food", "snack"] } }];
      } else {
        productQuery.category = input.category;
      }
    }

    const products = await Product.find(productQuery).sort({ sku: 1 }).lean();

    if (products.length === 0) {
      throw new Error("Không có sản phẩm nào phù hợp để tạo đợt kiểm kê.");
    }

    const items = products.map((p) => ({
      product: p._id as mongoose.Types.ObjectId,
      sku: p.sku || "",
      name: p.name || "",
      category: p.category || "",
      unit: p.unit || "",
      costPrice: Number(p.costPrice) || 0,
      systemStock: Number(p.stock) || 0,
      actualStock: null,
      variance: 0,
      varianceValue: 0,
      note: "",
    }));

    const stockCheck = new StockCheck({
      checkCode,
      title: input.title.trim(),
      category: input.category || "all",
      status: "draft",
      items,
      summary: {
        totalItems: items.length,
        matchedItems: 0,
        surplusItems: 0,
        deficitItems: 0,
        totalVarianceValue: 0,
      },
      createdBy: new mongoose.Types.ObjectId(userId),
      auditLog: [
        {
          action: "CREATED",
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: new Date(),
          details: `Khởi tạo đợt kiểm kê với ${items.length} mặt hàng chụp snapshot tồn kho.`,
        },
      ],
      note: input.note?.trim(),
    });

    await stockCheck.save();
    return stockCheck;
  }

  /**
   * SCRUM-1064: Nhập số lượng kiểm đếm thực tế và nộp phiếu kiểm kê (SUBMITTED)
   */
  async updateCounts(
    id: string,
    counts: UpdateCountItemInput[],
    userId: string,
    submit: boolean = false,
  ): Promise<IStockCheck> {
    const stockCheck = await StockCheck.findById(id);
    if (!stockCheck) {
      throw new Error("Không tìm thấy phiếu kiểm kê.");
    }

    if (stockCheck.status === "completed" || stockCheck.status === "cancelled") {
      throw new Error("Phiên kiểm kê đã hoàn tất hoặc bị hủy, không thể chỉnh sửa.");
    }

    const countMap = new Map<string, { actualStock: number; note?: string }>();
    counts.forEach((c) => {
      countMap.set(c.productId.toString(), {
        actualStock: Number(c.actualStock),
        note: c.note,
      });
    });

    let matched = 0;
    let surplus = 0;
    let deficit = 0;
    let totalVarValue = 0;

    stockCheck.items.forEach((item) => {
      const pId = item.product.toString();
      if (countMap.has(pId)) {
        const entry = countMap.get(pId)!;
        const actual = Math.max(0, entry.actualStock);
        item.actualStock = actual;
        item.variance = actual - item.systemStock;
        item.varianceValue = item.variance * item.costPrice;
        if (entry.note !== undefined) {
          item.note = entry.note;
        }
      }

      if (item.actualStock !== null) {
        if (item.variance === 0) matched++;
        else if (item.variance > 0) surplus++;
        else deficit++;
        totalVarValue += item.varianceValue;
      }
    });

    stockCheck.summary = {
      totalItems: stockCheck.items.length,
      matchedItems: matched,
      surplusItems: surplus,
      deficitItems: deficit,
      totalVarianceValue: totalVarValue,
    };

    if (submit) {
      stockCheck.status = "submitted";
      stockCheck.submittedBy = new mongoose.Types.ObjectId(userId);
      stockCheck.submittedAt = new Date();
      stockCheck.auditLog?.push({
        action: "SUBMITTED",
        performedBy: new mongoose.Types.ObjectId(userId),
        performedAt: new Date(),
        details: `Đã nộp phiếu kiểm kê: ${matched} khớp, ${surplus} thừa, ${deficit} thiếu. Chênh lệch ${totalVarValue.toLocaleString("vi-VN")} đ.`,
      });
    } else {
      stockCheck.auditLog?.push({
        action: "UPDATED_COUNTS",
        performedBy: new mongoose.Types.ObjectId(userId),
        performedAt: new Date(),
        details: `Cập nhật số lượng kiểm đếm cho ${counts.length} sản phẩm.`,
      });
    }

    await stockCheck.save();
    return stockCheck;
  }

  /**
   * SCRUM-1068 & SCRUM-1069: Phê duyệt cân bằng kho trong Transaction Atomic & Ghi nhật ký kiểm toán
   */
  async approveStockCheck(id: string, userId: string): Promise<IStockCheck> {
    const session = await mongoose.startSession();
    try {
      let resultDoc: IStockCheck | null = null;

      await session.withTransaction(async () => {
        const stockCheck = await StockCheck.findById(id).session(session);
        if (!stockCheck) {
          throw new Error("Không tìm thấy phiếu kiểm kê.");
        }

        if (stockCheck.status === "completed") {
          throw new Error("Phiếu kiểm kê này đã được duyệt cân bằng trước đó.");
        }

        if (stockCheck.status !== "submitted") {
          throw new Error("Phiếu kiểm kê phải ở trạng thái đã nộp (SUBMITTED) trước khi duyệt cân bằng.");
        }

        const now = new Date();
        const auditTransactions: any[] = [];

        // Duyệt từng sản phẩm có chênh lệch và cập nhật tồn kho
        for (const item of stockCheck.items) {
          if (item.actualStock === null) {
            throw new Error(`Sản phẩm ${item.name} (${item.sku}) chưa được nhập số lượng kiểm đếm thực tế.`);
          }

          if (item.variance !== 0) {
            const product = await Product.findById(item.product).session(session);
            if (!product) {
              throw new Error(`Sản phẩm ${item.name} không tồn tại trong hệ thống.`);
            }

            const prevStock = product.stock;
            const newStock = item.actualStock;

            // Cập nhật stock
            product.stock = newStock;
            await product.save({ session });

            // Ghi nhận sổ cái InventoryTransaction với type adjustment
            auditTransactions.push({
              product: item.product,
              type: "adjustment",
              quantity: Math.abs(item.variance),
              previousStock: prevStock,
              newStock: newStock,
              reason: `Cân bằng kiểm kê [${stockCheck.checkCode}]: ${
                item.variance > 0 ? "Thừa" : "Thiếu"
              } ${Math.abs(item.variance)} ${item.unit}`,
              referenceId: stockCheck.checkCode,
              referenceType: "stock_check",
              performedBy: new mongoose.Types.ObjectId(userId),
              createdAt: now,
            });
          }
        }

        if (auditTransactions.length > 0) {
          await InventoryTransaction.create(auditTransactions, { session });
        }

        // Đổi trạng thái phiếu
        stockCheck.status = "completed";
        stockCheck.approvedBy = new mongoose.Types.ObjectId(userId);
        stockCheck.approvedAt = now;
        stockCheck.auditLog?.push({
          action: "APPROVED_AND_ADJUSTED",
          performedBy: new mongoose.Types.ObjectId(userId),
          performedAt: now,
          details: `Đã duyệt cân bằng kho. Tự động điều chỉnh tồn kho cho ${auditTransactions.length} mặt hàng chênh lệch.`,
        });

        await stockCheck.save({ session });
        resultDoc = stockCheck;
      });

      return resultDoc!;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Hủy bỏ đợt kiểm kê
   */
  async cancelStockCheck(id: string, userId: string, reason?: string): Promise<IStockCheck> {
    const stockCheck = await StockCheck.findById(id);
    if (!stockCheck) {
      throw new Error("Không tìm thấy phiếu kiểm kê.");
    }

    if (stockCheck.status === "completed") {
      throw new Error("Không thể hủy phiếu kiểm kê đã hoàn tất cân bằng.");
    }

    stockCheck.status = "cancelled";
    stockCheck.auditLog?.push({
      action: "CANCELLED",
      performedBy: new mongoose.Types.ObjectId(userId),
      performedAt: new Date(),
      details: reason ? `Hủy đợt kiểm kê. Lý do: ${reason}` : "Hủy đợt kiểm kê.",
    });

    await stockCheck.save();
    return stockCheck;
  }

  /**
   * Lấy danh sách đợt kiểm kê có phân trang
   */
  async getStockChecks(filter: StockCheckFilter = {}) {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (filter.status && filter.status !== "all") {
      query.status = filter.status;
    }

    if (filter.search && filter.search.trim()) {
      const reg = new RegExp(filter.search.trim(), "i");
      query.$or = [{ checkCode: reg }, { title: reg }];
    }

    if (filter.fromDate || filter.toDate) {
      query.createdAt = {};
      if (filter.fromDate) query.createdAt.$gte = new Date(filter.fromDate);
      if (filter.toDate) {
        const toD = new Date(filter.toDate);
        toD.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toD;
      }
    }

    const [items, total] = await Promise.all([
      StockCheck.find(query)
        .populate("createdBy", "name email")
        .populate("submittedBy", "name email")
        .populate("approvedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockCheck.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Lấy chi tiết một đợt kiểm kê
   */
  async getStockCheckById(id: string): Promise<IStockCheck | null> {
    return await StockCheck.findById(id)
      .populate("createdBy", "name email")
      .populate("submittedBy", "name email")
      .populate("approvedBy", "name email")
      .populate("auditLog.performedBy", "name email");
  }
}

