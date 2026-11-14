import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { posService } from "../../services/pos.service";
import {
  SettingOutlined,
  ShopOutlined,
  CrownOutlined,
  SaveOutlined,
  ReloadOutlined,
  WifiOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  QrcodeOutlined,
  BankOutlined,
  CopyOutlined,
  EyeOutlined,
  AppstoreOutlined,
  PrinterOutlined,
  EditOutlined,
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

// ── Default Settings Chuẩn Nghiệp Vụ CLB ───────────────────────────────────────

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

  bankCode: "TPB",
  bankName: "TPBank (Ngân hàng TMCP Tiên Phong)",
  bankAccountNo: "0975685609",
  bankAccountName: "NGUYEN QUANG HUY",
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
          // Đồng bộ chuẩn 3 cấp bậc thực tế của CLB (giữ dữ liệu đã lưu nếu hợp lệ)
          memberTiers:
            Array.isArray(parsed.memberTiers) && parsed.memberTiers.length === 3
              ? parsed.memberTiers
              : DEFAULT_SETTINGS.memberTiers,
          bankCode: parsed.bankCode || DEFAULT_SETTINGS.bankCode,
          bankName: parsed.bankName || DEFAULT_SETTINGS.bankName,
          bankAccountNo: parsed.bankAccountNo || DEFAULT_SETTINGS.bankAccountNo,
          bankAccountName: parsed.bankAccountName || DEFAULT_SETTINGS.bankAccountName,
          printVietQROnBill: parsed.printVietQROnBill ?? DEFAULT_SETTINGS.printVietQROnBill,
          printClubLogoOnBill: parsed.printClubLogoOnBill ?? DEFAULT_SETTINGS.printClubLogoOnBill,
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

  // 3 Tab thực tế 100%: "general" | "vietqr" | "membership"
  const [activeTab, setActiveTab] = useState<"general" | "vietqr" | "membership">("general");

  // Modal xem trước mẫu in hóa đơn
  const [billPreviewVisible, setBillPreviewVisible] = useState<boolean>(false);

  // Modal chỉnh sửa đặc quyền cấp bậc hội viên
  const [editingTier, setEditingTier] = useState<MemberTierPolicy | null>(null);
  const [isEditTierModalOpen, setIsEditTierModalOpen] = useState<boolean>(false);

  const handleOpenEditTier = (tier: MemberTierPolicy) => {
    setEditingTier({ ...tier });
    setIsEditTierModalOpen(true);
  };

  const handleSaveTier = () => {
    if (!editingTier) return;
    if (!editingTier.tierName.trim()) {
      message.error("Tên cấp bậc không được để trống!");
      return;
    }
    const updatedTiers = settings.memberTiers.map((t) =>
      t.tierKey === editingTier.tierKey ? editingTier : t
    );
    const newSettings = { ...settings, memberTiers: updatedTiers };
    setSettings(newSettings);
    localStorage.setItem("cuezone_admin_settings", JSON.stringify(newSettings));
    window.dispatchEvent(new Event("cuezone_settings_updated"));
    setIsEditTierModalOpen(false);
    setEditingTier(null);
    message.success(`Đã cập nhật chính sách cấp bậc "${editingTier.tierName}" thành công!`);
  };

  const handleSaveAllSettings = () => {
    localStorage.setItem("cuezone_admin_settings", JSON.stringify(settings));
    window.dispatchEvent(new Event("cuezone_settings_updated"));
    message.success("Toàn bộ cấu hình hệ thống CueZone đã được lưu thành công!");
  };

  const handleResetDefaults = () => {
    Modal.confirm({
      title: "Khôi phục toàn bộ cấu hình ban đầu?",
      content:
        "Tất cả cài đặt thông tin CLB, tài khoản VietQR và chính sách hội viên sẽ trở về thông số chuẩn ban đầu của hệ thống.",
      okText: "Khôi phục",
      cancelText: "Hủy bỏ",
      onOk: () => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.setItem("cuezone_admin_settings", JSON.stringify(DEFAULT_SETTINGS));
        window.dispatchEvent(new Event("cuezone_settings_updated"));
        message.success("Đã khôi phục cài đặt mặc định thành công!");
      },
    });
  };

  // Member Tier Table Columns
  const tierColumns: TableColumnsType<MemberTierPolicy> = [
    {
      title: "Cấp bậc hội viên",
      key: "tierName",
      width: 170,
      render: (_, r) => (
        <div className="flex items-center gap-2">
          <Tag color={r.color as any} className="!font-bold !text-xs !px-2.5 !py-1 whitespace-nowrap">
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
        <Text strong className="!text-slate-800 !text-xs font-semibold whitespace-nowrap">
          Từ {r.minPoints.toLocaleString("vi-VN")} điểm
        </Text>
      ),
    },
    {
      title: "Giảm giá tiền bàn",
      key: "tableDiscountPercent",
      width: 150,
      render: (_, r) => (
        <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 whitespace-nowrap inline-block">
          Giảm {r.tableDiscountPercent}%
        </span>
      ),
    },
    {
      title: "Giảm giá menu F&B",
      key: "fnbDiscountPercent",
      width: 160,
      render: (_, r) => (
        <span
          className={`font-bold text-xs px-2.5 py-1 rounded-md border whitespace-nowrap inline-block ${
            r.fnbDiscountPercent > 0
              ? "text-blue-700 bg-blue-50 border-blue-200"
              : "text-slate-600 bg-slate-100 border-slate-200 font-medium"
          }`}
        >
          {r.fnbDiscountPercent > 0 ? `Giảm ${r.fnbDiscountPercent}%` : "Giá niêm yết (0%)"}
        </span>
      ),
    },
    {
      title: "Đặc quyền bổ sung",
      key: "perks",
      render: (_, r) => <Text className="!text-xs !text-slate-600">{r.perks}</Text>,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      render: (_, r) => (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<EditOutlined />}
          onClick={() => handleOpenEditTier(r)}
          className="!text-xs !border-slate-200 !text-slate-700 hover:!border-emerald-500 hover:!text-emerald-700 !rounded-lg"
        >
          Chỉnh sửa
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. Page Header ── */}
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
                Thiết lập thông tin câu lạc bộ, tài khoản thanh toán VietQR và chính sách hội viên
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

      {/* ── 2. Quick Status Bar (3 Thẻ Trạng Thái Thực Tế) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Hệ Thống Bàn Bida</span>
            <div className="text-base font-black text-emerald-700 mt-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Đang hoạt động
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {actualTableCount} Bàn ({actualTablesBreakdown.pool} Pool · {actualTablesBreakdown.carom} Carom · {actualTablesBreakdown.snooker} Snooker)
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
            <AppstoreOutlined />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Cổng Thanh Toán VietQR</span>
            <div className="text-base font-black text-emerald-800 mt-1 flex items-center gap-1.5">
              <BankOutlined /> {settings.bankName?.split(" (")[0] || "TPBank"}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              STK: {settings.bankAccountNo || "Chưa thiết lập"} · {settings.bankAccountName || ""}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
            <QrcodeOutlined />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-amber-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Chính Sách Hội Viên</span>
            <div className="text-base font-black text-amber-800 mt-1 flex items-center gap-1.5">
              <CrownOutlined /> 3 Cấp Bậc Thẻ
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Đồng · Bạc · Vàng (Tích điểm tự động)
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-xl">
            <CrownOutlined />
          </div>
        </div>
      </div>

      {/* ── 3. Navigation Tabs Bar (3 Tab Rõ Ràng, Thực Chất 100%) ── */}
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
          variant={activeTab === "vietqr" ? "primary" : "outline"}
          leftIcon={<BankOutlined />}
          onClick={() => setActiveTab("vietqr")}
          className={
            activeTab === "vietqr"
              ? "!bg-emerald-600 !border-emerald-600 text-white font-bold shadow-2xs"
              : "!bg-white !border-slate-200 !text-slate-700 hover:!bg-slate-50 font-semibold"
          }
        >
          Cổng Thanh Toán VietQR & In Bill
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
      </div>

      {/* ── 4. Tab 1: Thông Tin CLB & Thương Hiệu ── */}
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

          {/* Right Preview Card */}
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

      {/* ── 5. Tab 2: Cổng Thanh Toán VietQR & Tùy Chọn In Bill ── */}
      {activeTab === "vietqr" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BankOutlined className="text-emerald-600 text-lg" />
                <div>
                  <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                    Tài Khoản Ngân Hàng Nhận Tiền & Cổng VietQR Napas
                  </Title>
                  <Text className="!text-xs !text-slate-500">
                    Máy POS và ứng dụng khách hàng sẽ tự động sinh mã VietQR động có sẵn số tiền chính xác khi thanh toán
                  </Text>
                </div>
              </div>
              <Tag color="green" className="!font-bold !px-3 !py-1">
                Tự Động Sinh Mã QR Động
              </Tag>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngân hàng thụ hưởng <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={settings.bankCode || "TPB"}
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
                  value={settings.bankName || "TPBank (Ngân hàng TMCP Tiên Phong)"}
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
                  placeholder="VD: 0975685609"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chủ tài khoản (Không dấu) <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={settings.bankAccountName}
                  onChange={(e) => setSettings({ ...settings, bankAccountName: e.target.value.toUpperCase() })}
                  placeholder="VD: NGUYEN QUANG HUY"
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0">
                    <QrcodeOutlined />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Đang liên kết: {settings.bankName?.split(" (")[0]} — STK: {settings.bankAccountNo || "Chưa nhập"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Chủ tài khoản: {settings.bankAccountName || "Chưa nhập"} · Chuẩn Napas 247 VietQR
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<EyeOutlined />}
                  onClick={() => setBillPreviewVisible(true)}
                  className="!border-emerald-600 !text-emerald-700 font-bold hover:!bg-emerald-50 shrink-0"
                >
                  Xem mẫu in hóa đơn
                </Button>
              </div>
            </div>
          </div>

          {/* Tùy Chọn Mẫu In Hóa Đơn */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <PrinterOutlined className="text-blue-600 text-lg" />
              <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                Tùy Chọn Thông Tin In Lên Hóa Đơn Thanh Toán
              </Title>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                <input
                  type="checkbox"
                  checked={settings.printVietQROnBill}
                  onChange={(e) => setSettings({ ...settings, printVietQROnBill: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="font-semibold">In mã QR chuyển khoản VietQR ở chân hóa đơn thanh toán</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                <input
                  type="checkbox"
                  checked={settings.printClubLogoOnBill}
                  onChange={(e) => setSettings({ ...settings, printClubLogoOnBill: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="font-semibold">In tên quán, địa chỉ và mật khẩu Wifi ở đầu hóa đơn</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Tab 3: Chính Sách Hội Viên & Điểm Thưởng ── */}
      {activeTab === "membership" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <CrownOutlined className="text-amber-600 text-lg" />
              <div>
                <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                  Chính Sách Tích Điểm Thăng Hạng Hội Viên
                </Title>
                <Text className="!text-xs !text-slate-500">
                  Điểm thưởng được tự động cộng dồn khi hội viên thanh toán tại quầy POS để xét nâng hạng thẻ và hưởng quyền lợi chiết khấu
                </Text>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white rounded-2xl border border-emerald-200/90 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Định Mức Tích Lũy Điểm Thưởng Tiêu Dùng
                </span>
                <span className="text-xs text-slate-500 block max-w-xl">
                  Mỗi khi hóa đơn thanh toán tiền giờ hoặc F&B hoàn tất tại quầy thu ngân POS, hệ thống sẽ tự động quy đổi số tiền chi tiêu thành điểm hội viên theo định mức này để tích lũy thăng hạng.
                </span>
                <span className="text-[11px] text-emerald-800 font-semibold pt-1 block">
                  💡 <strong>Ví dụ minh họa:</strong> Hóa đơn 300.000đ sẽ tích được{" "}
                  <strong className="text-emerald-950 font-bold underline">
                    {Math.floor(
                      300000 / (settings.earnPointsRate > 0 ? settings.earnPointsRate : 10000),
                    ).toLocaleString("vi-VN")}{" "}
                    điểm
                  </strong>{" "}
                  thưởng thăng hạng.
                </span>
              </div>

              <div className="shrink-0 bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center gap-2.5">
                <div className="w-36">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Số tiền chi tiêu
                  </label>
                  <Input
                    type="number"
                    min={1000}
                    step={1000}
                    value={settings.earnPointsRate.toString()}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        earnPointsRate: Math.max(1000, parseInt(e.target.value) || 10000),
                      })
                    }
                    suffix="đ"
                    className="!font-bold !text-slate-800"
                  />
                </div>
                <div className="text-slate-900 text-sm font-black whitespace-nowrap pt-4">
                  = 1 Điểm
                </div>
              </div>
            </div>
          </div>

          {/* Member Tiers Matrix: 3 Cấp bậc chuẩn Database */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CrownOutlined className="text-purple-600 text-lg" />
                <div>
                  <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0">
                    Chính Sách Đặc Quyền 3 Cấp Bậc Hội Viên
                  </Title>
                  <Text className="!text-xs !text-slate-500">
                    Đồng bộ trực tiếp với hệ thống tự động thăng hạng và chiết khấu trên hóa đơn POS
                  </Text>
                </div>
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

      {/* ── 7. Modal: Thermal Bill Header Preview ── */}
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
            {settings.printClubLogoOnBill !== false && (
              <>
                <div className="text-[11px] mt-1">{settings.address}</div>
                <div className="text-[11px]">Hotline: {settings.phone}</div>
                {settings.wifiSSID && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Wifi: {settings.wifiSSID} | Pass: {settings.wifiPassword}
                  </div>
                )}
              </>
            )}
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
              <span>TIỀN GIỜ:</span>
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

          {settings.printVietQROnBill !== false && settings.bankAccountNo && (
            <div className="pt-2 border-t border-dashed border-slate-300 text-center space-y-1">
              <span className="text-[10px] text-slate-700 font-bold block uppercase tracking-wider">
                Mã VietQR Thanh Toán
              </span>
              <div className="flex justify-center py-1">
                <img
                  src={`https://api.vietqr.io/image/${settings.bankCode || "TPB"}-${settings.bankAccountNo}-compact2.jpg?amount=352750&addInfo=HD20260924&accountName=${encodeURIComponent(settings.bankAccountName || "")}`}
                  alt="VietQR Demo"
                  className="w-20 h-20 object-contain border border-slate-300 rounded p-1 bg-white"
                  loading="lazy"
                />
              </div>
              <div className="text-[9.5px] text-slate-700 font-medium">
                {settings.bankName?.split(" (")[0] || "Ngân hàng"} · STK: <strong>{settings.bankAccountNo}</strong>
              </div>
              <div className="text-[9px] text-slate-500">
                Chủ TK: {settings.bankAccountName}
              </div>
            </div>
          )}

          <div className="text-center pt-2 space-y-1 border-t border-slate-200">
            <div className="text-[10px] font-bold">CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!</div>
          </div>
        </div>
      </Modal>

      {/* ── 8. Modal: Chỉnh Sửa Chính Sách Cấp Bậc Hội Viên ── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <CrownOutlined className="text-amber-500" />
            <span>Chỉnh Sửa Chính Sách: {editingTier?.tierName}</span>
          </div>
        }
        open={isEditTierModalOpen}
        onCancel={() => {
          setIsEditTierModalOpen(false);
          setEditingTier(null);
        }}
        onOk={handleSaveTier}
        okText="Lưu chính sách"
        cancelText="Hủy bỏ"
        width={520}
        okButtonProps={{
          className: "!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !rounded-xl",
        }}
      >
        {editingTier && (
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên cấp bậc hiển thị <span className="text-rose-500">*</span>
              </label>
              <Input
                value={editingTier.tierName}
                onChange={(e) =>
                  setEditingTier({ ...editingTier, tierName: e.target.value })
                }
                placeholder="VD: Hội Viên Vàng (Gold)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Điểm tối thiểu
                </label>
                <Input
                  type="number"
                  min={0}
                  value={editingTier.minPoints.toString()}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      minPoints: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  suffix="điểm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giảm giá tiền bàn
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editingTier.tableDiscountPercent.toString()}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      tableDiscountPercent: Math.min(
                        100,
                        Math.max(0, parseInt(e.target.value) || 0)
                      ),
                    })
                  }
                  suffix="%"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giảm giá F&B
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editingTier.fnbDiscountPercent.toString()}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      fnbDiscountPercent: Math.min(
                        100,
                        Math.max(0, parseInt(e.target.value) || 0)
                      ),
                    })
                  }
                  suffix="%"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Đặc quyền & Quyền lợi bổ sung
              </label>
              <Input.TextArea
                rows={3}
                value={editingTier.perks}
                onChange={(e) =>
                  setEditingTier({ ...editingTier, perks: e.target.value })
                }
                placeholder="VD: Giảm 15% tiền bàn, ưu tiên giữ bàn giờ cao điểm, tủ để cơ riêng"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              💡 <strong>Lưu ý nghiệp vụ:</strong> Mức giảm giá sẽ tự động được áp dụng tại máy thu ngân POS khi chọn hội viên đạt cấp bậc này và đồng bộ trên toàn hệ thống.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SettingsManagementPage;
