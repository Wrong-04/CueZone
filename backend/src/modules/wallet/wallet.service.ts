import mongoose, { ClientSession, Types } from "mongoose";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";
import { User } from "../user/user.model";
import {
  IWallet,
  Wallet,
  WalletTransactionStatus,
  WalletTransactionType,
} from "./wallet.model";

const notifications = new NotificationService();

const httpError = (message: string, httpCode = 400) => Object.assign(new Error(message), { httpCode });

export class WalletService {
  async getForUser(userId: string) {
    if (!mongoose.isValidObjectId(userId)) throw httpError("Tài khoản không hợp lệ", 401);
    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, balance: 0, transactions: [] } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return wallet;
  }

  async requestTopup(userId: string, amount: unknown) {
    if (!mongoose.isValidObjectId(userId)) throw httpError("Tài khoản không hợp lệ", 401);
    if (!Number.isSafeInteger(amount) || Number(amount) < 50_000 || Number(amount) > 20_000_000) {
      throw httpError("Số tiền nạp phải từ 50.000đ đến 20.000.000đ");
    }
    const user = await User.findOne({ _id: userId, role: "customer", isActive: true, isLocked: false });
    if (!user) throw httpError("Chỉ hội viên đang hoạt động mới được tạo yêu cầu nạp ví", 403);

    const referenceCode = `CZ${Date.now().toString(36).toUpperCase()}${new Types.ObjectId().toString().slice(-5).toUpperCase()}`;
    const wallet = await mongoose.connection.transaction(async (session) => {
      const current = await this.findOrCreateForUser(userId, session);
      current.transactions.push({
        type: WalletTransactionType.TOPUP,
        status: WalletTransactionStatus.PENDING,
        amount: Number(amount),
        description: "Yêu cầu nạp tiền chờ nhân viên đối soát",
        referenceCode,
        balanceAfter: current.balance,
        createdAt: new Date(),
      } as any);
      await current.save({ session });
      return current;
    });

    await notifications.createForUser(userId, {
      title: "Đã tiếp nhận yêu cầu nạp ví",
      content: `Yêu cầu nạp ${Number(amount).toLocaleString("vi-VN")}đ (${referenceCode}) đang chờ nhân viên xác nhận. Số dư chưa thay đổi.`,
      type: NotificationType.WALLET,
    }).catch(() => undefined);
    await notifications.create({
      title: "Có yêu cầu nạp ví mới",
      content: `${user.name} yêu cầu nạp ${Number(amount).toLocaleString("vi-VN")}đ. Mã giao dịch: ${referenceCode}.`,
      type: NotificationType.WALLET,
    }).catch(() => undefined);
    return wallet;
  }

  async getPendingTopups() {
    const wallets = await Wallet.find({ "transactions.type": WalletTransactionType.TOPUP })
      .populate("userId", "name email phone")
      .sort({ updatedAt: -1 });
    return wallets.flatMap((wallet) => (wallet.transactions as any[])
      .filter((transaction: any) => transaction.type === WalletTransactionType.TOPUP && transaction.status === WalletTransactionStatus.PENDING)
      .map((transaction: any) => ({
        walletId: String(wallet._id),
        user: wallet.userId,
        transaction,
      })));
  }

  async reviewTopup(transactionId: string, reviewerId: string, status: "success" | "failed") {
    if (!mongoose.isValidObjectId(transactionId) || !mongoose.isValidObjectId(reviewerId)) {
      throw httpError("Mã giao dịch hoặc nhân viên không hợp lệ");
    }
    const result = await mongoose.connection.transaction(async (session) => {
      const wallet = await Wallet.findOne({
        transactions: { $elemMatch: { _id: transactionId, type: WalletTransactionType.TOPUP, status: WalletTransactionStatus.PENDING } },
      }).session(session);
      if (!wallet) throw httpError("Không tìm thấy yêu cầu nạp đang chờ xử lý", 404);
      const transaction = wallet.transactions.id(transactionId);
      if (!transaction) throw httpError("Không tìm thấy giao dịch", 404);
      if (status === "success") wallet.balance += transaction.amount;
      transaction.status = status === "success" ? WalletTransactionStatus.SUCCESS : WalletTransactionStatus.FAILED;
      transaction.description = status === "success"
        ? "Nạp tiền ví đã được nhân viên đối soát"
        : "Yêu cầu nạp tiền không được xác nhận";
      transaction.balanceAfter = wallet.balance;
      transaction.reviewedBy = new Types.ObjectId(reviewerId);
      transaction.reviewedAt = new Date();
      await wallet.save({ session });
      return { wallet, transaction };
    });

    const amount = result.transaction.amount.toLocaleString("vi-VN");
    await notifications.createForUser(String(result.wallet.userId), {
      title: status === "success" ? "Nạp ví thành công" : "Yêu cầu nạp ví chưa được xác nhận",
      content: status === "success"
        ? `Yêu cầu ${result.transaction.referenceCode} đã được xác nhận. ${amount}đ đã được cộng vào ví.`
        : `Yêu cầu ${result.transaction.referenceCode} chưa được xác nhận. Số dư ví không thay đổi; vui lòng liên hệ quầy nếu cần hỗ trợ.`,
      type: NotificationType.WALLET,
    }).catch(() => undefined);
    return result;
  }

  async chargeForTournament(userId: string, amount: number, tournamentName: string, session: ClientSession) {
    if (amount <= 0) return null;
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet || wallet.balance < amount) throw httpError("Số dư ví không đủ để thanh toán lệ phí giải đấu", 400);
    wallet.balance -= amount;
    wallet.transactions.push({
      type: WalletTransactionType.PAYMENT,
      status: WalletTransactionStatus.SUCCESS,
      amount,
      description: `Lệ phí ghi danh: ${tournamentName}`,
      referenceCode: `TOUR-${new Types.ObjectId().toString().slice(-8).toUpperCase()}`,
      balanceAfter: wallet.balance,
      createdAt: new Date(),
    } as any);
    await wallet.save({ session });
    return wallet;
  }

  async findOrCreateForUser(userId: string, session?: ClientSession): Promise<IWallet> {
    const found = await Wallet.findOne({ userId }).session(session ?? null);
    if (found) return found;
    const [created] = await Wallet.create([{ userId, balance: 0, transactions: [] }], { session });
    return created;
  }
}
