import { timingSafeEqual } from "crypto";

export const paymentError = (message: string, httpCode = 400) => Object.assign(new Error(message), { httpCode });

export function sepayConfig() {
  const { SEPAY_WEBHOOK_KEY: key, SEPAY_BANK_CODE: bankCode, SEPAY_ACCOUNT_NUMBER: accountNumber, SEPAY_ACCOUNT_NAME: accountName } = process.env;
  if (!key || key.length < 24 || !bankCode || !/^[A-Za-z0-9]+$/.test(bankCode) || !accountNumber || !/^[A-Za-z0-9]+$/.test(accountNumber) || !accountName?.trim()) {
    throw paymentError("Chuyển khoản SePay chưa được cấu hình đầy đủ. Vui lòng liên hệ nhân viên CLB.", 503);
  }
  return { key, bankCode, accountNumber, accountName: accountName.trim() };
}

export function refundContact() {
  const url = process.env.SEPAY_ZALO_URL || "";
  return /^https:\/\/zalo\.me\/[A-Za-z0-9]+$/.test(url) ? url : null;
}

export function verifySepayAuthorization(header: string | undefined) {
  const expected = Buffer.from(`Apikey ${sepayConfig().key}`);
  const supplied = Buffer.from(header || "");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw paymentError("Xác thực SePay không hợp lệ", 401);
}

export function bankDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) throw paymentError("Thời gian giao dịch ngân hàng không hợp lệ");
  const date = new Date(value.replace(" ", "T") + "+07:00");
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 19).replace("T", " ") !== value || date.getTime() > Date.now() + 60000) throw paymentError("Thời gian giao dịch ngân hàng không hợp lệ");
  return date;
}

export function sepayReceipt(body: any) {
  if (!body || typeof body !== "object" || !/^[1-9]\d{0,29}$/.test(String(body.id)) || (typeof body.id === "number" && !Number.isSafeInteger(body.id)) || !["in", "out"].includes(body.transferType)) throw paymentError("Dữ liệu giao dịch SePay không hợp lệ");
  const config = sepayConfig();
  if (body.accountNumber !== config.accountNumber || body.subAccount) throw paymentError("Tài khoản nhận SePay không khớp cấu hình");
  if (!Number.isSafeInteger(body.transferAmount) || body.transferAmount <= 0) throw paymentError("Số tiền SePay phải là số nguyên VND dương");
  const bankPaidAt = bankDate(body.transactionDate);
  const text = `${typeof body.code === "string" ? body.code : ""} ${typeof body.content === "string" ? body.content : ""}`.toUpperCase();
  const references = [...new Set(Array.from(text.matchAll(/(?:^|[^A-Z0-9])(CZ[A-F0-9]{24})(?![A-Z0-9])/g), match => match[1]))];
  if (references.length > 1) throw paymentError("Giao dịch có nhiều mã thanh toán, cần đối soát riêng");
  return { providerId: String(body.id), reference: references[0], accountNumber: body.accountNumber, amount: body.transferAmount, bankPaidAt, incoming: body.transferType === "in" };
}

export function comparePayments(a: { bankPaidAt: Date; providerId: string }, b: { bankPaidAt: Date; providerId: string }) {
  return a.bankPaidAt.getTime() - b.bankPaidAt.getTime() || a.providerId.length - b.providerId.length || a.providerId.localeCompare(b.providerId);
}

export function confirmedPlayer(player: any, fee: number) {
  return player.registrationStatus !== "cancelled" && (player.feePaid === true || (fee === 0 && player.registrationStatus === "confirmed"));
}
