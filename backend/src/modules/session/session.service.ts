import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { Table, TableStatus, TableSession } from "../table/table.model";
import { Booking } from "../booking/booking.model";
import { Invoice } from "../invoice/invoice.model";
import { PricingTier, IPricingTier } from "../pricing/pricing.model";
import { emitTableStatusChanged, emitTableTimerStarted } from "../../utils/socketHolder";

export interface SplitTimeSlot {
  tierName: string;
  startTime: string;
  endTime: string;
  minutes: number;
  pricePerHour: number;
  cost: number;
}

export function getCurrentTierPrice(
  table: { code?: string; area?: string; pricePerHour: number },
  pricingTiers: IPricingTier[] = [],
  now = Date.now()
): { price: number; tierName: string } {
  if (!pricingTiers || pricingTiers.length === 0) {
    return { price: table.pricePerHour, tierName: "Biểu giá tiêu chuẩn" };
  }
  const date = new Date(now);
  const vnTimeStr = date.toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour12: false, hour: "2-digit", minute: "2-digit" });
  const [hStr, mStr] = vnTimeStr.split(":");
  const currentMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
  const vnDateStr = date.toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const dayOfWeek = new Date(vnDateStr).getDay();

  const isVip = Boolean(table.code?.startsWith("VIP") || table.area?.toLowerCase().includes("vip"));
  const isMatch = Boolean(table.code?.startsWith("MTCH") || table.area?.toLowerCase().includes("thi đấu"));

  let matchedTier: IPricingTier | undefined;
  for (const tier of pricingTiers) {
    if (tier.isActive === false) continue;
    if (tier.daysOfWeek && tier.daysOfWeek.length > 0 && !tier.daysOfWeek.includes(dayOfWeek)) continue;
    
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
    else if (isMatch) price = matchedTier.prices.match || Math.round(matchedTier.prices.standard * 1.5 / 1000) * 1000;
    else price = matchedTier.prices.standard;
    return { price, tierName: matchedTier.name };
  }
  return { price: table.pricePerHour, tierName: "Biểu giá tiêu chuẩn" };
}

export function calculateSplitPlayingDetails(
  session: TableSession,
  table: { code?: string; area?: string; pricePerHour: number },
  pricingTiers: IPricingTier[] = [],
  now = Date.now()
) {
  const effectiveNow = session.isPaused && session.pausedAt ? session.pausedAt : now;
  const elapsed = Math.max(0, effectiveNow - session.startedAt - (session.totalPausedMs || 0));
  const totalMinutes = Math.max(1, Math.round(elapsed / 60000));

  const hours = Math.floor(elapsed / 3600000);
  const mins = Math.floor((elapsed % 3600000) / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const formattedTime = [hours, mins, secs].map(n => String(n).padStart(2, "0")).join(":");

  if (!pricingTiers || pricingTiers.length === 0) {
    const rate = session.pricePerHour ?? table.pricePerHour;
    const cost = Math.round(totalMinutes * rate / 60) + (session.carriedCost || 0);
    return {
      minutes: totalMinutes,
      cost,
      formattedTime,
      timeSlots: [
        {
          tierName: "Biểu giá tiêu chuẩn",
          startTime: session.sessionStart || new Date(session.startedAt).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }),
          endTime: new Date(effectiveNow).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }),
          minutes: totalMinutes,
          pricePerHour: rate,
          cost: Math.round(totalMinutes * rate / 60),
        },
      ],
    };
  }

  const isVip = Boolean(table.code?.startsWith("VIP") || table.area?.toLowerCase().includes("vip"));
  const isMatch = Boolean(table.code?.startsWith("MTCH") || table.area?.toLowerCase().includes("thi đấu"));

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
    const minuteTimestamp = session.startedAt + (totalMinutes > 1 ? Math.round(m * (effectiveNow - session.startedAt) / totalMinutes) : 0);
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
      else if (isMatch) tierPrice = matchedTier.prices.match || Math.round(matchedTier.prices.standard * 1.5 / 1000) * 1000;
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
      currentSlot.cost = Math.round((currentSlot.minutes * currentSlot.pricePerHour / 60) / 1000) * 1000;
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
    currentSlot.cost = Math.round((currentSlot.minutes * currentSlot.pricePerHour / 60) / 1000) * 1000;
    const endVnDate = new Date(effectiveNow + VN_OFFSET_MS);
    currentSlot.endTime = formatHM(endVnDate.getUTCHours() * 60 + endVnDate.getUTCMinutes());
    slots.push(currentSlot);
  }

  const rawCost = slots.reduce((sum, s) => sum + s.cost, 0);
  const cost = rawCost + (session.carriedCost || 0);

  return { minutes: totalMinutes, cost, formattedTime, timeSlots: slots };
}

export function playingDetails(session: TableSession, now = Date.now(), table?: any, pricingTiers: IPricingTier[] = []) {
  if (table && pricingTiers && pricingTiers.length > 0) {
    return calculateSplitPlayingDetails(session, table, pricingTiers, now);
  }
  const elapsed = Math.max(0, (session.isPaused ? session.pausedAt! : now) - session.startedAt - session.totalPausedMs);
  const minutes = Math.max(1, Math.round(elapsed / 60000));
  return {
    minutes,
    cost: Math.round(minutes * session.pricePerHour / 60) + session.carriedCost,
    formattedTime: [Math.floor(elapsed / 3600000), Math.floor(elapsed / 60000) % 60, Math.floor(elapsed / 1000) % 60].map(n => String(n).padStart(2, "0")).join(":"),
    timeSlots: [] as SplitTimeSlot[],
  };
}

export class SessionService {
  async open(tableId: string, input: any) {
    if ((input.customerName !== undefined && (typeof input.customerName !== "string" || input.customerName.length > 120)) ||
        (input.customerPhone !== undefined && (typeof input.customerPhone !== "string" || input.customerPhone.length > 30)) ||
        (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 1000))) {
      throw new Error("Thông tin khách hàng không hợp lệ");
    }
    const result = await mongoose.connection.transaction(async (session) => {
      const table = await Table.findOne({ _id: tableId, isActive: true,
        status: { $in: [TableStatus.AVAILABLE, TableStatus.BOOKED] }, currentSession: { $exists: false } }).session(session);
      if (!table) throw new Error("Bàn không còn sẵn sàng để mở");
      let deposit = 0;
      let name = input.customerName?.trim() || "Khách vãng lai";
      let phone = input.customerPhone?.trim();
      if (table.status === TableStatus.BOOKED) {
        if (!table.bookedInfo || input.bookingId !== table.bookedInfo.bookingId) throw new Error("Lịch đặt bàn đã thay đổi, vui lòng tải lại");
        const booking = await Booking.findOne({ _id: table.bookedInfo.bookingId, status: "approved" }).session(session);
        if (!booking) throw new Error("Không tìm thấy lịch đặt bàn hợp lệ");
        booking.status = "checked_in";
        deposit = booking.deposit;
        name = booking.customerName;
        phone = booking.phone;
        await booking.save({ session });
      } else if (input.bookingId) {
        throw new Error("Lịch đặt bàn đã thay đổi, vui lòng tải lại");
      }
      const now = Date.now();
      const pricingTiers = await PricingTier.find({ isActive: true }).session(session);
      const { price: currentRate } = getCurrentTierPrice(table, pricingTiers, now);
      table.currentSession = { sessionId: randomUUID(), sessionStart: new Date(now).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }),
        startedAt: now, pricePerHour: currentRate, isPaused: false, totalPausedMs: 0, carriedCost: 0,
        customerName: name, customerPhone: phone, isMember: false, orders: [], note: input.note, deposit };
      table.bookedInfo = undefined;
      table.status = TableStatus.PLAYING;
      await table.save({ session });
      return table;
    });
    emitTableStatusChanged({ tableId: String(result._id), status: result.status, table: result });
    emitTableTimerStarted({ tableId: String(result._id), sessionId: result.currentSession?.sessionId, table: result });
    return result;
  }

  async pause(tableId: string, input: any) {
    if (typeof input.sessionId !== "string" || typeof input.paused !== "boolean") throw new Error("Yêu cầu tạm dừng không hợp lệ");
    const result = await mongoose.connection.transaction(async (session) => {
      const table = await Table.findOne({ _id: tableId, "currentSession.sessionId": input.sessionId,
        status: input.paused ? TableStatus.PLAYING : TableStatus.PAUSED }).session(session);
      if (!table?.currentSession) throw new Error("Phiên chơi đã thay đổi, vui lòng tải lại");
      const current = table.currentSession;
      if (input.paused) current.pausedAt = Date.now();
      else { current.totalPausedMs += Date.now() - current.pausedAt!; current.pausedAt = undefined; }
      current.isPaused = input.paused;
      table.status = input.paused ? TableStatus.PAUSED : TableStatus.PLAYING;
      await table.save({ session });
      return table;
    });
    emitTableStatusChanged({ tableId: String(result._id), status: result.status, table: result });
    return result;
  }

  async move(tableId: string, input: any) {
    if (!["transfer", "merge"].includes(input.action) || !mongoose.isValidObjectId(input.targetTableId) ||
        input.targetTableId === tableId || typeof input.sessionId !== "string") throw new Error("Bàn đích không hợp lệ");
    const result = await mongoose.connection.transaction(async (session) => {
      const source = await Table.findOne({ _id: tableId, "currentSession.sessionId": input.sessionId,
        status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] } }).session(session);
      const target = await Table.findOne({ _id: input.targetTableId, isActive: true }).session(session);
      if (!source?.currentSession || !target) throw new Error("Phiên chơi đã thay đổi");
      if (input.action === "transfer") {
        if (target.status !== TableStatus.AVAILABLE || target.currentSession) throw new Error("Bàn đích không còn trống");
        // Preserve the session's agreed hourly rate when moving tables.
        target.currentSession = source.currentSession;
        target.status = source.status;
      } else {
        if (!target.currentSession || ![TableStatus.PLAYING, TableStatus.PAUSED].includes(target.status)) throw new Error("Bàn đích chưa có phiên chơi");
        target.currentSession.carriedCost += playingDetails(source.currentSession).cost;
        target.currentSession.deposit += source.currentSession.deposit;
        target.currentSession.orders.push(...source.currentSession.orders);
      }
      source.currentSession = undefined;
      source.status = TableStatus.AVAILABLE;
      await source.save({ session });
      await target.save({ session });
      return { target, source };
    });
    emitTableStatusChanged({ tableId: String(result.target._id), status: result.target.status, table: result.target });
    emitTableStatusChanged({ tableId: String(result.source._id), status: result.source.status, table: result.source });
    return result.target;
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
      table.currentSession.orders = input.orders;
      await table.save({ session });
      return table;
    });
    emitTableStatusChanged({ tableId: String(result._id), status: result.status, table: result });
    return result;
  }

  async checkout(tableId: string, input: any) {
    const validPaymentMethods = ["cash", "transfer", "vnpay", "card"];
    if (typeof input.sessionId !== "string" || !validPaymentMethods.includes(input.paymentMethod) ||
        typeof input.discountPercent !== "number" || !Number.isFinite(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100) {
      throw new Error("Phương thức thanh toán không hợp lệ; giảm giá phải từ 0 đến 100%");
    }
    const result = await mongoose.connection.transaction(async (session) => {
      const previous = await Invoice.findOne({ sessionId: input.sessionId, tableId }).session(session);
      if (previous) return previous.receipt;
      const table = await Table.findOne({ _id: tableId, "currentSession.sessionId": input.sessionId,
        status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] } }).session(session);
      if (!table?.currentSession) throw new Error("Phiên chơi đã thay đổi, vui lòng tải lại");
      const current = table.currentSession;
      const pricingTiers = await PricingTier.find({ isActive: true }).session(session);
      const { minutes, cost, formattedTime, timeSlots } = calculateSplitPlayingDetails(current, table, pricingTiers);
      const fnbTotal = current.orders.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const subtotal = cost + fnbTotal;
      const discountAmount = Math.round(subtotal * input.discountPercent / 100);
      const finalAmount = Math.max(0, subtotal - discountAmount - current.deposit);
      const receipt = { tableName: table.name, typeName: table.type, customerName: current.customerName,
        customerPhone: current.customerPhone, sessionStart: current.sessionStart,
        sessionEnd: new Date().toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }), durationFormatted: formattedTime,
        durationMinutes: minutes, pricePerHour: current.pricePerHour, playingCost: cost, timeSlots: timeSlots || [], orders: current.orders,
        fnbTotal, subtotal, discountPercent: input.discountPercent, discountAmount, deposit: current.deposit,
        finalAmount, refundAmount: Math.max(0, current.deposit - (subtotal - discountAmount)), paymentMethod: input.paymentMethod || "cash", invoiceCode: `HD-${randomUUID()}`,
        checkoutTime: new Date().toISOString() };
      await Invoice.create([{ sessionId: current.sessionId, tableId: table._id, receipt }], { session });
      table.currentSession = undefined;
      table.status = TableStatus.AVAILABLE;
      await table.save({ session });
      return receipt;
    });
    emitTableStatusChanged({ tableId, status: TableStatus.AVAILABLE });
    return result;
  }
}
