// ── 1. IMPORTS ────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  SettingOutlined,
  ShopOutlined,
  CrownOutlined,
  SaveOutlined,
  ReloadOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { Button, Tag, Typography, message, Modal } from "../../shared/ui";

import { posService } from "../../services/pos.service";
import { SettingsKpiCards } from "./settings/components/SettingsKpiCards";
import { GeneralClubInfoTab } from "./settings/components/GeneralClubInfoTab";
import { VietQrPaymentTab } from "./settings/components/VietQrPaymentTab";
import { MembershipPolicyTab } from "./settings/components/MembershipPolicyTab";
import { BillPreviewModal } from "./settings/modals/BillPreviewModal";

import {
  DEFAULT_SETTINGS,
  type ClubSettingsData,
} from "./settings/types/settings.types";

// ── 2. TYPES & INTERFACES ─────────────────────────────────────────────────────
// Types are imported from ./settings/types/settings.types

// ── 3. CONSTANTS & HELPERS ────────────────────────────────────────────────────
const { Title, Text } = Typography;

// ── 4. MAIN COMPONENT ─────────────────────────────────────────────────────────
export const SettingsManagementPage: React.FC = () => {
  const navigate = useNavigate();

  // State: Settings
  const [settings, setSettings] = useState<ClubSettingsData>(() => {
    const saved = localStorage.getItem("cuezone_admin_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          totalTables: 26,
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

  // State: Table counts from database
  const [actualTableCount, setActualTableCount] = useState<number>(0);
  const [actualTablesBreakdown, setActualTablesBreakdown] = useState({ pool: 0, carom: 0, snooker: 0 });

  // State: Navigation & Modals
  const [activeTab, setActiveTab] = useState<"general" | "vietqr" | "membership">("general");
  const [billPreviewVisible, setBillPreviewVisible] = useState<boolean>(false);

  // Sync actual tables
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

  // Handlers
  const handleSaveAllSettings = useCallback(() => {
    localStorage.setItem("cuezone_admin_settings", JSON.stringify(settings));
    window.dispatchEvent(new Event("cuezone_settings_updated"));
    message.success("Toàn bộ cấu hình hệ thống CueZone đã được lưu thành công!");
  }, [settings]);

  const handleResetDefaults = useCallback(() => {
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
  }, []);

  return (
    <div className="space-y-6 pb-12 max-w-[1440px] mx-auto">
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
                  className="!text-xl md:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight whitespace-nowrap"
                >
                  Cài Đặt Hệ Thống & CLB
                </Title>
                <Tag color="green" className="!px-2.5 !py-0.5 !text-xs !font-bold !rounded-full whitespace-nowrap">
                  HỆ THỐNG QUẢN TRỊ
                </Tag>
              </div>
              <Text className="!text-xs md:!text-sm !text-slate-500 block leading-relaxed [text-wrap:balance]">
                Thiết lập thông tin câu lạc bộ, tài khoản thanh toán VietQR và chính sách hội viên
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap whitespace-nowrap">
            <Button
              variant="outline"
              leftIcon={<ReloadOutlined />}
              onClick={handleResetDefaults}
              className="!border-slate-200 !text-slate-700 hover:!bg-slate-50 !rounded-xl !h-9 text-xs whitespace-nowrap"
            >
              Khôi phục mặc định
            </Button>

            <Button
              variant="primary"
              leftIcon={<SaveOutlined />}
              onClick={handleSaveAllSettings}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !rounded-xl !h-9 text-xs text-white shadow-2xs whitespace-nowrap"
            >
              Lưu toàn bộ cài đặt
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. Quick Status Bar (3 Thẻ Đồng Bộ Design System) ── */}
      <SettingsKpiCards
        actualTableCount={actualTableCount}
        actualTablesBreakdown={actualTablesBreakdown}
        settings={settings}
      />

      {/* ── 3. Tabs Navigation ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <Button
          size="sm"
          variant={activeTab === "general" ? "primary" : "outline"}
          leftIcon={<ShopOutlined />}
          onClick={() => setActiveTab("general")}
          className={`whitespace-nowrap ${
            activeTab === "general"
              ? "!bg-emerald-600 !border-emerald-600 text-white font-bold shadow-2xs"
              : "!bg-white !border-slate-200 !text-slate-700 hover:!bg-slate-50 font-semibold"
          }`}
        >
          Thông tin CLB & Thương hiệu
        </Button>

        <Button
          size="sm"
          variant={activeTab === "vietqr" ? "primary" : "outline"}
          leftIcon={<BankOutlined />}
          onClick={() => setActiveTab("vietqr")}
          className={`whitespace-nowrap ${
            activeTab === "vietqr"
              ? "!bg-emerald-600 !border-emerald-600 text-white font-bold shadow-2xs"
              : "!bg-white !border-slate-200 !text-slate-700 hover:!bg-slate-50 font-semibold"
          }`}
        >
          Cổng Thanh Toán VietQR & In Bill
        </Button>

        <Button
          size="sm"
          variant={activeTab === "membership" ? "primary" : "outline"}
          leftIcon={<CrownOutlined />}
          onClick={() => setActiveTab("membership")}
          className={`whitespace-nowrap ${
            activeTab === "membership"
              ? "!bg-emerald-600 !border-emerald-600 text-white font-bold shadow-2xs"
              : "!bg-white !border-slate-200 !text-slate-700 hover:!bg-slate-50 font-semibold"
          }`}
        >
          Hội viên & Tích lũy điểm
        </Button>
      </div>

      {/* ── 4. Main Tabs Content ── */}
      {activeTab === "general" && (
        <GeneralClubInfoTab
          settings={settings}
          setSettings={setSettings}
          actualTableCount={actualTableCount}
          actualTablesBreakdown={actualTablesBreakdown}
          onOpenBillPreview={() => setBillPreviewVisible(true)}
          onNavigateTables={() => navigate("/tables")}
        />
      )}

      {activeTab === "vietqr" && (
        <VietQrPaymentTab
          settings={settings}
          setSettings={setSettings}
          onOpenBillPreview={() => setBillPreviewVisible(true)}
        />
      )}

      {activeTab === "membership" && (
        <MembershipPolicyTab
          settings={settings}
          setSettings={setSettings}
        />
      )}

      {/* ── 5. Modal In Hóa Đơn ── */}
      <BillPreviewModal
        visible={billPreviewVisible}
        onCancel={() => setBillPreviewVisible(false)}
        settings={settings}
      />
    </div>
  );
};

export default SettingsManagementPage;
