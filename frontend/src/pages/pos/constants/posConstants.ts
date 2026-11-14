export const AREA_LABELS: Record<string, string> = {
  standard: "Khu Phổ Thông",
  vip: "Khu VIP",
  match: "Khu Thi Đấu",
};

export const getAreaLabel = (areaKey?: string): string => {
  if (!areaKey) return "Phổ Thông";
  const key = areaKey.toLowerCase().trim();
  return AREA_LABELS[key] || areaKey;
};

export const TABLE_TYPE_LABELS: Record<string, string> = {
  pool: "Bida Lỗ (Pool)",
  carom: "Bida Phăng / Carom",
  snooker: "Bida Snooker",
};

export const getTypeLabel = (typeKey?: string): string => {
  if (!typeKey) return "Bàn";
  const key = typeKey.toLowerCase().trim();
  return TABLE_TYPE_LABELS[key] || typeKey;
};

export const DEFAULT_CANCEL_REASONS = [
  "Khách đổi ý / Chưa dùng",
  "Khách đổi sang món khác",
  "Pha nhầm / Bưng nhầm bàn",
  "Món lỗi / Hỏng / Đổ vỡ",
  "Quán hết món / Thiếu đồ",
  "Quán ngừng kinh doanh món này",
  "Khác",
];


export interface ClubPaymentSettings {
  clubName: string;
  address: string;
  hotline: string;
  bankCode: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  wifiSSID?: string;
  wifiPassword?: string;
  printVietQROnBill?: boolean;
  printClubLogoOnBill?: boolean;
}

export const getClubPaymentSettings = (): ClubPaymentSettings => {
  try {
    const saved = localStorage.getItem("cuezone_admin_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        clubName: parsed.clubName || "CueZone Billiards Club",
        address: parsed.address || "128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
        hotline: parsed.hotline || parsed.phone || "0908 888 999",
        bankCode: parsed.bankCode || "TPB",
        bankName: parsed.bankName || "TPBank (Ngân hàng TMCP Tiên Phong)",
        bankAccountNo: parsed.bankAccountNo || "0975685609",
        bankAccountName: parsed.bankAccountName || "NGUYEN QUANG HUY",
        wifiSSID: parsed.wifiSSID || "CueZone_5G_VIP",
        wifiPassword: parsed.wifiPassword || "cuezone8888",
        printVietQROnBill: parsed.printVietQROnBill ?? true,
        printClubLogoOnBill: parsed.printClubLogoOnBill ?? true,
      };
    }
  } catch {
    // fallback
  }
  return {
    clubName: "CueZone Billiards Club",
    address: "128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
    hotline: "0908 888 999",
    bankCode: "TPB",
    bankName: "TPBank (Ngân hàng TMCP Tiên Phong)",
    bankAccountNo: "0975685609",
    bankAccountName: "NGUYEN QUANG HUY",
    wifiSSID: "CueZone_5G_VIP",
    wifiPassword: "cuezone8888",
    printVietQROnBill: true,
    printClubLogoOnBill: true,
  };
};
