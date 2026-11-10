import { Product } from "../product/product.model";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { Table, TableStatus, TableSession, SessionTransferRecord } from "../table/table.model";
import { Booking } from "../booking/booking.model";
import { Invoice } from "../invoice/invoice.model";
import { PricingTier, IPricingTier } from "../pricing/pricing.model";
import { User, UserRole } from "../user/user.model";
import { Wallet, WalletTransactionType, WalletTransactionStatus } from "../wallet/wallet.model";
import { emitTableStatusChanged, emitTableTimerStarted } from "../../utils/socketHolder";
import { VoucherService } from "../voucher/voucher.service";
import { WalletService } from "../wallet/wallet.service";
import { getMemberTier, MEMBER_TIERS } from "../member/membership.policy";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";
import { CustomerOrder, CustomerOrderStatus } from "../customer-order/customer-order.model";

export interface SplitTimeSlot {
  tierName: string;
  startTime: string;
  endTime: string;
  minutes: number;
  pricePerHour: number;
  cost: number;
}

const notifications = new NotificationService();

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
};

function phonePatterns(value: string) {
  const localDigits = normalizePhone(value).replace(/\D/g, "");
  if (!localDigits) return [];
  const variants = [localDigits];
  if (localDigits.startsWith("0")) variants.push(`84${localDigits.slice(1)}`);
  return variants.map((digits) => {
    const formattedDigits = digits.split("").join("[\\s().-]*");
    return `^${digits.startsWith("84") ? "\\+?" : ""}${formattedDigits}$`;
  });
}

export function sessionBelongsToCustomer(
  current: { customerId?: unknown; customerPhone?: string },
  customer: { _id: unknown; phone?: string },
) {
  if (current.customerId) return String(current.customerId) === String(customer._id);
  return Boolean(
    current.customerPhone &&
      customer.phone &&
      normalizePhone(current.customerPhone) === normalizePhone(customer.phone),
  );
}

export function getCurrentTierPrice(
  table: { code?: string; area?: string; pricePerHour: number },
  pricingTiers: IPricingTier[] = [],
  now = Date.now(),
): { price: number; tierName: string } {
  if (!pricingTiers || pricingTiers.length === 0) {
    return { price: table.pricePerHour, tierName: "Biểu giá tiêu chuẩn" };
  }
  const date = new Date(now);
  const vnTimeStr = date.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [hStr, mStr] = vnTimeStr.split(":");
  const currentMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
  const vnDateStr = date.toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const dayOfWeek = new Date(vnDateStr).getDay();

  const isVip = Boolean(table.code?.startsWith("VIP") || table.area?.toLowerCase().includes("vip"));
  const isMatch = Boolean(
    table.code?.startsWith("MTCH") || table.area?.toLowerCase().includes("thi đấu"),
  );

  let matchedTier: IPricingTier | undefined;
  for (const tier of pricingTiers) {
    if (tier.isActive === false) continue;
    if (tier.daysOfWeek && tier.daysOfWeek.length > 0 && !tier.daysOfWeek.includes(dayOfWeek))
      continue;

    const [startH, startM] = tier.startTime.split(":").map(Number);
    const [endH, endM] = tier.endTime === "24:00" ? [24, 0] : tier.endTime.split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal <= endTotal) {
      if (currentMins >= startTotal && currentMins < endTotal) {
        matchedTier = tier;
        break;
      }
    } else {
      if (currentMins >= startTotal || currentMins < endTotal) {
        matchedTier = tier;
        break;
      }
    }
  }

  if (matchedTier) {
    let price = table.pricePerHour;
    if (isVip) price = matchedTier.prices.vip;
    else if (isMatch)
      price =
        matchedTier.prices.match || Math.round((matchedTier.prices.standard * 1.5) / 1000) * 1000;
    else price = matchedTier.prices.standard;
    return { price, tierName: matchedTier.name };
  }
  return { price: table.pricePerHour, tierName: "Biểu giá tiêu chuẩn" };
}

export function calculateSplitPlayingDetails(
  session: TableSession,
  table: { code?: string; area?: string; pricePerHour: number },
  pricingTiers: IPricingTier[] = [],
  now = Date.now(),
) {
  const effectiveNow = session.isPaused && session.pausedAt ? session.pausedAt : now;
  const elapsed = Math.max(0, effectiveNow - session.startedAt - (session.totalPausedMs || 0));
  const totalMinutes = Math.max(1, Math.round(elapsed / 60000));

  const hours = Math.floor(elapsed / 3600000);
  const mins = Math.floor((elapsed % 3600000) / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const formattedTime = [hours, mins, secs].map((n) => String(n).padStart(2, "0")).join(":");

  if (!pricingTiers || pricingTiers.length === 0) {
    const rate = session.pricePerHour ?? table.pricePerHour;
    const cost = Math.round((totalMinutes * rate) / 60) + (session.carriedCost || 0);
    return {
      minutes: totalMinutes,
      cost,
      formattedTime,
      timeSlots: [
        {
          tierName: "Biểu giá tiêu chuẩn",
          startTime:
            session.sessionStart ||
            new Date(session.startedAt).toLocaleTimeString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              hour: "2-digit",
              minute: "2-digit",
            }),
          endTime: new Date(effectiveNow).toLocaleTimeString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
          }),
          minutes: totalMinutes,
          pricePerHour: rate,
          cost: Math.round((totalMinutes * rate) / 60),
        },
      ],
    };
  }

  const isVip = Boolean(table.code?.startsWith("VIP") || table.area?.toLowerCase().includes("vip"));
  const isMatch = Boolean(
    table.code?.startsWith("MTCH") || table.area?.toLowerCase().includes("thi đấu"),
  );

  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const parsedTiers = pricingTiers.map((tier) => {
    const [startH, startM] = tier.startTime.split(":").map(Number);
    const [endH, endM] = tier.endTime === "24:00" ? [24, 0] : tier.endTime.split(":").map(Number);
    return {
      tier,
      startTotal: startH * 60 + startM,
      endTotal: endH * 60 + endM,
      daysOfWeek: tier.daysOfWeek || [],
      isActive: tier.isActive !== false,
    };
  });

  const formatHM = (minsTotal: number): string => {
    const h = Math.floor(minsTotal / 60) % 24;
    const m = minsTotal % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const slots: SplitTimeSlot[] = [];
  let currentSlot: SplitTimeSlot | null = null;

  for (let m = 0; m < totalMinutes; m++) {
    const minuteTimestamp =
      session.startedAt +
      (totalMinutes > 1 ? Math.round((m * (effectiveNow - session.startedAt)) / totalMinutes) : 0);
    const vnDate = new Date(minuteTimestamp + VN_OFFSET_MS);
    const currentMins = vnDate.getUTCHours() * 60 + vnDate.getUTCMinutes();
    const dayOfWeek = vnDate.getUTCDay();

    let matchedTier: IPricingTier | undefined;
    for (let i = 0; i < parsedTiers.length; i++) {
      const pt = parsedTiers[i];
      if (!pt.isActive) continue;
      if (pt.daysOfWeek.length > 0 && !pt.daysOfWeek.includes(dayOfWeek)) continue;

      if (pt.startTotal <= pt.endTotal) {
        if (currentMins >= pt.startTotal && currentMins < pt.endTotal) {
          matchedTier = pt.tier;
          break;
        }
      } else {
        if (currentMins >= pt.startTotal || currentMins < pt.endTotal) {
          matchedTier = pt.tier;
          break;
        }
      }
    }

    const tierName = matchedTier ? matchedTier.name : "Khung Giờ Tiêu Chuẩn";
    let tierPrice = session.pricePerHour ?? table.pricePerHour;
    if (matchedTier) {
      if (isVip) tierPrice = matchedTier.prices.vip;
      else if (isMatch)
        tierPrice =
          matchedTier.prices.match || Math.round((matchedTier.prices.standard * 1.5) / 1000) * 1000;
      else tierPrice = matchedTier.prices.standard;
    }

    const timeStr = formatHM(currentMins);

    if (!currentSlot) {
      currentSlot = {
        tierName,
        startTime: timeStr,
        endTime: timeStr,
        minutes: 1,
        pricePerHour: tierPrice,
        cost: 0,
      };
    } else if (currentSlot.tierName === tierName && currentSlot.pricePerHour === tierPrice) {
      currentSlot.minutes += 1;
      currentSlot.endTime = timeStr;
    } else {
      currentSlot.cost =
        Math.round((currentSlot.minutes * currentSlot.pricePerHour) / 60 / 1000) * 1000;
      slots.push(currentSlot);
      currentSlot = {
        tierName,
        startTime: timeStr,
        endTime: timeStr,
        minutes: 1,
        pricePerHour: tierPrice,
        cost: 0,
      };
    }
  }

  if (currentSlot) {
    currentSlot.cost =
      Math.round((currentSlot.minutes * currentSlot.pricePerHour) / 60 / 1000) * 1000;
    const endVnDate = new Date(effectiveNow + VN_OFFSET_MS);
    currentSlot.endTime = formatHM(endVnDate.getUTCHours() * 60 + endVnDate.getUTCMinutes());
    slots.push(currentSlot);
  }

  const rawCost = slots.reduce((sum, s) => sum + s.cost, 0);
  const cost = rawCost + (session.carriedCost || 0);

  return { minutes: totalMinutes, cost, formattedTime, timeSlots: slots };
}

export function playingDetails(
  session: TableSession,
  now = Date.now(),
  table?: any,
  pricingTiers: IPricingTier[] = [],
) {
  if (table && pricingTiers && pricingTiers.length > 0) {
    return calculateSplitPlayingDetails(session, table, pricingTiers, now);
  }
  const elapsed = Math.max(
    0,
    (session.isPaused ? session.pausedAt! : now) - session.startedAt - session.totalPausedMs,
  );
  const minutes = Math.max(1, Math.round(elapsed / 60000));
  return {
    minutes,
    cost: Math.round((minutes * session.pricePerHour) / 60) + (session.carriedCost || 0),
    formattedTime: [
      Math.floor(elapsed / 3600000),
      Math.floor(elapsed / 60000) % 60,
      Math.floor(elapsed / 1000) % 60,
    ]
      .map((n) => String(n).padStart(2, "0"))
      .join(":"),
    timeSlots: [] as SplitTimeSlot[],
  };
}

export class SessionService {
  private readonly walletService = new WalletService();

  async open(tableId: string, input: any) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw Object.assign(new Error("Thông tin mở bàn không hợp lệ"), { httpCode: 400 });
    }
    if (
      (input.customerName !== undefined &&
        (typeof input.customerName !== "string" || input.customerName.length > 120)) ||
      (input.customerPhone !== undefined &&
        (typeof input.customerPhone !== "string" || input.customerPhone.length > 30)) ||
      (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 1000))
    ) {
      throw Object.assign(new Error("Thông tin khách hàng không hợp lệ"), { httpCode: 400 });
    }
    const result = await mongoose.connection.transaction(async (session) => {
      const table = await Table.findOne({
        _id: tableId,
        isActive: true,
        status: { $in: [TableStatus.AVAILABLE, TableStatus.BOOKED] },
        $or: [{ currentSession: { $exists: false } }, { currentSession: null }],
      }).session(session);
      if (!table) {
        throw Object.assign(new Error("Bàn không còn sẵn sàng để mở. Vui lòng tải lại danh sách bàn."), {
          httpCode: 409,
        });
      }
      let deposit = 0;
      let name = input.customerName?.trim() || "Khách vãng lai";
      let phone = input.customerPhone?.trim();
      let customerId: mongoose.Types.ObjectId | undefined;
      let preOrderedItems: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
        category: string;
        orderTime: string;
        status: string;
      }> = [];
      const isBookingCheckIn = Boolean(
        input.bookingId &&
        table.bookedInfo &&
        input.bookingId === table.bookedInfo.bookingId
      );

      if (isBookingCheckIn) {
        const booking = await Booking.findOne({
          _id: table.bookedInfo!.bookingId,
          status: "approved",
        }).session(session);
        if (!booking) {
          throw Object.assign(new Error("Không tìm thấy lịch đặt bàn hợp lệ"), { httpCode: 409 });
        }
        booking.status = "checked_in";
        deposit = booking.deposit;
        name = booking.customerName;
        phone = booking.phone;
        preOrderedItems = booking.preOrderItems.map((item: any) => ({
          id: `booking-${booking.id}-${String(item.productId)}`,
          name: item.name,
          price: item.unitPrice,
          quantity: item.quantity,
          category: item.category,
          orderTime: "Đặt trước",
          status: "pending",
        }));
        booking.inventoryReserved = false;
        await booking.save({ session });
      } else if (input.bookingId) {
        throw Object.assign(new Error("Lịch đặt bàn đã thay đổi, vui lòng tải lại"), {
          httpCode: 409,
        });
      }
      let isMember = Boolean(input.isMember);
      if (phone) {
        const patterns = phonePatterns(phone);
        const memberUser = patterns.length
          ? await User.findOne({
              phone: { $in: patterns.map((pattern) => new RegExp(pattern, "i")) },
              role: UserRole.CUSTOMER,
              isActive: true,
              isLocked: false,
            }).session(session)
          : null;
        if (memberUser) {
          customerId = memberUser._id;
          phone = memberUser.phone;
          isMember = true;
          if (
            !input.customerName ||
            input.customerName.trim() === "Khách vãng lai" ||
            input.customerName.trim() === ""
          ) {
            name = memberUser.name;
          }
        }
      }
      const now = Date.now();
      const pricingTiers = await PricingTier.find({ isActive: true }).session(session);
      const { price: currentRate } = getCurrentTierPrice(table, pricingTiers, now);
      table.currentSession = {
        sessionId: randomUUID(),
        sessionStart: new Date(now).toLocaleTimeString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          hour: "2-digit",
          minute: "2-digit",
        }),
        startedAt: now,
        pricePerHour: currentRate,
        isPaused: false,
        totalPausedMs: 0,
        carriedCost: 0,
        customerName: name,
        customerPhone: phone,
        customerId,
        isMember,
        orders: preOrderedItems,
        note: input.note,
        deposit,
      };
      // Chỉ xoá bookedInfo nếu đây là lượt nhận bàn thật sự của khách đặt trước
      // Nếu mở bàn cho khách vãng lai chơi tạm trong lúc chờ, giữ nguyên bookedInfo để POS cảnh báo khi sắp đến giờ đón khách
      if (isBookingCheckIn) {
        table.bookedInfo = undefined;
      }
      table.status = TableStatus.PLAYING;
      await table.save({ session });
      return table;
    });
    emitTableStatusChanged({ tableId: String(result._id), status: result.status, table: result });
    emitTableTimerStarted({
      tableId: String(result._id),
      sessionId: result.currentSession?.sessionId,
      table: result,
    });
    return result;
  }

  async pause(tableId: string, input: any) {
    if (typeof input.sessionId !== "string" || typeof input.paused !== "boolean")
      throw new Error("Yêu cầu tạm dừng không hợp lệ");
    const result = await mongoose.connection.transaction(async (session) => {
      const table = await Table.findOne({
        _id: tableId,
        "currentSession.sessionId": input.sessionId,
        status: input.paused ? TableStatus.PLAYING : TableStatus.PAUSED,
      }).session(session);
      if (!table?.currentSession) throw new Error("Phiên chơi đã thay đổi, vui lòng tải lại");
      const current = table.currentSession;
      if (current.checkoutState === "pending_payment") {
        throw Object.assign(new Error("Bàn đang chờ xác nhận thanh toán"), { httpCode: 409 });
      }
      if (input.paused) current.pausedAt = Date.now();
      else {
        current.totalPausedMs += Date.now() - current.pausedAt!;
        current.pausedAt = undefined;
      }
      current.isPaused = input.paused;
      table.status = input.paused ? TableStatus.PAUSED : TableStatus.PLAYING;
      await table.save({ session });
      return table;
    });
    emitTableStatusChanged({ tableId: String(result._id), status: result.status, table: result });
    return result;
  }

  async getEligibleMoveTargets(tableId: string, action: "transfer" | "merge" = "transfer") {
    if (!mongoose.isValidObjectId(tableId)) {
      throw Object.assign(new Error("Mã bàn không hợp lệ"), { httpCode: 400 });
    }
    const sourceTable = await Table.findById(tableId);
    if (!sourceTable || !sourceTable.currentSession) {
      throw Object.assign(new Error("Bàn nguồn không có phiên chơi hợp lệ"), { httpCode: 404 });
    }

    const now = Date.now();
    const sourceDetails = playingDetails(sourceTable.currentSession, now);
    const sourceInfo = {
      id: String(sourceTable._id),
      code: sourceTable.code,
      name: sourceTable.name,
      type: sourceTable.type,
      pricePerHour: sourceTable.currentSession.pricePerHour,
      durationMinutes: sourceDetails.minutes,
      currentCost: sourceDetails.cost,
      ordersCount: (sourceTable.currentSession.orders || []).filter((o) => o.status !== "cancelled").length,
      deposit: sourceTable.currentSession.deposit || 0,
      customerName: sourceTable.currentSession.customerName,
    };

    if (action === "transfer") {
      const availableTables = await Table.find({
        _id: { $ne: sourceTable._id },
        isActive: true,
        status: TableStatus.AVAILABLE,
        currentSession: { $exists: false },
      }).sort({ floor: 1, name: 1 });

      const targets = availableTables.map((t) => ({
        id: String(t._id),
        code: t.code,
        name: t.name,
        type: t.type,
        area: t.area,
        floor: t.floor,
        status: t.status,
        pricePerHour: t.pricePerHour,
        priceDiffPerHour: t.pricePerHour - sourceTable.currentSession!.pricePerHour,
        isSamePrice: t.pricePerHour === sourceTable.currentSession!.pricePerHour,
      }));

      return { source: sourceInfo, targets };
    } else {
      const playingTables = await Table.find({
        _id: { $ne: sourceTable._id },
        isActive: true,
        status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] },
        "currentSession.sessionId": { $exists: true },
        "currentSession.checkoutState": { $ne: "pending_payment" },
      }).sort({ floor: 1, name: 1 });

      const targets = playingTables.map((t) => {
        const targetSession = t.currentSession!;
        const details = playingDetails(targetSession, now);
        return {
          id: String(t._id),
          code: t.code,
          name: t.name,
          type: t.type,
          area: t.area,
          floor: t.floor,
          status: t.status,
          customerName: targetSession.customerName,
          customerPhone: targetSession.customerPhone,
          durationMinutes: details.minutes,
          currentCost: details.cost,
          pricePerHour: targetSession.pricePerHour,
          ordersCount: (targetSession.orders || []).filter((o) => o.status !== "cancelled").length,
          carriedCost: targetSession.carriedCost || 0,
        };
      });

      return { source: sourceInfo, targets };
    }
  }

  async move(
    tableId: string,
    input: {
      sessionId: string;
      targetTableId: string;
      action: "transfer" | "merge";
      reason?: string;
      pricingOption?: "keep_agreed" | "target_table";
    },
    staffUser?: { _id?: any; id?: string; name?: string; fullName?: string; username?: string },
  ) {
    if (
      !["transfer", "merge"].includes(input.action) ||
      !mongoose.isValidObjectId(input.targetTableId) ||
      input.targetTableId === tableId ||
      typeof input.sessionId !== "string"
    )
      throw new Error("Bàn đích không hợp lệ");

    const result = await mongoose.connection.transaction(async (session) => {
      const source = await Table.findOne({
        _id: tableId,
        "currentSession.sessionId": input.sessionId,
        status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] },
      }).session(session);

      if (!source?.currentSession) throw new Error("Phiên chơi đã thay đổi");
      if (source.currentSession.checkoutState === "pending_payment") {
        throw Object.assign(new Error("Không thể chuyển bàn khi đang chờ xác nhận thanh toán"), {
          httpCode: 409,
        });
      }

      const target = await Table.findOne({ _id: input.targetTableId, isActive: true }).session(
        session,
      );
      if (!target) {
        throw Object.assign(new Error("Không tìm thấy bàn đích hoặc bàn đích bị khóa"), {
          httpCode: 404,
        });
      }
      if (target.currentSession?.checkoutState === "pending_payment") {
        throw Object.assign(new Error("Không thể chuyển bàn khi đang chờ xác nhận thanh toán"), {
          httpCode: 409,
        });
      }

      const now = Date.now();
      const sourceDetails = playingDetails(source.currentSession, now);

      const transferRecord: SessionTransferRecord = {
        action: input.action,
        fromTableId: String(source._id),
        fromTableCode: source.code,
        fromTableName: source.name,
        toTableId: String(target._id),
        toTableCode: target.code,
        toTableName: target.name,
        transferredAt: new Date(now),
        transferredBy: staffUser
          ? {
              id: String(staffUser._id || staffUser.id || ""),
              name: staffUser.name || staffUser.fullName || staffUser.username || "Nhân viên",
            }
          : undefined,
        carriedCostSnapshot: sourceDetails.cost,
        carriedFnbCount: (source.currentSession.orders || []).filter((o) => o.status !== "cancelled").length,
        previousPricePerHour: source.currentSession.pricePerHour,
        newPricePerHour: target.pricePerHour,
        reason: typeof input.reason === "string" ? input.reason.trim() : undefined,
      };

      if (input.action === "transfer") {
        if (target.status !== TableStatus.AVAILABLE || target.currentSession)
          throw new Error("Bàn đích không còn trống");

        // Clone currentSession deeply as clean plain object to avoid Mongoose subdocument detachment issues
        const sourceSessionObj: TableSession =
          typeof (source.currentSession as any).toObject === "function"
            ? (source.currentSession as any).toObject()
            : JSON.parse(JSON.stringify(source.currentSession));

        if (!sourceSessionObj.transfers) {
          sourceSessionObj.transfers = [];
        }
        sourceSessionObj.transfers.push(transferRecord);

        // Áp dụng định giá lũy tiến (nếu chọn áp dụng đơn giá bàn mới và đơn giá khác nhau)
        if (
          input.pricingOption === "target_table" &&
          target.pricePerHour !== source.currentSession.pricePerHour
        ) {
          sourceSessionObj.carriedCost = (sourceSessionObj.carriedCost || 0) + sourceDetails.cost;
          sourceSessionObj.startedAt = now;
          sourceSessionObj.totalPausedMs = 0;
          sourceSessionObj.pausedAt = undefined;
          sourceSessionObj.pricePerHour = target.pricePerHour;
        }

        target.currentSession = sourceSessionObj;
        target.status = source.status;

        // Cập nhật các đơn đặt món online (CustomerOrder) nếu có sang bàn mới
        await CustomerOrder.updateMany(
          {
            tableId: source._id,
            sessionId: sourceSessionObj.sessionId,
            status: { $in: [CustomerOrderStatus.PENDING, CustomerOrderStatus.PREPARING] },
          },
          {
            $set: {
              tableId: target._id,
              tableCode: target.code,
              tableName: target.name,
            },
          },
          { session },
        );
        // Mặc định giữ đơn giá đã thỏa thuận ban đầu (bảo toàn assertion pricePerHour trong test)
      } else {
        if (
          !target.currentSession ||
          ![TableStatus.PLAYING, TableStatus.PAUSED].includes(target.status)
        )
          throw new Error("Bàn đích chưa có phiên chơi");

        target.currentSession.carriedCost = (target.currentSession.carriedCost || 0) + sourceDetails.cost;
        target.currentSession.deposit = (target.currentSession.deposit || 0) + (source.currentSession.deposit || 0);

        // Chuyển toàn bộ F&B, gắn nhãn bàn gốc để minh bạch hóa đơn
        // Lưu ý: Cần chuyển đổi Mongoose subdocument sang plain object (.toObject()) để không làm mất schema getters (name, price, quantity...)
        const rawSourceOrders = source.currentSession.orders || [];
        const sourceOrders = rawSourceOrders.map((o: any) =>
          typeof o?.toObject === "function" ? o.toObject() : (o?._doc ? { ...o._doc } : { ...o }),
        );
        const taggedOrders = sourceOrders.map((order: any) => ({
          ...order,
          id: order.id || String(order._id || new mongoose.Types.ObjectId()),
          productId: order.productId,
          name: order.name || "Món F&B",
          price: typeof order.price === "number" ? order.price : 0,
          quantity: typeof order.quantity === "number" ? order.quantity : 1,
          category: order.category || "drink",
          orderTime:
            order.orderTime ||
            new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          status: order.status || "served",
          cancelledQuantity: order.cancelledQuantity || 0,
          cancelReason: order.cancelReason,
          cancelledAt: order.cancelledAt,
          cancelledBy: order.cancelledBy,
          stockRestored: order.stockRestored !== undefined ? order.stockRestored : true,
          originTableName: order.originTableName || source.name,
        }));
        target.currentSession.orders.push(...taggedOrders);

        if (!target.currentSession.transfers) {
          target.currentSession.transfers = [];
        }
        target.currentSession.transfers.push(transferRecord);

        // Cập nhật các đơn đặt món online (CustomerOrder) nếu có sang bàn đích
        await CustomerOrder.updateMany(
          {
            tableId: source._id,
            sessionId: source.currentSession.sessionId,
            status: { $in: [CustomerOrderStatus.PENDING, CustomerOrderStatus.PREPARING] },
          },
          {
            $set: {
              tableId: target._id,
              tableCode: target.code,
              tableName: target.name,
              sessionId: target.currentSession.sessionId,
            },
          },
          { session },
        );
      }

      source.currentSession = undefined;
      source.status = TableStatus.AVAILABLE;
      await source.save({ session });
      await target.save({ session });
      return { target, source };
    });

    emitTableStatusChanged({
      tableId: String(result.target._id),
      status: result.target.status,
      table: result.target,
    });
    emitTableStatusChanged({
      tableId: String(result.source._id),
      status: result.source.status,
      table: result.source,
    });

    void notifications
      .create({
        type: NotificationType.TABLE,
        title: input.action === "transfer" ? "Chuyển bàn thành công" : "Gộp bàn thành công",
        content:
          input.action === "transfer"
            ? `Đã chuyển phiên chơi từ ${result.source.name} sang ${result.target.name}`
            : `Đã gộp phiên chơi từ ${result.source.name} vào ${result.target.name}`,
      })
      .catch(() => {});

    return result.target;
  }

  async cancelOrderItem(
    tableId: string,
    input: {
      sessionId: string;
      orderItemId: string;
      quantity?: number;
      reason: string;
      restoreStock?: boolean;
    },
    staffUser?: { _id?: any; name?: string; phone?: string },
  ) {
    if (
      typeof input.sessionId !== "string" ||
      !input.orderItemId ||
      typeof input.reason !== "string" ||
      !input.reason.trim()
    ) {
      throw Object.assign(new Error("Vui lòng cung cấp mã món và lý do hủy món"), { httpCode: 400 });
    }

    const cancelQty = Math.max(1, Number(input.quantity) || 1);

    const result = await mongoose.connection.transaction(async (session) => {
      const table = await Table.findOne({
        _id: tableId,
        "currentSession.sessionId": input.sessionId,
        status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] },
      }).session(session);

      if (!table?.currentSession) {
        throw Object.assign(new Error("Phiên chơi đã kết thúc hoặc không tìm thấy bàn"), { httpCode: 404 });
      }
      if (table.currentSession.checkoutState === "pending_payment") {
        throw Object.assign(new Error("Bàn đang chờ xác nhận thanh toán, không thể hủy món"), { httpCode: 409 });
      }

      const item = table.currentSession.orders.find((o) => o.id === input.orderItemId);
      if (!item) {
        throw Object.assign(new Error("Không tìm thấy món cần hủy trong bàn này"), { httpCode: 404 });
      }
      if (item.status === "cancelled" || item.quantity <= 0) {
        throw Object.assign(new Error("Món này đã bị hủy trước đó"), { httpCode: 400 });
      }
      if (cancelQty > item.quantity) {
        throw Object.assign(
          new Error(`Số lượng hủy (${cancelQty}) vượt quá số lượng đang có (${item.quantity})`),
          { httpCode: 400 },
        );
      }

      // Restore stock to Product (SCRUM-875) only if requested
      const shouldRestoreStock = input.restoreStock !== false;
      if (shouldRestoreStock) {
        const productQuery =
          item.productId && mongoose.isValidObjectId(item.productId)
            ? { _id: item.productId }
            : { name: item.name };

        await Product.findOneAndUpdate(
          productQuery,
          { $inc: { stock: cancelQty } },
          { session },
        );
      }

      // Update item status in session orders (SCRUM-873, SCRUM-877)
      const remainingQty = item.quantity - cancelQty;
      item.cancelledQuantity = (item.cancelledQuantity || 0) + cancelQty;
      item.cancelReason = input.reason.trim();
      item.cancelledAt = new Date();
      item.cancelledBy = staffUser?.name || "Thu ngân";
      (item as any).stockRestored = shouldRestoreStock;

      if (remainingQty === 0) {
        item.quantity = 0;
        item.status = "cancelled";
      } else {
        item.quantity = remainingQty;
      }

      table.markModified("currentSession.orders");
      await table.save({ session });
      return table;
    });

    emitTableStatusChanged({ tableId: String(result._id), status: result.status, table: result });
    return result;
  }

  async updateOrders(tableId: string, input: any) {
    if (typeof input.sessionId !== "string" || !Array.isArray(input.orders)) {
      throw new Error("Dữ liệu gọi món không hợp lệ");
    }
    const result = await mongoose.connection.transaction(async (session) => {
      const table = await Table.findOne({
        _id: tableId,
        "currentSession.sessionId": input.sessionId,
        status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] },
      }).session(session);
      if (!table?.currentSession) throw new Error("Phiên chơi đã thay đổi hoặc đã đóng");
      if (table.currentSession.checkoutState === "pending_payment") {
        throw Object.assign(new Error("Bàn đang chờ xác nhận thanh toán"), { httpCode: 409 });
      }
      table.currentSession.orders = input.orders;
      await table.save({ session });
      return table;
    });
    emitTableStatusChanged({ tableId: String(result._id), status: result.status, table: result });
    return result;
  }

  async getCustomerSessions(customerId: string) {
    if (!mongoose.isValidObjectId(customerId))
      throw Object.assign(new Error("Tài khoản không hợp lệ"), { httpCode: 401 });
    const user = await User.findOne({
      _id: customerId,
      role: UserRole.CUSTOMER,
      isActive: true,
      isLocked: false,
    }).select("_id phone");
    if (!user) return [];
    const [tables, wallet, pricingTiers] = await Promise.all([
      Table.find({
        status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] },
        "currentSession.checkoutState": { $in: ["open", "pending_payment", null] },
      }).select("code name area pricePerHour status currentSession"),
      Wallet.findOne({ userId: customerId }).select("balance points"),
      PricingTier.find({ isActive: true }),
    ]);
    return tables
      .filter((table) => table.currentSession && sessionBelongsToCustomer(table.currentSession, user))
      .map((table) => {
        const current = table.currentSession!;
        const pending = current.pendingCheckout;
        const quote = this.customerQuote(table, wallet?.points ?? 0, pricingTiers);
        return {
          ...quote,
          ...(pending
            ? {
                tier: {
                  key: pending.membershipTierKey,
                  name: pending.membershipTierName,
                  tableDiscountPercent: pending.tableDiscountPercent,
                  fnbDiscountPercent: pending.fnbDiscountPercent,
                },
                membershipDiscountAmount: pending.membershipDiscountAmount,
                voucherCode: pending.voucherCode,
                voucherDiscountAmount: pending.voucherDiscountAmount,
                discountAmount: pending.membershipDiscountAmount + pending.voucherDiscountAmount,
                totalDue: pending.estimatedTotalDue,
              }
            : {}),
          tableId: String(table._id),
          tableCode: table.code,
          tableName: table.name,
          status: table.status,
          sessionId: current.sessionId,
          sessionStart: current.sessionStart,
          startedAt: current.startedAt,
          isPaused: current.isPaused,
          walletBalance: wallet?.balance ?? 0,
          checkoutState: current.checkoutState ?? "open",
          pendingCheckout: pending
            ? {
                paymentMethod: pending.paymentMethod,
                requestedAt: pending.requestedAt,
              }
            : undefined,
        };
      });
  }

  async previewCustomerCheckout(
    customerId: string,
    tableId: string,
    sessionId: unknown,
    voucherCode?: unknown,
  ) {
    if (!mongoose.isValidObjectId(customerId) || !mongoose.isValidObjectId(tableId)) {
      throw Object.assign(new Error("Mã tài khoản hoặc bàn không hợp lệ"), { httpCode: 400 });
    }
    if (typeof sessionId !== "string" || !sessionId) throw new Error("Phiên chơi không hợp lệ");
    const [user, table, wallet, pricingTiers] = await Promise.all([
      User.findOne({
        _id: customerId,
        role: UserRole.CUSTOMER,
        isActive: true,
        isLocked: false,
      }).select("phone"),
      Table.findOne({
        _id: tableId,
        "currentSession.sessionId": sessionId,
        status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] },
      }).select("code name area pricePerHour status currentSession"),
      Wallet.findOne({ userId: customerId }).select("balance points"),
      PricingTier.find({ isActive: true }),
    ]);
    if (!user || !table?.currentSession) {
      throw Object.assign(new Error("Không tìm thấy phiên bàn đang hoạt động"), { httpCode: 404 });
    }
    if (!sessionBelongsToCustomer(table.currentSession, user)) {
      throw Object.assign(new Error("Phiên chơi không thuộc tài khoản này"), { httpCode: 403 });
    }
    if (
      table.currentSession.checkoutState !== undefined &&
      table.currentSession.checkoutState !== "open"
    ) {
      throw Object.assign(new Error("Không thể thay đổi báo giá khi phiên đang chờ thanh toán"), {
        httpCode: 409,
      });
    }
    const quote = this.customerQuote(table, wallet?.points ?? 0, pricingTiers);
    if (voucherCode !== undefined && voucherCode !== "") {
      const voucher = await new VoucherService().validate(
        voucherCode,
        quote.subtotal - quote.membershipDiscountAmount,
      );
      quote.voucherCode = voucher.code;
      quote.voucherDiscountAmount = voucher.discountAmount;
      quote.discountAmount += voucher.discountAmount;
      quote.totalDue = Math.max(0, quote.subtotal - quote.discountAmount - quote.deposit);
    }
    return { ...quote, walletBalance: wallet?.balance ?? 0 };
  }

  async requestCustomerCheckout(
    customerId: string,
    tableId: string,
    input: { sessionId?: unknown; paymentMethod?: unknown; voucherCode?: unknown },
  ) {
    if (!input || typeof input !== "object") {
      throw Object.assign(new Error("Thông tin yêu cầu thanh toán không hợp lệ"), {
        httpCode: 400,
      });
    }
    const validMethods = ["cash", "transfer"];
    if (
      !mongoose.isValidObjectId(customerId) ||
      !mongoose.isValidObjectId(tableId) ||
      typeof input.sessionId !== "string" ||
      !input.sessionId ||
      !validMethods.includes(String(input.paymentMethod)) ||
      (input.voucherCode !== undefined &&
        (typeof input.voucherCode !== "string" || !input.voucherCode.trim()))
    ) {
      throw Object.assign(new Error("Thông tin yêu cầu thanh toán không hợp lệ"), {
        httpCode: 400,
      });
    }
    const voucherCode =
      typeof input.voucherCode === "string" ? input.voucherCode.trim().toUpperCase() : undefined;
    const request = await mongoose.connection.transaction(async (session) => {
      const [user, table, wallet, pricingTiers] = await Promise.all([
        User.findOne({
          _id: customerId,
          role: UserRole.CUSTOMER,
          isActive: true,
          isLocked: false,
        })
          .select("phone")
          .session(session),
        Table.findOne({
          _id: tableId,
          "currentSession.sessionId": input.sessionId,
          status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] },
        }).session(session),
        Wallet.findOne({ userId: customerId }).select("points").session(session),
        PricingTier.find({ isActive: true }).session(session),
      ]);
      if (!user || !table?.currentSession) {
        throw Object.assign(new Error("Không tìm thấy phiên bàn đang hoạt động"), {
          httpCode: 404,
        });
      }
      if (!sessionBelongsToCustomer(table.currentSession, user)) {
        throw Object.assign(new Error("Phiên chơi không thuộc tài khoản này"), { httpCode: 403 });
      }
      if (
        table.currentSession.checkoutState !== undefined &&
        table.currentSession.checkoutState !== "open"
      ) {
        throw Object.assign(new Error("Phiên bàn đang có yêu cầu thanh toán"), { httpCode: 409 });
      }
      const wasPlaying = !table.currentSession.isPaused;
      if (wasPlaying) {
        table.currentSession.isPaused = true;
        table.currentSession.pausedAt = Date.now();
      }
      const quote = this.customerQuote(table, wallet?.points ?? 0, pricingTiers);
      let voucherDiscountAmount = 0;
      if (voucherCode) {
        voucherDiscountAmount = (
          await new VoucherService().validate(
            voucherCode,
            quote.subtotal - quote.membershipDiscountAmount,
          )
        ).discountAmount;
      }
      const totalDue = Math.max(
        0,
        quote.subtotal - quote.membershipDiscountAmount - voucherDiscountAmount - quote.deposit,
      );
      table.currentSession.checkoutState = "pending_payment";
      table.currentSession.pendingCheckout = {
        customerId: new mongoose.Types.ObjectId(customerId),
        paymentMethod: input.paymentMethod as "cash" | "transfer",
        voucherCode,
        estimatedTotalDue: totalDue,
        wasPlaying,
        membershipTierKey: quote.tier.key,
        membershipTierName: quote.tier.name,
        tableDiscountPercent: quote.tier.tableDiscountPercent,
        fnbDiscountPercent: quote.tier.fnbDiscountPercent,
        membershipDiscountAmount: quote.membershipDiscountAmount,
        voucherDiscountAmount,
        requestedAt: new Date(),
      };
      await table.save({ session });
      return {
        customerId,
        tableName: table.name,
        tableCode: table.code,
        paymentMethod: input.paymentMethod,
        totalDue,
        voucherCode,
        requestedAt: table.currentSession.pendingCheckout.requestedAt,
      };
    });
    emitTableStatusChanged({ tableId, status: TableStatus.PLAYING });
    await notifications
      .createForRoles(
        {
          title: `Yêu cầu thanh toán tại ${request.tableName}`,
          content: `${request.tableCode}: khách yêu cầu thanh toán ${request.totalDue.toLocaleString("vi-VN")}đ bằng ${request.paymentMethod === "cash" ? "tiền mặt" : "chuyển khoản"}.`,
          type: NotificationType.SYSTEM,
        },
        [UserRole.ADMIN, UserRole.STAFF, UserRole.CASHIER],
      )
      .catch((error) => console.error("Không thể gửi thông báo yêu cầu thanh toán:", error));
    return { status: "pending_payment", ...request };
  }

  async getCustomerPaymentRequests() {
    const tables = await Table.find({
      "currentSession.checkoutState": "pending_payment",
      "currentSession.pendingCheckout": { $exists: true },
    }).select("code name status currentSession");
    return Promise.all(
      tables.map(async (table) => {
        const pending = table.currentSession!.pendingCheckout!;
        const customer = await User.findById(pending.customerId).select("name phone");
        return {
          tableId: String(table._id),
          tableCode: table.code,
          tableName: table.name,
          sessionId: table.currentSession!.sessionId,
          customerName: customer?.name ?? table.currentSession!.customerName,
          customerPhone: customer?.phone ?? table.currentSession!.customerPhone,
          paymentMethod: pending.paymentMethod,
          voucherCode: pending.voucherCode,
          requestedAt: pending.requestedAt,
          totalDue: pending.estimatedTotalDue,
        };
      }),
    );
  }

  async resolveCustomerPaymentRequest(tableId: string, sessionId: string, approved: boolean) {
    if (!mongoose.isValidObjectId(tableId) || typeof sessionId !== "string" || !sessionId) {
      throw new Error("Mã yêu cầu thanh toán không hợp lệ");
    }
    const table = await Table.findOne({
      _id: tableId,
      "currentSession.sessionId": sessionId,
      "currentSession.checkoutState": "pending_payment",
      "currentSession.pendingCheckout": { $exists: true },
    }).select("name currentSession");
    if (!table?.currentSession?.pendingCheckout) {
      throw Object.assign(new Error("Yêu cầu thanh toán đã được xử lý hoặc không còn tồn tại"), {
        httpCode: 409,
      });
    }
    const pending = table.currentSession.pendingCheckout;
    if (approved) {
      const receipt = await this.checkout(tableId, {
        sessionId,
        paymentMethod: pending.paymentMethod,
        customerId: String(pending.customerId),
        customerCheckout: true,
        customerCheckoutRequest: true,
        voucherCode: pending.voucherCode,
        discountPercent: 0,
      });
      await notifications
        .createForUser(String(pending.customerId), {
          title: "Thanh toán hóa đơn thành công",
          content: `Nhân viên đã xác nhận thanh toán bàn ${receipt.tableCode}.`,
          type: NotificationType.SYSTEM,
        })
        .catch((error) => console.error("Không thể gửi thông báo hoàn tất thanh toán:", error));
      return { status: "paid", receipt };
    }

    await mongoose.connection.transaction(async (session) => {
      const current = await Table.findOne({
        _id: tableId,
        "currentSession.sessionId": sessionId,
        "currentSession.checkoutState": "pending_payment",
      }).session(session);
      if (!current?.currentSession) {
        throw Object.assign(new Error("Yêu cầu thanh toán đã được xử lý"), { httpCode: 409 });
      }
      const pending = current.currentSession.pendingCheckout;
      current.currentSession.checkoutState = "open";
      if (pending?.wasPlaying) {
        current.currentSession.totalPausedMs +=
          Date.now() - (current.currentSession.pausedAt ?? Date.now());
        current.currentSession.isPaused = false;
        current.currentSession.pausedAt = undefined;
      }
      current.currentSession.pendingCheckout = undefined;
      await current.save({ session });
    });
    emitTableStatusChanged({ tableId, status: table.status });
    await notifications
      .createForUser(String(pending.customerId), {
        title: "Yêu cầu thanh toán chưa được xác nhận",
        content: `Nhân viên chưa xác nhận thanh toán bàn ${table.name}. Bạn có thể tiếp tục sử dụng bàn và gửi yêu cầu mới.`,
        type: NotificationType.SYSTEM,
      })
      .catch((error) => console.error("Không thể gửi thông báo từ chối thanh toán:", error));
    return { status: "rejected" };
  }

  private customerQuote(table: any, points: number, pricingTiers: IPricingTier[]) {
    const current = table.currentSession as TableSession;
    const playing = calculateSplitPlayingDetails(current, table, pricingTiers);
    const fnbTotal = current.orders.reduce((sum, item) => {
      if (item.status === "cancelled" || item.quantity <= 0) return sum;
      return sum + item.price * item.quantity;
    }, 0);
    const subtotal = playing.cost + fnbTotal;
    const { tier } = getMemberTier(points);
    const membershipDiscountAmount =
      Math.round((playing.cost * tier.tableDiscountPercent) / 100) +
      Math.round((fnbTotal * tier.fnbDiscountPercent) / 100);
    const effectiveNow = current.isPaused && current.pausedAt ? current.pausedAt : Date.now();
    return {
      sessionId: current.sessionId,
      minutes: playing.minutes,
      formattedTime: playing.formattedTime,
      elapsedSeconds: Math.floor(
        Math.max(0, effectiveNow - current.startedAt - (current.totalPausedMs || 0)) / 1000,
      ),
      playingCost: playing.cost,
      fnbTotal,
      orders: current.orders,
      subtotal,
      deposit: current.deposit,
      tier: {
        key: tier.key,
        name: tier.name,
        tableDiscountPercent: tier.tableDiscountPercent,
        fnbDiscountPercent: tier.fnbDiscountPercent,
      },
      membershipDiscountAmount,
      voucherCode: undefined as string | undefined,
      voucherDiscountAmount: 0,
      discountAmount: membershipDiscountAmount,
      totalDue: Math.max(0, subtotal - membershipDiscountAmount - current.deposit),
    };
  }

  async checkout(tableId: string, input: any) {
    const validPaymentMethods = [
      "cash",
      "transfer",
      "vnpay",
      "card",
      "member_balance",
      "wallet",
      "split",
      "cash_qr",
    ];
    if (
      typeof input.sessionId !== "string" ||
      !validPaymentMethods.includes(input.paymentMethod) ||
      (input.paymentMethod === "member_balance" &&
        (typeof input.customerPhone !== "string" || !input.customerPhone.trim()) &&
        input.customerCheckout !== true) ||
      (input.customerCheckout === true &&
        (!mongoose.isValidObjectId(input.customerId) || input.discountPercent !== 0)) ||
      typeof input.discountPercent !== "number" ||
      !Number.isFinite(input.discountPercent) ||
      input.discountPercent < 0 ||
      input.discountPercent > 100 ||
      (input.voucherCode !== undefined &&
        (typeof input.voucherCode !== "string" ||
          !input.voucherCode.trim() ||
          input.discountPercent !== 0))
    ) {
      throw new Error("Phương thức thanh toán không hợp lệ; giảm giá phải từ 0 đến 100%");
    }
    const result = await mongoose.connection.transaction(async (session) => {
      const previous = await Invoice.findOne({ sessionId: input.sessionId, tableId }).session(
        session,
      );
      if (previous) {
        if (
          input.customerCheckout === true &&
          String(previous.receipt.memberId) !== String(input.customerId)
        ) {
          throw Object.assign(new Error("Hóa đơn không thuộc tài khoản này"), { httpCode: 403 });
        }
        return { receipt: previous.receipt };
      }
      const table = await Table.findOne({
        _id: tableId,
        "currentSession.sessionId": input.sessionId,
        status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] },
      }).session(session);
      if (!table?.currentSession) throw new Error("Phiên chơi đã thay đổi, vui lòng tải lại");
      const current = table.currentSession;
      let customerPhone: string | undefined;
      if (input.customerCheckout === true) {
        const customer = await User.findOne({
          _id: input.customerId,
          role: UserRole.CUSTOMER,
          isActive: true,
          isLocked: false,
        })
          .select("_id phone")
          .session(session);
        if (
          !customer ||
          !sessionBelongsToCustomer(current, customer)
        ) {
          throw Object.assign(new Error("Phiên chơi không thuộc tài khoản này"), { httpCode: 403 });
        }
        customerPhone = customer.phone;
      }
      if (
        input.customerCheckoutRequest === true &&
        (current.checkoutState !== "pending_payment" ||
          String(current.pendingCheckout?.customerId) !== String(input.customerId))
      ) {
        throw Object.assign(new Error("Phiên bàn đang chờ nhân viên xác nhận thanh toán"), {
          httpCode: 409,
        });
      }
      if (
        current.checkoutState === "checkout" ||
        (current.checkoutState === "pending_payment" &&
          (input.customerCheckoutRequest !== true ||
            !current.pendingCheckout ||
            String(current.pendingCheckout.customerId) !== String(input.customerId)))
      ) {
        throw Object.assign(new Error("Phiên bàn đang được thanh toán"), { httpCode: 409 });
      }
      if (
        input.customerCheckout === true &&
        (await CustomerOrder.exists({
          sessionId: current.sessionId,
          status: CustomerOrderStatus.PENDING,
        }).session(session))
      ) {
        throw Object.assign(
          new Error("Vui lòng chờ quầy xác nhận các món đang gọi trước khi thanh toán"),
          { httpCode: 409 },
        );
      }
      const pricingTiers = await PricingTier.find({ isActive: true }).session(session);
      const { minutes, cost, formattedTime, timeSlots } = calculateSplitPlayingDetails(
        current,
        table,
        pricingTiers,
      );
      const fnbTotal = current.orders.reduce((sum, item) => {
      if (item.status === "cancelled" || item.quantity <= 0) return sum;
      return sum + item.price * item.quantity;
    }, 0);
      const subtotal = cost + fnbTotal;
      const membershipTier = input.customerCheckout
        ? input.customerCheckoutRequest === true
          ? MEMBER_TIERS.find((tier) => tier.key === current.pendingCheckout?.membershipTierKey)
          : getMemberTier(
              (await Wallet.findOne({ userId: input.customerId }).select("points").session(session))
                ?.points ?? 0,
            ).tier
        : undefined;
      if (input.customerCheckoutRequest === true && !membershipTier) {
        throw Object.assign(new Error("Không tìm thấy hạng hội viên đã lưu cho yêu cầu này"), {
          httpCode: 409,
        });
      }
      const membershipDiscountAmount = membershipTier
        ? Math.round((cost * membershipTier.tableDiscountPercent) / 100) +
          Math.round((fnbTotal * membershipTier.fnbDiscountPercent) / 100)
        : 0;
      const voucherSubtotal = subtotal - membershipDiscountAmount;
      const voucherService = new VoucherService();
      const invoiceCode = `HD-${randomUUID()}`;
      const voucher = input.voucherCode
        ? await voucherService.redeem(
            input.voucherCode,
            voucherSubtotal,
            {
              sessionId: current.sessionId,
              invoiceCode,
              tableId: table._id,
              customerName: current.customerName,
            },
            session,
          )
        : undefined;
      const voucherDiscountAmount = voucher?.discountAmount ?? 0;
      const discountAmount =
        membershipDiscountAmount +
        (voucher
          ? voucher.discountAmount
          : Math.round((voucherSubtotal * input.discountPercent) / 100));
      const finalAmount = Math.max(0, subtotal - discountAmount - current.deposit);

      // Xử lý thanh toán kết hợp (Tiền mặt + Chuyển khoản QR)
      if (input.paymentMethod === "split" || input.paymentMethod === "cash_qr") {
        const cashAmount = Number(input.paymentDetails?.cashAmount) || 0;
        const transferAmount = Number(input.paymentDetails?.transferAmount) || 0;
        if (cashAmount + transferAmount < finalAmount) {
          throw new Error(
            `Tổng tiền thanh toán kết hợp không đủ (${(cashAmount + transferAmount).toLocaleString("vi-VN")}đ < ${finalAmount.toLocaleString("vi-VN")}đ)`,
          );
        }
      }

      // Xử lý thanh toán ví hoặc tích điểm hội viên
      const checkoutPhone =
        typeof input.customerPhone === "string" && input.customerPhone.trim()
          ? input.customerPhone.trim()
          : current.customerPhone;
      const memberPayment =
        input.paymentMethod === "member_balance" || input.paymentMethod === "wallet"
          ? await this.walletService.chargeForCheckout(
              checkoutPhone,
              finalAmount,
              invoiceCode,
              session,
            )
          : await this.walletService.awardCheckoutPoints(checkoutPhone, finalAmount, session);
      const earnedPoints = memberPayment?.pointsAwarded ?? 0;

      const receipt = {
        tableName: table.name,
        tableCode: table.code,
        typeName: table.type,
        customerName: current.customerName,
        customerPhone: memberPayment?.phone ?? checkoutPhone,
        memberId: memberPayment?.memberId,
        sessionStart: current.sessionStart,
        sessionEnd: new Date().toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        durationFormatted: formattedTime,
        durationMinutes: minutes,
        pricePerHour: current.pricePerHour,
        playingCost: cost,
        carriedCost: current.carriedCost || 0,
        transfers: current.transfers || [],
        timeSlots: timeSlots || [],
        orders: current.orders,
        fnbTotal,
        subtotal,
        discountPercent: voucher || membershipTier ? 0 : input.discountPercent,
        voucherCode: voucher?.code,
        membershipTier: membershipTier?.name,
        membershipDiscountAmount,
        voucherDiscountAmount,
        discountAmount,
        deposit: current.deposit,
        finalAmount,
        paymentStatus: "paid",
        pointsAwarded: memberPayment?.pointsAwarded ?? 0,
        refundAmount: Math.max(0, current.deposit - (subtotal - discountAmount)),
        paymentMethod: input.paymentMethod || "cash",
        paymentDetails: input.paymentDetails,
        earnedPoints,
        invoiceCode,
        checkoutTime: new Date().toISOString(),
      };
      await Invoice.create(
        [{ sessionId: current.sessionId, tableId: table._id, status: "paid", receipt }],
        {
          session,
        },
      );
      table.currentSession = undefined;
      table.status = table.bookedInfo ? TableStatus.BOOKED : TableStatus.AVAILABLE;
      await table.save({ session });
      return { receipt, nextStatus: table.status, updatedTable: table };
    });
    if (result.nextStatus) {
      emitTableStatusChanged({
        tableId,
        status: result.nextStatus,
        table: result.updatedTable,
      });
    }
    return result.receipt;
  }
}
