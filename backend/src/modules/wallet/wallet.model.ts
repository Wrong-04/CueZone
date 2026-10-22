import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Loại giao dịch ví điện tử:
 * - TOPUP: Nạp tiền vào tài khoản ví (chuyển khoản, tiền mặt, cổng thanh toán).
 * - PAYMENT: Thanh toán trừ tiền ví (thanh toán tiền giờ chơi, F&B, lệ phí thi đấu).
 */
export enum WalletTransactionType {
  TOPUP = "topup",
  PAYMENT = "payment",
}

/**
 * Trạng thái xử lý của một giao dịch ví:
 * - PENDING: Chờ xử lý / chờ xác nhận đối soát từ thu ngân/admin.
 * - SUCCESS: Giao dịch thành công, số dư đã biến động.
 * - FAILED: Giao dịch thất bại / bị từ chối.
 */
export enum WalletTransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

/**
 * Cấu trúc một lịch sử biến động số dư giao dịch trong ví.
 */
export interface IWalletTransaction {
  /** Mã định danh giao dịch (ObjectId) */
  _id: Types.ObjectId;
  /** Loại giao dịch (nạp tiền TOPUP hoặc thanh toán PAYMENT) */
  type: WalletTransactionType;
  /** Trạng thái giao dịch (chờ duyệt, thành công, thất bại) */
  status: WalletTransactionStatus;
  /** Số tiền giao dịch (VNĐ, tối thiểu 1 VNĐ) */
  amount: number;
  /** Nội dung / lý do biến động số dư */
  description: string;
  /** Mã tham chiếu đối soát giao dịch (vd: mã chuyển khoản ngân hàng, mã đơn hàng) */
  referenceCode: string;
  /** Số dư ví sau khi giao dịch này được ghi nhận */
  balanceAfter: number;
  /** Tài khoản nhân viên/admin thực hiện duyệt giao dịch nạp tiền */
  reviewedBy?: Types.ObjectId;
  /** Thời điểm nhân viên/admin phê duyệt */
  reviewedAt?: Date;
  /** Thời điểm phát sinh yêu cầu giao dịch */
  createdAt: Date;
}

/**
 * Interface đại diện cho thực thể Ví hội viên (Wallet).
 * Mỗi tài khoản người dùng có duy nhất một ví liên kết (1-1 relationship).
 */
export interface IWallet extends Document {
  /** ID tài khoản người dùng sở hữu ví (khóa ngoại User, duy nhất 1-1) */
  userId: Types.ObjectId;
  /** Số dư hiện khả dụng trong ví (VNĐ) */
  balance: number;
  /** Lịch sử các giao dịch phát sinh trên ví */
  transactions: Types.DocumentArray<IWalletTransaction>;
  /** Thời điểm khởi tạo ví */
  createdAt: Date;
  /** Thời điểm cập nhật số dư ví gần nhất */
  updatedAt: Date;
}

const transactionSchema = new Schema<IWalletTransaction>({
  // Phân loại: nạp tiền hay thanh toán trừ ví
  type: { type: String, enum: Object.values(WalletTransactionType), required: true },
  // Trạng thái: đang chờ, thành công, hoặc thất bại
  status: { type: String, enum: Object.values(WalletTransactionStatus), required: true },
  // Số tiền giao dịch
  amount: { type: Number, required: true, min: 1 },
  // Diễn giải chi tiết lý do biến động
  description: { type: String, required: true, trim: true, maxlength: 250 },
  // Mã tham chiếu tra cứu đối soát
  referenceCode: { type: String, required: true, trim: true },
  // Số dư còn lại sau giao dịch
  balanceAfter: { type: Number, required: true, min: 0 },
  // Nhân sự duyệt giao dịch
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  // Thời gian xét duyệt
  reviewedAt: { type: Date },
  // Thời gian tạo yêu cầu giao dịch
  createdAt: { type: Date, default: Date.now },
});

const walletSchema = new Schema<IWallet>(
  {
    // Liên kết tài khoản người dùng (1 người dùng có duy nhất 1 ví)
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    // Số dư khả dụng hiện tại (mặc định 0 VNĐ)
    balance: { type: Number, required: true, default: 0, min: 0 },
    // Mảng lịch sử biến động số dư
    transactions: { type: [transactionSchema], default: [] },
  },
  { timestamps: true }
);

export const Wallet = mongoose.models.Wallet || mongoose.model<IWallet>("Wallet", walletSchema);
