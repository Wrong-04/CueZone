import type { ClubBankInfo } from "../services/tournament.service";

export function getSepayQrUrl(bank: ClubBankInfo, amount: number, tableCode: string) {
  const qr = new URL("https://vietqr.app/img");
  for (const [key, value] of Object.entries({
    acc: bank.accountNumber,
    bank: bank.bankCode,
    amount: String(amount),
    des: `CueZone ${tableCode}`,
    template: bank.qrTemplate,
  })) {
    qr.searchParams.set(key, value);
  }
  return qr.toString();
}
