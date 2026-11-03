import { Invoice } from "../invoice/invoice.model";
import { User, UserRole } from "../user/user.model";
import { Wallet } from "../wallet/wallet.model";
import { getMemberTier, MEMBER_EARN_POINTS_RATE, MEMBER_TIERS } from "./membership.policy";
import { PlayReview } from "./play-review.model";

const pageSize = 10;

function phonePattern(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? `^\\+?${digits.split("").join("[\\s().-]*")}$` : null;
}

export class MemberCenterService {
  private httpError(message: string, httpCode: number) {
    return Object.assign(new Error(message), { httpCode });
  }

  private async getCustomer(userId: string, projection: string) {
    const user = await User.findOne({ _id: userId, role: UserRole.CUSTOMER }).select(projection);
    if (!user) throw this.httpError("Không tìm thấy hội viên", 404);
    return user;
  }

  private async findOwnedInvoice(userId: string, sessionId: string) {
    const user = await this.getCustomer(userId, "_id phone createdAt");
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

    const invoice = await Invoice.findOne({
      sessionId,
      status: "paid",
      $or: ownershipFilters,
    }).select("_id sessionId receipt status");
    if (!invoice) {
      throw this.httpError("Không tìm thấy phiên chơi đã hoàn tất của hội viên", 404);
    }
    return { user, invoice };
  }

  async getMembership(userId: string) {
    const user = await this.getCustomer(userId, "name email phone createdAt");

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
    const user = await this.getCustomer(userId, "_id phone createdAt");
    const query = { $or: this.getInvoiceOwnershipFilters(user), status: "paid" };
    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .select("sessionId receipt createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    const reviews = await PlayReview.find({
      sessionId: { $in: invoices.map((invoice) => invoice.sessionId) },
      memberId: user._id,
    }).lean();
    const reviewsBySession = new Map(reviews.map((review) => [review.sessionId, review]));

    return {
      items: invoices.map((invoice) => {
        const review = reviewsBySession.get(invoice.sessionId);
        return {
          id: String(invoice._id),
          sessionId: invoice.sessionId,
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
          review: review
            ? {
                tableRating: review.tableRating,
                serviceRating: review.serviceRating,
                comment: review.comment,
                createdAt: review.createdAt,
              }
            : null,
        };
      }),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private getInvoiceOwnershipFilters(user: {
    _id: unknown;
    phone?: string;
    createdAt: Date;
  }) {
    const filters: Record<string, unknown>[] = [{ "receipt.memberId": String(user._id) }];
    const legacyPhonePattern = user.phone ? phonePattern(user.phone) : null;
    if (legacyPhonePattern) {
      filters.push({
        "receipt.memberId": { $exists: false },
        "receipt.customerPhone": { $regex: legacyPhonePattern },
        createdAt: { $gte: user.createdAt },
      });
    }
    return filters;
  }

  async submitPlayReview(userId: string, input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw this.httpError("Thông tin đánh giá không hợp lệ", 400);
    }
    const { sessionId, tableRating, serviceRating, comment } = input as Record<string, unknown>;
    if (typeof sessionId !== "string" || !sessionId.trim() || sessionId.length > 200) {
      throw this.httpError("Mã phiên chơi không hợp lệ", 400);
    }
    if (
      !Number.isInteger(tableRating) ||
      Number(tableRating) < 1 ||
      Number(tableRating) > 5 ||
      !Number.isInteger(serviceRating) ||
      Number(serviceRating) < 1 ||
      Number(serviceRating) > 5
    ) {
      throw this.httpError("Vui lòng chọn số sao từ 1 đến 5 cho bàn chơi và chất lượng phục vụ", 400);
    }
    if (comment !== undefined && (typeof comment !== "string" || comment.length > 1000)) {
      throw this.httpError("Nhận xét không được vượt quá 1.000 ký tự", 400);
    }

    const { user, invoice } = await this.findOwnedInvoice(userId, sessionId.trim());
    try {
      const review = await PlayReview.create({
        sessionId: invoice.sessionId,
        invoiceId: invoice._id,
        memberId: user._id,
        tableRating: Number(tableRating),
        serviceRating: Number(serviceRating),
        comment: typeof comment === "string" ? comment.trim() : "",
      });
      return review;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        throw this.httpError("Phiên chơi này đã được đánh giá trước đó", 409);
      }
      throw error;
    }
  }
}
