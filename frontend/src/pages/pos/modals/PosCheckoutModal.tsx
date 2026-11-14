import React from "react";
import {
  DollarOutlined,
  UserOutlined,
  UserAddOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  GiftOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  CoffeeOutlined,
  InfoCircleOutlined,
  QrcodeOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { Button, Input, Modal, Space, Tag, message } from "../../../shared/ui";
import { getClubPaymentSettings } from "../constants/posConstants";
import { posService } from "../../../services/pos.service";
import type { PosTable } from "../../../types/pos";

interface PosCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  selectedTable: PosTable | null;
  calculatePlayingDetails: (table: PosTable) => any;
  checkoutPhone: string;
  setCheckoutPhone: (val: string) => void;
  loyaltyCustomer: any;
  setLoyaltyCustomer: (val: any) => void;
  discountPercent: number;
  setDiscountPercent: (val: number) => void;
  isSearchingMember: boolean;
  onSearchLoyaltyCustomer: () => void | Promise<void>;
  appliedVoucher: any;
  setAppliedVoucher: (val: any) => void;
  setVoucherCode: (val: string) => void;
  onSelectCustomerVoucher: (code: string) => void | Promise<void>;
  showTimeSlots: boolean;
  setShowTimeSlots: React.Dispatch<React.SetStateAction<boolean>>;
  paymentMethod: string;
  setPaymentMethod: (val: any) => void;
  cashReceived: number | null;
  setCashReceived: (val: number | null) => void;
  onConfirmCheckout: () => void | Promise<void>;
  saving?: boolean;
  loading?: boolean;
  loadError?: any;
}

export const PosCheckoutModal: React.FC<PosCheckoutModalProps> = ({
  open,
  onClose,
  selectedTable,
  calculatePlayingDetails,
  checkoutPhone,
  setCheckoutPhone,
  loyaltyCustomer,
  setLoyaltyCustomer,
  discountPercent,
  setDiscountPercent,
  isSearchingMember,
  onSearchLoyaltyCustomer,
  appliedVoucher,
  setAppliedVoucher,
  setVoucherCode,
  onSelectCustomerVoucher,
  showTimeSlots,
  setShowTimeSlots,
  paymentMethod,
  setPaymentMethod,
  cashReceived,
  setCashReceived,
  onConfirmCheckout,
  saving = false,
  loading = false,
  loadError,
}) => {
  const [showQuickRegister, setShowQuickRegister] = React.useState(false);
  const [quickRegName, setQuickRegName] = React.useState("");
  const [quickRegPhone, setQuickRegPhone] = React.useState("");
  const [isRegistering, setIsRegistering] = React.useState(false);

  React.useEffect(() => {
    if (checkoutPhone) setQuickRegPhone(checkoutPhone);
  }, [checkoutPhone]);

  React.useEffect(() => {
    if (!open) {
      setShowQuickRegister(false);
      setQuickRegName("");
    }
  }, [open]);

  const handleQuickRegister = async () => {
    const phoneToRegister = (quickRegPhone || checkoutPhone).trim();
    if (!phoneToRegister || phoneToRegister.replace(/\D/g, "").length < 8) {
      message.error("Vui lòng nhập số điện thoại hợp lệ (tối thiểu 8 số)");
      return;
    }
    setIsRegistering(true);
    try {
      const res = await posService.quickRegisterCustomer({
        phone: phoneToRegister,
        name: quickRegName.trim(),
      });
      if (res.success && res.data) {
        setCheckoutPhone(res.data.phone);
        const rankDiscount = res.data.discountPercent ?? 0;
        setLoyaltyCustomer({
          name: res.data.name,
          phone: res.data.phone,
          rank: res.data.rank,
          discountPercent: rankDiscount,
          membershipPoints: res.data.membershipPoints || 0,
          totalStoreVouchers: res.data.totalStoreVouchers,
          availableVouchers: res.data.availableVouchers || [],
        });
        setDiscountPercent(rankDiscount);
        setShowQuickRegister(false);
        setQuickRegName("");
        message.success(
          res.data.message || `Đã đăng ký thành công hội viên ${res.data.name}! Đã kích hoạt ví voucher.`,
        );
      } else {
        message.error(res.message || "Không thể đăng ký hội viên");
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || "Đăng ký hội viên thất bại");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={620}
      title={
        <Space align="center" size={8}>
          <DollarOutlined className="text-emerald-600 text-lg" />
          <span className="font-bold text-slate-900 text-base">
            Thanh Toán Bàn - {selectedTable?.name}
          </span>
        </Space>
      }
    >
      {selectedTable && selectedTable.currentSession && (() => {
        const clubPayment = getClubPaymentSettings();
        const playingDetailsObj = calculatePlayingDetails(selectedTable);
        const fnbTotal = (selectedTable.currentSession.orders || []).reduce(
          (sum: number, item: any) =>
            item.status !== "cancelled"
              ? sum + (Number(item.price) || 0) * (Number(item.quantity) || 0)
              : sum,
          0,
        );
        const subtotal = playingDetailsObj.cost + fnbTotal;
        const memberDiscountAmount =
          discountPercent > 0
            ? Math.round(subtotal * (discountPercent / 100))
            : 0;
        const voucherDiscountAmount = appliedVoucher ? appliedVoucher.discountAmount : 0;
        const totalDiscount = Math.min(subtotal, memberDiscountAmount + voucherDiscountAmount);
        const depositAmount = selectedTable.currentSession.deposit || 0;
        const finalAmount = Math.max(0, subtotal - totalDiscount - depositAmount);
        const pointsWillEarn = loyaltyCustomer ? Math.floor(finalAmount / 10000) : 0;

        return (
          <div className="py-2 space-y-3.5 text-xs">
            {/* Card Tổng quan hóa đơn */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              {/* Header bàn & thời gian */}
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-sm whitespace-nowrap">{selectedTable.name}</span>
                  <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                    • {selectedTable.type === "pool" ? "Bàn Lỗ (Pool)" : selectedTable.type === "carom" ? "Bàn Carom" : "Bàn Snooker"}
                  </span>
                </div>
                <span className="font-mono text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 whitespace-nowrap shrink-0">
                  ⏱ {playingDetailsObj.formattedTime} ({playingDetailsObj.minutes} phút)
                </span>
              </div>

              {/* KHỐI 1: KHÁCH HÀNG & HỘI VIÊN */}
              <div className="p-3 rounded-xl bg-white border border-emerald-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                    <UserOutlined className="text-emerald-600" />
                    Khách hàng & Hội viên:
                  </span>
                  {loyaltyCustomer ? (
                    <Tag color="gold" className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold !m-0 whitespace-nowrap">
                      ⭐ HỘI VIÊN {loyaltyCustomer.rank ? loyaltyCustomer.rank.toUpperCase() : "VIP"} (-{discountPercent}% Giờ)
                    </Tag>
                  ) : (
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">Khách vãng lai</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập SĐT khách hàng tích điểm..."
                    value={checkoutPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCheckoutPhone(val);
                      if (loyaltyCustomer && val.trim() !== loyaltyCustomer.phone) {
                        setLoyaltyCustomer(null);
                        setDiscountPercent(0);
                        setAppliedVoucher(null);
                        setVoucherCode("");
                      }
                    }}
                    onPressEnter={onSearchLoyaltyCustomer}
                    prefix={<PhoneOutlined className="text-slate-400 text-xs" />}
                    className="!h-9 !rounded-xl !text-xs font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSearchLoyaltyCustomer}
                    loading={isSearchingMember}
                    className="!h-9 !px-3 !rounded-xl !text-xs font-bold shrink-0"
                  >
                    Áp dụng
                  </Button>
                </div>

                {!loyaltyCustomer && !showQuickRegister && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-50/70 via-emerald-50/50 to-teal-50/70 border border-emerald-200/80 text-[11px] text-slate-700 shadow-2xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GiftOutlined className="text-amber-500 text-xs shrink-0" />
                      <span className="truncate">
                        Khách chưa có thẻ? Đăng ký ngay để nhận <strong className="text-emerald-700 font-bold">Voucher chào mừng</strong> & tích điểm!
                      </span>
                    </div>
                    <Button
                      htmlType="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuickRegPhone(checkoutPhone);
                        setShowQuickRegister(true);
                      }}
                      className="!h-7 !px-2.5 !rounded-lg !text-[11px] !font-bold !text-emerald-700 !border-emerald-300 hover:!bg-emerald-50 shrink-0"
                    >
                      + Đăng ký (3s)
                    </Button>
                  </div>
                )}

                {!loyaltyCustomer && showQuickRegister && (
                  <div className="p-3 rounded-xl bg-gradient-to-b from-emerald-50/90 to-teal-50/70 border border-emerald-300 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                      <span className="flex items-center gap-1.5">
                        <UserAddOutlined className="text-emerald-600" />
                        Đăng ký nhanh Hội viên mới
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowQuickRegister(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        Đóng ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-700 block mb-0.5">
                          Số điện thoại <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          value={quickRegPhone}
                          onChange={(e) => setQuickRegPhone(e.target.value)}
                          placeholder="0988xxxxxx"
                          className="!h-8 !text-xs font-mono !rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-700 block mb-0.5">
                          Họ và tên khách hàng
                        </label>
                        <Input
                          value={quickRegName}
                          onChange={(e) => setQuickRegName(e.target.value)}
                          placeholder="VD: Anh Nam (hoặc để trống)"
                          className="!h-8 !text-xs !rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-emerald-800 font-medium">
                        🎁 Tự động kích hoạt ví ưu đãi ngay sau khi tạo
                      </span>
                      <Button
                        htmlType="button"
                        size="sm"
                        loading={isRegistering}
                        onClick={handleQuickRegister}
                        className="!h-7 !px-3 !rounded-lg !text-xs !bg-emerald-600 !text-white hover:!bg-emerald-700 !font-bold shadow-2xs"
                      >
                        Kích hoạt ngay
                      </Button>
                    </div>
                  </div>
                )}

                {loyaltyCustomer ? (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 transition-all">
                      <div className="flex items-center gap-1.5 font-medium flex-wrap">
                        <CheckCircleOutlined className="text-emerald-600 text-xs" />
                        <span>Hội viên:</span>
                        <strong className="text-emerald-950 font-bold">{loyaltyCustomer.name}</strong>
                        {loyaltyCustomer.rank && (
                          <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
                            Hạng {loyaltyCustomer.rank}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs text-[11px] font-semibold text-emerald-900">
                          Điểm hiện có:
                          <strong className="font-mono text-emerald-700 font-black text-xs">
                            {(loyaltyCustomer.membershipPoints ?? 0).toLocaleString("vi-VN")}
                          </strong>
                          <span>điểm</span>
                        </span>
                        {pointsWillEarn > 0 && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg shadow-2xs text-[11px] font-bold">
                            Tích đơn này:
                            <strong className="font-mono text-amber-700 font-black text-xs">
                              +{pointsWillEarn.toLocaleString("vi-VN")}
                            </strong>
                            <span>điểm</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer available membership vouchers */}
                    {loyaltyCustomer.availableVouchers && (loyaltyCustomer.availableVouchers.length > 0 || Boolean(loyaltyCustomer.totalStoreVouchers)) && (
                      <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-50/70 to-teal-50/60 border border-emerald-200/90 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                          <span className="flex items-center gap-1.5">
                            <GiftOutlined className="text-emerald-600" />
                            Voucher khả dụng (
                            {loyaltyCustomer.totalStoreVouchers
                              ? `${loyaltyCustomer.availableVouchers.length}/${loyaltyCustomer.totalStoreVouchers}`
                              : loyaltyCustomer.availableVouchers.length}
                            ):
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {loyaltyCustomer.availableVouchers.length > 0
                              ? "Bấm để áp dụng nhanh"
                              : "Đã dùng hết ưu đãi"}
                          </span>
                        </div>
                        {loyaltyCustomer.availableVouchers.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {loyaltyCustomer.availableVouchers.map((v: any) => {
                              const isApplied = appliedVoucher?.code === v.code;
                              const isEligible = subtotal >= (v.minOrderAmount || 0);
                              return (
                                <button
                                  key={v.code}
                                  type="button"
                                  onClick={() => {
                                    if (!isEligible && !isApplied) {
                                      message.warning(
                                        `Hóa đơn hiện tại (${subtotal.toLocaleString("vi-VN")}đ) chưa đạt mức tối thiểu ${(v.minOrderAmount || 0).toLocaleString("vi-VN")}đ để dùng voucher ${v.code}.`,
                                      );
                                      return;
                                    }
                                    void onSelectCustomerVoucher(v.code);
                                  }}
                                  title={v.description || v.code}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-all select-none text-left ${
                                    isApplied
                                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs font-bold cursor-pointer"
                                      : isEligible
                                      ? "bg-white border-emerald-200 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer"
                                      : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-80"
                                  }`}
                                >
                                  <span className="font-bold flex items-center gap-1">
                                    {v.targetAudience === "new_member" && (
                                      <span className={`text-[9px] px-1 rounded font-normal font-sans ${isApplied ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"}`}>
                                        Mới
                                      </span>
                                    )}
                                    {v.code}
                                  </span>
                                  <span
                                    className={`text-[10px] ${
                                      isApplied ? "text-emerald-100" : isEligible ? "text-emerald-700 font-semibold" : "text-slate-400"
                                    }`}
                                  >
                                    ({v.discountType === "percent" ? `-${v.discountValue}%` : `-${(v.discountValue / 1000).toLocaleString("vi-VN")}k`})
                                  </span>
                                  {isApplied ? (
                                    <CheckCircleOutlined className="text-white text-xs ml-0.5" />
                                  ) : !isEligible ? (
                                    <span className="text-[9px] text-amber-600 font-sans">
                                      [Đơn từ {((v.minOrderAmount || 0) / 1000).toLocaleString("vi-VN")}k]
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-emerald-600 font-sans">
                                      [Dùng]
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic py-1">
                            Hội viên đã sử dụng hết hoặc chưa có ưu đãi khả dụng trong đợt này.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : checkoutPhone.trim().length >= 8 ? (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <span>Chưa xác thực hội viên cho số <strong>{checkoutPhone}</strong></span>
                    <button
                      type="button"
                      onClick={onSearchLoyaltyCustomer}
                      className="text-emerald-600 font-bold hover:underline cursor-pointer"
                    >
                      Bấm để tra cứu
                    </button>
                  </div>
                ) : null}
              </div>

              {/* KHỐI 2: BẢNG KÊ DỊCH VỤ SỬ DỤNG (GIỜ CHƠI + ĐỒ UỐNG LIỀN MẠCH) */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                <span className="font-bold text-xs text-slate-800 block">
                  Bảng kê dịch vụ sử dụng:
                </span>

                {/* 1. Tiền giờ chơi */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <ClockCircleOutlined className="text-indigo-600" />
                      Tiền giờ chơi ({playingDetailsObj.minutes} phút):
                    </span>
                    <strong className="text-slate-900 font-mono text-sm">
                      {playingDetailsObj.cost.toLocaleString("vi-VN")}đ
                    </strong>
                  </div>

                  {selectedTable.currentSession.carriedCost > 0 && (
                    <div className="flex justify-between items-center text-[11px] text-purple-700 bg-purple-50/70 px-2 py-1 rounded-lg border border-purple-100">
                      <span className="flex items-center gap-1 font-medium">
                        <SwapOutlined className="text-purple-600" />
                        Tiền giờ chuyển / gộp từ bàn trước:
                      </span>
                      <strong className="font-mono font-bold">
                        +{selectedTable.currentSession.carriedCost.toLocaleString("vi-VN")}đ
                      </strong>
                    </div>
                  )}

                  {/* Collapsible Split Time Slots */}
                  {playingDetailsObj.timeSlots && playingDetailsObj.timeSlots.length > 0 && (
                    <div className="p-2 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-1">
                      <div
                        className="text-[11px] font-bold text-slate-700 flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setShowTimeSlots(!showTimeSlots)}
                      >
                        <span className="flex items-center gap-1.5 text-indigo-900">
                          ⚡ Chi tiết khung giờ
                          {playingDetailsObj.isCrossed && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold">
                              {playingDetailsObj.timeSlots.length} khung
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800">
                          {showTimeSlots ? "Thu gọn ▴" : "Xem chi tiết ▾"}
                        </span>
                      </div>

                      {showTimeSlots && (
                        <div className="max-h-36 overflow-y-auto space-y-1 pt-1 border-t border-indigo-100 pr-1">
                          {playingDetailsObj.timeSlots.map((slot: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-[10.5px] text-slate-600 bg-white/90 px-2 py-1 rounded"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">
                                  {slot.tierName}
                                </span>
                                <span className="text-slate-400 font-mono text-[10px] shrink-0">
                                  ({slot.startTime} – {slot.endTime})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-slate-500 font-mono text-[10px]">
                                  {slot.minutes}p × {slot.pricePerHour.toLocaleString()}đ
                                </span>
                                <span className="font-mono font-bold text-slate-900">
                                  {slot.cost.toLocaleString()}đ
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Tiền đồ uống & dịch vụ */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <CoffeeOutlined className="text-amber-600" />
                      Tiền đồ uống & dịch vụ (
                      {(selectedTable.currentSession.orders || []).filter(
                        (o: any) => o.status !== "cancelled",
                      ).length}{" "}
                      món):
                    </span>
                    <strong className="text-slate-900 font-mono text-sm">
                      {fnbTotal.toLocaleString("vi-VN")}đ
                    </strong>
                  </div>

                  {(selectedTable.currentSession.orders || []).filter(
                    (o: any) => o.status !== "cancelled",
                  ).length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                      {(selectedTable.currentSession.orders || [])
                        .filter((o: any) => o.status !== "cancelled")
                        .map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[11px] text-slate-600"
                          >
                            <span className="flex items-center gap-1.5">
                              <span>
                                {item.name || "Món F&B"}{" "}
                                <strong className="text-slate-800">
                                  x{Number(item.quantity) || 1}
                                </strong>
                              </span>
                              {item.originTableName && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">
                                  {item.originTableName}
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-slate-900 font-medium">
                              {(
                                (Number(item.price) || 0) * (Number(item.quantity) || 1)
                              ).toLocaleString("vi-VN")}
                              đ
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* KHỐI 3: BẢNG TÍNH TỔNG TIỀN & GIẢM TRỪ */}
              <div className="bg-slate-100/90 p-3.5 rounded-xl space-y-1.5 text-[11px] border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền dịch vụ:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {subtotal.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                {memberDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>
                      Ưu đãi Hội viên {loyaltyCustomer?.rank ? `${loyaltyCustomer.rank} ` : ""}(-{discountPercent}%):
                    </span>
                    <span className="font-mono">
                      -{memberDiscountAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                )}
                {voucherDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold items-center">
                    <span>Voucher hội viên ({appliedVoucher?.code}):</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono">
                        -{voucherDiscountAmount.toLocaleString("vi-VN")}đ
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedVoucher(null);
                          setVoucherCode("");
                          if (loyaltyCustomer) {
                            setDiscountPercent(loyaltyCustomer.discountPercent ?? 0);
                          }
                        }}
                        className="text-[10px] text-rose-500 hover:underline cursor-pointer font-sans"
                      >
                        [Gỡ]
                      </button>
                    </div>
                  </div>
                )}
                {depositAmount > 0 && (
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Khách đã đặt cọc (trừ vào hóa đơn):</span>
                    <span className="font-mono">
                      -{depositAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                  <div>
                    <span>TỔNG CỘNG THANH TOÁN:</span>
                    {loyaltyCustomer && pointsWillEarn > 0 && (
                      <span className="block text-[11px] font-semibold text-emerald-700 font-sans mt-0.5">
                        ⭐ Tích lũy cho hội viên: <strong>+{pointsWillEarn.toLocaleString("vi-VN")} điểm</strong>
                      </span>
                    )}
                  </div>
                  <span className="text-xl font-black text-emerald-700 font-mono">
                    {finalAmount.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>

              {depositAmount > 0 && (
                <p className="text-[11px] text-slate-500 italic flex items-center gap-1">
                  <InfoCircleOutlined className="text-emerald-600 shrink-0" />
                  <span>
                    Tiền cọc {depositAmount.toLocaleString("vi-VN")}đ đã được khấu trừ trực tiếp.{" "}
                    {finalAmount === 0 && depositAmount > subtotal - totalDiscount
                      ? `Thừa ${(depositAmount - (subtotal - totalDiscount)).toLocaleString("vi-VN")}đ hoàn lại cho khách.`
                      : ""}
                  </span>
                </p>
              )}

              {/* KHỐI 4: PHƯƠNG THỨC THANH TOÁN */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Phương thức thanh toán:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button
                    variant={paymentMethod === "cash" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMethod("cash")}
                    leftIcon={<DollarOutlined />}
                    className={`!h-12 !flex-col !gap-1 !rounded-xl ${
                      paymentMethod === "cash"
                        ? "!bg-emerald-600 !border-emerald-600 text-white shadow-xs"
                        : "!border-slate-200 !text-slate-700 hover:!border-slate-300"
                    }`}
                  >
                    <span className="text-[11px] font-bold">Tiền Mặt</span>
                  </Button>

                  <Button
                    variant={paymentMethod === "vnpay" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMethod("vnpay")}
                    leftIcon={<QrcodeOutlined />}
                    className={`!h-12 !flex-col !gap-1 !rounded-xl ${
                      paymentMethod === "vnpay"
                        ? "!bg-emerald-600 !border-emerald-600 text-white shadow-xs"
                        : "!border-slate-200 !text-slate-700 hover:!border-slate-300"
                    }`}
                  >
                    <span className="text-[11px] font-bold">Chuyển Khoản QR</span>
                  </Button>

                  <Button
                    variant={paymentMethod === "split" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMethod("split")}
                    leftIcon={<SwapOutlined />}
                    className={`!h-12 !flex-col !gap-1 !rounded-xl ${
                      paymentMethod === "split"
                        ? "!bg-emerald-600 !border-emerald-600 text-white shadow-xs"
                        : "!border-slate-200 !text-slate-700 hover:!border-slate-300"
                    }`}
                  >
                    <span className="text-[11px] font-bold">Tiền Mặt + QR</span>
                  </Button>

                </div>
              </div>

              {/* Chi tiết theo từng phương thức thanh toán */}
              {paymentMethod === "cash" && (
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-xs text-slate-800 whitespace-nowrap">
                      Tiền mặt khách đưa:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        placeholder={finalAmount.toString()}
                        value={cashReceived !== null ? cashReceived : finalAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCashReceived(val === "" ? null : Number(val));
                        }}
                        className="!w-40 !h-9 !text-right font-mono font-bold !text-slate-900 !text-sm"
                      />
                      <span className="text-xs font-semibold text-slate-500">đ</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCashReceived(finalAmount)}
                        title="Điền đúng số tiền hóa đơn"
                        className="!h-9 !px-2.5 !rounded-xl !text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 shrink-0"
                      >
                        Đủ tiền
                      </Button>
                    </div>
                  </div>

                  {(() => {
                    const actualReceived = cashReceived !== null ? cashReceived : finalAmount;
                    if (actualReceived === finalAmount) {
                      return (
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] flex items-center justify-between border border-emerald-200 font-medium">
                          <span className="flex items-center gap-1.5">
                            <CheckCircleOutlined className="text-emerald-600" />
                            Khách trả đủ tiền mặt ({finalAmount.toLocaleString("vi-VN")}đ)
                          </span>
                          <span className="font-bold font-mono">Tiền thừa: 0đ</span>
                        </div>
                      );
                    }
                    if (actualReceived > finalAmount) {
                      return (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-950">
                          <span className="font-semibold text-xs">Tiền thừa trả khách:</span>
                          <span className="font-mono font-black text-base text-emerald-700">
                            {(actualReceived - finalAmount).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      );
                    }
                    const missing = finalAmount - actualReceived;
                    return (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-amber-950">
                          <span className="font-bold">Khách đưa còn thiếu: </span>
                          <strong className="font-mono text-rose-600 font-bold text-xs">
                            {missing.toLocaleString("vi-VN")}đ
                          </strong>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setPaymentMethod("split");
                            setCashReceived(actualReceived);
                          }}
                          leftIcon={<QrcodeOutlined />}
                          className="!h-7 !px-2.5 !rounded-lg !bg-indigo-600 hover:!bg-indigo-700 !border-indigo-600 !text-xs font-bold text-white shrink-0"
                        >
                          Quét QR phần thiếu ({missing.toLocaleString("vi-VN")}đ)
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {paymentMethod === "vnpay" && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center gap-3.5">
                    <div className="h-28 w-28 bg-white rounded-xl p-1 shadow-xs border border-emerald-300 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://img.vietqr.io/image/${clubPayment.bankCode}-${clubPayment.bankAccountNo}-compact2.png?amount=${finalAmount}&addInfo=CueZone%20${selectedTable.code}&accountName=${encodeURIComponent(clubPayment.bankAccountName)}`}
                        alt="VietQR Chuyển Khoản"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Tag
                          color="green"
                          className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold !m-0"
                        >
                          VIETQR 24/7
                        </Tag>
                        <span className="font-extrabold text-slate-900 text-xs">
                          {clubPayment.bankName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        STK:{" "}
                        <strong className="font-mono text-slate-900 font-bold">
                          {clubPayment.bankAccountNo}
                        </strong>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        Chủ TK:{" "}
                        <strong className="text-slate-900 font-bold">{clubPayment.bankAccountName}</strong>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Số tiền:{" "}
                        <strong className="font-mono text-emerald-700 font-black text-sm">
                          {finalAmount.toLocaleString("vi-VN")}đ
                        </strong>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Nội dung: <strong>CueZone {selectedTable.code}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 border border-emerald-200/80 text-[11px] text-emerald-800 flex items-center gap-1.5">
                    <CheckCircleOutlined className="text-emerald-600 shrink-0" />
                    <span>
                      Khách quét mã chuyển khoản thành công, nhấn{" "}
                      <strong>Xác Nhận & In Hóa Đơn</strong> để hoàn tất.
                    </span>
                  </div>
                </div>
              )}

              {/* Thanh toán kết hợp: Tiền Mặt + QR */}
              {paymentMethod === "split" && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                    <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                      <SwapOutlined className="text-indigo-600" /> Thanh toán kết hợp: Tiền Mặt + QR
                    </span>
                    <Tag color="purple" className="!rounded-md !px-1.5 !text-[10px] !font-bold !m-0">
                      TỰ ĐỘNG CHIA TIỀN
                    </Tag>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Cột 1: Thu tiền mặt */}
                    <div className="p-2.5 bg-white rounded-xl border border-indigo-100 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        1. Số tiền mặt nhận:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          value={cashReceived !== null ? cashReceived : Math.floor(finalAmount / 2)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCashReceived(val === "" ? 0 : Math.max(0, Math.min(finalAmount, Number(val))));
                          }}
                          className="!h-8 !text-right font-mono font-bold !text-slate-900 !text-xs"
                        />
                        <span className="text-xs font-semibold text-slate-500">đ</span>
                      </div>
                      <div className="flex items-center gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setCashReceived(Math.floor(finalAmount / 2))}
                          className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium cursor-pointer"
                        >
                          50% ({Math.floor(finalAmount / 2).toLocaleString("vi-VN")}đ)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashReceived(0)}
                          className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium cursor-pointer"
                        >
                          0đ
                        </button>
                      </div>
                    </div>

                    {/* Cột 2: Phần còn lại quét QR */}
                    {(() => {
                      const cashPart = cashReceived !== null ? cashReceived : Math.floor(finalAmount / 2);
                      const qrPart = Math.max(0, finalAmount - cashPart);
                      return (
                        <div className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-center gap-2.5">
                          <div className="h-20 w-20 bg-white rounded-lg p-0.5 shadow-2xs border border-indigo-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={`https://img.vietqr.io/image/${clubPayment.bankCode}-${clubPayment.bankAccountNo}-compact2.png?amount=${qrPart}&addInfo=CueZone%20${selectedTable.code}&accountName=${encodeURIComponent(clubPayment.bankAccountName)}`}
                              alt="VietQR Còn Thiếu"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5 text-[11px]">
                            <span className="text-[10px] font-bold text-indigo-700 uppercase">
                              2. Quét QR còn lại:
                            </span>
                            <div className="font-mono font-black text-indigo-900 text-sm">
                              {qrPart.toLocaleString("vi-VN")}đ
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {clubPayment.bankCode}: <strong>{clubPayment.bankAccountNo}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="!rounded-xl"
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onConfirmCheckout}
                loading={saving}
                disabled={loading || !!loadError}
                leftIcon={<PrinterOutlined />}
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
              >
                Xác Nhận & In Hóa Đơn
              </Button>
            </div>
          </div>
        );
      })()}
    </Modal>
  );
};

export default PosCheckoutModal;
