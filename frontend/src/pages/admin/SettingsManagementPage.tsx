import React, { useState, useEffect } from "react";
import {
  SettingOutlined,
  ShopOutlined,
  DollarOutlined,
  CrownOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  WifiOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  QrcodeOutlined,
  BellOutlined,
  LockOutlined,
  BulbOutlined,
  BankOutlined,
  CopyOutlined,
  EyeOutlined,
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

export interface TablePricingRule {
  id: string;
  tableType: string;
  tableTypeName: string;
  regularHourRate: number; // VNĐ/h
  goldHourRate: number; // VNĐ/h
  description: string;
}

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
  pricingRules: TablePricingRule[];

  // Membership Points
  earnPointsRate: number; // 10,000đ = 1 pt
  redeemPointsRate: number; // 100 pt = 10,000đ
  memberTiers: MemberTierPolicy[];

  // Hardware & Peripherals
  printerType: string;
  printerPaperWidth: string; // K80 or K58
  printerIpAddress: string;
  autoCutPaper: boolean;
  printVietQROnBill: boolean;
  printClubLogoOnBill: boolean;

  // Smart Relay Table Lighting
  isRelayConnected: boolean;
  relayProtocol: string;
  relayControllerIp: string;
  autoTurnOnLightOnOpen: boolean;
  autoTurnOffDelayMinutes: number;

  // Payment VietQR
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
  totalTables: 20,

  goldHourStart: "18:00",
  goldHourEnd: "23:00",
  minBillingMinutes: 15,
  roundBillingMinutes: 5,
  vatTaxPercent: 8,
  isVatEnabled: false,
  serviceChargePercent: 0,
  holidaySurchargePercent: 15,
  pricingRules: [
    {
      id: "pr-1",
      tableType: "standard",
      tableTypeName: "Bàn Pool Tiêu Chuẩn (9ft)",
      regularHourRate: 50000,
      goldHourRate: 70000,
      description: "Bàn thi đấu lỗ phổ thông, bi Dynasphere tiêu chuẩn",
    },
    {
      id: "pr-2",
      tableType: "vip",
      tableTypeName: "Bàn VIP Tournament (Nỉ Simonis 860)",
      regularHourRate: 80000,
      goldHourRate: 110000,
      description: "Nỉ Iwan Simonis 860 Bỉ, bi Aramith Pro TV Cup, đèn LED chống chói",
    },
    {
      id: "pr-3",
      tableType: "match_var",
      tableTypeName: "Bàn Match 13 - 14 (Có Camera VAR)",
      regularHourRate: 100000,
      goldHourRate: 140000,
      description: "Sảnh trung tâm truyền hình trực tiếp, camera VAR phân giải 4K",
    },
    {
      id: "pr-4",
      tableType: "carom_3c",
      tableTypeName: "Bàn Carom 3 Băng (Sưởi Nhiệt Điện)",
      regularHourRate: 70000,
      goldHourRate: 90000,
      description: "Mặt đá sưởi ấm điện trở tự động, băng cao su Artemis chuẩn quốc tế",
    },
  ],

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

  isRelayConnected: true,
  relayProtocol: "Modbus TCP / RS485 Gateway",
  relayControllerIp: "192.168.1.150:502",
  autoTurnOnLightOnOpen: true,
  autoTurnOffDelayMinutes: 2,

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

// ── Main Component ────────────────────────────────────────────────────────────

const SettingsManagementPage: React.FC = () => {
  // Local Storage Data Management
  const [settings, setSettings] = useState<ClubSettingsData>(() => {
    const saved = localStorage.getItem("cuezone_admin_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse settings from storage:", e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem("cuezone_admin_settings", JSON.stringify(settings));
  }, [settings]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "general" | "pricing" | "membership" | "hardware" | "system"
  >("general");

  // Edit Pricing Rule Modal State
  const [editingPriceRule, setEditingPriceRule] = useState<TablePricingRule | null>(null);
  const [priceModalVisible, setPriceModalVisible] = useState<boolean>(false);

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
        "Tất cả cài đặt thông tin CLB, bảng giá giờ chơi, rơ-le đèn và tích điểm sẽ trở về thông số chuẩn ban đầu của hệ thống.",
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
    message.loading({ content: "Đang gửi lệnh in thử đến máy in nhiệt K80 (192.168.1.200)...", key: "print" });
    setTimeout(() => {
      message.success({
        content: "Lệnh in test thành công! Giấy in K80 đã được cắt tự động.",
        key: "print",
        duration: 3,
      });
    }, 1200);
  };

  const handleTestRelay = (action: "all_on" | "all_off") => {
    const actText = action === "all_on" ? "BẬT TOÀN BỘ 20 RƠ-LE ĐÈN BÀN" : "TẮT TOÀN BỘ RƠ-LE ĐÈN BÀN";
    message.loading({ content: `Đang gửi tín hiệu Modbus TCP tới ${actText}...`, key: "relay" });
    setTimeout(() => {
      message.success({ content: `Thao tác thành công: ${actText}!`, key: "relay", duration: 3 });
    }, 1000);
  };

  // Pricing Rule Edit
  const handleOpenEditPricing = (rule: TablePricingRule) => {
    setEditingPriceRule({ ...rule });
    setPriceModalVisible(true);
  };

  const handleSavePricingRule = () => {
    if (!editingPriceRule) return;
    setSettings((prev) => ({
      ...prev,
      pricingRules: prev.pricingRules.map((r) => (r.id === editingPriceRule.id ? editingPriceRule : r)),
    }));
    setPriceModalVisible(false);
    message.success(`Đã cập nhật bảng giá cho ${editingPriceRule.tableTypeName}!`);
  };

  // Pricing Table Columns
  const pricingColumns: TableColumnsType<TablePricingRule> = [
    {
      title: "Loại bàn bida",
      key: "tableTypeName",
      render: (_, r) => (
        <div>
          <Text strong className="!text-slate-900 !text-sm block font-bold">
            {r.tableTypeName}
          </Text>
          <Text className="!text-xs !text-slate-500 block">{r.description}</Text>
        </div>
      ),
    },
    {
      title: "Giá giờ ban ngày (08:00 - 18:00)",
      key: "regularHourRate",
      width: 220,
      render: (_, r) => (
        <div className="flex items-center gap-1.5 font-bold text-emerald-700 text-sm bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-fit">
          <DollarOutlined />
          <span>{r.regularHourRate.toLocaleString()} đ / giờ</span>
        </div>
      ),
    },
    {
      title: "Giá Giờ Vàng (18:00 - 23:00)",
      key: "goldHourRate",
      width: 220,
      render: (_, r) => (
        <div className="flex items-center gap-1.5 font-bold text-amber-800 text-sm bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 w-fit">
          <CrownOutlined className="text-amber-600" />
          <span>{r.goldHourRate.toLocaleString()} đ / giờ</span>
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 110,
      render: (_, r) => (
        <Button size="sm" variant="outline" onClick={() => handleOpenEditPricing(r)} className="!border-slate-300 font-semibold">
          Sửa giá
        </Button>
      ),
    },
  ];

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
                <Title level={2} className="!text-xl md:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                  Cài Đặt Hệ Thống & Cấu Hình CLB
                </Title>
                <Tag color="green" className="!px-2.5 !py-0.5 !text-xs !font-black !rounded-full">
                  CUEZONE ADMIN V2.6.4
                </Tag>
              </div>
              <Text className="!text-xs md:!text-sm !text-slate-500">
                Quản lý thông tin câu lạc bộ, bảng giá giờ chơi, thẻ hội viên, rơ-le đèn tự động và cổng thanh toán
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

      {/* ── 2. Quick Hardware Status Bar (Clean Light Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Hệ thống POS</span>
            <div className="text-base font-black text-emerald-700 mt-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Đang trực tuyến (Online)
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{settings.totalTables} Bàn hoạt động</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
            <ThunderboltOutlined />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-teal-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Rơ-le Đèn Thông Minh</span>
            <div className="text-base font-black text-teal-700 mt-1 flex items-center gap-1.5">
              <CheckCircleOutlined /> Modbus TCP
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">20/20 Cổng rơ-le sẵn sàng</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 text-xl">
            <BulbOutlined />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-blue-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Máy in hóa đơn</span>
            <div className="text-base font-black text-blue-700 mt-1 flex items-center gap-1.5">
              <PrinterOutlined /> Khổ K80 (80mm)
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{settings.printerIpAddress}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xl">
            <PrinterOutlined />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-amber-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Cổng VietQR Napas</span>
            <div className="text-base font-black text-amber-800 mt-1 flex items-center gap-1.5">
              <BankOutlined /> MB Bank Quầy
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">STK: {settings.bankAccountNo}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-xl">
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
          Bảng giá & Quy tắc tính tiền
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
          Thiết bị phần cứng & Thanh toán
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
          Bảo mật & Tự động hóa
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng bàn hoạt động
                  </label>
                  <Input
                    type="number"
                    value={settings.totalTables.toString()}
                    onChange={(e) =>
                      setSettings({ ...settings, totalTables: parseInt(e.target.value) || 20 })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Khẩu hiệu / Slogan</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email hỗ trợ</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tên mạng Wifi (SSID)</label>
                  <Input
                    value={settings.wifiSSID}
                    onChange={(e) => setSettings({ ...settings, wifiSSID: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu Wifi</label>
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
          {/* Hourly Rates by Table Type */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarOutlined className="text-emerald-600 text-lg" />
                <div>
                  <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                    Bảng Giá Giờ Chơi Theo Loại Bàn
                  </Title>
                  <Text className="!text-xs !text-slate-500">
                    Hệ thống POS tự động áp dụng giá theo phân loại bàn và khung giờ trong ngày
                  </Text>
                </div>
              </div>
            </div>

            <Table<TablePricingRule>
              dataSource={settings.pricingRules}
              columns={pricingColumns}
              rowKey="id"
              pagination={false}
            />
          </div>

          {/* Billing Calculation Rules */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ClockCircleOutlined className="text-amber-600 text-lg" />
              <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                Quy Tắc Tính Tiền Giờ & Khung Giờ Vàng
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Làm tròn thời gian</label>
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
                  <span className="text-slate-900 text-sm font-bold">= 1 Điểm</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                  Ví dụ: Hóa đơn 300.000đ sẽ tích được 30 điểm
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
                  <span className="text-slate-900 text-sm font-bold">= 10.000 VNĐ</span>
                </div>
                <span className="text-[11px] text-amber-800 font-semibold mt-1 block">
                  Trừ trực tiếp vào tổng tiền khi khách yêu cầu dùng điểm
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
              <Button size="sm" variant="outline" onClick={handleTestPrinter} className="!border-slate-300 font-semibold">
                In thử hóa đơn
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loại máy in</label>
                <Input
                  value={settings.printerType}
                  onChange={(e) => setSettings({ ...settings, printerType: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Khổ giấy in</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ IP máy in LAN</label>
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

          {/* Smart Relay Table Lighting */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BulbOutlined className="text-teal-600 text-lg" />
                <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                  Rơ-le Đèn Bàn Thông Minh (Smart Relay)
                </Title>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => handleTestRelay("all_on")} className="!border-slate-300 font-semibold">
                  Bật tất cả
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleTestRelay("all_off")}>
                  Tắt tất cả
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giao thức điều khiển</label>
                  <Input
                    value={settings.relayProtocol}
                    onChange={(e) => setSettings({ ...settings, relayProtocol: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ Gateway Modbus TCP</label>
                  <Input
                    value={settings.relayControllerIp}
                    onChange={(e) =>
                      setSettings({ ...settings, relayControllerIp: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.autoTurnOnLightOnOpen}
                    onChange={(e) =>
                      setSettings({ ...settings, autoTurnOnLightOnOpen: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="font-bold text-teal-800">
                    Tự động bật rơ-le đèn bàn ngay khi bấm "Mở bàn" trên POS
                  </span>
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Độ trễ tự động tắt đèn sau khi thanh toán hóa đơn
                  </label>
                  <Select
                    value={settings.autoTurnOffDelayMinutes.toString()}
                    onChange={(val) =>
                      setSettings({ ...settings, autoTurnOffDelayMinutes: parseInt(val) || 2 })
                    }
                    className="w-full"
                    options={[
                      { label: "Tắt đèn ngay lập tức (0 phút)", value: "0" },
                      { label: "Tắt sau 2 phút (Để khách thu dọn gậy cơ)", value: "2" },
                      { label: "Tắt sau 5 phút", value: "5" },
                    ]}
                  />
                </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngân hàng thụ hưởng <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={settings.bankName}
                  onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tài khoản nhận tiền <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={settings.bankAccountNo}
                  onChange={(e) => setSettings({ ...settings, bankAccountNo: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chủ tài khoản (Không dấu) <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={settings.bankAccountName}
                  onChange={(e) => setSettings({ ...settings, bankAccountName: e.target.value })}
                />
              </div>
            </div>
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
                Tự Động Hóa & Thông Báo Ca Trực
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
                  Hệ thống tự động kích hoạt Web Audio API phát âm thanh "Ding" tại quầy thu ngân giúp nhân
                  viên không bỏ lỡ lịch đặt bàn giờ vàng của hội viên.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Modal: Edit Price Rule ── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <DollarOutlined className="text-emerald-600" />
            <span>Chỉnh Sửa Giá Giờ Chơi: {editingPriceRule?.tableTypeName}</span>
          </div>
        }
        open={priceModalVisible}
        onCancel={() => {
          setPriceModalVisible(false);
          setEditingPriceRule(null);
        }}
        width={520}
        footer={[
          <Button
            key="cancel"
            variant="ghost"
            onClick={() => {
              setPriceModalVisible(false);
              setEditingPriceRule(null);
            }}
          >
            Hủy
          </Button>,
          <Button key="save" variant="primary" onClick={handleSavePricingRule}>
            Lưu mức giá
          </Button>,
        ]}
      >
        {editingPriceRule && (
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giá ngày thường (08:00 - 18:00)
              </label>
              <Input
                type="number"
                value={editingPriceRule.regularHourRate.toString()}
                onChange={(e) =>
                  setEditingPriceRule({
                    ...editingPriceRule,
                    regularHourRate: parseInt(e.target.value) || 0,
                  })
                }
                suffix="VNĐ / giờ"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giá Giờ Vàng (18:00 - 23:00)
              </label>
              <Input
                type="number"
                value={editingPriceRule.goldHourRate.toString()}
                onChange={(e) =>
                  setEditingPriceRule({
                    ...editingPriceRule,
                    goldHourRate: parseInt(e.target.value) || 0,
                  })
                }
                suffix="VNĐ / giờ"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả loại bàn</label>
              <Input
                value={editingPriceRule.description}
                onChange={(e) =>
                  setEditingPriceRule({
                    ...editingPriceRule,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── 10. Modal: Thermal Bill Header Preview ── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <PrinterOutlined className="text-emerald-600" />
            <span>Mô Phỏng Đầu Hóa Đơn Nhiệt K80 (Thermal Receipt)</span>
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
            <div className="text-[10px] text-slate-600">STK: {settings.bankAccountNo} ({settings.bankName})</div>
            <div className="text-[10px] font-bold">CẢMƠN QUÝ KHÁCH & HẸN GẶP LẠI!</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsManagementPage;
