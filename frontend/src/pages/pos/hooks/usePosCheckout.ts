import { useState } from "react";
import { message } from "../../../shared/ui";
import { posService } from "../../../services/pos.service";
import type { PosTable, CheckoutReceipt } from "../../../types/pos";

// ============================================================================
// HOOK QUẢN LÝ THANH TOÁN, TÍNH TIỀN & IN PHIẾU (USE POS CHECKOUT)
// Sơ đồ luồng dữ liệu:
//   PosCheckoutModal
//     -> usePosCheckout (tra cứu hội viên, kiểm tra voucher, chốt thanh toán)
//     -> posService.lookupCustomer() / validateVoucher() / checkout()
//     -> Backend: SessionService.checkout() (MongoDB Transaction: Invoice + trả bàn + cộng điểm)
//     -> PosReceiptModal (hiển thị & in hóa đơn nhiệt 80mm)
// ============================================================================

export interface LoyaltyCustomerInfo {
  name: string;
  phone: string;
  rank?: string;
  discountPercent?: number;
  membershipPoints?: number;
  totalStoreVouchers?: number;
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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "vnpay" | "card" | "split">("cash");
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

  /**
   * Tìm kiếm thông tin hội viên theo SĐT tại modal thanh toán để áp dụng giảm giá hạng thẻ và voucher khả dụng.
   * Luồng đi: Nhập SĐT -> posService.lookupCustomer() -> GET /tables/customer-lookup.
   *
   * @returns {Promise<void>}
   */
  const handleSearchLoyaltyCustomer = async () => {
    const phoneTrimmed = checkoutPhone.trim();
    if (!phoneTrimmed || phoneTrimmed.length < 8) {
      message.warning("Vui lòng nhập số điện thoại hợp lệ (tối thiểu 8 số)");
      setLoyaltyCustomer(null);
      setDiscountPercent(0);
      setAppliedVoucher(null);
      setVoucherCode("");
      return;
    }

    setIsSearchingMember(true);
    try {
      const res = await posService.lookupCustomer(phoneTrimmed);
      if (res.success && res.data) {
        if (loyaltyCustomer?.phone !== res.data.phone) {
          setAppliedVoucher(null);
          setVoucherCode("");
        }
        const rankDiscount = res.data.discountPercent ?? 0;
        setLoyaltyCustomer({
          name: res.data.name,
          phone: res.data.phone,
          rank: res.data.rank,
          discountPercent: rankDiscount,
          membershipPoints: res.data.membershipPoints,
          totalStoreVouchers: res.data.totalStoreVouchers,
          availableVouchers: res.data.availableVouchers || [],
        });
        setDiscountPercent(rankDiscount);
        const voucherCount = res.data.availableVouchers?.length || 0;
        message.success(
          `Đã tìm thấy hội viên ${res.data.name} (Hạng ${res.data.rank})! Tự động áp dụng giảm ${rankDiscount}% tiền giờ${
            voucherCount > 0 ? ` (và ${voucherCount} voucher hội viên)` : ""
          }.`,
        );
      } else {
        setLoyaltyCustomer(null);
        setDiscountPercent(0);
        setAppliedVoucher(null);
        setVoucherCode("");
        message.info(res.message || "Không tìm thấy hội viên với số điện thoại này. Áp dụng giá chuẩn.");
      }
    } catch {
      setLoyaltyCustomer(null);
      setDiscountPercent(0);
      setAppliedVoucher(null);
      setVoucherCode("");
      message.info("Không tìm thấy hội viên với số điện thoại này.");
    } finally {
      setIsSearchingMember(false);
    }
  };

  /**
   * Mở modal thanh toán cho bàn được chọn, tự động tra cứu lại thông tin hội viên nếu phiên đã gắn SĐT.
   *
   * @param {PosTable} table - Bàn đang chơi cần tính tiền
   * @returns {void}
   */
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
        membershipPoints: 0,
        discountPercent: 0,
      });
      setDiscountPercent(0);

      if (sessionPhone) {
        void posService.lookupCustomer(sessionPhone).then((res) => {
          if (res.success && res.data) {
            const rankDiscount = res.data.discountPercent ?? 0;
            setLoyaltyCustomer({
              name: res.data.name,
              phone: res.data.phone,
              rank: res.data.rank,
              discountPercent: rankDiscount,
              membershipPoints: res.data.membershipPoints,
              totalStoreVouchers: res.data.totalStoreVouchers,
              availableVouchers: res.data.availableVouchers || [],
            });
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

  /**
   * Xác nhận chốt hóa đơn thanh toán cuối cùng và chuyển sang modal in bill.
   * Luồng đi: PosCheckoutModal -> posService.checkout() -> POST /tables/:id/session/checkout -> PosReceiptModal.
   *
   * @param {NonNullable<CheckoutReceipt["paymentDetails"]>} paymentDetails - Chi tiết số tiền thu theo tiền mặt/chuyển khoản
   * @returns {Promise<void>}
   */
  const handleConfirmCheckout = async (
    paymentDetails: NonNullable<CheckoutReceipt["paymentDetails"]>,
  ) => {
    if (!selectedTable?.currentSession) return;
    const ok = await save(async () => {
      const summary = await posService.checkout(
        selectedTable,
        discountPercent,
        paymentMethod,
        appliedVoucher?.code,
        loyaltyCustomer?.phone || selectedTable.currentSession?.customerPhone,
        paymentDetails,
      );
      setPaidSummary(summary);
    });
    if (!ok) return;
    setCheckoutModalVisible(false);
    setReceiptModalVisible(true);
    const paymentLabel =
      paymentMethod === "split"
        ? "Tiền mặt + QR"
        : paymentMethod === "vnpay"
          ? "Chuyển khoản QR"
          : paymentMethod === "card"
            ? "Thẻ ngân hàng"
            : "Tiền mặt";
    message.success(
      `Đã lưu hóa đơn thanh toán (${paymentLabel}) cho ${selectedTable.name}!`,
    );
  };

  /**
   * Tạo bản xem trước phiếu tạm tính (chưa chốt thanh toán) để in kiểm tra cho khách.
   *
   * @param {PosTable} table - Bàn cần xem trước hóa đơn tạm tính
   * @returns {void}
   */
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

  /**
   * Kiểm tra tính hợp lệ của mã voucher đối với tổng tạm tính và hội viên hiện tại.
   * Luồng đi: Nhấn Áp dụng -> posService.validateVoucher() -> POST /vouchers/validate.
   *
   * @param {string} [codeOverride] - Mã voucher truyền trực tiếp khi chọn từ danh sách gợi ý của hội viên
   * @returns {Promise<void>}
   */
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
      const phone = loyaltyCustomer?.phone || selectedTable.currentSession.customerPhone;
      const voucher = await posService.validateVoucher(code, subtotal, phone);
      setVoucherCode(voucher.code);
      setAppliedVoucher({ code: voucher.code, discountAmount: voucher.discountAmount });
      message.success(`Đã áp dụng voucher ${voucher.code} (giảm ${voucher.discountAmount.toLocaleString("vi-VN")}đ)`);
    } catch (error: any) {
      setAppliedVoucher(null);
      const msg = error?.response?.data?.message || (error instanceof Error ? error.message : "Không thể áp dụng voucher này.");
      message.error(msg);
    }
  };

  /**
   * Chọn nhanh hoặc bỏ chọn một mã voucher trong danh sách ưu đãi của hội viên.
   *
   * @param {string} code - Mã voucher được bấm chọn
   * @returns {Promise<void>}
   */
  const handleSelectCustomerVoucher = async (code: string) => {
    if (appliedVoucher?.code === code) {
      setAppliedVoucher(null);
      setVoucherCode("");
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
