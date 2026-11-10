import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import mongoose, { ClientSession, Types } from "mongoose";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";
import { User } from "../user/user.model";
import { IWallet, Wallet, WalletTransactionStatus, WalletTransactionType } from "./wallet.model";
import { WalletPayment } from "./wallet-payment.model";
import { getPointsForSpend } from "../member/membership.policy";

const notifications = new NotificationService();

const httpError = (message: string, httpCode = 400, code?: string) =>
  Object.assign(new Error(message), { httpCode, ...(code ? { code } : {}) });

const VNPAY_PAYMENT_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const VNPAY_PRESET_AMOUNTS = [100_000, 200_000, 500_000];
const VNPAY_IPN_SUCCESS = { RspCode: "00", Message: "Confirm Success" };

interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  returnUrl: string;
}

export type VnpayParameters = Record<string, string>;

export function getVnpayConfig(): VnpayConfig {
  const { VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_RETURN_URL } = process.env;
  if (
    !VNPAY_TMN_CODE ||
    !/^[a-zA-Z0-9]{8}$/.test(VNPAY_TMN_CODE) ||
    !VNPAY_HASH_SECRET ||
    !VNPAY_RETURN_URL
  ) {
    throw httpError("Cấu hình VNPay Sandbox chưa đầy đủ", 503);
  }
  let returnUrl: URL;
  try {
    returnUrl = new URL(VNPAY_RETURN_URL);
  } catch {
    throw httpError("VNPAY_RETURN_URL không phải URL hợp lệ", 503);
  }
  if (
    returnUrl.protocol !== "https:" &&
    !(returnUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(returnUrl.hostname))
  ) {
    throw httpError("VNPAY_RETURN_URL phải sử dụng HTTPS", 503);
  }
  return { tmnCode: VNPAY_TMN_CODE, hashSecret: VNPAY_HASH_SECRET, returnUrl: returnUrl.toString() };
}

function formEncode(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

export function vnpaySignData(parameters: VnpayParameters) {
  return Object.keys(parameters)
    .filter(
      (key) => key.startsWith("vnp_") && key !== "vnp_SecureHash" && key !== "vnp_SecureHashType",
    )
    .sort()
    .map((key) => `${formEncode(key)}=${formEncode(parameters[key])}`)
    .join("&");
}

export function verifyVnpaySignature(parameters: VnpayParameters, hashSecret: string) {
  const supplied = parameters.vnp_SecureHash;
  if (!supplied || !/^[a-fA-F0-9]{128}$/.test(supplied)) return false;
  const expected = createHmac("sha512", hashSecret).update(vnpaySignData(parameters)).digest();
  const actual = Buffer.from(supplied, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function formatVnpayDate(date: Date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
}

function parseVnpayDate(value: string) {
  if (!/^\d{14}$/.test(value)) throw httpError("Thời gian thanh toán VNPay không hợp lệ", 400);
  const parsed = new Date(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}+07:00`,
  );
  if (!Number.isFinite(parsed.getTime()) || formatVnpayDate(parsed) !== value) {
    throw httpError("Thời gian thanh toán VNPay không hợp lệ", 400);
  }
  return parsed;
}

function buildVnpayPaymentUrl(
  config: VnpayConfig,
  referenceCode: string,
  amount: number,
  ipAddress: string,
  now: Date,
) {
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const parameters: VnpayParameters = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(amount * 100),
    vnp_CreateDate: formatVnpayDate(now),
    vnp_ExpireDate: formatVnpayDate(expiresAt),
    vnp_CurrCode: "VND",
    vnp_IpAddr: ipAddress.replace(/^::ffff:/, "").replace(/^::1$/, "127.0.0.1").slice(0, 45),
    vnp_Locale: "vn",
    vnp_OrderInfo: `Nap vi CueZone ${referenceCode}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: config.returnUrl,
    vnp_TxnRef: referenceCode,
  };
  const signature = createHmac("sha512", config.hashSecret)
    .update(vnpaySignData(parameters))
    .digest("hex");
  const query = Object.keys(parameters)
    .sort()
    .map((key) => `${formEncode(key)}=${formEncode(parameters[key])}`)
    .join("&");
  return `${VNPAY_PAYMENT_URL}?${query}&vnp_SecureHash=${signature}`;
}

export class WalletService {
  async getForUser(userId: string) {
    if (!mongoose.isValidObjectId(userId)) throw httpError("Tài khoản không hợp lệ", 401);
    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, balance: 0, transactions: [] } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return wallet;
  }

  async requestTopup(userId: string, amount: unknown) {
    if (!mongoose.isValidObjectId(userId)) throw httpError("Tài khoản không hợp lệ", 401);
    if (!Number.isSafeInteger(amount) || Number(amount) < 50_000 || Number(amount) > 20_000_000) {
      throw httpError("Số tiền nạp phải từ 50.000đ đến 20.000.000đ");
    }
    const user = await User.findOne({
      _id: userId,
      role: "customer",
      isActive: true,
      isLocked: false,
    });
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

    await notifications
      .createForUser(userId, {
        title: "Đã tiếp nhận yêu cầu nạp ví",
        content: `Yêu cầu nạp ${Number(amount).toLocaleString("vi-VN")}đ (${referenceCode}) đang chờ nhân viên xác nhận. Số dư chưa thay đổi.`,
        type: NotificationType.WALLET,
      })
      .catch(() => undefined);
    await notifications
      .create({
        title: "Có yêu cầu nạp ví mới",
        content: `${user.name} yêu cầu nạp ${Number(amount).toLocaleString("vi-VN")}đ. Mã giao dịch: ${referenceCode}.`,
        type: NotificationType.WALLET,
      })
      .catch(() => undefined);
    return wallet;
  }

  async createVnpayTopup(userId: string, amount: unknown, ipAddress?: string) {
    if (!mongoose.isValidObjectId(userId)) throw httpError("Tài khoản không hợp lệ", 401);
    const numericAmount = Number(amount);
    if (
      !Number.isSafeInteger(numericAmount) ||
      numericAmount < 50_000 ||
      numericAmount > 10_000_000 ||
      numericAmount % 10_000 !== 0
    ) {
      throw httpError("Số tiền nạp tối thiểu từ 50.000đ (bội số của 10.000đ, tối đa 10.000.000đ)");
    }
    if (!ipAddress) throw httpError("Không xác định được địa chỉ IP thanh toán");
    const config = getVnpayConfig();
    const user = await User.findOne({
      _id: userId,
      role: "customer",
      isActive: true,
      isLocked: false,
    }).select("_id");
    if (!user) throw httpError("Chỉ hội viên đang hoạt động mới được nạp ví", 403);

    const now = new Date();
    const referenceCode = `CZVN${formatVnpayDate(now)}${randomBytes(8).toString("hex").toUpperCase()}`;
    await mongoose.connection.transaction(async (session) => {
      const wallet = await this.findOrCreateForUser(userId, session);
      await WalletPayment.create(
        [{ userId, referenceCode, amount: Number(amount), status: WalletTransactionStatus.PENDING }],
        { session },
      );
      wallet.transactions.push({
        type: WalletTransactionType.TOPUP,
        status: WalletTransactionStatus.PENDING,
        amount: Number(amount),
        description: "Nạp ví qua VNPay đang chờ thanh toán",
        referenceCode,
        gateway: "vnpay",
        balanceAfter: wallet.balance,
        createdAt: now,
      } as any);
      await wallet.save({ session });
    });

    return {
      referenceCode,
      amount: Number(amount),
      paymentUrl: buildVnpayPaymentUrl(config, referenceCode, Number(amount), ipAddress, now),
    };
  }

  async getVnpayTopupStatus(userId: string, referenceCode: string) {
    if (!mongoose.isValidObjectId(userId)) throw httpError("Tài khoản không hợp lệ", 401);
    const payment = await WalletPayment.findOne({ userId, referenceCode }).select(
      "referenceCode amount status responseCode transactionNo bankCode paidAt createdAt",
    );
    if (!payment) throw httpError("Không tìm thấy giao dịch nạp ví", 404);
    return payment;
  }

  async confirmVnpayReturn(userId: string, parameters: VnpayParameters) {
    if (!mongoose.isValidObjectId(userId)) throw httpError("Tài khoản không hợp lệ", 401);
    const referenceCode = parameters.vnp_TxnRef;
    if (!referenceCode) throw httpError("Thiếu mã giao dịch VNPay");
    const payment = await WalletPayment.findOne({ userId, referenceCode }).select("_id");
    if (!payment) throw httpError("Không tìm thấy giao dịch nạp ví", 404);

    const result = await this.handleVnpayIpn(parameters);
    if (result.RspCode !== "00") {
      const failures: Record<string, { message: string; httpCode: number }> = {
        "01": { message: "Không tìm thấy giao dịch nạp ví VNPay", httpCode: 404 },
        "04": { message: "Số tiền thanh toán VNPay không khớp với giao dịch", httpCode: 400 },
        "97": {
          message: "Chữ ký phản hồi VNPay không hợp lệ. Giao dịch chưa được cộng tiền.",
          httpCode: 400,
        },
        "99": { message: "Dữ liệu phản hồi VNPay không hợp lệ", httpCode: 400 },
      };
      const failure = failures[result.RspCode];
      throw httpError(
        failure?.message ?? "Không thể xác thực kết quả thanh toán VNPay",
        failure?.httpCode ?? 400,
      );
    }
    return this.getVnpayTopupStatus(userId, referenceCode);
  }

  async handleVnpayIpn(parameters: VnpayParameters) {
    const config = getVnpayConfig();
    if (
      parameters.vnp_TmnCode !== config.tmnCode ||
      !verifyVnpaySignature(parameters, config.hashSecret)
    ) {
      return { RspCode: "97", Message: "Invalid Checksum" };
    }

    const referenceCode = parameters.vnp_TxnRef;
    const amount = Number(parameters.vnp_Amount);
    if (
      !referenceCode ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      !/^\d{2}$/.test(parameters.vnp_ResponseCode || "") ||
      !/^\d{2}$/.test(parameters.vnp_TransactionStatus || "")
    ) {
      return { RspCode: "99", Message: "Invalid data" };
    }

    const payment = await WalletPayment.findOne({ referenceCode }).select(
      "_id userId amount status",
    );
    if (!payment) return { RspCode: "01", Message: "Order not found" };
    if (amount !== payment.amount * 100 || parameters.vnp_CurrCode !== "VND") {
      return { RspCode: "04", Message: "Invalid Amount" };
    }
    if (payment.status !== WalletTransactionStatus.PENDING) return VNPAY_IPN_SUCCESS;

    const isSuccessful =
      parameters.vnp_ResponseCode === "00" && parameters.vnp_TransactionStatus === "00";
    if (isSuccessful && !parameters.vnp_PayDate) {
      return { RspCode: "99", Message: "Missing payment date" };
    }
    const processed = await mongoose.connection.transaction(async (session) => {
      const currentPayment = await WalletPayment.findOne({
        _id: payment._id,
        status: WalletTransactionStatus.PENDING,
      }).session(session);
      if (!currentPayment) return false;

      const wallet = await Wallet.findOne({
        userId: currentPayment.userId,
        transactions: {
          $elemMatch: {
            referenceCode,
            gateway: "vnpay",
            status: WalletTransactionStatus.PENDING,
          },
        },
      }).session(session);
      if (!wallet) throw httpError("Không tìm thấy bút toán ví chờ xử lý", 500);
      const transaction = (wallet.transactions as any[]).find(
        (item) => item.referenceCode === referenceCode,
      );
      if (!transaction) throw httpError("Không tìm thấy bút toán ví", 500);

      const paidAt = parameters.vnp_PayDate
        ? parseVnpayDate(parameters.vnp_PayDate)
        : new Date();
      currentPayment.status = isSuccessful
        ? WalletTransactionStatus.SUCCESS
        : WalletTransactionStatus.FAILED;
      currentPayment.responseCode = parameters.vnp_ResponseCode;
      currentPayment.transactionNo = parameters.vnp_TransactionNo;
      currentPayment.bankCode = parameters.vnp_BankCode;
      if (isSuccessful) currentPayment.paidAt = paidAt;

      if (isSuccessful) wallet.balance += currentPayment.amount;
      transaction.status = currentPayment.status;
      transaction.description = isSuccessful
        ? "Nạp ví qua VNPay thành công"
        : "Thanh toán VNPay không thành công";
      transaction.balanceAfter = wallet.balance;
      transaction.gatewayTransactionNo = currentPayment.transactionNo;
      transaction.paidAt = currentPayment.paidAt;

      await wallet.save({ session });
      await currentPayment.save({ session });
      return true;
    });
    if (processed && isSuccessful) {
      await notifications
        .createForUser(String(payment.userId), {
          title: "Nạp ví VNPay thành công",
          content: `${payment.amount.toLocaleString("vi-VN")}đ đã được cộng vào ví. Mã giao dịch: ${referenceCode}.`,
          type: NotificationType.WALLET,
        })
        .catch(() => undefined);
    }
    return VNPAY_IPN_SUCCESS;
  }

  async getPendingTopups() {
    const wallets = await Wallet.find({ "transactions.type": WalletTransactionType.TOPUP })
      .populate("userId", "name email phone")
      .sort({ updatedAt: -1 });
    return wallets.flatMap((wallet) =>
      (wallet.transactions as any[])
        .filter(
          (transaction: any) =>
            transaction.type === WalletTransactionType.TOPUP &&
              transaction.status === WalletTransactionStatus.PENDING &&
              transaction.gateway !== "vnpay",
        )
        .map((transaction: any) => ({
          walletId: String(wallet._id),
          user: wallet.userId,
          transaction,
        })),
    );
  }

  async reviewTopup(transactionId: string, reviewerId: string, status: "success" | "failed") {
    if (!mongoose.isValidObjectId(transactionId) || !mongoose.isValidObjectId(reviewerId)) {
      throw httpError("Mã giao dịch hoặc nhân viên không hợp lệ");
    }
    const result = await mongoose.connection.transaction(async (session) => {
      const wallet = await Wallet.findOne({
        transactions: {
          $elemMatch: {
            _id: transactionId,
            type: WalletTransactionType.TOPUP,
            status: WalletTransactionStatus.PENDING,
          },
        },
      }).session(session);
      if (!wallet) throw httpError("Không tìm thấy yêu cầu nạp đang chờ xử lý", 404);
      const transaction = wallet.transactions.id(transactionId);
      if (!transaction) throw httpError("Không tìm thấy giao dịch", 404);
      if (transaction.gateway === "vnpay") {
        throw httpError("Giao dịch VNPay chỉ được cập nhật qua IPN", 409);
      }
      if (status === "success") wallet.balance += transaction.amount;
      transaction.status =
        status === "success" ? WalletTransactionStatus.SUCCESS : WalletTransactionStatus.FAILED;
      transaction.description =
        status === "success"
          ? "Nạp tiền ví đã được nhân viên đối soát"
          : "Yêu cầu nạp tiền không được xác nhận";
      transaction.balanceAfter = wallet.balance;
      transaction.reviewedBy = new Types.ObjectId(reviewerId);
      transaction.reviewedAt = new Date();
      await wallet.save({ session });
      return { wallet, transaction };
    });

    const amount = result.transaction.amount.toLocaleString("vi-VN");
    await notifications
      .createForUser(String(result.wallet.userId), {
        title: status === "success" ? "Nạp ví thành công" : "Yêu cầu nạp ví chưa được xác nhận",
        content:
          status === "success"
            ? `Yêu cầu ${result.transaction.referenceCode} đã được xác nhận. ${amount}đ đã được cộng vào ví.`
            : `Yêu cầu ${result.transaction.referenceCode} chưa được xác nhận. Số dư ví không thay đổi; vui lòng liên hệ quầy nếu cần hỗ trợ.`,
        type: NotificationType.WALLET,
      })
      .catch(() => undefined);
    return result;
  }

  async chargeForTournament(
    userId: string,
    amount: number,
    tournamentName: string,
    session: ClientSession,
  ) {
    if (amount <= 0) return null;
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet || wallet.balance < amount)
      throw httpError("Số dư ví không đủ để thanh toán lệ phí giải đấu", 400);
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

  async chargeForCheckout(
    phone: string,
    amount: number,
    invoiceCode: string,
    session: ClientSession,
  ) {
    const user = await this.findCheckoutMember(phone, session);
    if (!user) throw httpError("Không tìm thấy hội viên đang hoạt động với số điện thoại này");

    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw httpError("Số tiền thanh toán không hợp lệ");
    }

    const pointsAwarded = getPointsForSpend(amount);
    if (amount === 0) {
      return { memberId: String(user._id), phone: user.phone ?? phone, pointsAwarded };
    }

    const wallet = await Wallet.findOneAndUpdate(
      { userId: user._id, balance: { $gte: amount } },
      { $inc: { balance: -amount, points: pointsAwarded } },
      { new: true, session },
    );
    if (!wallet) {
      throw httpError("Số dư ví hội viên không đủ để thanh toán hóa đơn", 409, "WAL001");
    }

    wallet.transactions.push({
      type: WalletTransactionType.PAYMENT,
      status: WalletTransactionStatus.SUCCESS,
      amount,
      pointsAwarded,
      description: `Thanh toán hóa đơn ${invoiceCode}`,
      referenceCode: invoiceCode,
      balanceAfter: wallet.balance,
      createdAt: new Date(),
    } as any);
    await wallet.save({ session });

    return { memberId: String(user._id), phone: user.phone ?? phone, pointsAwarded };
  }

  async awardCheckoutPoints(phone: string | undefined, amount: number, session: ClientSession) {
    if (!phone) return undefined;
    const user = await this.findCheckoutMember(phone, session);
    if (!user) return undefined;

    const pointsAwarded = getPointsForSpend(amount);
    if (pointsAwarded > 0) {
      await Wallet.findOneAndUpdate(
        { userId: user._id },
        { $inc: { points: pointsAwarded } },
        { new: true, upsert: true, setDefaultsOnInsert: true, session },
      );
    }
    return { memberId: String(user._id), phone: user.phone ?? phone, pointsAwarded };
  }

  private async findCheckoutMember(phone: string, session: ClientSession) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) return null;
    const phonePattern = `^\\+?${digits.split("").join("[\\s().-]*")}$`;
    const users = await User.find({
      phone: { $regex: phonePattern },
      role: "customer",
      isActive: true,
      isLocked: false,
    })
      .select("_id phone")
      .limit(2)
      .session(session);
    if (users.length > 1) {
      throw httpError("Số điện thoại hội viên không duy nhất, vui lòng liên hệ nhân viên", 409);
    }
    return users[0] ?? null;
  }

  async findOrCreateForUser(userId: string, session?: ClientSession): Promise<IWallet> {
    const found = await Wallet.findOne({ userId }).session(session ?? null);
    if (found) return found;
    const [created] = await Wallet.create([{ userId, balance: 0, transactions: [] }], { session });
    return created;
  }
}
