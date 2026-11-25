import { useState } from "react";
import { message } from "../../../shared/ui";
import { posService } from "../../../services/pos.service";
import { waitlistService } from "../../../services/waitlist.service";
import type { PosTable, BookingRequest } from "../../../types/pos";

// ============================================================================
// HOOK QUẢN LÝ MỞ BÀN, NHẬN LỊCH HẸN & TRA CỨU HỘI VIÊN (usePosOpenTable)
// Sơ đồ luồng dữ liệu:
//   PosOpenTableModal / PosTableCard
//     -> usePosOpenTable (tra cứu hội viên theo SĐT, mở bàn, gắn waitlist/booking)
//     -> posService.lookupCustomer() / posService.open()
//     -> Backend: SessionService.open() (khởi tạo currentSession, cập nhật pool_tables + Socket.IO)
// ============================================================================

interface UsePosOpenTableProps {
  selectedTable: PosTable | null;
  setSelectedTable: (table: PosTable | null) => void;
  save: (action: () => Promise<any>) => Promise<boolean>;
  pendingWaitlistEntryId: string | null;
  clearPendingWaitlist: () => void;
  fetchWaitlist: () => Promise<void>;
}

export function usePosOpenTable({
  selectedTable,
  setSelectedTable,
  save,
  pendingWaitlistEntryId,
  clearPendingWaitlist,
  fetchWaitlist,
}: UsePosOpenTableProps) {
  const [openModalVisible, setOpenModalVisible] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [sessionNote, setSessionNote] = useState<string>("");
  const [isCheckInMode, setIsCheckInMode] = useState<boolean>(false);
  const [isMemberCustomer, setIsMemberCustomer] = useState<boolean>(false);
  const [openModalMemberInfo, setOpenModalMemberInfo] = useState<{
    name: string;
    phone: string;
    rank?: string;
    discountPercent?: number;
  } | null>(null);
  const [isSearchingOpenMember, setIsSearchingOpenMember] = useState<boolean>(false);

  /**
   * Tự động tra cứu thông tin hội viên theo số điện thoại khi thu ngân nhập vào modal mở bàn.
   * Luồng đi: Input SĐT -> posService.lookupCustomer -> điền tên & áp dụng ưu đãi hạng thẻ.
   *
   * @param {string} phoneInput - Chuỗi số điện thoại thu ngân đang nhập
   * @returns {Promise<void>}
   */
  const handlePhoneChangeInOpenModal = async (phoneInput: string) => {
    setCustomerPhone(phoneInput);
    const clean = phoneInput.trim().replace(/[\s.-]/g, "");
    if (clean.length >= 8) {
      setIsSearchingOpenMember(true);
      try {
        const res = await posService.lookupCustomer(clean);
        if (res.success && res.data) {
          setOpenModalMemberInfo({
            name: res.data.name,
            phone: res.data.phone,
            rank: res.data.rank,
            discountPercent: res.data.discountPercent,
          });
          setCustomerName(res.data.name);
          setIsMemberCustomer(true);
        } else {
          setOpenModalMemberInfo(null);
          setIsMemberCustomer(false);
        }
      } catch {
        setOpenModalMemberInfo(null);
        setIsMemberCustomer(false);
      } finally {
        setIsSearchingOpenMember(false);
      }
    } else {
      setOpenModalMemberInfo(null);
      setIsMemberCustomer(false);
    }
  };

  /**
   * Xác nhận mở bàn mới hoặc check-in khách từ lịch hẹn / danh sách chờ.
   * Luồng đi: Nút Mở bàn -> posService.open() -> cập nhật waitlist (nếu có) -> đóng modal.
   *
   * @returns {Promise<void>}
   */
  const handleOpenTable = async () => {
    if (!selectedTable) return;
    if (selectedTable.status !== "available" && selectedTable.status !== "booked") {
      message.warning("Bàn này không ở trạng thái sẵn sàng để mở!");
      return;
    }

    const ok = await save(() =>
      posService.open(selectedTable.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        note: sessionNote.trim(),
        bookingId: isCheckInMode ? selectedTable.bookedInfo?.bookingId : undefined,
        isMember: isMemberCustomer,
      }),
    );
    if (!ok) return;

    if (pendingWaitlistEntryId) {
      waitlistService
        .updateStatus(pendingWaitlistEntryId, "seated", selectedTable.id)
        .then(() => fetchWaitlist())
        .catch(() => {});
      clearPendingWaitlist();
    }

    message.success(`Đã mở ${selectedTable.name} & bắt đầu tính giờ thành công!`);
    setOpenModalVisible(false);
    setSelectedTable(null);
    setCustomerName("");
    setCustomerPhone("");
    setSessionNote("");
    setIsMemberCustomer(false);
    setOpenModalMemberInfo(null);
    setIsCheckInMode(false);
  };

  /**
   * Mở modal cấu hình mở bàn (tự điền thông tin khách nếu là check-in từ lịch đặt trước).
   *
   * @param {PosTable} table - Bàn đích cần mở phiên chơi
   * @param {boolean} [isCheckIn=false] - True nếu khách đã đặt trước (bookedInfo)
   * @returns {void}
   */
  const handleOpenTableModal = (table: PosTable, isCheckIn = false) => {
    setSelectedTable(table);
    setIsCheckInMode(isCheckIn);
    if (isCheckIn && table.bookedInfo) {
      setCustomerName(table.bookedInfo.customerName || "");
      setCustomerPhone(table.bookedInfo.phone || "");
      setSessionNote(`Lịch hẹn lúc ${table.bookedInfo.time}`);
      if (table.bookedInfo.phone) {
        void handlePhoneChangeInOpenModal(table.bookedInfo.phone);
      }
    } else {
      setCustomerName("");
      setCustomerPhone("");
      setSessionNote("");
      setIsMemberCustomer(false);
      setOpenModalMemberInfo(null);
    }
    setOpenModalVisible(true);
  };

  /**
   * Mở modal nhận bàn từ thông tin một đơn đặt trước cụ thể.
   *
   * @param {string} tableId - Mã định danh bàn cần check-in
   * @param {BookingRequest} booking - Dữ liệu đơn đặt bàn của khách
   * @returns {void}
   */
  const handleCheckInFromBooking = (tableId: string, booking: BookingRequest) => {
    const table = selectedTable && selectedTable.id === tableId ? selectedTable : null;
    if (table) {
      setSelectedTable(table);
      setIsCheckInMode(true);
      setCustomerName(booking.customerName);
      setCustomerPhone(booking.phone);
      setSessionNote(`Nhận bàn hẹn lúc ${booking.time} (${booking.date})`);
      setOpenModalVisible(true);
      if (booking.phone) {
        void handlePhoneChangeInOpenModal(booking.phone);
      }
    }
  };

  return {
    openModalVisible,
    setOpenModalVisible,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    sessionNote,
    setSessionNote,
    isCheckInMode,
    setIsCheckInMode,
    isMemberCustomer,
    setIsMemberCustomer,
    openModalMemberInfo,
    isSearchingOpenMember,
    handlePhoneChangeInOpenModal,
    handleOpenTable,
    handleOpenTableModal,
    handleCheckInFromBooking,
  };
}
