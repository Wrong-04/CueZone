import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { Table, TableStatus, TableSession } from "../table/table.model";
import { Booking } from "../booking/booking.model";
import { Invoice } from "../invoice/invoice.model";

export function playingDetails(session: TableSession, now = Date.now()) {
  const elapsed = Math.max(0, (session.isPaused ? session.pausedAt! : now) - session.startedAt - session.totalPausedMs);
  const minutes = Math.max(1, Math.round(elapsed / 60000));
  return { minutes, cost: Math.round(minutes * session.pricePerHour / 60) + session.carriedCost,
    formattedTime: [Math.floor(elapsed / 3600000), Math.floor(elapsed / 60000) % 60, Math.floor(elapsed / 1000) % 60].map(n => String(n).padStart(2, "0")).join(":") };
}

export class SessionService {
  async open(tableId: string, input: any) {
    if ((input.customerName !== undefined && (typeof input.customerName !== "string" || input.customerName.length > 120)) ||
        (input.customerPhone !== undefined && (typeof input.customerPhone !== "string" || input.customerPhone.length > 30)) ||
        (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 1000))) {
      throw new Error("Thông tin khách hàng không hợp lệ");
    }
    return mongoose.connection.transaction(async (session) => {
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
      table.currentSession = { sessionId: randomUUID(), sessionStart: new Date(now).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }),
        startedAt: now, pricePerHour: table.pricePerHour, isPaused: false, totalPausedMs: 0, carriedCost: 0,
        customerName: name, customerPhone: phone, isMember: false, orders: [], note: input.note, deposit };
      table.bookedInfo = undefined;
      table.status = TableStatus.PLAYING;
      await table.save({ session });
      return table;
    });
  }

  async pause(tableId: string, input: any) {
    if (typeof input.sessionId !== "string" || typeof input.paused !== "boolean") throw new Error("Yêu cầu tạm dừng không hợp lệ");
    return mongoose.connection.transaction(async (session) => {
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
  }

  async move(tableId: string, input: any) {
    if (!["transfer", "merge"].includes(input.action) || !mongoose.isValidObjectId(input.targetTableId) ||
        input.targetTableId === tableId || typeof input.sessionId !== "string") throw new Error("Bàn đích không hợp lệ");
    return mongoose.connection.transaction(async (session) => {
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
      return target;
    });
  }

  async checkout(tableId: string, input: any) {
    if (typeof input.sessionId !== "string" || input.paymentMethod !== "cash" ||
        typeof input.discountPercent !== "number" || !Number.isFinite(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100) {
      throw new Error("Chỉ hỗ trợ thu tiền mặt; giảm giá phải từ 0 đến 100%");
    }
    return mongoose.connection.transaction(async (session) => {
      const previous = await Invoice.findOne({ sessionId: input.sessionId, tableId }).session(session);
      if (previous) return previous.receipt;
      const table = await Table.findOne({ _id: tableId, "currentSession.sessionId": input.sessionId,
        status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] } }).session(session);
      if (!table?.currentSession) throw new Error("Phiên chơi đã thay đổi, vui lòng tải lại");
      const current = table.currentSession;
      const { minutes, cost, formattedTime } = playingDetails(current);
      const fnbTotal = current.orders.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const subtotal = cost + fnbTotal;
      const discountAmount = Math.round(subtotal * input.discountPercent / 100);
      const finalAmount = Math.max(0, subtotal - discountAmount - current.deposit);
      const receipt = { tableName: table.name, typeName: table.type, customerName: current.customerName,
        customerPhone: current.customerPhone, sessionStart: current.sessionStart,
        sessionEnd: new Date().toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }), durationFormatted: formattedTime,
        durationMinutes: minutes, pricePerHour: current.pricePerHour, playingCost: cost, orders: current.orders,
        fnbTotal, subtotal, discountPercent: input.discountPercent, discountAmount, deposit: current.deposit,
        finalAmount, refundAmount: Math.max(0, current.deposit - (subtotal - discountAmount)), paymentMethod: "cash", invoiceCode: `HD-${randomUUID()}`,
        checkoutTime: new Date().toISOString() };
      await Invoice.create([{ sessionId: current.sessionId, tableId: table._id, receipt }], { session });
      table.currentSession = undefined;
      table.status = TableStatus.AVAILABLE;
      await table.save({ session });
      return receipt;
    });
  }
}
