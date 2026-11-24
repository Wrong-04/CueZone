// ============================================================================
// 1. IMPORTS & ICONS
// ============================================================================
import React from "react";
import { BankOutlined, QrcodeOutlined, EyeOutlined, PrinterOutlined } from "@ant-design/icons";
import { Button, Input, Select, Tag, Typography } from "../../../../shared/ui";
import { POPULAR_BANKS, type ClubSettingsData } from "../types/settings.types";

const { Title, Text } = Typography;

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface VietQrPaymentTabProps {
  settings: ClubSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<ClubSettingsData>>;
  onOpenBillPreview: () => void;
}

// ============================================================================
// 4. MAIN COMPONENT: TAB CẤU HÌNH CỔNG THANH TOÁN VIETQR & IN BILL
// Thiết lập ngân hàng thụ hưởng, số tài khoản, tên chủ tài khoản và mẫu in nhiệt
// ============================================================================
export const VietQrPaymentTab: React.FC<VietQrPaymentTabProps> = ({
  settings,
  setSettings,
  onOpenBillPreview,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BankOutlined className="text-emerald-600 text-lg" />
            <div>
              <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0 whitespace-nowrap">
                Tài Khoản Ngân Hàng Nhận Tiền & Cổng VietQR Napas
              </Title>
              <Text className="!text-xs !text-slate-500 whitespace-nowrap">
                Máy POS và ứng dụng khách hàng sẽ tự động sinh mã VietQR động có sẵn số tiền chính xác khi thanh toán
              </Text>
            </div>
          </div>
          <Tag color="green" className="!font-bold !px-3 !py-1 whitespace-nowrap">
            Tự Động Sinh Mã QR Động
          </Tag>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
              Ngân hàng thụ hưởng <span className="text-rose-500">*</span>
            </label>
            <Select
              value={settings.bankCode || undefined}
              placeholder="Chọn ngân hàng thụ hưởng"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
              Tên ngân hàng đầy đủ <span className="text-rose-500">*</span>
            </label>
            <Input
              value={settings.bankName}
              onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
              placeholder="VD: MB Bank (Ngân hàng TMCP Quân Đội)"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
              Số tài khoản nhận tiền <span className="text-rose-500">*</span>
            </label>
            <Input
              value={settings.bankAccountNo}
              onChange={(e) => setSettings({ ...settings, bankAccountNo: e.target.value.trim() })}
              placeholder="VD: 0123456789"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
              Chủ tài khoản (Không dấu) <span className="text-rose-500">*</span>
            </label>
            <Input
              value={settings.bankAccountName}
              onChange={(e) => setSettings({ ...settings, bankAccountName: e.target.value.toUpperCase() })}
              placeholder="VD: CLB BIDA CUEZONE"
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
                <span className="text-xs font-bold text-slate-800 block whitespace-nowrap">
                  Đang liên kết: {settings.bankName?.split(" (")[0] || "Chưa chọn ngân hàng"} — STK: {settings.bankAccountNo || "Chưa nhập"}
                </span>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                  Chủ tài khoản: {settings.bankAccountName || "Chưa nhập"} · Chuẩn Napas 247 VietQR
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              leftIcon={<EyeOutlined />}
              onClick={onOpenBillPreview}
              className="!border-emerald-600 !text-emerald-700 font-bold hover:!bg-emerald-50 shrink-0 whitespace-nowrap"
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
          <Title level={4} className="!text-slate-900 !text-base !font-bold !mb-0 whitespace-nowrap">
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
            <span className="font-semibold whitespace-nowrap">In mã QR chuyển khoản VietQR ở chân hóa đơn thanh toán</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
            <input
              type="checkbox"
              checked={settings.printClubLogoOnBill}
              onChange={(e) => setSettings({ ...settings, printClubLogoOnBill: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <span className="font-semibold whitespace-nowrap">In tên quán, địa chỉ và mật khẩu Wifi ở đầu hóa đơn</span>
          </label>
        </div>
      </div>
    </div>
  );
};
