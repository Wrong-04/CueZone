import { useState } from "react";
import { message } from "../../../shared/ui";
import { posService } from "../../../services/pos.service";
import { RANK_DISCOUNT_PERCENT } from "../constants/posConstants";
import type { PosTable, CheckoutReceipt } from "../../../types/pos";

export interface LoyaltyCustomerInfo {
  name: string;
  phone: string;
  rank?: string;
  walletBalance?: number;
  walletPoints?: number;
  availableVouchers?: Array<{
    code: string;
    description?: string;
    discountType: string;
    discountValue: number;
    minOrderAmount: number;
  }>;
}

interface UsePosCheckoutProps {
  selectedTable: PosTable | null;
  setSelectedTable: (table: PosTable | null) => void;
  save: (action: () => Promise<any>) => Promise<boolean>;
  calculatePlayingDetails: (table: PosTable) => { cost: number; minutes: number };
}

export function usePosCheckout({
  selectedTable,
  setSelectedTable,
  save,
  calculatePlayingDetails,
}: UsePosCheckoutProps) {
  const [checkoutModalVisible, setCheckoutModalVisible] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "vnpay" | "card" | "wallet">("cash");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showTimeSlots, setShowTimeSlots] = useState<boolean>(false);
  const [checkoutPhone, setCheckoutPhone] = useState<string>("");
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<LoyaltyCustomerInfo | null>(null);
  const [isSearchingMember, setIsSearchingMember] = useState<boolean>(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState<boolean>(false);
  const [paidSummary, setPaidSummary] = useState<CheckoutReceipt | null>(null);

  const handleSearchLoyaltyCustomer = async () => {
    const phoneTrimmed = checkoutPhone.trim();
    if (!phoneTrimmed || phoneTrimmed.length < 8) {
      message.warning("Vui lòng nhập số điện thoại hợp lệ (tối thiểu 8 số)");
      setLoyaltyCustomer(null);
      setDiscountPercent(0);
      return;
    }

    setIsSearchingMember(true);
    try {
      const res = await posService.lookupCustomer(phoneTrimmed);
      if (res.success && res.data) {
        setLoyaltyCustomer({
          name: res.data.name,
          phone: res.data.phone,
          rank: res.data.rank,
          walletBalance: res.data.walletBalance,
          walletPoints: res.data.walletPoints,
          availableVouchers: res.data.availableVouchers || [],
        });
        const rankDiscount = RANK_DISCOUNT_PERCENT[res.data.rank || "Standard"] || 10;
        setDiscountPercent(rankDiscount);
        const voucherCount = res.data.availableVouchers?.length || 0;
        message.success(
          `Đã tìm thấy hội viên ${res.data.name} (Hạng ${res.data.rank || "Standard"})! Tự động áp dụng giảm ${rankDiscount}% tiền giờ${
            voucherCount > 0 ? ` (và ${voucherCount} voucher trong ví)` : ""
          }.`,
        );
      } else {
        setLoyaltyCustomer(null);
        setDiscountPercent(0);
        message.info(res.message || "Không tìm thấy hội viên với số điện thoại này. Áp dụng giá chuẩn.");
      }
    } catch {
      setLoyaltyCustomer(null);
      setDiscountPercent(0);
      message.info("Không tìm thấy hội viên với số điện thoại này.");
    } finally {
      setIsSearchingMember(false);
    }
  };

  const handleOpenCheckout = (table: PosTable) => {
    setSelectedTable(table);
    const sessionPhone = table.currentSession?.customerPhone || "";
    setCheckoutPhone(sessionPhone);
    setShowTimeSlots(false);
    setVoucherCode("");
    setAppliedVoucher(null);
    setPaymentMethod("cash");
    setCashReceived(null);

    if (table.currentSession?.isMember) {
      setLoyaltyCustomer({
        name: table.currentSession.customerName || "Hội viên CLB",
        phone: sessionPhone,
        rank: "VIP",
        walletBalance: 0,
        walletPoints: 0,
      });
      setDiscountPercent(10);

      if (sessionPhone) {
        void posService.lookupCustomer(sessionPhone).then((res) => {
          if (res.success && res.data) {
            setLoyaltyCustomer({
              name: res.data.name,
              phone: res.data.phone,
              rank: res.data.rank,
              walletBalance: res.data.walletBalance,
              walletPoints: res.data.walletPoints,
              availableVouchers: res.data.availableVouchers || [],
            });
            const rankDiscount = RANK_DISCOUNT_PERCENT[res.data.rank || "Standard"] || 10;
            setDiscountPercent(rankDiscount);
          }
        });
      }
    } else {
      setLoyaltyCustomer(null);
      setDiscountPercent(0);
    }

    setCheckoutModalVisible(true);
  };

  const handleConfirmCheckout = async () => {
    if (!selectedTable?.currentSession) return;
    const ok = await save(async () => {
      const summary = await posService.checkout(
        selectedTable,
        appliedVoucher ? 0 : discountPercent,
        paymentMethod,
        appliedVoucher?.code,
      );
      setPaidSummary(summary);
    });
    if (!ok) return;
    setCheckoutModalVisible(false);
    setReceiptModalVisible(true);
    message.success(
      `Đã lưu hóa đơn thanh toán (${paymentMethod === "vnpay" ? "Chuyển khoản QR" : "Tiền mặt"}) cho ${selectedTable.name}!`,
    );
  };

  const handleOpenPrePrintReceipt = (table: PosTable) => {
    const { cost, minutes } = calculatePlayingDetails(table);
    const fnbItems = (table.currentSession?.orders || []).filter(
      (o) => o.status !== "cancelled",
    );
    const fnbTotal = fnbItems.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0,
    );
    const totalAmount = cost + fnbTotal;
    const receipt: CheckoutReceipt = {
      tableName: table.name,
      typeName: table.typeName,
      customerName: table.currentSession?.customerName || "Khách lẻ",
      customerPhone: table.currentSession?.customerPhone,
      sessionStart: table.currentSession?.sessionStart || "",
      sessionEnd: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      durationFormatted: `${Math.floor(minutes / 60)}h ${minutes % 60}p`,
      durationMinutes: minutes,
      pricePerHour: table.currentSession?.pricePerHour || table.pricePerHour,
      playingCost: cost,
      orders: fnbItems,
      fnbTotal,
      subtotal: totalAmount,
      discountPercent: 0,
      discountAmount: 0,
      deposit: 0,
      refundAmount: 0,
      checkoutTime: new Date().toLocaleString("vi-VN"),
      finalAmount: totalAmount,
      paymentMethod: "cash",
      invoiceCode: `PRE-${Date.now().toString().slice(-6)}`,
    };
    setPaidSummary(receipt);
    setReceiptModalVisible(true);
  };

  const handleValidateVoucher = async (codeOverride?: string) => {
    const code = (codeOverride || voucherCode).trim();
    if (!selectedTable?.currentSession || !code) {
      message.warning("Vui lòng chọn voucher.");
      return;
    }
    const subtotal =
      calculatePlayingDetails(selectedTable).cost +
      (selectedTable.currentSession.orders || []).reduce(
        (sum, item) =>
          item.status !== "cancelled"
            ? sum + (Number(item.price) || 0) * (Number(item.quantity) || 0)
            : sum,
        0,
      );
    try {
      const voucher = await posService.validateVoucher(code, subtotal);
      setVoucherCode(voucher.code);
      setAppliedVoucher({ code: voucher.code, discountAmount: voucher.discountAmount });
      setDiscountPercent(0);
      message.success(`Đã áp dụng voucher ${voucher.code}`);
    } catch (error) {
      setAppliedVoucher(null);
      message.error(
        error instanceof Error ? error.message : "Không thể áp dụng voucher này.",
      );
    }
  };

  const handleSelectCustomerVoucher = async (code: string) => {
    if (appliedVoucher?.code === code) {
      setAppliedVoucher(null);
      setVoucherCode("");
      if (loyaltyCustomer) setDiscountPercent(10);
      message.info(`Đã gỡ voucher ${code}`);
      return;
    }
    setVoucherCode(code);
    await handleValidateVoucher(code);
  };

  return {
    checkoutModalVisible,
    setCheckoutModalVisible,
    paymentMethod,
    setPaymentMethod,
    discountPercent,
    setDiscountPercent,
    showTimeSlots,
    setShowTimeSlots,
    checkoutPhone,
    setCheckoutPhone,
    loyaltyCustomer,
    setLoyaltyCustomer,
    isSearchingMember,
    voucherCode,
    setVoucherCode,
    appliedVoucher,
    setAppliedVoucher,
    cashReceived,
    setCashReceived,
    receiptModalVisible,
    setReceiptModalVisible,
    paidSummary,
    handleSearchLoyaltyCustomer,
    handleOpenCheckout,
    handleConfirmCheckout,
    handleOpenPrePrintReceipt,
    handleValidateVoucher,
    handleSelectCustomerVoucher,
  };
}
