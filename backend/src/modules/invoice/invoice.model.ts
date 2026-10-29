import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Interface đại diện cho thực thể Hóa đơn thanh toán (Invoice).
 * Được tạo ra khi kết thúc (checkout) một phiên chơi tại quầy POS.
 */
export interface IInvoice extends Document {
  /** Mã định danh phiên chơi (duy nhất, bảo đảm tính idempotent khi retry thanh toán) */
  sessionId: string;
  /** ID bàn bida thực hiện phiên chơi */
  tableId: Types.ObjectId;
  transactionId?: Types.ObjectId;
  /** Snapshot dữ liệu toàn bộ hóa đơn chi tiết tại thời điểm thanh toán (tiền giờ, F&B, cọc, giảm giá, VAT...) */
  receipt: Record<string, any>;
  /** Thời điểm tạo hóa đơn */
  createdAt: Date;
  /** Thời điểm cập nhật hóa đơn gần nhất */
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    // Mã phiên chơi duy nhất, đánh index unique partial để ngăn chặn trùng lặp hóa đơn
    sessionId: {
      type: String,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: { sessionId: { $type: "string" } },
      },
    },
    // Tham chiếu đến bàn chơi
    tableId: { type: Schema.Types.ObjectId, ref: "Table", required: true },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
    // Dữ liệu snapshot chi tiết hóa đơn (JSON linh hoạt lưu toàn bộ thông tin thanh toán cuối cùng)
    receipt: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);
