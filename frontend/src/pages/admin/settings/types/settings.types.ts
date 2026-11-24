export interface MemberTierPolicy {
  tierKey: string;
  tierName: string;
  color: string;
  minPoints: number;
  tableDiscountPercent: number;
  fnbDiscountPercent: number;
  perks: string;
}

export interface ClubSettingsData {
  // 1. Thông tin CLB & Cơ sở
  clubName: string;
  slogan: string;
  phone: string;
  email: string;
  address: string;
  openingHours: string;
  wifiSSID: string;
  wifiPassword: string;
  totalTables: number;

  // 2. Cổng Thanh Toán VietQR & Tùy chọn In Bill
  bankCode: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  isVietQREnabled: boolean;
  printVietQROnBill: boolean;
  printClubLogoOnBill: boolean;

  // 3. Chính Sách Hội Viên & Điểm Thưởng
  earnPointsRate: number;
  memberTiers: MemberTierPolicy[];
}

export const SETTINGS_STORAGE_KEY = "cuezone_admin_settings";

export const DEFAULT_SETTINGS: ClubSettingsData = {
  clubName: "CueZone Billiards Club",
  slogan: "Đẳng cấp cơ thủ - Đỉnh cao không gian thi đấu bida chuyên nghiệp",
  phone: "0908 888 999",
  email: "contact@cuezone.vn",
  address: "128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
  openingHours: "08:00 - 04:00 Sáng hôm sau (Mở cửa xuyên đêm)",
  wifiSSID: "CueZone_5G_VIP",
  wifiPassword: "cuezone8888",
  totalTables: 0,

  bankCode: "",
  bankName: "",
  bankAccountNo: "",
  bankAccountName: "",
  isVietQREnabled: true,
  printVietQROnBill: true,
  printClubLogoOnBill: true,

  earnPointsRate: 10000,
  memberTiers: [
    {
      tierKey: "bronze",
      tierName: "Hội Viên Đồng (Bronze)",
      color: "orange",
      minPoints: 0,
      tableDiscountPercent: 5,
      fnbDiscountPercent: 0,
      perks: "Tích lũy điểm từ hóa đơn chơi, đặt bàn trước qua App",
    },
    {
      tierKey: "silver",
      tierName: "Hội Viên Bạc (Silver)",
      color: "cyan",
      minPoints: 500,
      tableDiscountPercent: 10,
      fnbDiscountPercent: 5,
      perks: "Giảm 10% tiền bàn, giảm 5% menu F&B, quà tặng sinh nhật",
    },
    {
      tierKey: "gold",
      tierName: "Hội Viên Vàng (Gold)",
      color: "gold",
      minPoints: 1500,
      tableDiscountPercent: 15,
      fnbDiscountPercent: 10,
      perks: "Giảm 15% tiền bàn, ưu tiên giữ bàn giờ cao điểm, tủ để cơ riêng",
    },
  ],
};

export const POPULAR_BANKS = [
  { code: "MB", name: "MB Bank (Ngân hàng TMCP Quân Đội)" },
  { code: "VCB", name: "Vietcombank (Ngân hàng TMCP Ngoại thương VN)" },
  { code: "TCB", name: "Techcombank (Ngân hàng TMCP Kỹ Thương)" },
  { code: "BIDV", name: "BIDV (Ngân hàng TMCP Đầu tư & Phát triển VN)" },
  { code: "CTG", name: "VietinBank (Ngân hàng TMCP Công Thương VN)" },
  { code: "ACB", name: "ACB (Ngân hàng TMCP Á Châu)" },
  { code: "VPB", name: "VPBank (Ngân hàng TMCP Việt Nam Thịnh Vượng)" },
  { code: "TPB", name: "TPBank (Ngân hàng TMCP Tiên Phong)" },
  { code: "STB", name: "Sacombank (Ngân hàng TMCP Sài Gòn Thương Tín)" },
  { code: "HDB", name: "HDBank (Ngân hàng TMCP Phát triển TP.HCM)" },
];
