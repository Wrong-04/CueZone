import { Invoice } from "../invoice/invoice.model";
import { User, UserRole } from "../user/user.model";
import { Wallet } from "../wallet/wallet.model";
import { getMemberTier, MEMBER_EARN_POINTS_RATE, MEMBER_TIERS } from "./membership.policy";

const pageSize = 10;

function phonePattern(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? `^\\+?${digits.split("").join("[\\s().-]*")}$` : null;
}

export class MemberCenterService {
  async getMembership(userId: string) {
    const user = await User.findOne({ _id: userId, role: UserRole.CUSTOMER }).select(
      "name email phone createdAt",
    );
    if (!user) {
      throw Object.assign(new Error("Không tìm thấy hội viên"), { httpCode: 404 });
    }

    const wallet = await Wallet.findOne({ userId: user._id }).select("points");
    const points = wallet?.points ?? 0;
    const progression = getMemberTier(points);
    return {
      member: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone ?? "",
        joinedAt: user.createdAt,
      },
      points,
      earnPointsRate: MEMBER_EARN_POINTS_RATE,
      currentTier: progression.tier,
      nextTier: progression.nextTier,
      pointsToNextTier: progression.pointsToNextTier,
      progressPercent: progression.progressPercent,
      tiers: MEMBER_TIERS,
    };
  }

  async getPlayHistory(userId: string, page: number) {
    const user = await User.findOne({ _id: userId, role: UserRole.CUSTOMER }).select(
      "_id phone createdAt",
    );
    if (!user) {
      throw Object.assign(new Error("Không tìm thấy hội viên"), { httpCode: 404 });
    }

    const ownershipFilters: Record<string, unknown>[] = [
      { "receipt.memberId": String(user._id) },
    ];
    const legacyPhonePattern = user.phone ? phonePattern(user.phone) : null;
    if (legacyPhonePattern) {
      ownershipFilters.push({
        "receipt.memberId": { $exists: false },
        "receipt.customerPhone": { $regex: legacyPhonePattern },
        createdAt: { $gte: user.createdAt },
      });
    }
    const query = { $or: ownershipFilters, status: "paid" };
    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .select("receipt createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    return {
      items: invoices.map((invoice) => ({
        id: String(invoice._id),
        invoiceCode: invoice.receipt.invoiceCode,
        tableCode: invoice.receipt.tableCode,
        tableName: invoice.receipt.tableName,
        sessionStart: invoice.receipt.sessionStart,
        sessionEnd: invoice.receipt.sessionEnd,
        durationFormatted: invoice.receipt.durationFormatted,
        durationMinutes: invoice.receipt.durationMinutes,
        finalAmount: invoice.receipt.finalAmount,
        paymentMethod: invoice.receipt.paymentMethod,
        pointsAwarded: invoice.receipt.pointsAwarded ?? 0,
        createdAt: invoice.createdAt,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
