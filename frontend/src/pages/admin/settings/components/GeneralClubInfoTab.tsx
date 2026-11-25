// ============================================================================
// 1. IMPORTS & ICONS
// ============================================================================
import React from "react";
import {
  ShopOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  WifiOutlined,
  CopyOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { Button, Input, Tooltip, Typography, message } from "../../../../shared/ui";
import type { ClubSettingsData } from "../types/settings.types";

const { Title, Text } = Typography;

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface GeneralClubInfoTabProps {
  settings: ClubSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<ClubSettingsData>>;
  actualTableCount: number;
  actualTablesBreakdown: { pool: number; carom: number; snooker: number };
  onOpenBillPreview: () => void;
  onNavigateTables: () => void;
}

// ============================================================================
// 4. MAIN COMPONENT: TAB THÔNG TIN CHUNG & THƯƠNG HIỆU CÂU LẠC BỘ
// Cấu hình tên quán, slogan, địa chỉ, hotline, giờ mở cửa, wifi và xem trước hóa đơn
// ============================================================================
export const GeneralClubInfoTab: React.FC<GeneralClubInfoTabProps> = ({
  settings,
  setSettings,
  actualTableCount,
  actualTablesBreakdown,
  onOpenBillPreview,
  onNavigateTables,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShopOutlined className="text-emerald-600 text-lg" />
            <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0 whitespace-nowrap">
              Thông Tin Cơ Bản Câu Lạc Bộ
            </Title>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                Tên Câu lạc bộ <span className="text-rose-500">*</span>
              </label>
              <Input
                value={settings.clubName}
                onChange={(e) => setSettings({ ...settings, clubName: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Quy mô bàn hoạt động
                </label>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                  Đồng bộ tự động
                </span>
              </div>
              <div className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-slate-900 font-medium min-w-0 truncate">
                  {actualTableCount} Bàn ({actualTablesBreakdown.pool} Pool · {actualTablesBreakdown.carom} Carom · {actualTablesBreakdown.snooker} Snooker)
                </span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={onNavigateTables}
                  className="!text-xs !p-0 !h-auto !text-emerald-700 font-bold hover:!text-emerald-800 whitespace-nowrap shrink-0"
                >
                  Quản lý bàn →
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
              Khẩu hiệu / Slogan
            </label>
            <Input
              value={settings.slogan}
              onChange={(e) => setSettings({ ...settings, slogan: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                Hotline đặt bàn <span className="text-rose-500">*</span>
              </label>
              <Input
                prefix={<PhoneOutlined className="text-slate-400" />}
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
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
            <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
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
            <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0 whitespace-nowrap">
              Mạng Wifi Khách Hàng (Tự In Lên Bill)
            </Title>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                Tên mạng Wifi (SSID)
              </label>
              <Input
                value={settings.wifiSSID}
                onChange={(e) => setSettings({ ...settings, wifiSSID: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
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
            <Title level={4} className="!text-white !text-lg !font-bold !mb-1 whitespace-nowrap">
              {settings.clubName}
            </Title>
            <Text className="!text-xs !text-emerald-400 !italic block [text-wrap:balance]">{settings.slogan}</Text>
          </div>

          <div className="py-4 space-y-3 text-xs">
            <div className="flex items-start gap-2 text-slate-300">
              <EnvironmentOutlined className="text-emerald-400 mt-0.5 shrink-0" />
              <span>{settings.address}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <PhoneOutlined className="text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">{settings.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <ClockCircleOutlined className="text-emerald-400 shrink-0" />
              <span>{settings.openingHours}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
              <WifiOutlined className="text-teal-400 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-white whitespace-nowrap">{settings.wifiSSID}</div>
                <div className="text-[11px] text-slate-400 whitespace-nowrap">Pass: {settings.wifiPassword}</div>
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
                  className="!text-slate-300 hover:!text-white whitespace-nowrap"
                />
              </Tooltip>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              leftIcon={<EyeOutlined />}
              onClick={onOpenBillPreview}
              className="w-full !text-xs !border-emerald-500/50 !text-emerald-400 hover:!bg-emerald-500/10 font-bold whitespace-nowrap"
            >
              Xem mẫu in đầu hóa đơn
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
