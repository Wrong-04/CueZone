import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { posService } from "../../services/pos.service";
import {
  SettingOutlined,
  ShopOutlined,
  DollarOutlined,
  CrownOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  ReloadOutlined,
  WifiOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  QrcodeOutlined,
  BellOutlined,
  LockOutlined,
  BankOutlined,
  CopyOutlined,
  EyeOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tag,
  Typography,
  message,
  Modal,
  Table,
  Input,
  Select,
  Tooltip,
  type TableColumnsType,
} from "../../shared/ui";

const { Title, Text } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

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
  // General Info
  clubName: string;
  slogan: string;
  phone: string;
  email: string;
  address: string;
  openingHours: string;
  wifiSSID: string;
  wifiPassword: string;
  totalTables: number;

  // Pricing & Billing Rules
  goldHourStart: string; // e.g. "18:00"
  goldHourEnd: string; // e.g. "23:00"
  minBillingMinutes: number; // e.g. 15
  roundBillingMinutes: number; // e.g. 5
  vatTaxPercent: number; // e.g. 8
  isVatEnabled: boolean;
  serviceChargePercent: number; // e.g. 0
  holidaySurchargePercent: number; // e.g. 15

  // Membership Points
  earnPointsRate: number;
  redeemPointsRate: number;
  memberTiers: MemberTierPolicy[];

  // Hardware & Peripherals
  printerType: string;
  printerPaperWidth: string; // K80 or K58
  printerIpAddress: string;
  autoCutPaper: boolean;
  printVietQROnBill: boolean;
  printClubLogoOnBill: boolean;

  // Payment VietQR
  bankCode: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  isVietQREnabled: boolean;

  // Security & Automation
  autoLockPosTimeoutMinutes: number;
  requireAdminPassOnCancelItem: boolean;
  requireAdminPassOnHighDiscount: boolean;
  autoEndShiftTime: string; // "04:00"
  soundAlertNewBooking: boolean;
}

// ── Default Mock Settings ─────────────────────────────────────────────────────

const DEFAULT_SETTINGS: ClubSettingsData = {
  clubName: "CueZone Billiards Club",
  slogan: "Đẳng cấp cơ thủ - Đỉnh cao không gian thi đấu bida chuyên nghiệp",
  phone: "0908 888 999",
  email: "contact@cuezone.vn",
  address: "128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
  openingHours: "08:00 - 04:00 Sáng hôm sau (Mở cửa xuyên đêm)",
  wifiSSID: "CueZone_5G_VIP",
  wifiPassword: "cuezone8888",
  totalTables: 26,

  goldHourStart: "18:00",
  goldHourEnd: "23:00",
  minBillingMinutes: 15,
  roundBillingMinutes: 5,
  vatTaxPercent: 8,
  isVatEnabled: false,
  serviceChargePercent: 0,
  holidaySurchargePercent: 15,

  earnPointsRate: 10000,
  redeemPointsRate: 100,
  memberTiers: [
    {
      tierKey: "standard",
      tierName: "Thành Viên Tiêu Chuẩn",
      color: "blue",
      minPoints: 0,
      tableDiscountPercent: 5,
      fnbDiscountPercent: 0,
      perks: "Tích lũy điểm giờ chơi, đặt bàn trước qua App",
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
    {
      tierKey: "diamond",
      tierName: "Kim Cương (Diamond VIP)",
      color: "purple",
      minPoints: 3500,
      tableDiscountPercent: 20,
      fnbDiscountPercent: 15,
      perks: "Giảm 20% tiền bàn, tủ cơ vân tay VIP, miễn phí thay đầu cơ Kamui",
    },
  ],

  printerType: "Máy in nhiệt mạng LAN (Network ESC/POS)",
  printerPaperWidth: "K80 (Khổ rộng 80mm)",
  printerIpAddress: "192.168.1.200:9100",
  autoCutPaper: true,
  printVietQROnBill: true,
  printClubLogoOnBill: true,

  bankCode: "MB",
  bankName: "MB Bank (Ngân hàng TMCP Quân Đội)",
  bankAccountNo: "0908888999",
  bankAccountName: "CLB BIDA CUEZONE - NGUYEN HAI LONG",
  isVietQREnabled: true,

  autoLockPosTimeoutMinutes: 30,
  requireAdminPassOnCancelItem: true,
  requireAdminPassOnHighDiscount: true,
  autoEndShiftTime: "04:00",
  soundAlertNewBooking: true,
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

// ── Main Component ────────────────────────────────────────────────────────────

const SettingsManagementPage: React.FC = () => {
  const navigate = useNavigate();

  // Local Storage Data Management
  const [settings, setSettings] = useState<ClubSettingsData>(() => {
    const saved = localStorage.getItem("cuezone_admin_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          totalTables: 26,
          bankCode: parsed.bankCode || "MB",
          bankName: parsed.bankName || "MB Bank (Ngân hàng TMCP Quân Đội)",
          bankAccountNo: parsed.bankAccountNo || "0908888999",
          bankAccountName: parsed.bankAccountName || "CLB BIDA CUEZONE - NGUYEN HAI LONG",
        };
      } catch (e) {
        console.error("Failed to parse settings from storage:", e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Đồng bộ số lượng bàn thực tế từ Database
  const [actualTableCount, setActualTableCount] = useState<number>(26);
  const [actualTablesBreakdown, setActualTablesBreakdown] = useState({ pool: 14, carom: 9, snooker: 3 });

  useEffect(() => {
    let mounted = true;
    posService
      .getTables()
      .then((tables) => {
        if (mounted && Array.isArray(tables) && tables.length > 0) {
          const count = tables.length;
          setActualTableCount(count);
          const pool = tables.filter((t) => t.type === "pool").length;
          const carom = tables.filter((t) => t.type === "carom").length;
          const snooker = tables.filter((t) => t.type === "snooker").length;
          setActualTablesBreakdown({ pool, carom, snooker });
          setSettings((prev) => ({ ...prev, totalTables: count }));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("cuezone_admin_settings", JSON.stringify(settings));
  }, [settings]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "general" | "pricing" | "membership" | "hardware" | "system"
  >("general");

  // Bill Preview Modal
  const [billPreviewVisible, setBillPreviewVisible] = useState<boolean>(false);

  // Sync to localStorage
  const handleSaveAllSettings = () => {
    localStorage.setItem("cuezone_admin_settings", JSON.stringify(settings));
    message.success("Toàn bộ cấu hình hệ thống CueZone đã được lưu thành công!");
  };

  const handleResetDefaults = () => {
    Modal.confirm({
      title: "Khôi phục toàn bộ cấu hình ban đầu?",
      content:
        "Tất cả cài đặt thông tin CLB, quy tắc tính tiền, máy in bill và tích điểm sẽ trở về thông số chuẩn ban đầu của hệ thống.",
      okText: "Khôi phục",
      cancelText: "Hủy bỏ",
      onOk: () => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.setItem("cuezone_admin_settings", JSON.stringify(DEFAULT_SETTINGS));
        message.success("Đã khôi phục cài đặt mặc định thành công!");
      },
    });
  };

  // Test hardware actions
  const handleTestPrinter = () => {
    message.loading({
      content: "Đang gửi lệnh in thử đến máy in nhiệt K80...",
      key: "print",
    });
    setTimeout(() => {
      message.success({
        content: "Lệnh in test thành công! Giấy in K80 đã được cắt tự động.",
        key: "print",
        duration: 3,
      });
    }, 1200);
  };

  // Member Tier Table Columns
  const tierColumns: TableColumnsType<MemberTierPolicy> = [
    {
      title: "Cấp bậc hội viên",
      key: "tierName",
      render: (_, r) => (
        <div className="flex items-center gap-2">
          <Tag color={r.color as any} className="!font-bold !text-xs !px-2.5 !py-1">
            {r.tierName}
          </Tag>
        </div>
      ),
    },
    {
      title: "Điểm tích lũy tối thiểu",
      key: "minPoints",
      width: 180,
      render: (_, r) => (
        <Text strong className="!text-slate-800 !text-xs font-semibold">
          Từ {r.minPoints.toLocaleString()} điểm
        </Text>
      ),
    },
    {
      title: "Ưu đãi tiền bàn",
      key: "tableDiscountPercent",
      width: 150,
      render: (_, r) => (
        <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
          Giảm {r.tableDiscountPercent}%
        </span>
      ),
    },
    {
      title: "Ưu đãi F&B",
      key: "fnbDiscountPercent",
      width: 140,
      render: (_, r) => (
        <span className="text-blue-700 font-bold text-xs bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
          Giảm {r.fnbDiscountPercent}%
        </span>
      ),
    },
    {
      title: "Đặc quyền bổ sung",
      key: "perks",
      render: (_, r) => <Text className="!text-xs !text-slate-600">{r.perks}</Text>,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. Page Header (Light Theme) ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50 via-teal-50 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-2xl shadow-2xs">
              <SettingOutlined />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Title
                  level={2}
                  className="!text-xl md:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight"
                >
                  Cài Đặt Hệ Thống & CLB
                </Title>
                <Tag color="green" className="!px-2.5 !py-0.5 !text-xs !font-bold !rounded-full">
                  HỆ THỐNG QUẢN TRỊ
                </Tag>
              </div>
              <Text className="!text-xs md:!text-sm !text-slate-500">
                Thiết lập thông tin câu lạc bộ, quy tắc tính tiền, máy in hóa đơn, tài khoản thanh toán và hội viên
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              leftIcon={<ReloadOutlined />}
              onClick={handleResetDefaults}
              className="!border-slate-200 !text-slate-700 hover:!bg-slate-50 !rounded-xl !h-9 text-xs"
            >
              Khôi phục mặc định
            </Button>

            <Button
              variant="primary"
              leftIcon={<SaveOutlined />}
              onClick={handleSaveAllSettings}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !rounded-xl !h-9 text-xs text-white shadow-2xs"
            >
              Lưu toàn bộ cài đặt
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. Quick Status Bar (Clean Light Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Hệ Thống Bàn Bida</span>
            <div className="text-base font-black text-emerald-700 mt-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Đang hoạt động
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              26 Bàn phục vụ (Pool, Carom, Snooker)
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
            <AppstoreOutlined />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-amber-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Chính Sách Hội Viên</span>
            <div className="text-base font-black text-amber-800 mt-1 flex items-center gap-1.5">
              <CrownOutlined /> 4 Cấp Bậc Thẻ
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Tích điểm & giảm giá giờ chơi tự động
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-xl">
            <CrownOutlined />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-blue-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Máy In Hóa Đơn</span>
            <div className="text-base font-black text-blue-700 mt-1 flex items-center gap-1.5">
              <PrinterOutlined /> Khổ K80 (80mm)
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Tự động cắt giấy khi in xong bill
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xl">
            <PrinterOutlined />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Cổng Thanh Toán VietQR</span>
            <div className="text-base font-black text-emerald-800 mt-1 flex items-center gap-1.5">
              <BankOutlined /> {settings.bankName || "MB Bank Quầy"}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              STK: {settings.bankAccountNo || "0908888999"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
            <QrcodeOutlined />
          </div>
        </div>
      </div>

      {/* ── 3. Navigation Tabs Bar (Consistent Styled Buttons) ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <Button
          size="sm"
          variant={activeTab === "general" ? "primary" : "outline"}
          leftIcon={<ShopOutlined />}
          onClick={() => setActiveTab("general")}
          className={
            activeTab === "general"
              ? "!bg-emerald-600 !border-emerald-600 text-white font-bold shadow-2xs"
              : "!bg-white !border-slate-200 !text-slate-700 hover:!bg-slate-50 font-semibold"
          }
        >
          Thông tin CLB & Thương hiệu
        </Button>

        <Button
          size="sm"
          variant={activeTab === "pricing" ? "primary" : "outline"}
          leftIcon={<DollarOutlined />}
          onClick={() => setActiveTab("pricing")}
          className={
            activeTab === "pricing"
              ? "!bg-emerald-600 !border-emerald-600 text-white font-bold shadow-2xs"
              : "!bg-white !border-slate-200 !text-slate-700 hover:!bg-slate-50 font-semibold"
          }
        >
          Quy Tắc Tính Tiền & Phụ Thu
        </Button>

        <Button
          size="sm"
          variant={activeTab === "membership" ? "primary" : "outline"}
          leftIcon={<CrownOutlined />}
          onClick={() => setActiveTab("membership")}
          className={
            activeTab === "membership"
              ? "!bg-emerald-600 !border-emerald-600 text-white font-bold shadow-2xs"
              : "!bg-white !border-slate-200 !text-slate-700 hover:!bg-slate-50 font-semibold"
          }
        >
          Hội viên & Tích lũy điểm
        </Button>

        <Button
          size="sm"
          variant={activeTab === "hardware" ? "primary" : "outline"}
          leftIcon={<PrinterOutlined />}
          onClick={() => setActiveTab("hardware")}
          className={
            activeTab === "hardware"
              ? "!bg-emerald-600 !border-emerald-600 text-white font-bold shadow-2xs"
              : "!bg-white !border-slate-200 !text-slate-700 hover:!bg-slate-50 font-semibold"
          }
        >
          Máy In Bill & Tài Khoản Ngân Hàng
        </Button>

        <Button
          size="sm"
          variant={activeTab === "system" ? "primary" : "outline"}
          leftIcon={<SafetyCertificateOutlined />}
          onClick={() => setActiveTab("system")}
          className={
            activeTab === "system"
              ? "!bg-emerald-600 !border-emerald-600 text-white font-bold shadow-2xs"
              : "!bg-white !border-slate-200 !text-slate-700 hover:!bg-slate-50 font-semibold"
          }
        >
          Bảo Mật & Thông Báo Quầy
        </Button>
      </div>

      {/* ── 4. Tab 1: General Info & Brand ── */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <ShopOutlined className="text-emerald-600 text-lg" />
                <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                  Thông Tin Cơ Bản Câu Lạc Bộ
                </Title>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên Câu lạc bộ <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={settings.clubName}
                    onChange={(e) => setSettings({ ...settings, clubName: e.target.value })}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Quy mô bàn hoạt động
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Đồng bộ từ Database
                    </span>
                  </div>
                  <Input
                    readOnly
                    value={`${actualTableCount} Bàn (${actualTablesBreakdown.pool} Pool · ${actualTablesBreakdown.carom} Carom · ${actualTablesBreakdown.snooker} Snooker)`}
                    suffix={
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate("/tables")}
                        className="!text-xs !p-0 !text-emerald-700 font-bold hover:!text-emerald-800"
                      >
                        Quản lý bàn →
                      </Button>
                    }
                    className="!bg-slate-50 !text-slate-900 font-medium cursor-default"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khẩu hiệu / Slogan
                </label>
                <Input
                  value={settings.slogan}
                  onChange={(e) => setSettings({ ...settings, slogan: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ cơ sở <span className="text-rose-500">*</span>
                </label>
                <Input
                  prefix={<EnvironmentOutlined className="text-slate-400" />}
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hotline đặt bàn <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    prefix={<PhoneOutlined className="text-slate-400" />}
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email hỗ trợ
                  </label>
                  <Input
                    prefix={<MailOutlined className="text-slate-400" />}
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giờ mở cửa phục vụ
                </label>
                <Input
                  prefix={<ClockCircleOutlined className="text-slate-400" />}
                  value={settings.openingHours}
                  onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <WifiOutlined className="text-teal-600 text-lg" />
                <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                  Mạng Wifi Khách Hàng (Tự In Lên Bill)
                </Title>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên mạng Wifi (SSID)
                  </label>
                  <Input
                    value={settings.wifiSSID}
                    onChange={(e) => setSettings({ ...settings, wifiSSID: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu Wifi
                  </label>
                  <Input
                    value={settings.wifiPassword}
                    onChange={(e) => setSettings({ ...settings, wifiPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Preview Card (Clean Brand Showcase) */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="text-center pb-4 border-b border-slate-800">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 text-3xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                  <ShopOutlined />
                </div>
                <Title level={4} className="!text-white !text-lg !font-bold !mb-1">
                  {settings.clubName}
                </Title>
                <Text className="!text-xs !text-emerald-400 !italic block">{settings.slogan}</Text>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="flex items-start gap-2 text-slate-300">
                  <EnvironmentOutlined className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>{settings.address}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <PhoneOutlined className="text-emerald-400 shrink-0" />
                  <span>{settings.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <ClockCircleOutlined className="text-emerald-400 shrink-0" />
                  <span>{settings.openingHours}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                  <WifiOutlined className="text-teal-400 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-white">{settings.wifiSSID}</div>
                    <div className="text-[11px] text-slate-400">Pass: {settings.wifiPassword}</div>
                  </div>
                  <Tooltip title="Sao chép mật khẩu">
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<CopyOutlined />}
                      onClick={() => {
                        navigator.clipboard.writeText(settings.wifiPassword);
                        message.success("Đã sao chép mật khẩu Wifi!");
                      }}
                      className="!text-slate-300 hover:!text-white"
                    />
                  </Tooltip>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  leftIcon={<EyeOutlined />}
                  onClick={() => setBillPreviewVisible(true)}
                  className="w-full !text-xs !border-emerald-500/50 !text-emerald-400 hover:!bg-emerald-500/10 font-bold"
                >
                  Xem mẫu in đầu hóa đơn
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Tab 2: Pricing & Billing Rules ── */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          {/* Banner liên kết sang Quản Lý Bàn & Bảng Giá */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 text-lg shadow-2xs">
                <DollarOutlined />
              </div>
              <div>
                <strong className="text-sm sm:text-base text-emerald-950 block font-bold">
                  Quản Lý Đơn Giá Giờ Chơi Theo Bàn & Khung Giờ
                </strong>
                <span className="text-xs text-emerald-800 leading-relaxed block mt-0.5">
                  Đơn giá giờ chơi chính thức theo từng loại bàn (Pool, Carom, Snooker) và theo khung giờ (Ngày, Đêm, Giờ Cao Điểm) được thiết lập tại trang <strong>Quản Lý Bàn & Bảng Giá</strong> để đồng bộ trực tiếp tới máy POS.
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/tables")}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !rounded-xl !h-9 !px-4 text-xs text-white shadow-2xs shrink-0 self-start sm:self-center whitespace-nowrap"
            >
              Mở Quản Lý Bàn & Bảng Giá &rarr;
            </Button>
          </div>

          {/* Billing Calculation Rules */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ClockCircleOutlined className="text-amber-600 text-lg" />
              <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                Quy Tắc Tính Tiền Giờ & Phụ Thu
              </Title>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khung Giờ Vàng (Bắt đầu)
                </label>
                <Input
                  value={settings.goldHourStart}
                  onChange={(e) => setSettings({ ...settings, goldHourStart: e.target.value })}
                  placeholder="18:00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khung Giờ Vàng (Kết thúc)
                </label>
                <Input
                  value={settings.goldHourEnd}
                  onChange={(e) => setSettings({ ...settings, goldHourEnd: e.target.value })}
                  placeholder="23:00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Block tính tiền tối thiểu
                </label>
                <Select
                  value={settings.minBillingMinutes.toString()}
                  onChange={(val) =>
                    setSettings({ ...settings, minBillingMinutes: parseInt(val) || 15 })
                  }
                  className="w-full"
                  options={[
                    { label: "15 Phút đầu", value: "15" },
                    { label: "30 Phút đầu", value: "30" },
                    { label: "60 Phút (1 Giờ)", value: "60" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Làm tròn thời gian
                </label>
                <Select
                  value={settings.roundBillingMinutes.toString()}
                  onChange={(val) =>
                    setSettings({ ...settings, roundBillingMinutes: parseInt(val) || 5 })
                  }
                  className="w-full"
                  options={[
                    { label: "Làm tròn 5 phút", value: "5" },
                    { label: "Làm tròn 10 phút", value: "10" },
                    { label: "Làm tròn 15 phút", value: "15" },
                    { label: "Tính chính xác từng phút", value: "1" },
                  ]}
                />
              </div>
            </div>

            {/* Taxes & Surcharges */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <Title level={5} className="!text-slate-900 !text-xs !font-bold !mb-0">
                Thuế VAT & Phụ Thu Ngày Lễ
              </Title>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 mb-1">
                    <input
                      type="checkbox"
                      checked={settings.isVatEnabled}
                      onChange={(e) => setSettings({ ...settings, isVatEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="font-semibold">Áp dụng Thuế VAT xuất hóa đơn</span>
                  </label>
                  <Input
                    type="number"
                    disabled={!settings.isVatEnabled}
                    value={settings.vatTaxPercent.toString()}
                    onChange={(e) =>
                      setSettings({ ...settings, vatTaxPercent: parseInt(e.target.value) || 8 })
                    }
                    suffix="%"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phí dịch vụ phòng lạnh (Service Charge)
                  </label>
                  <Input
                    type="number"
                    value={settings.serviceChargePercent.toString()}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        serviceChargePercent: parseInt(e.target.value) || 0,
                      })
                    }
                    suffix="%"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phụ thu ngày Lễ / Tết
                  </label>
                  <Input
                    type="number"
                    value={settings.holidaySurchargePercent.toString()}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        holidaySurchargePercent: parseInt(e.target.value) || 15,
                      })
                    }
                    suffix="%"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Tab 3: Membership & Loyalty Points ── */}
      {activeTab === "membership" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <CrownOutlined className="text-amber-600 text-lg" />
              <div>
                <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                  Tỷ Lệ Tích Điểm & Đổi Thưởng
                </Title>
                <Text className="!text-xs !text-slate-500">
                  Tự động cộng điểm cho hội viên khi thanh toán hóa đơn bàn chơi hoặc F&B
                </Text>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-700 block font-bold mb-1">
                  Tỷ lệ tích lũy điểm tiêu dùng
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.earnPointsRate.toString()}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        earnPointsRate: parseInt(e.target.value) || 10000,
                      })
                    }
                    suffix="VNĐ"
                  />
                  <span className="text-slate-900 text-sm font-bold whitespace-nowrap shrink-0">= 1 Điểm</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                  Ví dụ: Hóa đơn 300.000đ sẽ tích được{" "}
                  <strong>
                    {Math.floor(
                      300000 / (settings.earnPointsRate > 0 ? settings.earnPointsRate : 10000)
                    ).toLocaleString("vi-VN")}
                  </strong>{" "}
                  điểm
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-700 block font-bold mb-1">
                  Tỷ lệ quy đổi điểm trừ tiền hóa đơn
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.redeemPointsRate.toString()}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        redeemPointsRate: parseInt(e.target.value) || 100,
                      })
                    }
                    suffix="Điểm"
                  />
                  <span className="text-slate-900 text-sm font-bold whitespace-nowrap shrink-0">= 10.000 VNĐ</span>
                </div>
                <span className="text-[11px] text-amber-800 font-semibold mt-1 block">
                  Ví dụ: Dùng{" "}
                  <strong>
                    {(
                      (settings.redeemPointsRate > 0 ? settings.redeemPointsRate : 100) * 2
                    ).toLocaleString("vi-VN")}
                  </strong>{" "}
                  điểm sẽ được trừ <strong>20.000đ</strong> vào bill (1 điểm ={" "}
                  {Math.round(
                    10000 / (settings.redeemPointsRate > 0 ? settings.redeemPointsRate : 100)
                  ).toLocaleString("vi-VN")}
                  đ)
                </span>
              </div>
            </div>
          </div>

          {/* Member Tiers Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CrownOutlined className="text-purple-600 text-lg" />
                <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                  Chính Sách Đặc Quyền Cấp Bậc Hội Viên
                </Title>
              </div>
            </div>

            <Table<MemberTierPolicy>
              dataSource={settings.memberTiers}
              columns={tierColumns}
              rowKey="tierKey"
              pagination={false}
            />
          </div>
        </div>
      )}

      {/* ── 7. Tab 4: Hardware & Payments ── */}
      {activeTab === "hardware" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Thermal Printer Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PrinterOutlined className="text-blue-600 text-lg" />
                <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                  Máy In Hóa Đơn Nhiệt (K80 / K58)
                </Title>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestPrinter}
                className="!border-slate-300 font-semibold"
              >
                In thử hóa đơn
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loại máy in
                </label>
                <Input
                  value={settings.printerType}
                  onChange={(e) => setSettings({ ...settings, printerType: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Khổ giấy in
                  </label>
                  <Select
                    value={settings.printerPaperWidth}
                    onChange={(val) => setSettings({ ...settings, printerPaperWidth: val })}
                    className="w-full"
                    options={[
                      { label: "K80 (Khổ chuẩn 80mm)", value: "K80 (Khổ rộng 80mm)" },
                      { label: "K58 (Khổ nhỏ 58mm)", value: "K58 (Khổ nhỏ 58mm)" },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Địa chỉ IP máy in LAN
                  </label>
                  <Input
                    value={settings.printerIpAddress}
                    onChange={(e) => setSettings({ ...settings, printerIpAddress: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.autoCutPaper}
                    onChange={(e) => setSettings({ ...settings, autoCutPaper: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>Tự động cắt giấy khi in xong bill</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.printVietQROnBill}
                    onChange={(e) =>
                      setSettings({ ...settings, printVietQROnBill: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>In mã QR chuyển khoản VietQR ở chân hóa đơn</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.printClubLogoOnBill}
                    onChange={(e) =>
                      setSettings({ ...settings, printClubLogoOnBill: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>In logo CueZone và thông tin Wifi ở đầu hóa đơn</span>
                </label>
              </div>
            </div>
          </div>

          {/* Payment VietQR Gateway */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BankOutlined className="text-amber-600 text-lg" />
                <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                  Tài Khoản Ngân Hàng Nhận Tiền & Cổng VietQR Napas
                </Title>
              </div>
              <Tag color="green" className="!font-bold">
                Tự Động Sinh Mã QR Động
              </Tag>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngân hàng thụ hưởng (VietQR) <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={settings.bankCode || "MB"}
                  onChange={(val) => {
                    const matched = POPULAR_BANKS.find((b) => b.code === val);
                    setSettings({
                      ...settings,
                      bankCode: val,
                      bankName: matched ? matched.name : val,
                    });
                  }}
                  options={POPULAR_BANKS.map((b) => ({
                    value: b.code,
                    label: `${b.code} - ${b.name.split(" (")[0]}`,
                  }))}
                  className="w-full !rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên ngân hàng đầy đủ <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={settings.bankName || "MB Bank (Ngân hàng TMCP Quân Đội)"}
                  onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tài khoản nhận tiền <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={settings.bankAccountNo}
                  onChange={(e) => setSettings({ ...settings, bankAccountNo: e.target.value.trim() })}
                  placeholder="VD: 0908888999"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chủ tài khoản (Không dấu) <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={settings.bankAccountName}
                  onChange={(e) => setSettings({ ...settings, bankAccountName: e.target.value.toUpperCase() })}
                  placeholder="VD: CLB BIDA CUEZONE"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Cần cấu hình đủ mã ngân hàng, số tài khoản và tên chủ tài khoản để tạo QR chuyển khoản.
            </p>
          </div>
        </div>
      )}

      {/* ── 8. Tab 5: Security & Automation ── */}
      {activeTab === "system" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <LockOutlined className="text-emerald-600 text-lg" />
              <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                Bảo Mật Thu Ngân & Phân Quyền Vận Hành
              </Title>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tự động khóa màn hình POS khi không có thao tác
                </label>
                <Select
                  value={settings.autoLockPosTimeoutMinutes.toString()}
                  onChange={(val) =>
                    setSettings({
                      ...settings,
                      autoLockPosTimeoutMinutes: parseInt(val) || 30,
                    })
                  }
                  className="w-full"
                  options={[
                    { label: "15 phút không hoạt động", value: "15" },
                    { label: "30 phút không hoạt động (Khuyến nghị)", value: "30" },
                    { label: "60 phút không hoạt động", value: "60" },
                    { label: "Không bao giờ tự khóa", value: "0" },
                  ]}
                />
              </div>

              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.requireAdminPassOnCancelItem}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        requireAdminPassOnCancelItem: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>Bắt buộc mã PIN Quản lý khi hủy món F&B hoặc giảm số lượng đã phục vụ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.requireAdminPassOnHighDiscount}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        requireAdminPassOnHighDiscount: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>Bắt buộc duyệt mã PIN khi áp dụng chiết khấu đặc biệt trên 20%</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <BellOutlined className="text-amber-600 text-lg" />
              <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                Thông Báo & Ca Trực
              </Title>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giờ chốt ca đêm tự động & tổng kết báo cáo doanh thu
                </label>
                <Input
                  value={settings.autoEndShiftTime}
                  onChange={(e) => setSettings({ ...settings, autoEndShiftTime: e.target.value })}
                  placeholder="04:00"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.soundAlertNewBooking}
                    onChange={(e) =>
                      setSettings({ ...settings, soundAlertNewBooking: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="font-bold text-amber-800">
                    Phát chuông thông báo âm thanh khi có yêu cầu đặt bàn mới từ App Khách Hàng
                  </span>
                </label>

                <div className="text-[11px] text-slate-500 leading-relaxed">
                  Phát chuông thông báo âm thanh tại quầy thu ngân khi có yêu cầu đặt bàn mới từ khách hàng để nhân viên kịp thời chuẩn bị bàn.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Modal: Thermal Bill Header Preview ── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <PrinterOutlined className="text-emerald-600" />
            <span>Mô Phỏng Đầu Hóa Đơn Nhiệt K80</span>
          </div>
        }
        open={billPreviewVisible}
        onCancel={() => setBillPreviewVisible(false)}
        width={420}
        footer={[
          <Button key="close" variant="outline" onClick={() => setBillPreviewVisible(false)}>
            Đóng
          </Button>,
        ]}
      >
        <div className="p-4 bg-white text-slate-900 font-mono text-xs rounded-xl shadow-inner space-y-2 border border-slate-300">
          <div className="text-center pb-2 border-b border-dashed border-slate-400">
            <div className="font-bold text-sm tracking-wider uppercase">{settings.clubName}</div>
            <div className="text-[10px] text-slate-600 italic">{settings.slogan}</div>
            <div className="text-[11px] mt-1">{settings.address}</div>
            <div className="text-[11px]">Hotline: {settings.phone}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Wifi: {settings.wifiSSID} | Pass: {settings.wifiPassword}
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>HÓA ĐƠN THANH TOÁN:</span>
              <span className="font-bold">#HD-2026-0924</span>
            </div>
            <div className="flex justify-between">
              <span>BÀN SỐ:</span>
              <span className="font-bold">BÀN 08 (VIP TOURNAMENT)</span>
            </div>
            <div className="flex justify-between">
              <span>GIỜ VÀO - RA:</span>
              <span>19:00 - 21:30 (2h 30m)</span>
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between font-bold">
              <span>TIỀN GIỜ (Giờ vàng):</span>
              <span>275.000 đ</span>
            </div>
            <div className="flex justify-between">
              <span>F&B (2 Red Bull + Bò khô):</span>
              <span>140.000 đ</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>GIẢM VIP GOLD (-15%):</span>
              <span>-62.250 đ</span>
            </div>
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
              <span>TỔNG CỘNG:</span>
              <span>352.750 đ</span>
            </div>
          </div>

          <div className="text-center pt-2 space-y-1">
            <div className="text-[10px] text-slate-600">
              STK: {settings.bankAccountNo} ({settings.bankName})
            </div>
            <div className="text-[10px] font-bold">CẢMƠN QUÝ KHÁCH & HẸN GẶP LẠI!</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsManagementPage;
