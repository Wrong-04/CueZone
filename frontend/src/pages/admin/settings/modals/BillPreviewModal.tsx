// ============================================================================
// 1. IMPORTS & ICONS
// ============================================================================
import React from "react";
import { PrinterOutlined } from "@ant-design/icons";
import { Button, Modal } from "../../../../shared/ui";
import type { ClubSettingsData } from "../types/settings.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface BillPreviewModalProps {
  visible: boolean;
  onCancel: () => void;
  settings: ClubSettingsData;
}

// ============================================================================
// 4. MAIN COMPONENT: MODAL XEM TRƯỚC PHIẾU IN NHIỆT K80 (BILL PREVIEW)
// ============================================================================
export const BillPreviewModal: React.FC<BillPreviewModalProps> = ({
  visible,
  onCancel,
  settings,
}) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-900 font-bold whitespace-nowrap">
          <PrinterOutlined className="text-emerald-600" />
          <span>Mô Phỏng Đầu Hóa Đơn Nhiệt K80</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={420}
      footer={[
        <Button key="close" variant="outline" onClick={onCancel} className="whitespace-nowrap">
          Đóng
        </Button>,
      ]}
    >
      <div className="p-4 bg-white text-slate-900 font-mono text-xs rounded-xl shadow-inner space-y-2 border border-slate-300">
        <div className="text-center pb-2 border-b border-dashed border-slate-400">
          <div className="font-bold text-sm tracking-wider uppercase whitespace-nowrap">{settings.clubName}</div>
          <div className="text-[10px] text-slate-600 italic [text-wrap:balance]">{settings.slogan}</div>
          {settings.printClubLogoOnBill !== false && (
            <>
              <div className="text-[11px] mt-1">{settings.address}</div>
              <div className="text-[11px] whitespace-nowrap">Hotline: {settings.phone}</div>
              {settings.wifiSSID && (
                <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
                  Wifi: {settings.wifiSSID} | Pass: {settings.wifiPassword}
                </div>
              )}
            </>
          )}
        </div>

        <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="whitespace-nowrap">HÓA ĐƠN THANH TOÁN:</span>
            <span className="font-bold whitespace-nowrap">#HD-2026-0924</span>
          </div>
          <div className="flex justify-between">
            <span className="whitespace-nowrap">BÀN SỐ:</span>
            <span className="font-bold whitespace-nowrap">BÀN 08 (VIP TOURNAMENT)</span>
          </div>
          <div className="flex justify-between">
            <span className="whitespace-nowrap">GIỜ VÀO - RA:</span>
            <span className="whitespace-nowrap">19:00 - 21:30 (2h 30m)</span>
          </div>
        </div>

        <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
          <div className="flex justify-between font-bold">
            <span className="whitespace-nowrap">TIỀN GIỜ:</span>
            <span className="whitespace-nowrap">275.000 đ</span>
          </div>
          <div className="flex justify-between">
            <span className="whitespace-nowrap">F&B (2 Red Bull + Bò khô):</span>
            <span className="whitespace-nowrap">140.000 đ</span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span className="whitespace-nowrap">GIẢM VIP GOLD (-15%):</span>
            <span className="whitespace-nowrap">-62.250 đ</span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
            <span className="whitespace-nowrap">TỔNG CỘNG:</span>
            <span className="whitespace-nowrap">352.750 đ</span>
          </div>
        </div>

        {settings.printVietQROnBill !== false && settings.bankCode && settings.bankAccountNo && (
          <div className="pt-2 border-t border-dashed border-slate-300 text-center space-y-1">
            <span className="text-[10px] text-slate-700 font-bold block uppercase tracking-wider whitespace-nowrap">
              Mã VietQR Thanh Toán
            </span>
            <div className="flex justify-center py-1">
              <img
                src={`https://api.vietqr.io/image/${settings.bankCode}-${settings.bankAccountNo}-compact2.jpg?amount=352750&addInfo=HD20260924&accountName=${encodeURIComponent(settings.bankAccountName || "")}`}
                alt="VietQR Demo"
                className="w-20 h-20 object-contain border border-slate-300 rounded p-1 bg-white"
                loading="lazy"
              />
            </div>
            <div className="text-[9.5px] text-slate-700 font-medium whitespace-nowrap">
              {settings.bankName?.split(" (")[0] || "Ngân hàng"} · STK: <strong>{settings.bankAccountNo}</strong>
            </div>
            {settings.bankAccountName && (
              <div className="text-[9px] text-slate-500 whitespace-nowrap">
                Chủ TK: {settings.bankAccountName}
              </div>
            )}
          </div>
        )}

        <div className="text-center pt-2 space-y-1 border-t border-slate-200">
          <div className="text-[10px] font-bold whitespace-nowrap">CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!</div>
        </div>
      </div>
    </Modal>
  );
};
